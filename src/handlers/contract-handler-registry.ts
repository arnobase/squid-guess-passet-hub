/**
 * Registry des handlers de contrats
 * Route automatiquement vers le bon handler selon l'adresse du contrat
 */

import { ContractHandler, TypedContractEvent } from './contract-handler'
import { Logger } from '../utils/logger'

export class ContractHandlerRegistry {
    private handlers: ContractHandler[] = []
    private addressToHandler = new Map<string, ContractHandler>()

    /**
     * Enregistre un handler
     */
    register(handler: ContractHandler): void {
        this.handlers.push(handler)
        
        // Indexer les adresses
        for (const address of handler.contractAddresses) {
            this.addressToHandler.set(address.toLowerCase(), handler)
            Logger.debug(`Registered handler for ${handler.contractName} at ${address}`)
        }
    }

    /**
     * Trouve le handler pour une adresse de contrat donnée
     */
    getHandler(contractAddress: string): ContractHandler | null {
        const normalizedAddress = contractAddress.toLowerCase()
        return this.addressToHandler.get(normalizedAddress) || null
    }

    /**
     * Vérifie si une adresse est gérée par un handler
     */
    isHandled(contractAddress: string): boolean {
        return this.addressToHandler.has(contractAddress.toLowerCase())
    }

    /**
     * Obtient tous les handlers
     */
    getAllHandlers(): ContractHandler[] {
        return [...this.handlers]
    }
}
