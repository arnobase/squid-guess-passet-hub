import {TypeormDatabase, Store} from '@subsquid/typeorm-store'
import {In} from 'typeorm'
import * as ss58 from '@subsquid/ss58'
import assert from 'assert'
import { encodeAddress } from '@polkadot/util-crypto'

import {processor, ProcessorContext} from './processor'
import {Contract, Game, GameStartedEvent, GuessSubmittedEvent, ClueGivenEvent, GameOverEvent, GameCancelledEvent, MaxAttemptsUpdatedEvent} from './model'
import {events} from './types'
// ✅ NEW: Unified decoder module (static or runtime)
// import { createDecoder, DecoderMode } from './decoders'
// 
// STATIC mode (recommended - no JSON metadata needed):
// const decoder = createDecoder({
//   mode: DecoderMode.STATIC,
//   contract: 'guess_the_number'
// })
//
// RUNTIME mode (legacy system - requires JSON metadata):
// const decoder = createDecoder({
//   mode: DecoderMode.RUNTIME,
//   metadataPath: './guess_the_number.json',
//   contractAddress: '0xe75cbd47620dbb2053cf2a98d06840f06baaf141',
//   eventTypeMapping: { ... }
// })

// ✅ NEW: Use @luckyweb3/subsquid-ink-v6-decoder package
// Option 1: STATIC mode (recommended - no JSON metadata needed)
import { createDecoder, DecoderMode } from '@luckyweb3/subsquid-ink-v6-decoder'
// Register static decoders for this project
import './decoders/static-registry'

// Option 2: RUNTIME mode (legacy system - requires JSON metadata)
// import { createDecoder, DecoderMode } from '../packages/ink-decoder/src'
import {GameManager, GameEvent} from './services/game-manager'
import { Logger } from './utils/logger'

Logger.info('🚀 Starting Passet Hub Indexer...')
Logger.info(`🔗 RPC Endpoint: ${process.env.RPC_PASSET_HUB_WS || 'wss://westend-asset-hub-rpc.polkadot.io'}`)
Logger.info('📊 Indexing Revive pallet events and game events')

/**
 * Converts an address (object or hexadecimal) to SS58 format
 * For Revive contracts (EVM), we convert to Substrate SS58 format
 */
/**
 * Serialize data with BigInt support for logging
 * @param data - Data to serialize
 * @returns Serialized string with BigInt converted to string
 */
function serializeForLogging(data: any): string {
    return JSON.stringify(data, (key, value) => {
        if (typeof value === 'bigint') {
            return value.toString()
        }
        if (value instanceof Uint8Array) {
            return Array.from(value).map(b => b.toString(16).padStart(2, '0')).join('')
        }
        return value
    }, 2)
}

export function convertToSS58(addressInput: any): string {
    try {
        let hexAddress: string
        
        // If it's already a hexadecimal string
        if (typeof addressInput === 'string') {
            hexAddress = addressInput
        }
        // If it's an object with a field property (generic decoder format)
        else if (addressInput && typeof addressInput === 'object' && addressInput.field && Array.isArray(addressInput.field)) {
            // Convert byte array to hexadecimal
            const hexBytes = addressInput.field.map((byte: number) => byte.toString(16).padStart(2, '0')).join('')
            // Pad to 32 bytes (64 hex characters) for Substrate
            const paddedHex = hexBytes.padStart(64, '0')
            hexAddress = `0x${paddedHex}`
        }
        else {
            console.warn(`⚠️ Unknown address format:`, addressInput)
            return String(addressInput)
        }

        // Check address length
        const cleanHex = hexAddress.startsWith('0x') ? hexAddress.slice(2) : hexAddress
        
        if (cleanHex.length === 40) {
            // EVM address (20 bytes) - convert to SS58 with padding
            Logger.debug(`Converting EVM address: ${hexAddress} (20 bytes)`)
            const paddedHex = cleanHex.padStart(64, '0') // Pad to 32 bytes
            const ss58Address = encodeAddress(`0x${paddedHex}`, 42)
            Logger.debug(`SS58 result: ${ss58Address}`)
            return ss58Address
        } else if (cleanHex.length === 64) {
            // Substrate address (32 bytes) - direct conversion
            Logger.debug(`Converting Substrate address: ${hexAddress} (32 bytes)`)
            const ss58Address = encodeAddress(hexAddress, 42)
            Logger.debug(`SS58 result: ${ss58Address}`)
            return ss58Address
        } else {
            Logger.warn(`Invalid address length: ${cleanHex.length} bytes (expected 20 or 32)`)
            return hexAddress
        }
    } catch (error) {
        Logger.warn(`Error converting address to SS58:`, error)
        return String(addressInput)
    }
}

