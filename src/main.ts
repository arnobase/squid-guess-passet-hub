import {TypeormDatabase, Store} from '@subsquid/typeorm-store'
import {In} from 'typeorm'
import { encodeAddress } from '@polkadot/util-crypto'

import {processor, ProcessorContext} from './processor'
import {Contract, Game, Player, GameStartedEvent, GuessSubmittedEvent, ClueGivenEvent, GameOverEvent, GameCancelledEvent, MaxAttemptsUpdatedEvent, Token, MintEvent, BurntEvent, TransferEvent, ApprovalEvent, ApprovalForAllEvent} from './model'
import {events} from './types'
// Use @luckyweb3/subsquid-ink-v6-decoder package (STATIC mode)
import { createDecoder, DecoderMode } from '@luckyweb3/subsquid-ink-v6-decoder'
// Register static decoders for this project
import './decoders/static-registry'
import {GameManager, GameEvent} from './services/game-manager'
import { Logger } from './utils/logger'
import { RPC_URL, GUESS_THE_NUMBER_CONTRACTS, ERC721_CONTRACTS } from './config'

Logger.info('🚀 Starting Squid Guess Indexer...')
Logger.info(`🔗 RPC Endpoint: ${RPC_URL}`)
Logger.info('📊 Indexing Revive pallet events and game events')

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
            Logger.warn(`Unknown address format:`, addressInput)
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

// ✅ NEW: Multi-contract decoder with automatic routing
import { MultiContractDecoder } from './decoders/multi-contract-decoder'
const decoder = new MultiContractDecoder()

// ✅ NEW: Contract handlers registry for multi-contract support
import { ContractHandlerRegistry } from './handlers/contract-handler-registry'
import { GuessTheNumberHandler } from './handlers/guess-the-number-handler'
import { ERC721Handler } from './handlers/erc721-handler'

// Créer le registry et enregistrer les handlers
const handlerRegistry = new ContractHandlerRegistry()

// Enregistrer le handler pour guess_the_number
handlerRegistry.register(
    new GuessTheNumberHandler(
        GUESS_THE_NUMBER_CONTRACTS,
        persistentGameManager
    )
)

