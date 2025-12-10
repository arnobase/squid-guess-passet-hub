// 🎮 Gestionnaire de jeux pour l'indexeur Passet Hub
// Gère la logique métier des jeux de manière cohérente

import { Game } from '../model/generated/game.model'
import { Contract } from '../model/generated/contract.model'
import { convertToSS58 } from '../main'
import { GuessHistoryItem } from '../model/generated/_guessHistoryItem'

export interface GameEvent {
    id: string
    blockNumber: number
    timestamp: Date
    contractAddress: string
    eventType: 'game_started' | 'guess_submitted' | 'clue_given'
    gameNumber: string
    player?: string
    minNumber?: number
    maxNumber?: number
    attemptNumber?: number
    guess?: number
    result?: string
}

export class GameManager {
    private games = new Map<string, Game>()
    private gameEvents = new Map<string, GameEvent[]>()

    /**
     * Traite un événement de jeu et met à jour l'état du jeu
     */
    processGameEvent(event: GameEvent, contract: Contract): Game | null {
        const contractAddressSS58 = convertToSS58(event.contractAddress)
        const gameKey = `${contractAddressSS58}-${event.gameNumber}`
        
        // ✅ DEBUG: Log pour voir ce qui se passe
        console.log(`🎮 Processing event: ${event.eventType} for game ${gameKey}`)
        
        // Récupérer ou créer le jeu
        let game = this.games.get(gameKey)
        
        if (!game && event.eventType === 'game_started') {
            // Créer un nouveau jeu seulement pour l'événement game_started
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
                guessHistory: [] // ✅ CORRECTION: Initialiser le champ guessHistory
            })
            
            this.games.set(gameKey, game)
            console.log(`🎮 Nouveau jeu créé: ${gameKey}`)
        } else if (!game) {
            // ✅ DEBUG: Log si le jeu n'existe pas pour un événement non-game_started
            console.log(`⚠️ Jeu non trouvé pour ${event.eventType}: ${gameKey}`)
            return null
        }
        
        if (game) {
            // Mettre à jour le jeu selon le type d'événement
            switch (event.eventType) {
                case 'game_started':
                    // Le jeu est déjà créé, pas besoin de mise à jour
                    break
                    
                case 'guess_submitted':
                    // ✅ CORRECTION: Mettre à jour attempt seulement si c'est plus récent
                    if (event.attemptNumber && event.attemptNumber > game.attempt) {
                        game.attempt = event.attemptNumber
                    }
                    // ✅ CORRECTION: Toujours mettre à jour lastGuess avec la dernière tentative
                    if (event.guess !== undefined) {
                        game.lastGuess = event.guess
                    }
                    
                    // ✅ NOUVEAU: Ajouter à l'historique des tentatives
                    if (!game.guessHistory) {
                        game.guessHistory = []
                    }
                    const newGuessItem = new GuessHistoryItem({
                        attemptNumber: event.attemptNumber || 0,
                        guess: event.guess || 0,
                        result: 'Pending' // Sera mis à jour par clue_given
                    })
                    game.guessHistory.push(newGuessItem)
                    
                    console.log(`🎯 Tentative ajoutée à l'historique: ${event.guess} (tentative ${event.attemptNumber})`)
                    console.log(`📊 Historique actuel: ${game.guessHistory.length} tentatives`)
                    break
                    
                case 'clue_given':
                    // ✅ CORRECTION: Mettre à jour lastClue seulement si c'est plus récent
                    if (event.attemptNumber && event.attemptNumber >= game.attempt) {
                        game.lastClue = event.result
                    }
                    
                    // ✅ NOUVEAU: Mettre à jour le résultat dans l'historique
                    if (game.guessHistory) {
                        const lastGuess = game.guessHistory[game.guessHistory.length - 1]
                        if (lastGuess && lastGuess.attemptNumber === event.attemptNumber) {
                            lastGuess.result = event.result || 'Unknown'
                            console.log(`💡 Résultat mis à jour: ${event.result} pour tentative ${event.attemptNumber}`)
                        }
                    }
                    
                    console.log(`💡 Indice enregistré: ${event.result}`)
                    break
            }
            
            // Enregistrer l'événement pour l'historique
            if (!this.gameEvents.has(gameKey)) {
                this.gameEvents.set(gameKey, [])
            }
            this.gameEvents.get(gameKey)!.push(event)
        }
        
        return game || null
    }

    /**
     * Récupère tous les jeux traités
     */
    getAllGames(): Game[] {
        return Array.from(this.games.values())
    }

    /**
     * Récupère l'historique des événements d'un jeu
     */
    getGameEvents(gameId: string): GameEvent[] {
        return this.gameEvents.get(gameId) || []
    }

    /**
     * Vérifie si un jeu existe
     */
    hasGame(gameId: string): boolean {
        return this.games.has(gameId)
    }

    /**
     * Récupère un jeu par son ID
     */
    getGame(gameId: string): Game | undefined {
        return this.games.get(gameId)
    }
}