// ✅ FIX: Persistent GameManager across batches
let persistentGameManager = new GameManager()

// ✅ NEW: Unified Ink! v6 decoder (STATIC mode - no JSON metadata needed)
const decoder = createDecoder({
    mode: DecoderMode.STATIC,
    contract: 'guess_the_number'
})

// Alternative: RUNTIME mode (if you prefer to use JSON metadata)
// const decoder = createDecoder({
//     mode: DecoderMode.RUNTIME,
//     metadataPath: './metadata/guess_the_number.json',
//     contractAddress: '0xe75cbd47620dbb2053cf2a98d06840f06baaf141',
//     eventTypeMapping: {
//         'NewGame': 'game_started',
//         'GuessMade': 'guess_submitted',
//         'ClueGiven': 'clue_given'
//     },
//     debugMode: true
// })

processor.run(new TypeormDatabase({supportHotBlocks: true}), async (ctx: ProcessorContext<Store>) => {
    Logger.debug(`Processing ${ctx.blocks.length} blocks`)
    
    // Use persistent GameManager
    const gameManager = persistentGameManager
    
    // Extract events from blocks
    let contractEvents: TypedContractEvent[] = await getContractEvents(ctx)

    // Compact batch summary
    if (contractEvents.length > 0) {
        const eventSummary = contractEvents.map(evt => {
            const eventType = evt instanceof GameStartedEvent ? 'NEW_GAME' :
                            evt instanceof GuessSubmittedEvent ? 'GUESS_MADE' :
                            evt instanceof ClueGivenEvent ? 'CLUE_GIVEN' :
                            evt instanceof GameOverEvent ? 'GAME_OVER' :
                            evt instanceof GameCancelledEvent ? 'GAME_CANCELLED' :
                            evt instanceof MaxAttemptsUpdatedEvent ? 'MAX_ATTEMPTS' : 'UNKNOWN'
            return `${eventType}#${evt.gameNumber}@${evt.blockNumber}`
        }).join(', ')
        Logger.info(`📦 Batch: ${contractEvents.length} event(s) - ${eventSummary}`)
    }

    // Process and store data
    let contracts: Map<string, Contract> = await createContracts(ctx, contractEvents)
    
    // Assign contracts to events
    for (let event of contractEvents) {
        const contract = contracts.get(event.contractAddress)
        if (contract) {
            event.contract = contract
        }
    }
    
    // ✅ FIX: Load existing games from DB into GameManager before processing events
    // This ensures that games created in previous batches are available
    if (contractEvents.length > 0) {
        const gameKeys = contractEvents.map(event => {
            const contractAddressSS58 = convertToSS58(event.contractAddress)
            return `${contractAddressSS58}-${event.gameNumber.toString()}`
        })
        const existingGames = await ctx.store.findBy(Game, {id: In(gameKeys)})
        existingGames.forEach(game => {
            gameManager.loadGame(game)
        })
    }
    
    // ✅ FIX: Use GameManager for consistent game management
    let games: Game[] = processGamesWithManager(contractEvents, contracts, gameManager)

        // ✅ FIX: Retrieve existing games from database and merge them
        const existingGames = await ctx.store.findBy(Game, {id: In(games.map(g => g.id))})
        const existingGamesMap = new Map<string, Game>()
        existingGames.forEach(game => {
            existingGamesMap.set(game.id, game)
        })

        // Merge existing games with new ones
        const mergedGames = new Map<string, Game>()
        
        // First, add existing games
        existingGamesMap.forEach((game, id) => {
            mergedGames.set(id, game)
        })
        
        // Then, update with new events
        games.forEach(game => {
            const existingGame = mergedGames.get(game.id)
            if (existingGame) {
                // ✅ FIX: Update ALL fields of existing game
                existingGame.attempt = game.attempt
                existingGame.lastGuess = game.lastGuess
                existingGame.lastClue = game.lastClue
                // ✅ NEW: Update v0.1.3 fields
                if (game.isOver !== undefined) existingGame.isOver = game.isOver
                if (game.won !== undefined) existingGame.won = game.won
                if (game.target !== undefined && game.target !== null) existingGame.target = game.target
                if (game.cancelled !== undefined) existingGame.cancelled = game.cancelled
                if (game.maxAttempts !== undefined && game.maxAttempts !== null) existingGame.maxAttempts = game.maxAttempts
                // ✅ FIX: Merge guess history
                if (game.guessHistory && game.guessHistory.length > 0) {
                    if (!existingGame.guessHistory) {
                        existingGame.guessHistory = []
                    }
                    // Add new guesses to existing history
                    game.guessHistory.forEach(newGuess => {
                        const existingGuess = existingGame.guessHistory.find(g => g.attemptNumber === newGuess.attemptNumber)
                        if (existingGuess) {
                            // Update existing guess
                            existingGuess.guess = newGuess.guess
                            existingGuess.result = newGuess.result
                        } else {
                            // Add new guess
                            existingGame.guessHistory.push(newGuess)
                        }
                    })
                }
            } else {
                // Add new game
                mergedGames.set(game.id, game)
            }
        })
        
        const deduplicatedGames = Array.from(mergedGames.values())

        // Batch database operations
        await ctx.store.upsert([...contracts.values()])
        
        // Save typed events by type
        const gameStartedEvents = contractEvents.filter(e => e instanceof GameStartedEvent)
        const guessSubmittedEvents = contractEvents.filter(e => e instanceof GuessSubmittedEvent)
        const clueGivenEvents = contractEvents.filter(e => e instanceof ClueGivenEvent)
        const gameOverEvents = contractEvents.filter(e => e instanceof GameOverEvent)
        const gameCancelledEvents = contractEvents.filter(e => e instanceof GameCancelledEvent)
        const maxAttemptsUpdatedEvents = contractEvents.filter(e => e instanceof MaxAttemptsUpdatedEvent)
        
        if (gameStartedEvents.length > 0) await ctx.store.insert(gameStartedEvents)
        if (guessSubmittedEvents.length > 0) await ctx.store.insert(guessSubmittedEvents)
        if (clueGivenEvents.length > 0) await ctx.store.insert(clueGivenEvents)
        if (gameOverEvents.length > 0) await ctx.store.insert(gameOverEvents)
        if (gameCancelledEvents.length > 0) await ctx.store.insert(gameCancelledEvents)
        if (maxAttemptsUpdatedEvents.length > 0) await ctx.store.insert(maxAttemptsUpdatedEvents)
        
        await ctx.store.upsert(deduplicatedGames)
    
        // Log only if there are events or in debug mode
        if (contractEvents.length > 0 || Logger.getLogLevel() === 'debug') {
            Logger.info(`✅ Processed: ${contractEvents.length} event(s), ${deduplicatedGames.length} game(s)`)
        }
})

