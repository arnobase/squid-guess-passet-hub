/**
 * Handler pour le contrat guess_the_number
 * Gère tous les événements liés aux jeux
 */

import { ContractHandler, TypedContractEvent } from './contract-handler'
import { DecodedEvent } from '@luckyweb3/subsquid-ink-v6-decoder'
import { 
    GameStartedEvent, 
    GuessSubmittedEvent, 
    ClueGivenEvent, 
    GameOverEvent, 
    GameCancelledEvent, 
    MaxAttemptsUpdatedEvent,
    Player
} from '../model'
import { GameManager, GameEvent } from '../services/game-manager'
import { Contract, Game } from '../model'
import { Logger } from '../utils/logger'

// Fonction helper pour créer un Player stub si non trouvé
function getOrCreatePlayerStub(players: Map<string, Player>, address: string, timestamp: Date, blockNumber: number): Player {
    const normalizedAddress = address.toLowerCase()
    let player = players.get(normalizedAddress)
    if (!player) {
        player = new Player({
            id: normalizedAddress,
            totalGames: 0,
            totalWins: 0,
            totalTokens: 0,
            maxMaxAttempts: null,
            firstSeenAt: timestamp,
            firstSeenAtBlock: blockNumber,
            lastActiveAt: timestamp,
            lastActiveAtBlock: blockNumber
        })
        players.set(normalizedAddress, player)
    }
    return player
}

export class GuessTheNumberHandler implements ContractHandler {
    contractName = 'guess_the_number'
    contractAddresses: string[]
    private gameManager: GameManager

    constructor(contractAddresses: string[], gameManager: GameManager) {
        this.contractAddresses = contractAddresses.map(addr => addr.toLowerCase())
        this.gameManager = gameManager
    }

    handlesEventType(eventType: string): boolean {
        return [
            'new_game',
            'guess_made',
            'clue_given',
            'game_over',
            'game_cancelled',
            'max_attempts_updated'
        ].includes(eventType)
    }

    createTypedEvent(
        id: string,
        blockNumber: number,
        timestamp: Date,
        extrinsicHash: string | undefined,
        contractAddress: string,
        decodedEvent: DecodedEvent
    ): TypedContractEvent | null {
        const baseEvent = {
            id,
            blockNumber,
            timestamp,
            extrinsicHash: extrinsicHash || null,
            contractAddress
        }

        const normalizeAddress = (addr: any): string => {
            if (typeof addr === 'string') {
                return addr.startsWith('0x') ? addr : `0x${addr}`
            }
            return String(addr)
        }

        switch (decodedEvent.eventType) {
            case 'new_game':
                return new GameStartedEvent({
                    ...baseEvent,
                    gameNumber: BigInt(decodedEvent.data.game_number || 0),
                    player: normalizeAddress(decodedEvent.data.player || ''),
                    minNumber: decodedEvent.data.min_number || 0,
                    maxNumber: decodedEvent.data.max_number || 0
                })
            
            case 'guess_made':
                return new GuessSubmittedEvent({
                    ...baseEvent,
                    gameNumber: BigInt(decodedEvent.data.game_number || 0),
                    player: normalizeAddress(decodedEvent.data.player || ''),
                    attemptNumber: decodedEvent.data.attempt || 0,
                    guess: decodedEvent.data.guess || 0
                })
            
            case 'clue_given':
                return new ClueGivenEvent({
                    ...baseEvent,
                    gameNumber: BigInt(decodedEvent.data.game_number || 0),
                    player: normalizeAddress(decodedEvent.data.player || ''),
                    attemptNumber: decodedEvent.data.attempt || 0,
                    guess: decodedEvent.data.guess || 0,
                    result: decodedEvent.data.clue || ''
                })
            
            case 'game_over':
                return new GameOverEvent({
                    ...baseEvent,
                    gameNumber: BigInt(decodedEvent.data.game_number || 0),
                    player: normalizeAddress(decodedEvent.data.player || ''),
                    win: decodedEvent.data.win || false,
                    target: decodedEvent.data.target || 0
                })
            
            case 'game_cancelled':
                return new GameCancelledEvent({
                    ...baseEvent,
                    gameNumber: BigInt(decodedEvent.data.game_number || 0),
                    player: normalizeAddress(decodedEvent.data.player || '')
                })
            
            case 'max_attempts_updated':
                return new MaxAttemptsUpdatedEvent({
                    ...baseEvent,
                    gameNumber: BigInt(decodedEvent.data.game_number || 0),
                    player: normalizeAddress(decodedEvent.data.player || ''),
                    maxAttempts: decodedEvent.data.max_attempts || 0
                })
            
            case 'message_queued':
            case 'message_processed':
            case 'role_granted':
            case 'role_revoked':
            case 'meta_transaction_decoded':
                // Événements non liés aux jeux, ignorés
                return null
            
            default:
                Logger.warn(`[${this.contractName}] Unknown event type: ${decodedEvent.eventType}`)
                return null
        }
    }

    processEvents(
        events: TypedContractEvent[],
        contracts: Map<string, Contract>,
        players?: Map<string, Player>
    ): Game[] {
        const games: Game[] = []
        const localPlayers = players || new Map<string, Player>()
        
        for (const event of events) {
            const contract = contracts.get(event.contractAddress)
            if (!contract) continue

            // Convertir en format GameEvent pour le GameManager
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
                // Récupérer ou créer l'entité Player
                const playerEntity = getOrCreatePlayerStub(localPlayers, playerAddress, event.timestamp, event.blockNumber)
                const game = this.gameManager.processGameEvent(gameEvent, contract, playerEntity)
                if (game) {
                    games.push(game)
                }
            }
        }

        return games
    }
}
