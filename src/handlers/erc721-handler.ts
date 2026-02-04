/**
 * Handler pour le contrat ERC721
 * Gère tous les événements liés aux NFTs (Mint, Transfer, Approval, etc.)
 */

import { ContractHandler, TypedContractEvent } from './contract-handler'
import { DecodedEvent } from '@luckyweb3/subsquid-ink-v6-decoder'
import { Contract, Token, Player } from '../model'
import { Logger } from '../utils/logger'

// Les types d'événements seront générés après yarn type:generate
// Pour l'instant, on les définit manuellement
import {
    MintEvent,
    BurntEvent,
    TransferEvent,
    ApprovalEvent,
    ApprovalForAllEvent
} from '../model'

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

export class ERC721Handler implements ContractHandler {
    contractName = 'erc721'
    contractAddresses: string[]

    constructor(contractAddresses: string[]) {
        this.contractAddresses = contractAddresses.map(addr => addr.toLowerCase())
    }

    handlesEventType(eventType: string): boolean {
        const normalized = eventType.toLowerCase()
        return [
            'mint',
            'burnt',
            'transfer',
            'approval',
            'approval_for_all',
            'approvalforall'  // Support aussi le format sans underscore (selon EVENT_SIGNATURES)
        ].includes(normalized)
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

        const normalizeAddress = (addr: any): string | null => {
            if (!addr) return null
            if (typeof addr === 'string') {
                return addr.startsWith('0x') ? addr : `0x${addr}`
            }
            // Si c'est un Option, extraire la valeur
            if (typeof addr === 'object' && addr !== null) {
                if ('Some' in addr) {
                    const value = addr.Some
                    return typeof value === 'string' 
                        ? (value.startsWith('0x') ? value : `0x${value}`)
                        : null
                }
                if ('None' in addr) {
                    return null
                }
            }
            return String(addr)
        }

        switch (decodedEvent.eventType?.toLowerCase()) {
            case 'mint':
                return new MintEvent({
                    ...baseEvent,
                    tokenId: BigInt(decodedEvent.data.id || decodedEvent.data.token_id || 0),
                    maxAttempts: decodedEvent.data.max_attempts 
                        ? BigInt(decodedEvent.data.max_attempts) 
                        : null
                })
            
            case 'burnt':
                return new BurntEvent({
                    ...baseEvent,
                    tokenId: BigInt(decodedEvent.data.id || decodedEvent.data.token_id || 0)
                })
            
            case 'transfer':
                return new TransferEvent({
                    ...baseEvent,
                    from: normalizeAddress(decodedEvent.data.from),
                    to: normalizeAddress(decodedEvent.data.to),
                    tokenId: BigInt(decodedEvent.data.id || decodedEvent.data.token_id || 0)
                })
            
            case 'approval':
                return new ApprovalEvent({
                    ...baseEvent,
                    from: normalizeAddress(decodedEvent.data.from) || '',
                    to: normalizeAddress(decodedEvent.data.to) || '',
                    tokenId: BigInt(decodedEvent.data.id || decodedEvent.data.token_id || 0)
                })
            
            case 'approval_for_all':
                return new ApprovalForAllEvent({
                    ...baseEvent,
                    owner: normalizeAddress(decodedEvent.data.owner) || '',
                    operator: normalizeAddress(decodedEvent.data.operator) || '',
                    approved: decodedEvent.data.approved || false
                })
            
            default:
                Logger.warn(`[${this.contractName}] Unknown event type: ${decodedEvent.eventType}`)
                return null
        }
    }

