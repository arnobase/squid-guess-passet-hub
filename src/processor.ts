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
// Configuration RPC optimisée
const rpcCapacity = parseInt(process.env.RPC_CAPACITY || '20') // Connexions concurrentes
const rpcMaxBatchCallSize = parseInt(process.env.RPC_MAX_BATCH_CALL_SIZE || '200') // Appels RPC batchés
const rpcRequestTimeout = parseInt(process.env.RPC_REQUEST_TIMEOUT || '60000') // Timeout en ms

Logger.info(`Configuration du processor:`)
Logger.info(`   - Start Block: ${startBlock}`)
Logger.info(`   - End Block: ${endBlock || 'undefined (continu)'}`)
Logger.info(`   - Finality Confirmation: ${finalityConfirmation}`)
Logger.info(`   - RPC Capacity: ${rpcCapacity} connexions`)
Logger.info(`   - RPC Max Batch Call Size: ${rpcMaxBatchCallSize}`)
Logger.info(`   - RPC Request Timeout: ${rpcRequestTimeout}ms`)
Logger.info(`   - Target Contracts: ${Logger.getTargetContracts().join(', ')}`)
Logger.info(`   - Log Level: ${Logger.getLogLevel()}`)

export const processor = new SubstrateBatchProcessor()
    // Configuration RPC optimisée avec setRpcEndpoint() (nouvelle API)
    // Permet de configurer maxBatchCallSize, capacity, etc.
    .setRpcEndpoint({
        url: process.env.RPC_PASSET_HUB_WS || 'wss://passet-hub-paseo.ibp.network',
        capacity: rpcCapacity,                    // Nombre de connexions concurrentes
        maxBatchCallSize: rpcMaxBatchCallSize,    // Nombre d'appels RPC batchés
        requestTimeout: rpcRequestTimeout        // Timeout des requêtes RPC
    })
    // Configuration pour rester en attente des nouveaux blocs
    .setBlockRange({
        from: startBlock,
        to: endBlock
    })
    .setFinalityConfirmation(finalityConfirmation)
    // Note: La taille des batches est gérée automatiquement par Subsquid
    // basée sur la taille des blocs et les ressources disponibles
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
