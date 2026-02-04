// import {assertNotNull} from '@subsquid/util-internal'
import { Logger } from './utils/logger'
import { RPC_URL } from './config'

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

import {events} from './types'

Logger.debug('Types imported, creating processor...')

// Configuration depuis les variables d'environnement
const startBlock = parseInt(process.env.START_BLOCK || '13411865')
const endBlock = parseInt(process.env.END_BLOCK || '0') || undefined
const finalityConfirmation = parseInt(process.env.FINALITY_CONFIRMATION || '1')
// Configuration RPC optimisée
const rpcCapacity = parseInt(process.env.RPC_CAPACITY || '20') // Connexions concurrentes
const rpcMaxBatchCallSize = parseInt(process.env.RPC_MAX_BATCH_CALL_SIZE || '200') // Appels RPC batchés
const rpcRequestTimeout = parseInt(process.env.RPC_REQUEST_TIMEOUT || '60000') // Timeout en ms
// Configuration de performance pour les batches
const batchSize = parseInt(process.env.BATCH_SIZE || '0') || undefined // Taille des batches (0 = auto)

Logger.info(`Configuration du processor:`)
Logger.info(`   - Start Block: ${startBlock}`)
Logger.info(`   - End Block: ${endBlock || 'undefined (continu)'}`)
Logger.info(`   - Finality Confirmation: ${finalityConfirmation}`)
Logger.info(`   - RPC Capacity: ${rpcCapacity} connexions`)
Logger.info(`   - RPC Max Batch Call Size: ${rpcMaxBatchCallSize}`)
Logger.info(`   - RPC Request Timeout: ${rpcRequestTimeout}ms`)
Logger.info(`   - Batch Size: ${batchSize || 'auto (géré par Subsquid)'}`)
Logger.info(`   - Target Contracts: ${Logger.getTargetContracts().join(', ')}`)
Logger.info(`   - Log Level: ${Logger.getLogLevel()}`)

// Optional: Subsquid archive gateway for historical blocks. If unset, only RPC is used (no archive).
const SUBSQUID_GATEWAY = process.env.SUBSQUID_GATEWAY?.trim() || undefined

const proc = new SubstrateBatchProcessor()
if (SUBSQUID_GATEWAY) {
  proc.setGateway(SUBSQUID_GATEWAY)
}
export const processor = proc
    .setRpcEndpoint({
        url: RPC_URL,
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
    // Configuration de la taille des batches (si spécifiée)
    // Note: La taille des batches est gérée automatiquement par Subsquid si non spécifiée
    // basée sur la taille des blocs et les ressources disponibles
    // Pour les blocs historiques, on peut réduire la finality confirmation pour accélérer
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
