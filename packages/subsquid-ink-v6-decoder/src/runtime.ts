/**
 * Décodeur runtime : charge les métadonnées JSON à l'exécution
 * 
 * Avantages :
 * - Flexible : peut décoder n'importe quel contrat sans recompilation
 * - Pas besoin de générer les types au préalable
 * 
 * Inconvénients :
 * - Plus lent (charge et parse les métadonnées JSON)
 * - Nécessite les fichiers de métadonnées à l'exécution
 */

import { SubsquidInkDecoder, createInkDecoder, InkDecoderConfig, InkDecodedEvent } from './subsquid-inkv6-decoder'
import { Decoder, DecodedEvent } from './types'

/**
 * Configuration pour le décodeur runtime
 */
export interface RuntimeDecoderConfig {
  /** Chemin vers le fichier de métadonnées JSON */
  metadataPath: string
  /** Adresse du contrat */
  contractAddress: string
  /** Mapping des types d'événements (optionnel) */
  eventTypeMapping?: Record<string, string>
  /** Mode debug (optionnel) */
  debugMode?: boolean
}

/**
 * Wrapper pour le décodeur runtime qui implémente l'interface Decoder
 */
export class RuntimeDecoder implements Decoder {
  private decoder: SubsquidInkDecoder

  constructor(config: RuntimeDecoderConfig) {
    const inkConfig: InkDecoderConfig = {
      metadataPath: config.metadataPath,
      contractAddress: config.contractAddress,
      eventTypeMapping: config.eventTypeMapping,
      debugMode: config.debugMode || false
    }
    this.decoder = createInkDecoder(inkConfig)
  }

  decodeEvent(
    eventData: string,
    topics: string[],
    contractAddress?: string,
    blockHeight?: number
  ): DecodedEvent | null {
    const decoded = this.decoder.decodeEvent(eventData, topics, contractAddress)
    if (!decoded) {
      return null
    }
    return {
      eventType: decoded.eventType,
      data: decoded.data,
      topics: decoded.topics
    }
  }
}

/**
 * Factory pour créer un décodeur runtime
 */
export function createRuntimeDecoder(config: RuntimeDecoderConfig): Decoder {
  return new RuntimeDecoder(config)
}