    processEvents(
        events: TypedContractEvent[],
        contracts: Map<string, Contract>,
        players?: Map<string, Player>
    ): Token[] {
        Logger.info(`[ERC721] 🎯 Traitement de ${events.length} événement(s) ERC721`)
        const tokens = new Map<string, Token>()
        const localPlayers = players || new Map<string, Player>()
        
        // Première passe : identifier les mints et leurs transfers associés
        // En ERC721, un MintEvent est TOUJOURS suivi d'un TransferEvent depuis 0x0 vers le créateur
        const mintToTransferMap = new Map<string, TransferEvent>()
        
        // Trouver les transfers depuis 0x0 (mint transfers)
        for (const event of events) {
            if (event instanceof TransferEvent) {
                const isMintTransfer = !event.from || 
                    event.from === '0x0000000000000000000000000000000000000000' || 
                    event.from === '0x0' ||
                    event.from.toLowerCase() === '0x0000000000000000000000000000000000000000'
                
                if (isMintTransfer && event.to) {
                    const tokenKey = `${event.contractAddress}-${event.tokenId.toString()}`
                    mintToTransferMap.set(tokenKey, event)
                    Logger.info(`[ERC721] 🔍 Mint transfer trouvé pour token ${event.tokenId} → owner: ${event.to}`)
                }
            }
        }
        
        // Deuxième passe : traiter les événements
        for (const event of events) {
            const contract = contracts.get(event.contractAddress)
            if (!contract) continue

            if (event instanceof MintEvent) {
                const tokenKey = `${event.contractAddress}-${event.tokenId.toString()}`
                if (!tokens.has(tokenKey)) {
                    // Chercher le transfer associé (mint transfer)
                    const mintTransfer = mintToTransferMap.get(tokenKey)
                    const ownerAddress = mintTransfer?.to || 'unknown'
                    
                    if (mintTransfer) {
                        Logger.info(`[ERC721] ✅ Mint token ${event.tokenId} → owner défini depuis TransferEvent: ${ownerAddress}`)
                    } else {
                        // Normalement, un TransferEvent devrait toujours suivre un MintEvent en ERC721
                        // Si on ne le trouve pas dans le même batch, il arrivera dans un batch ultérieur
                        Logger.warn(`[ERC721] ⚠️  Mint token ${event.tokenId} → TransferEvent non trouvé dans ce batch (normal si dans batch suivant), owner temporaire: 'unknown'`)
                    }
                    
                    // Récupérer ou créer l'entité Player
                    const ownerEntity = ownerAddress !== 'unknown' 
                        ? getOrCreatePlayerStub(localPlayers, ownerAddress, event.timestamp, event.blockNumber)
                        : getOrCreatePlayerStub(localPlayers, 'unknown', event.timestamp, event.blockNumber)
                    
                    tokens.set(tokenKey, new Token({
                        id: tokenKey,
                        contract,
                        tokenId: event.tokenId,
                        owner: ownerEntity,
                        ownerAddress: ownerAddress,
                        mintedAt: event.timestamp,
                        mintedAtBlock: event.blockNumber,
                        maxAttempts: event.maxAttempts,
                        burnt: false
                    }))
                }
            } else if (event instanceof TransferEvent) {
                const tokenKey = `${event.contractAddress}-${event.tokenId.toString()}`
                let token = tokens.get(tokenKey)
                
                // Si from est null, c'est un mint (transfer depuis l'adresse zéro)
                const isMint = !event.from || event.from === '0x0000000000000000000000000000000000000000' || event.from === '0x0'
                const ownerAddress = event.to || 'unknown'
                
                if (!token) {
                    // Token n'existe pas encore, créer un stub
                    Logger.info(`[ERC721] 📦 Transfer token ${event.tokenId} (${isMint ? 'MINT' : 'TRANSFER'}) → création token, owner: ${ownerAddress}`)
                    
                    const ownerEntity = getOrCreatePlayerStub(localPlayers, ownerAddress, event.timestamp, event.blockNumber)
                    
                    token = new Token({
                        id: tokenKey,
                        contract,
                        tokenId: event.tokenId,
                        owner: ownerEntity,
                        ownerAddress: ownerAddress,
                        mintedAt: event.timestamp, // Approximation si pas de MintEvent
                        mintedAtBlock: event.blockNumber,
                        maxAttempts: null, // Sera mis à jour par MintEvent si présent
                        burnt: false
                    })
                    tokens.set(tokenKey, token)
                } else {
                    // Mettre à jour le propriétaire (toujours, même si 'unknown')
                    if (event.to) {
                        const oldOwnerAddress = token.ownerAddress
                        const newOwnerEntity = getOrCreatePlayerStub(localPlayers, event.to, event.timestamp, event.blockNumber)
                        token.owner = newOwnerEntity
                        token.ownerAddress = event.to
                        Logger.info(`[ERC721] 🔄 Transfer token ${event.tokenId} → owner mis à jour: ${oldOwnerAddress} → ${event.to}`)
                    }
                    // Si c'est un mint et que le token a été créé avec des valeurs approximatives,
                    // on garde les valeurs du MintEvent (déjà définies)
                }
            } else if (event instanceof BurntEvent) {
                const tokenKey = `${event.contractAddress}-${event.tokenId.toString()}`
                let token = tokens.get(tokenKey)
                
                if (!token) {
                    Logger.info(`[ERC721] 🔥 Burn token ${event.tokenId} → création token marqué comme brûlé`)
                    const unknownOwner = getOrCreatePlayerStub(localPlayers, 'unknown', event.timestamp, event.blockNumber)
                    token = new Token({
                        id: tokenKey,
                        contract,
                        tokenId: event.tokenId,
                        owner: unknownOwner,
                        ownerAddress: 'unknown',
                        mintedAt: event.timestamp,
                        mintedAtBlock: event.blockNumber,
                        maxAttempts: null,
                        burnt: true,
                        burntAt: event.timestamp,
                        burntAtBlock: event.blockNumber
                    })
                    tokens.set(tokenKey, token)
                } else {
                    Logger.info(`[ERC721] 🔥 Burn token ${event.tokenId} → token existant marqué comme brûlé`)
                    token.burnt = true
                    token.burntAt = event.timestamp
                    token.burntAtBlock = event.blockNumber
                }
            }
        }

        const tokensList = Array.from(tokens.values())
        Logger.info(`[ERC721] ✅ Traitement terminé : ${tokensList.length} token(s) créé(s)/mis à jour`)
        return tokensList
    }
}