// Enregistrer le handler pour ERC721
handlerRegistry.register(
    new ERC721Handler(ERC721_CONTRACTS)
)

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
            // Événements de jeu
            if (evt instanceof GameStartedEvent) return `NEW_GAME#${evt.gameNumber}@${evt.blockNumber}`
            if (evt instanceof GuessSubmittedEvent) return `GUESS_MADE#${evt.gameNumber}@${evt.blockNumber}`
            if (evt instanceof ClueGivenEvent) return `CLUE_GIVEN#${evt.gameNumber}@${evt.blockNumber}`
            if (evt instanceof GameOverEvent) return `GAME_OVER#${evt.gameNumber}@${evt.blockNumber}`
            if (evt instanceof GameCancelledEvent) return `GAME_CANCELLED#${evt.gameNumber}@${evt.blockNumber}`
            if (evt instanceof MaxAttemptsUpdatedEvent) return `MAX_ATTEMPTS#${evt.gameNumber}@${evt.blockNumber}`
            // Événements ERC721
            if (evt instanceof MintEvent) return `MINT#${evt.tokenId}@${evt.blockNumber}`
            if (evt instanceof BurntEvent) return `BURNT#${evt.tokenId}@${evt.blockNumber}`
            if (evt instanceof TransferEvent) return `TRANSFER#${evt.tokenId}@${evt.blockNumber}`
            if (evt instanceof ApprovalEvent) return `APPROVAL#${evt.tokenId}@${evt.blockNumber}`
            if (evt instanceof ApprovalForAllEvent) return `APPROVAL_FOR_ALL@${evt.blockNumber}`
            return `UNKNOWN@${(evt as any).blockNumber || '?'}`
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
    
    // ✅ NEW: Séparer les événements par type de contrat
    const gameEvents = contractEvents.filter(e => 
        e instanceof GameStartedEvent || 
        e instanceof GuessSubmittedEvent || 
        e instanceof ClueGivenEvent ||
        e instanceof GameOverEvent ||
        e instanceof GameCancelledEvent ||
        e instanceof MaxAttemptsUpdatedEvent
    )
    const erc721Events = contractEvents.filter(e =>
        e instanceof MintEvent ||
        e instanceof BurntEvent ||
        e instanceof TransferEvent ||
        e instanceof ApprovalEvent ||
        e instanceof ApprovalForAllEvent
    )
    
    // ✅ FIX: Load existing games from DB into GameManager before processing events
    if (gameEvents.length > 0) {
        const gameKeys = gameEvents.map(event => {
            const normalizedContract = event.contractAddress.startsWith('0x') 
                ? event.contractAddress 
                : `0x${event.contractAddress}`
            const gameEvent = event as any
            if (gameEvent.gameNumber !== undefined) {
                return `${normalizedContract}-${gameEvent.gameNumber.toString()}`
            }
            return null
        }).filter((key): key is string => key !== null)
        
        if (gameKeys.length > 0) {
            const existingGames = await ctx.store.findBy(Game, {id: In(gameKeys)})
            existingGames.forEach(game => {
                gameManager.loadGame(game)
            })
        }
    }
    
    // ✅ NEW: Créer/récupérer les Players pour tous les événements
    const allPlayerAddresses: string[] = []
    let firstTimestamp = new Date()
    let firstBlockNumber = 0
    
    // Collecter toutes les adresses de joueurs des événements
    for (const event of gameEvents) {
        if (event instanceof GameStartedEvent || event instanceof GuessSubmittedEvent || 
            event instanceof ClueGivenEvent || event instanceof GameOverEvent ||
            event instanceof GameCancelledEvent || event instanceof MaxAttemptsUpdatedEvent) {
            allPlayerAddresses.push(event.player)
            if (!firstBlockNumber || event.blockNumber < firstBlockNumber) {
                firstTimestamp = event.timestamp
                firstBlockNumber = event.blockNumber
            }
        }
    }
    
    // Collecter les adresses des événements ERC721 (owners)
    for (const event of erc721Events) {
        if (event instanceof TransferEvent) {
            if (event.from) allPlayerAddresses.push(event.from)
            if (event.to) allPlayerAddresses.push(event.to)
        }
        if (!firstBlockNumber || event.blockNumber < firstBlockNumber) {
            firstTimestamp = event.timestamp
            firstBlockNumber = event.blockNumber
        }
    }
    
    // Créer/récupérer les Players
    const players = await getOrCreatePlayers(ctx, allPlayerAddresses, firstTimestamp, firstBlockNumber)
    
    // ✅ FIX: Traiter les événements de jeu avec GameManager (comportement existant)
    let games: Game[] = []
    if (gameEvents.length > 0) {
        games = processGamesWithManager(gameEvents, contracts, players, gameManager)
    }
    
    // ✅ NEW: Traiter les événements ERC721 avec le handler
    let tokens: Token[] = []
    if (erc721Events.length > 0) {
        const handler = handlerRegistry.getHandler(erc721Events[0].contractAddress) as any
        if (handler && handler.contractName === 'erc721') {
            tokens = handler.processEvents(erc721Events, contracts, players) as Token[]
        }
    }

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
                // ✅ FIX: Update player if new game has player and existing is unknown
                if (game.playerAddress && game.playerAddress !== 'unknown' && (existingGame.playerAddress === 'unknown' || !existingGame.playerAddress)) {
                    existingGame.player = game.player
                    existingGame.playerAddress = game.playerAddress
                }
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
        
        // ✅ IMPORTANT: Sauvegarder les Players (sans stats complètes) AVANT les Games et Tokens (contrainte FK)
        // On les sauvegarde d'abord avec des valeurs par défaut, puis on mettra à jour les stats après
        if (players.size > 0) {
            // Sauvegarder les players avec les valeurs de base (sans stats calculées)
            await ctx.store.upsert(Array.from(players.values()))
        }
        
        // Save typed events by type
        const gameStartedEvents = contractEvents.filter(e => e instanceof GameStartedEvent)
        const guessSubmittedEvents = contractEvents.filter(e => e instanceof GuessSubmittedEvent)
        const clueGivenEvents = contractEvents.filter(e => e instanceof ClueGivenEvent)
        const gameOverEvents = contractEvents.filter(e => e instanceof GameOverEvent)
        const gameCancelledEvents = contractEvents.filter(e => e instanceof GameCancelledEvent)
        const maxAttemptsUpdatedEvents = contractEvents.filter(e => e instanceof MaxAttemptsUpdatedEvent)
        
        // Événements ERC721
        const mintEvents = contractEvents.filter(e => e instanceof MintEvent)
        const burntEvents = contractEvents.filter(e => e instanceof BurntEvent)
        const transferEvents = contractEvents.filter(e => e instanceof TransferEvent)
        const approvalEvents = contractEvents.filter(e => e instanceof ApprovalEvent)
        const approvalForAllEvents = contractEvents.filter(e => e instanceof ApprovalForAllEvent)
        
        // Sauvegarder les événements de jeu
        if (gameStartedEvents.length > 0) await ctx.store.insert(gameStartedEvents)
        if (guessSubmittedEvents.length > 0) await ctx.store.insert(guessSubmittedEvents)
        if (clueGivenEvents.length > 0) await ctx.store.insert(clueGivenEvents)
        if (gameOverEvents.length > 0) await ctx.store.insert(gameOverEvents)
        if (gameCancelledEvents.length > 0) await ctx.store.insert(gameCancelledEvents)
        if (maxAttemptsUpdatedEvents.length > 0) await ctx.store.insert(maxAttemptsUpdatedEvents)
        
        // Sauvegarder les événements ERC721
        if (mintEvents.length > 0) await ctx.store.insert(mintEvents)
        if (burntEvents.length > 0) await ctx.store.insert(burntEvents)
        if (transferEvents.length > 0) await ctx.store.insert(transferEvents)
        if (approvalEvents.length > 0) await ctx.store.insert(approvalEvents)
        if (approvalForAllEvents.length > 0) await ctx.store.insert(approvalForAllEvents)
        
        // Sauvegarder les entités (Games et Tokens)
        if (deduplicatedGames.length > 0) await ctx.store.upsert(deduplicatedGames)
        if (tokens.length > 0) {
            // Charger les tokens existants pour fusion
            const tokenKeys = tokens.map(t => t.id)
            const existingTokens = await ctx.store.findBy(Token, {id: In(tokenKeys)})
            const existingTokensMap = new Map<string, Token>()
            existingTokens.forEach(token => {
                existingTokensMap.set(token.id, token)
            })
            
            // Fusionner les tokens
            const mergedTokens = new Map<string, Token>()
            existingTokensMap.forEach((token, id) => {
                mergedTokens.set(id, token)
            })
            
            tokens.forEach(token => {
                const existingToken = mergedTokens.get(token.id)
                if (existingToken) {
                    // Mettre à jour le token existant
                    // Toujours mettre à jour le propriétaire si on a une valeur valide
                    if (token.ownerAddress && token.ownerAddress !== 'unknown') {
                        existingToken.owner = token.owner
                        existingToken.ownerAddress = token.ownerAddress
                    } else if (token.ownerAddress === 'unknown' && existingToken.ownerAddress === 'unknown') {
                        // Si les deux sont 'unknown', on garde l'existant (pas de changement)
                    }
                    // Mettre à jour maxAttempts si défini (venant d'un MintEvent)
                    if (token.maxAttempts !== null && token.maxAttempts !== undefined) {
                        existingToken.maxAttempts = token.maxAttempts
                    }
                    // Mettre à jour les dates de mint si meilleures (plus anciennes)
                    if (token.mintedAt && (!existingToken.mintedAt || token.mintedAt < existingToken.mintedAt)) {
                        existingToken.mintedAt = token.mintedAt
                        existingToken.mintedAtBlock = token.mintedAtBlock
                    }
                    // Mettre à jour le statut burnt
                    if (token.burnt !== undefined) existingToken.burnt = token.burnt
                    if (token.burntAt) existingToken.burntAt = token.burntAt
                    if (token.burntAtBlock) existingToken.burntAtBlock = token.burntAtBlock
                } else {
                    mergedTokens.set(token.id, token)
                }
            })
            
            await ctx.store.upsert(Array.from(mergedTokens.values()))
        }
        
        // ✅ NEW: Mettre à jour les stats des Players APRÈS avoir sauvegardé les tokens
        // Maintenant tous les tokens (existants + nouveaux) sont en DB
        if (players.size > 0) {
            const playerIds = Array.from(players.keys())
            
            // Recharger les players depuis la DB (ils ont été sauvegardés plus tôt)
            const playersFromDb = await ctx.store.findBy(Player, {id: In(playerIds)})
            const playersMap = new Map<string, Player>()
            playersFromDb.forEach(p => playersMap.set(p.id, p))
            
            // Pour chaque player, recalculer les stats à partir de TOUS les tokens et games en DB
            for (const playerId of playerIds) {
                const player = playersMap.get(playerId) || players.get(playerId)
                if (!player) continue
                
                const playerIdLower = playerId.toLowerCase()
                
                // Charger tous les games du player depuis la DB
                const allGamesFromDb = await ctx.store.find(Game, {})
                const playerGames = allGamesFromDb.filter(g => 
                    g.playerAddress.toLowerCase() === playerIdLower
                )
                player.totalGames = playerGames.length
                player.totalWins = playerGames.filter(g => g.won === true).length
                
                // Charger tous les tokens du player depuis la DB (maintenant ils sont tous sauvegardés)
                const allTokensFromDb = await ctx.store.find(Token, {})
                const playerTokens = allTokensFromDb.filter(t => 
                    t.ownerAddress.toLowerCase() === playerIdLower && !t.burnt
                )
                player.totalTokens = playerTokens.length
                
                // Calculer maxMaxAttempts à partir de TOUS les tokens
                let currentMax: number | null = null
                for (const token of playerTokens) {
                    if (token.maxAttempts !== null && token.maxAttempts !== undefined) {
                        const maxAttempts = Number(token.maxAttempts)
                        if (currentMax === null || maxAttempts > currentMax) {
                            currentMax = maxAttempts
                        }
                    }
                }
                player.maxMaxAttempts = currentMax
            }
            
            // Sauvegarder les players avec les stats mises à jour
            await ctx.store.upsert(Array.from(playersMap.values()))
        }
    
        // Log only if there are events or in debug mode
        if (contractEvents.length > 0 || Logger.getLogLevel() === 'debug') {
            Logger.info(`✅ Processed: ${contractEvents.length} event(s), ${deduplicatedGames.length} game(s), ${players.size} player(s)`)
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
    | MintEvent
    | BurntEvent
    | TransferEvent
    | ApprovalEvent
    | ApprovalForAllEvent

// Function to create typed events based on decoded data
// ✅ NEW: Utilise le système de handlers pour router automatiquement
function createTypedEvent(
    id: string,
    blockNumber: number,
    timestamp: Date,
    extrinsicHash: string | undefined,
    contractAddress: string,
    decodedEvent: any
): TypedContractEvent | null {
    // Trouver le handler pour ce contrat
    const handler = handlerRegistry.getHandler(contractAddress)
    
    if (!handler) {
        Logger.debug(`No handler found for contract: ${contractAddress}`)
        return null
    }
    
    // Vérifier si le handler gère ce type d'événement
    if (!handler.handlesEventType(decodedEvent.eventType)) {
        Logger.debug(`Handler ${handler.contractName} does not handle event type: ${decodedEvent.eventType}`)
        return null
    }
    
    // Déléguer au handler
    return handler.createTypedEvent(
        id,
        blockNumber,
        timestamp,
        extrinsicHash,
        contractAddress,
        decodedEvent
    ) as TypedContractEvent | null
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
                    
                    // Afficher les informations brutes de l'événement
                    const signature = topics.length > 0 ? topics[0] : 'N/A'
                    Logger.info(`📋 [Event] Block ${block.header.height} | Signature: ${signature.slice(0, 18)}...`)
                    Logger.info(`   Data (hex): ${eventData.slice(0, 80)}${eventData.length > 80 ? '...' : ''}`)
                    Logger.info(`   Topics (${topics.length}): ${topics.map((t: string, i: number) => `[${i}]: ${t.slice(0, 20)}...`).join(', ')}`)
                    
                    // Decode event with unified Ink! v6 decoder
                    const decodedEvent = await decoder.decodeEvent(eventData, topics, contractAddress, block.header.height)
                    
                    if (!decodedEvent) {
                        Logger.warn(`   ⚠️  Could not decode event`)
                        continue
                    }
                    
                    if (!decodedEvent.eventType) {
                        Logger.warn(`   ⚠️  Decoded event but no eventType`)
                        continue
                    }
                    
                    Logger.info(`   ✅ Decoded: ${decodedEvent.eventType}`)
                    
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
                        const normalizedContract = contractAddress.startsWith('0x')
                            ? contractAddress
                            : `0x${contractAddress}`
                        const eventId = `${block.header.height}-${eventIndex}-${normalizedContract}`
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

/**
 * Creates or updates Player entities from events
 */
async function getOrCreatePlayers(ctx: ProcessorContext<Store>, addresses: string[], timestamp: Date, blockNumber: number): Promise<Map<string, Player>> {
    const players = new Map<string, Player>()
    
    // Normalize addresses
    const normalizedAddresses = addresses.map(addr => addr.toLowerCase())
    const uniqueAddresses = [...new Set(normalizedAddresses)].filter(a => a && a !== 'unknown')
    
    if (uniqueAddresses.length === 0) return players
    
    // Fetch existing players
    const existingPlayers = await ctx.store.findBy(Player, {id: In(uniqueAddresses)})
    for (const player of existingPlayers) {
        players.set(player.id, player)
    }
    
    // Create new players for addresses that don't exist
    for (const address of uniqueAddresses) {
        if (!players.has(address)) {
            const player = new Player({
                id: address,
                totalGames: 0,
                totalWins: 0,
                totalTokens: 0,
                maxMaxAttempts: null,
                firstSeenAt: timestamp,
                firstSeenAtBlock: blockNumber,
                lastActiveAt: timestamp,
                lastActiveAtBlock: blockNumber
            })
            players.set(address, player)
        } else {
            // Update last active time
            const player = players.get(address)!
            player.lastActiveAt = timestamp
            player.lastActiveAtBlock = blockNumber
        }
    }
    
    return players
}

/**
 * Updates player stats based on games and tokens
 */
function updatePlayerStats(player: Player, games: Game[], tokens: Token[]): void {
    // Count games for this player
    const playerGames = games.filter(g => g.playerAddress.toLowerCase() === player.id)
    player.totalGames = playerGames.length
    player.totalWins = playerGames.filter(g => g.won === true).length
    
    // Count tokens and find maxMaxAttempts
    const playerTokens = tokens.filter(t => t.ownerAddress.toLowerCase() === player.id && !t.burnt)
    player.totalTokens = playerTokens.length
    
    // Calculate maxMaxAttempts from tokens
    let maxMax: number | null = null
    for (const token of playerTokens) {
        if (token.maxAttempts !== null && token.maxAttempts !== undefined) {
            const maxAttempts = Number(token.maxAttempts)
            if (maxMax === null || maxAttempts > maxMax) {
                maxMax = maxAttempts
            }
        }
    }
    player.maxMaxAttempts = maxMax
}

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

// Process games with GameManager
function processGamesWithManager(contractEvents: TypedContractEvent[], contracts: Map<string, Contract>, players: Map<string, Player>, gameManager: GameManager): Game[] {
    let games: Game[] = []
    
    for (let event of contractEvents) {
        try {
        const contract = contracts.get(event.contractAddress)
        if (contract) {
                // Convert typed event to GameEvent format
                let gameEvent: GameEvent | null = null
                let playerAddress: string = 'unknown'
                
                if (event instanceof GameStartedEvent) {
                    playerAddress = event.player
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
                    playerAddress = event.player
                    gameEvent = {
                        id: event.id,
                        blockNumber: event.blockNumber,
                        timestamp: event.timestamp,
                        contractAddress: event.contractAddress,
                        eventType: 'guess_made',
                        gameNumber: event.gameNumber.toString(),
                        player: event.player,
                        attemptNumber: event.attemptNumber,
                        guess: event.guess
                    }
                } else if (event instanceof ClueGivenEvent) {
                    playerAddress = event.player
                    gameEvent = {
                        id: event.id,
                        blockNumber: event.blockNumber,
                        timestamp: event.timestamp,
                contractAddress: event.contractAddress,
                        eventType: 'clue_given',
                        gameNumber: event.gameNumber.toString(),
                        player: event.player,
                        attemptNumber: event.attemptNumber,
                        guess: event.guess,
                        result: event.result
                    }
                } else if (event instanceof GameOverEvent) {
                    playerAddress = event.player
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
                    playerAddress = event.player
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
                    playerAddress = event.player
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
                    // Get or create player entity
                    const playerEntity = players.get(playerAddress.toLowerCase())
                    if (playerEntity) {
                        // Process event with GameManager
                        const game = gameManager.processGameEvent(gameEvent, contract, playerEntity)
                        if (game) {
                            games.push(game)
                        }
                    } else {
                        Logger.warn(`Player not found for address: ${playerAddress}`)
                    }
                }
            }
        } catch (error) {
            Logger.error('Error processing game event:', error)
        }
    }
    
    return games
}

