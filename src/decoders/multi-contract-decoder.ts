/**
 * Décodeur multi-contrats avec routing automatique
 * 
 * Ce décodeur route automatiquement vers le bon décodeur selon l'adresse du contrat.
 * Pour ajouter un nouveau contrat :
 * 1. Ajoutez-le dans ink-contracts.json
 * 2. Régénérez les décodeurs (yarn gen:decoders)
 * 3. Ajoutez l'adresse dans la map ci-dessous
 */

import { createDecoder, DecoderMode, Decoder, DecodedEvent } from '@luckyweb3/subsquid-ink-v6-decoder'
import { Logger } from '../utils/logger'
import { GUESS_THE_NUMBER_CONTRACTS, ERC721_CONTRACTS } from '../config'

// Map des adresses de contrats vers leurs noms
// Construite à partir de la configuration centralisée
const CONTRACT_ADDRESS_MAP = new Map<string, string>([
  ...GUESS_THE_NUMBER_CONTRACTS.map((addr) => [addr, 'guess_the_number'] as const),
  ...ERC721_CONTRACTS.map((addr) => [addr, 'erc721'] as const),
])

/**
 * Décodeur multi-contrats qui route automatiquement selon l'adresse
 */
export class MultiContractDecoder implements Decoder {
  private decoders = new Map<string, Decoder>()
  private addressToContract = new Map<string, string>()

  constructor() {
    // Créer un décodeur pour chaque contrat
    for (const [address, contractName] of CONTRACT_ADDRESS_MAP) {
      const normalizedAddress = address.toLowerCase()
      this.addressToContract.set(normalizedAddress, contractName)
      
      try {
        const decoder = createDecoder({
          mode: DecoderMode.STATIC,
          contract: contractName
        })
        this.decoders.set(normalizedAddress, decoder)
        Logger.debug(`Decoder registered for contract: ${contractName} (${normalizedAddress})`)
      } catch (error) {
        Logger.error(`Failed to create decoder for contract ${contractName}:`, error)
      }
    }
  }

  async decodeEvent(
    eventData: string,
    topics: string[],
    contractAddress?: string,
    blockHeight?: number
  ): Promise<DecodedEvent | null> {
    if (!contractAddress) {
      Logger.warn('No contract address provided for decoding')
      return null
    }

    const normalizedAddress = contractAddress.toLowerCase()
    const decoder = this.decoders.get(normalizedAddress)

    if (!decoder) {
      const contractName = this.addressToContract.get(normalizedAddress)
      if (contractName) {
        Logger.warn(`Decoder not found for contract ${contractName} (${normalizedAddress}). Make sure you ran 'yarn gen:decoders'`)
      } else {
        Logger.debug(`No decoder registered for contract address: ${contractAddress}`)
      }
      return null
    }

    return decoder.decodeEvent(eventData, topics, contractAddress, blockHeight)
  }

  /**
   * Vérifie si une adresse de contrat est supportée
   */
  isSupported(contractAddress: string): boolean {
    return this.decoders.has(contractAddress.toLowerCase())
  }

  /**
   * Obtient le nom du contrat pour une adresse donnée
   */
  getContractName(contractAddress: string): string | undefined {
    return this.addressToContract.get(contractAddress.toLowerCase())
  }
}