// Removed: TransferEvent - focus on games only

// Union type for all event types
type TypedContractEvent = 
    | GameStartedEvent 
    | GuessSubmittedEvent 
    | ClueGivenEvent
    | GameOverEvent
    | GameCancelledEvent
    | MaxAttemptsUpdatedEvent

// Function to create typed events based on decoded data
function createTypedEvent(
    id: string,
    blockNumber: number,
    timestamp: Date,
    extrinsicHash: string | undefined,
    contractAddress: string,
    decodedEvent: any
): TypedContractEvent | null {
    const baseEvent = {
        id,
        blockNumber,
        timestamp,
        extrinsicHash: extrinsicHash || null,
        contractAddress
    }

    switch (decodedEvent.eventType) {
        case 'new_game':
            const playerAddress = decodedEvent.data.player || ''
            const ss58Address = convertToSS58(playerAddress)
            Logger.debug(`Address conversion: ${playerAddress} -> ${ss58Address}`)
            return new GameStartedEvent({
                ...baseEvent,
                gameNumber: BigInt(decodedEvent.data.game_number || 0),
                player: ss58Address,
                minNumber: decodedEvent.data.min_number || 0,
                maxNumber: decodedEvent.data.max_number || 0
            })
        
        case 'guess_made':
            const guessMadePlayer = decodedEvent.data.player || ''
            const guessMadeSS58 = convertToSS58(guessMadePlayer)
            return new GuessSubmittedEvent({
                ...baseEvent,
                gameNumber: BigInt(decodedEvent.data.game_number || 0),
                player: guessMadeSS58,
                attemptNumber: decodedEvent.data.attempt || 0,
                guess: decodedEvent.data.guess || 0
            })
        
        case 'clue_given':
            const clueGivenPlayer = decodedEvent.data.player || ''
            const clueGivenSS58 = convertToSS58(clueGivenPlayer)
            return new ClueGivenEvent({
                ...baseEvent,
                gameNumber: BigInt(decodedEvent.data.game_number || 0),
                player: clueGivenSS58,
                attemptNumber: decodedEvent.data.attempt || 0,
                guess: decodedEvent.data.guess || 0,
                result: decodedEvent.data.clue || ''
            })
        
        case 'game_over':
            const gameOverPlayer = decodedEvent.data.player || ''
            const gameOverSS58 = convertToSS58(gameOverPlayer)
            return new GameOverEvent({
                ...baseEvent,
                gameNumber: BigInt(decodedEvent.data.game_number || 0),
                player: gameOverSS58,
                win: decodedEvent.data.win || false,
                target: decodedEvent.data.target || 0
            })
        
        case 'game_cancelled':
            const cancelledPlayer = decodedEvent.data.player || ''
            const cancelledSS58 = convertToSS58(cancelledPlayer)
            return new GameCancelledEvent({
                ...baseEvent,
                gameNumber: BigInt(decodedEvent.data.game_number || 0),
                player: cancelledSS58
            })
        
        case 'max_attempts_updated':
            const maxAttemptsPlayer = decodedEvent.data.player || ''
            const maxAttemptsSS58 = convertToSS58(maxAttemptsPlayer)
            return new MaxAttemptsUpdatedEvent({
                ...baseEvent,
                gameNumber: BigInt(decodedEvent.data.game_number || 0),
                player: maxAttemptsSS58,
                maxAttempts: decodedEvent.data.max_attempts || 0
            })
        
        case 'message_queued':
        case 'message_processed':
        case 'role_granted':
        case 'role_revoked':
        case 'meta_transaction_decoded':
            // These events are not game-related, skip them silently
            return null
        
        default:
            Logger.warn(`Unknown event type: ${decodedEvent.eventType}`)
            return null
    }
}

