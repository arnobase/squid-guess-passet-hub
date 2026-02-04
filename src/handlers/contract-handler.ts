/**
 * Interface pour les handlers de contrats
 * Chaque contrat peut avoir son propre handler qui gère ses événements spécifiques
 */

import { DecodedEvent } from '@luckyweb3/subsquid-ink-v6-decoder'

export interface TypedContractEvent {
    id: string
    blockNumber: number
    timestamp: Date
    extrinsicHash: string | null | undefined
    contractAddress: string
}

/**
 * Interface pour un handler de contrat
 */
export interface ContractHandler {
    /**
     * Nom du contrat géré par ce handler
     */
    contractName: string
    
    /**
     * Adresses des contrats gérés (en minuscules)
     */
    contractAddresses: string[]
    
    /**
     * Crée un événement typé à partir d'un événement décodé
     */
    createTypedEvent(
        id: string,
        blockNumber: number,
        timestamp: Date,
        extrinsicHash: string | undefined,
        contractAddress: string,
        decodedEvent: DecodedEvent
    ): TypedContractEvent | null
    
    /**
     * Traite les événements et retourne les entités à sauvegarder
     * (ex: Game pour guess_the_number, Order pour un contrat de trading, etc.)
     */
    processEvents(
        events: TypedContractEvent[],
        contracts: Map<string, any>
    ): any[]
    
    /**
     * Vérifie si un type d'événement est géré par ce handler
     */
    handlesEventType(eventType: string): boolean
}
