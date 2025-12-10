// import {assertNotNull} from '@subsquid/util-internal'
import { Logger } from './utils/logger'

Logger.debug('Loading processor.ts...')

// Fonction utilitaire simple pour remplacer assertNotNull
function assertNotNull<T>(value: T | null | undefined, message?: string): asserts value is T {
  if (value == null) {
    throw new Error(message || 'Value is null or undefined')
  }
}

import {
    BlockHeader,
    DataHandlerContext,
    SubstrateBatchProcessor,
    SubstrateBatchProcessorFields,
    Event as _Event,
    Call as _Call,
    Extrinsic as _Extrinsic
} from '@subsquid/substrate-processor'

console.log('📝 [DEBUG] Substrate processor imports loaded')

import {events} from './types'

Logger.debug('Types imported, creating processor...')

// Configuration depuis les variables d'environnement
const startBlock = parseInt(process.env.START_BLOCK || '1888457')
const endBlock = parseInt(process.env.END_BLOCK || '0') || undefined
const finalityConfirmation = parseInt(process.env.FINALITY_CONFIRMATION || '1')

Logger.info(`Configuration du processor:`)
Logger.info(`   - Start Block: ${startBlock}`)
Logger.info(`   - End Block: ${endBlock || 'undefined (continu)'}`)
Logger.info(`   - Finality Confirmation: ${finalityConfirmation}`)
Logger.info(`   - Target Contracts: ${Logger.getTargetContracts().join(', ')}`)
Logger.info(`   - Log Level: ${Logger.getLogLevel()}`)

export const processor = new SubstrateBatchProcessor()
    // Configuration RPC depuis les variables d'environnement
    .setDataSource({
        chain: process.env.RPC_PASSET_HUB_WS || 'wss://passet-hub-paseo.ibp.network'
    })
    // Configuration pour rester en attente des nouveaux blocs
    .setBlockRange({
        from: startBlock,
        to: endBlock
    })
    .setFinalityConfirmation(finalityConfirmation)
    // Événements de la pallet revive pour les contrats
    .addEvent({
        name: ['Revive.ContractEmitted']
    })
    .addEvent({
        name: ['Revive.ContractInstantiated']
    })
    .addEvent({
        name: ['Revive.CodeStored']
    })
    // Événements génériques pour tester la connectivité
    .addEvent({
        name: ['System.ExtrinsicSuccess', 'System.ExtrinsicFailed']
    })
    .addEvent({
        name: ['Balances.Transfer']
    })
    .setFields({
        event: {
            args: true,
            name: true
        },
        extrinsic: {
            hash: true,
            fee: true,
            success: true
        },
        block: {
            timestamp: true
        }
    })

Logger.debug('Processor configuration completed')

export type Fields = SubstrateBatchProcessorFields<typeof processor>
export type Block = BlockHeader<Fields>
export type Event = _Event<Fields>
export type Call = _Call<Fields>
export type Extrinsic = _Extrinsic<Fields>
export type ProcessorContext<Store> = DataHandlerContext<Store, Fields>