// Supprimé : getTransferEvents - focus sur les jeux uniquement

async function getContractEvents(ctx: ProcessorContext<Store>): Promise<TypedContractEvent[]> {
    let contractEvents: TypedContractEvent[] = []
    const processedEventData = new Set<string>() // To avoid duplicates based on decoded content
    const targetContracts = Logger.getTargetContracts()
    
    for (let block of ctx.blocks) {
        let hasTargetEvents = false
        let totalEvents = 0
        let targetContractEvents = 0
        
        for (let eventIndex = 0; eventIndex < block.events.length; eventIndex++) {
            const event = block.events[eventIndex]
            if (event.name === 'Revive.ContractEmitted') {
                totalEvents++
                try {
                    // Extract contract address and event data
                    const contractAddress = event.args.contract
                    const eventData = event.args.data
                    const topics = event.args.topics || []
                    
                    // Check if it's a target contract
                    const isTargetContract = targetContracts.includes(contractAddress.toLowerCase())
                    
                    if (!isTargetContract) {
                        continue
                    }
                    
                    hasTargetEvents = true
                    targetContractEvents++
                    
                    // Decode event with unified Ink! v6 decoder
                    const decodedEvent = await decoder.decodeEvent(eventData, topics, contractAddress, block.header.height)
                    
                    // Debug: log what we get from decoder
                    if (!decodedEvent) {
                        Logger.debug(`No decoded event for contract ${contractAddress} at block ${block.header.height}`)
                        continue
                    }
                    
                    // Debug: check if eventType exists
                    if (!decodedEvent.eventType) {
                        Logger.warn(`Decoded event but no eventType. Decoded: ${JSON.stringify(decodedEvent)}`)
                        Logger.debug(`  EventData: ${eventData}`)
                        Logger.debug(`  Topics: ${JSON.stringify(topics)}`)
                        continue
                    }
                    
                    if (decodedEvent) {
                        // Skip non-game events silently
                        if (['message_queued', 'message_processed', 'role_granted', 'role_revoked', 'meta_transaction_decoded'].includes(decodedEvent.eventType)) {
                            continue
                        }
                        // Compact log for game events
                        const gameNum = decodedEvent.data.game_number ? ` Game #${decodedEvent.data.game_number}` : ''
                        // Vérifier que eventType existe avant d'appeler toUpperCase
                        const eventTypeUpper = decodedEvent.eventType ? decodedEvent.eventType.toUpperCase() : 'UNKNOWN'
                        Logger.contractEvent(contractAddress, eventTypeUpper, `Block ${block.header.height}${gameNum}`, decodedEvent.data)
                        
                        // Create unique key based on decoded data
                        const eventDataKey = `${decodedEvent.eventType}-${decodedEvent.data.game_number || ''}-${decodedEvent.data.attempt || ''}-${block.header.height}-${eventIndex}`
                        
                        // Check if this event has already been processed
                        if (processedEventData.has(eventDataKey)) {
                            continue
                        }
                        processedEventData.add(eventDataKey)
                        
                        // Create typed event according to its type
                        const contractAddressSS58 = convertToSS58(contractAddress)
                        const eventId = `${block.header.height}-${eventIndex}-${contractAddressSS58}`
                        const blockTimestamp = new Date(Number((block.header as any).timestamp ?? (block as any).timestamp))
                        const typedEvent = createTypedEvent(
                            eventId,
                            block.header.height,
                            blockTimestamp,
                            event.extrinsic?.id,
                            contractAddress,
                            decodedEvent
                        )
			if (typedEvent) {
                            contractEvents.push(typedEvent)
                        }
                    } else {
                        // Only log undecodable events in debug mode
                        Logger.debug(`Undecodable event from ${contractAddress}@${block.header.height}`)
                    }
                } catch (error) {
                    Logger.error(`Error processing Revive.ContractEmitted at block ${block.header.height}`, error)
                }
            }
            else if (event.name === 'Revive.ContractInstantiated') {
                try {
                    const contractAddress = event.args.contract
                    const deployer = event.args.deployer
                    
                    // Log only if it's a target contract
                    if (targetContracts.includes(contractAddress.toLowerCase())) {
                        Logger.contractEvent(contractAddress, 'CONTRACT_INSTANTIATED', `Block ${block.header.height}`, { deployer })
                    }
                } catch (error) {
                    Logger.error(`Error processing Revive.ContractInstantiated at block ${block.header.height}`, error)
                }
            }
        }
        
        // Only log block processing in debug mode or if there are target events
        if (hasTargetEvents || Logger.getLogLevel() === 'debug') {
            Logger.blockProcessing(block.header.height, totalEvents, hasTargetEvents)
        }
            }
            
            return contractEvents
        }

