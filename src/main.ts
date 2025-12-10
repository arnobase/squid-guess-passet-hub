import {TypeormDatabase, Store} from '@subsquid/typeorm-store'
import {In} from 'typeorm'
import * as ss58 from '@subsquid/ss58'
import assert from 'assert'
import { encodeAddress } from '@polkadot/util-crypto'

import {processor, ProcessorContext} from './processor'
import {Contract, Game, GameStartedEvent, GuessSubmittedEvent, ClueGivenEvent} from './model'
import {events} from './types'
import {createInkDecoder} from './decoders'
import {GameManager, GameEvent} from './services/game-manager'
import { Logger } from './utils/logger'

Logger.info('🚀 Starting Passet Hub Indexer...')
Logger.info(`🔗 RPC Endpoint: ${process.env.RPC_PASSET_HUB_WS || 'wss://passet-hub-paseo.ibp.network'}`)
Logger.info('📊 Indexing Revive pallet events and game events')

/**
 * Convertit une adresse (objet ou hexadécimale) en format SS58
 * Pour les contrats Revive (EVM), on convertit en format SS58 Substrate
 */
export function convertToSS58(addressInput: any): string {
    try {
        let hexAddress: string
        
        // Si c'est déjà une chaîne hexadécimale
        if (typeof addressInput === 'string') {
            hexAddress = addressInput
        }
        // Si c'est un objet avec un champ field (format du décodeur générique)
        else if (addressInput && typeof addressInput === 'object' && addressInput.field && Array.isArray(addressInput.field)) {
            // Convertir le tableau de bytes en hexadécimal
            const hexBytes = addressInput.field.map((byte: number) => byte.toString(16).padStart(2, '0')).join('')
            // Padder à 32 bytes (64 caractères hex) pour Substrate
            const paddedHex = hexBytes.padStart(64, '0')
            hexAddress = `0x${paddedHex}`
        }
        else {
            console.warn(`⚠️ Unknown address format:`, addressInput)
            return String(addressInput)
        }

        // Vérifier la longueur de l'adresse
        const cleanHex = hexAddress.startsWith('0x') ? hexAddress.slice(2) : hexAddress
        
        if (cleanHex.length === 40) {
            // Adresse EVM (20 bytes) - convertir en SS58 avec padding
            Logger.debug(`Converting EVM address: ${hexAddress} (20 bytes)`)
            const paddedHex = cleanHex.padStart(64, '0') // Padder à 32 bytes
            const ss58Address = encodeAddress(`0x${paddedHex}`, 42)
            Logger.debug(`SS58 result: ${ss58Address}`)
            return ss58Address
        } else if (cleanHex.length === 64) {
            // Adresse Substrate (32 bytes) - conversion directe
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

// ✅ CORRECTION: GameManager persistant entre les batches
let persistentGameManager = new GameManager()

// ✅ NOUVEAU: Décodeur générique Ink! v6
const inkDecoder = createInkDecoder({
    metadataPath: './guess_the_number.json',
    contractAddress: '0xe75cbd47620dbb2053cf2a98d06840f06baaf141',
    eventTypeMapping: {
        'NewGame': 'game_started',
        'GuessMade': 'guess_submitted',
        'ClueGiven': 'clue_given'
    },
    debugMode: true
})

processor.run(new TypeormDatabase({supportHotBlocks: true}), async (ctx: ProcessorContext<Store>) => {
    Logger.debug(`Processing ${ctx.blocks.length} blocks`)
    
    // Utiliser le GameManager persistant
    const gameManager = persistentGameManager
    
    // Extract events from blocks
    let contractEvents: TypedContractEvent[] = getContractEvents(ctx)

    // Log seulement s'il y a des événements ou en mode debug
    if (contractEvents.length > 0 || Logger.getLogLevel() === 'debug') {
        Logger.info(`Found ${contractEvents.length} contract events`)
    }

    // Process and store data
    let contracts: Map<string, Contract> = await createContracts(ctx, contractEvents)
    
    // Assigner les contrats aux événements
    for (let event of contractEvents) {
        const contract = contracts.get(event.contractAddress)
        if (contract) {
            event.contract = contract
        }
    }
    
        // ✅ CORRECTION: Utiliser le GameManager pour une gestion cohérente des jeux
        let games: Game[] = processGamesWithManager(contractEvents, contracts, gameManager)

        // ✅ CORRECTION: Récupérer les jeux existants de la base et les fusionner
        const existingGames = await ctx.store.findBy(Game, {id: In(games.map(g => g.id))})
        const existingGamesMap = new Map<string, Game>()
        existingGames.forEach(game => {
            existingGamesMap.set(game.id, game)
        })

        // Fusionner les jeux existants avec les nouveaux
        const mergedGames = new Map<string, Game>()
        
        // D'abord, ajouter les jeux existants
        existingGamesMap.forEach((game, id) => {
            mergedGames.set(id, game)
        })
        
        // Ensuite, mettre à jour avec les nouveaux événements
        games.forEach(game => {
            const existingGame = mergedGames.get(game.id)
            if (existingGame) {
                // ✅ CORRECTION: Mettre à jour TOUS les champs du jeu existant
                existingGame.attempt = game.attempt
                existingGame.lastGuess = game.lastGuess
                existingGame.lastClue = game.lastClue
                // ✅ CORRECTION: Fusionner l'historique des tentatives
                if (game.guessHistory && game.guessHistory.length > 0) {
                    if (!existingGame.guessHistory) {
                        existingGame.guessHistory = []
                    }
                    // Ajouter les nouvelles tentatives à l'historique existant
                    game.guessHistory.forEach(newGuess => {
                        const existingGuess = existingGame.guessHistory.find(g => g.attemptNumber === newGuess.attemptNumber)
                        if (existingGuess) {
                            // Mettre à jour la tentative existante
                            existingGuess.guess = newGuess.guess
                            existingGuess.result = newGuess.result
                        } else {
                            // Ajouter une nouvelle tentative
                            existingGame.guessHistory.push(newGuess)
                        }
                    })
                }
            } else {
                // Ajouter le nouveau jeu
                mergedGames.set(game.id, game)
            }
        })
        
        const deduplicatedGames = Array.from(mergedGames.values())

        // Batch database operations
        await ctx.store.upsert([...contracts.values()])
        
        // Sauvegarder les événements typés par type
        const gameStartedEvents = contractEvents.filter(e => e instanceof GameStartedEvent)
        const guessSubmittedEvents = contractEvents.filter(e => e instanceof GuessSubmittedEvent)
        const clueGivenEvents = contractEvents.filter(e => e instanceof ClueGivenEvent)
        
        if (gameStartedEvents.length > 0) await ctx.store.insert(gameStartedEvents)
        if (guessSubmittedEvents.length > 0) await ctx.store.insert(guessSubmittedEvents)
        if (clueGivenEvents.length > 0) await ctx.store.insert(clueGivenEvents)
        
        await ctx.store.upsert(deduplicatedGames)
    
        // Log seulement s'il y a des événements ou en mode debug
        if (contractEvents.length > 0 || Logger.getLogLevel() === 'debug') {
            Logger.info(`Processed ${contractEvents.length} contract events, ${deduplicatedGames.length} games`)
        }
})

// Supprimé : TransferEvent - focus sur les jeux uniquement

// Union type for all event types
type TypedContractEvent = GameStartedEvent | GuessSubmittedEvent | ClueGivenEvent

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
        case 'game_started':
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
        
        case 'guess_submitted':
            return new GuessSubmittedEvent({
                ...baseEvent,
                gameNumber: BigInt(decodedEvent.data.game_number || 0),
                attemptNumber: decodedEvent.data.attempt || 0,
                guess: decodedEvent.data.guess || 0
            })
        
        case 'clue_given':
            return new ClueGivenEvent({
                ...baseEvent,
                gameNumber: BigInt(decodedEvent.data.game_number || 0),
                attemptNumber: decodedEvent.data.attempt || 0,
                guess: decodedEvent.data.guess || 0,
                result: decodedEvent.data.clue || ''
            })
        
        default:
            Logger.warn(`Unknown event type: ${decodedEvent.eventType}`)
            return null
    }
}

// Supprimé : getTransferEvents - focus sur les jeux uniquement

function getContractEvents(ctx: ProcessorContext<Store>): TypedContractEvent[] {
    let contractEvents: TypedContractEvent[] = []
    const processedEventData = new Set<string>() // Pour éviter les doublons basés sur le contenu décodé
    const targetContracts = Logger.getTargetContracts()
    
    for (let block of ctx.blocks) {
        let hasTargetEvents = false
        let totalEvents = 0
        
        for (let eventIndex = 0; eventIndex < block.events.length; eventIndex++) {
            const event = block.events[eventIndex]
            if (event.name === 'Revive.ContractEmitted') {
                totalEvents++
                try {
                    // Extract contract address and event data
                    const contractAddress = event.args.contract
                    const eventData = event.args.data
                    const topics = event.args.topics || []
                    
                    // Vérifier si c'est un contrat cible
                    const isTargetContract = targetContracts.includes(contractAddress.toLowerCase())
                    
                    if (isTargetContract) {
                        hasTargetEvents = true
                        Logger.contractEvent(contractAddress, 'CONTRACT_EMITTED', `Block ${block.header.height}`, {
                            data: eventData,
                            topics: topics.length
                        })
                    } else {
                        Logger.debug(`Skipping non-target contract: ${contractAddress}`)
                        continue
                    }
                    
                    Logger.debug(`Contract: ${contractAddress}`)
                    Logger.debug(`EventData: ${eventData}`)
                    Logger.debug(`Topics:`, topics)
                    
                    // ✅ NOUVEAU: Décoder l'événement avec le décodeur générique Ink! v6
                    const decodedEvent = inkDecoder.decodeEvent(eventData, topics, contractAddress)
                    
                    if (decodedEvent) {
                        Logger.contractEvent(contractAddress, decodedEvent.eventType.toUpperCase(), `Decoded successfully`, decodedEvent.data)
                        
                        // Créer une clé unique basée sur les données décodées
                        const eventDataKey = `${decodedEvent.eventType}-${decodedEvent.data.game_number}-${decodedEvent.data.attempt}-${decodedEvent.data.guess}-${decodedEvent.data.clue || ''}`
                        
                        // Vérifier si cet événement a déjà été traité (même contenu décodé)
                        if (processedEventData.has(eventDataKey)) {
                            Logger.debug(`Skipping duplicate decoded event: ${eventDataKey}`)
                            continue
                        }
                        processedEventData.add(eventDataKey)
                        
                        // Créer l'événement typé selon son type
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
                        Logger.debug(`Skipping undecodable event from contract ${contractAddress}`, { rawData: eventData })
                    }
                } catch (error) {
                    Logger.error(`Error processing Revive.ContractEmitted at block ${block.header.height}`, error)
                }
            }
            else if (event.name === 'Revive.ContractInstantiated') {
                try {
                    const contractAddress = event.args.contract
                    const deployer = event.args.deployer
                    
                    // Log seulement si c'est un contrat cible
                    if (targetContracts.includes(contractAddress.toLowerCase())) {
                        Logger.contractEvent(contractAddress, 'CONTRACT_INSTANTIATED', `Block ${block.header.height}`, { deployer })
                    }
                } catch (error) {
                    Logger.error(`Error processing Revive.ContractInstantiated at block ${block.header.height}`, error)
                }
            }
        }
        
        // Log du traitement du bloc seulement si nécessaire
        Logger.blockProcessing(block.header.height, totalEvents, hasTargetEvents)
    }
    
    return contractEvents
}

// Supprimé : createAccounts et createTransfers - focus sur les jeux uniquement

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
            // Pour les nouveaux événements typés, on ne peut plus extraire le deployer
            // On utilise une valeur par défaut
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

// Cette fonction n'est plus nécessaire car on sauvegarde directement les événements typés

// ✅ NOUVELLE FONCTION: Traitement des jeux avec GameManager
function processGamesWithManager(contractEvents: TypedContractEvent[], contracts: Map<string, Contract>, gameManager: GameManager): Game[] {
    let games: Game[] = []
    
    for (let event of contractEvents) {
        try {
        const contract = contracts.get(event.contractAddress)
        if (contract) {
                // Convertir l'événement typé en format GameEvent
                let gameEvent: GameEvent | null = null
                
                if (event instanceof GameStartedEvent) {
                    gameEvent = {
                id: event.id,
                blockNumber: event.blockNumber,
                timestamp: event.timestamp,
                        contractAddress: event.contractAddress,
                        eventType: 'game_started',
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
                        eventType: 'guess_submitted',
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
                }
                
                if (gameEvent) {
                    // Traiter l'événement avec le GameManager
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

// Ancienne fonction supprimée - remplacée par processGamesWithManager
