// 🎮 Game manager for Passet Hub indexer
// Manages game business logic in a consistent manner

import { Game } from '../model/generated/game.model'
import { Contract } from '../model/generated/contract.model'
import { convertToSS58 } from '../main'
import { GuessHistoryItem } from '../model/generated/_guessHistoryItem'

export interface GameEvent {
    id: string
    blockNumber: number
    timestamp: Date
    contractAddress: string
    eventType: 
        | 'new_game' 
        | 'guess_made' 
        | 'clue_given'
        | 'game_over'
        | 'game_cancelled'
        | 'max_attempts_updated'
    gameNumber: string
    player?: string
    minNumber?: number
    maxNumber?: number
    attemptNumber?: number
    guess?: number
    result?: string
    win?: boolean
    target?: number
    maxAttempts?: number
}

export class GameManager {
    private games = new Map<string, Game>()
    private gameEvents = new Map<string, GameEvent[]>()

    /**
     * Load a game into the manager (from DB or memory)
     */
    loadGame(game: Game): void {
        this.games.set(game.id, game)
    }

    /**
     * Get a game by key
     */
    getGame(gameKey: string): Game | undefined {
        return this.games.get(gameKey)
    }

    /**
     * Processes a game event and updates the game state
     */
    processGameEvent(event: GameEvent, contract: Contract): Game | null {
        const contractAddressSS58 = convertToSS58(event.contractAddress)
        const gameKey = `${contractAddressSS58}-${event.gameNumber}`
        
        // Get or create the game
        let game = this.games.get(gameKey)
        
        if (!game && event.eventType === 'new_game') {
            // Create a new game only for new_game event
            game = new Game({
                id: gameKey,
                gameNumber: BigInt(event.gameNumber),
                player: event.player || 'unknown',
                minNumber: event.minNumber || 0,
                maxNumber: event.maxNumber || 100,
                attempt: 0,
                createdAt: event.timestamp,
                createdAtBlock: event.blockNumber,
                contract,
                guessHistory: []
            })
            this.games.set(gameKey, game)
        } else if (!game) {
            // Create a stub game if event arrives before new_game
            game = new Game({
                id: gameKey,
                gameNumber: BigInt(event.gameNumber),
                player: event.player || 'unknown',
                minNumber: 0,
                maxNumber: 100,
                attempt: 0,
                createdAt: event.timestamp,
                createdAtBlock: event.blockNumber,
                contract,
                guessHistory: [],
                isOver: false,
                won: false,
                cancelled: false
            })
            this.games.set(gameKey, game)
        }
        
        if (game) {
            // Update game according to event type
            switch (event.eventType) {
                case 'new_game':
                    // Game is already created, no need to update
                    break
                    
                case 'guess_made':
                    // ✅ FIX: Update attempt only if it's more recent
                    if (event.attemptNumber && event.attemptNumber > game.attempt) {
                        game.attempt = event.attemptNumber
                    }
                    // ✅ FIX: Always update lastGuess with the latest attempt
                    if (event.guess !== undefined) {
                        game.lastGuess = event.guess
                    }
                    
                    // ✅ NEW: Add to guess history
                    if (!game.guessHistory) {
                        game.guessHistory = []
                    }
                    const newGuessItem = new GuessHistoryItem({
                        attemptNumber: event.attemptNumber || 0,
                        guess: event.guess || 0,
                        result: 'Pending' // Will be updated by clue_given
                    })
                    game.guessHistory.push(newGuessItem)
                    break
                    
                case 'clue_given':
                    // ✅ FIX: Update lastClue only if it's more recent
                    if (event.attemptNumber && event.attemptNumber >= game.attempt) {
                        game.lastClue = event.result
                    }
                    
                    // ✅ NEW: Update result in history
                    if (game.guessHistory) {
                        const lastGuess = game.guessHistory[game.guessHistory.length - 1]
                        if (lastGuess && lastGuess.attemptNumber === event.attemptNumber) {
                            lastGuess.result = event.result || 'Unknown'
                            console.log(`💡 Result updated: ${event.result} for attempt ${event.attemptNumber}`)
                        }
                    }
                    
                    console.log(`💡 Clue recorded: ${event.result}`)
                    break
                
                case 'game_over':
                    game.isOver = true
                    game.won = event.win || false
                    game.target = event.target || null
                    console.log(`🏁 Game over: ${event.win ? 'Won' : 'Lost'} - Target: ${event.target}`)
                    break
                
                case 'game_cancelled':
                    game.cancelled = true
                    console.log(`❌ Game cancelled: ${event.gameNumber}`)
                    break
                
                case 'max_attempts_updated':
                    game.maxAttempts = event.maxAttempts || null
                    console.log(`📊 Max attempts updated: ${event.maxAttempts}`)
                    break
            }
            
            // Record event for history
            if (!this.gameEvents.has(gameKey)) {
                this.gameEvents.set(gameKey, [])
            }
            this.gameEvents.get(gameKey)!.push(event)
        }
        
        return game || null
    }

    /**
     * Gets all processed games
     */
    getAllGames(): Game[] {
        return Array.from(this.games.values())
    }

    /**
     * Gets the event history for a game
     */
    getGameEvents(gameId: string): GameEvent[] {
        return this.gameEvents.get(gameId) || []
    }

    /**
     * Checks if a game exists
     */
    hasGame(gameId: string): boolean {
        return this.games.has(gameId)
    }
}