// Removed: createAccounts and createTransfers - focus on games only

async function createContracts(ctx: ProcessorContext<Store>, contractEvents: TypedContractEvent[]): Promise<Map<string, Contract>> {
    let contracts = new Map<string, Contract>()
    
    // Batch fetch existing contracts
    let existingContracts = await ctx.store.findBy(Contract, {id: In(contractEvents.map(e => e.contractAddress))})
    for (let contract of existingContracts) {
        contracts.set(contract.id, contract)
    }

    // Create new contracts for events
    for (let event of contractEvents) {
        if (!contracts.has(event.contractAddress)) {
            // For new typed events, we can no longer extract the deployer
            // Use a default value
            let deployer = 'unknown'
            
            contracts.set(event.contractAddress, new Contract({
                id: event.contractAddress,
                instantiatedAt: event.timestamp,
                instantiatedAtBlock: event.blockNumber,
                instantiatedBy: deployer
            }))
            
            Logger.debug(`Contract created: ${event.contractAddress}`, { deployer, block: event.blockNumber })
        }
    }

    return contracts
}

// This function is no longer needed as we save typed events directly

// ✅ NEW FUNCTION: Process games with GameManager
function processGamesWithManager(contractEvents: TypedContractEvent[], contracts: Map<string, Contract>, gameManager: GameManager): Game[] {
    let games: Game[] = []
    
    for (let event of contractEvents) {
        try {
        const contract = contracts.get(event.contractAddress)
        if (contract) {
                // Convert typed event to GameEvent format
                let gameEvent: GameEvent | null = null
                
                if (event instanceof GameStartedEvent) {
                    gameEvent = {
                id: event.id,
                blockNumber: event.blockNumber,
                timestamp: event.timestamp,
                        contractAddress: event.contractAddress,
                        eventType: 'new_game',
                        gameNumber: event.gameNumber.toString(),
                player: event.player,
                minNumber: event.minNumber,
                        maxNumber: event.maxNumber
                    }
                } else if (event instanceof GuessSubmittedEvent) {
                    gameEvent = {
                        id: event.id,
                        blockNumber: event.blockNumber,
                        timestamp: event.timestamp,
                        contractAddress: event.contractAddress,
                        eventType: 'guess_made',
                        gameNumber: event.gameNumber.toString(),
                        attemptNumber: event.attemptNumber,
                        guess: event.guess
                    }
                } else if (event instanceof ClueGivenEvent) {
                    gameEvent = {
                        id: event.id,
                        blockNumber: event.blockNumber,
                        timestamp: event.timestamp,
                contractAddress: event.contractAddress,
                        eventType: 'clue_given',
                        gameNumber: event.gameNumber.toString(),
                        attemptNumber: event.attemptNumber,
                        guess: event.guess,
                        result: event.result
                    }
                } else if (event instanceof GameOverEvent) {
                    gameEvent = {
                        id: event.id,
                        blockNumber: event.blockNumber,
                        timestamp: event.timestamp,
                        contractAddress: event.contractAddress,
                        eventType: 'game_over',
                        gameNumber: event.gameNumber.toString(),
                        player: event.player,
                        win: event.win,
                        target: event.target
                    }
                } else if (event instanceof GameCancelledEvent) {
                    gameEvent = {
                        id: event.id,
                        blockNumber: event.blockNumber,
                        timestamp: event.timestamp,
                        contractAddress: event.contractAddress,
                        eventType: 'game_cancelled',
                        gameNumber: event.gameNumber.toString(),
                        player: event.player
                    }
                } else if (event instanceof MaxAttemptsUpdatedEvent) {
                    gameEvent = {
                        id: event.id,
                        blockNumber: event.blockNumber,
                        timestamp: event.timestamp,
                        contractAddress: event.contractAddress,
                        eventType: 'max_attempts_updated',
                        gameNumber: event.gameNumber.toString(),
                        player: event.player,
                        maxAttempts: event.maxAttempts
                    }
                }
                
                if (gameEvent) {
                    // Process event with GameManager
                    const game = gameManager.processGameEvent(gameEvent, contract)
                    if (game) {
                        games.push(game)
                    }
                }
            }
        } catch (error) {
            Logger.error('Error processing game event:', error)
        }
    }
    
    return games
}

// Old function removed - replaced by processGamesWithManager
