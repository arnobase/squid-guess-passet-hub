/**
 * Décodeur statique : utilise les types générés par gen-ink-decoder.js
 * 
 * Avantages :
 * - Plus performant (pas de parsing JSON à l'exécution)
 * - Types TypeScript compilés
 * - Pas besoin de fichiers de métadonnées à l'exécution
 * 
 * Inconvénients :
 * - Nécessite de générer les types au préalable (yarn gen:decoders)
 * - Moins flexible (nécessite recompilation pour nouveaux contrats)
 */

import { Decoder, DecodedEvent } from './types'

/**
 * Configuration pour le décodeur statique
 */
export interface StaticDecoderConfig {
  /** Nom du contrat (ex: 'guess_the_number') */
  contract: string
}

/**
 * Registry des décodeurs statiques disponibles
 * Mappé par nom de contrat
 */
const staticDecoders: Map<string, any> = new Map()

/**
 * Registry des imports statiques pour éviter les imports dynamiques multiples
 */
const staticDecoderImports: Map<string, () => any> = new Map()

// Charger les imports statiques enregistrés
try {
  // Import conditionnel pour éviter les erreurs si le fichier n'existe pas encore
  const staticRegistry = require('./static-registry')
  if (staticRegistry && typeof staticRegistry.registerAllStaticDecoders === 'function') {
    // Les imports sont déjà enregistrés lors du chargement du module
  }
} catch (error) {
  // Le fichier static-registry.ts n'existe pas encore, ce n'est pas grave
  // Les imports dynamiques seront utilisés en fallback
}

/**
 * Enregistre un import statique pour un contrat
 * Cette fonction doit être appelée au build time pour chaque contrat
 */
export function registerStaticDecoder(contractName: string, importFn: () => any): void {
  staticDecoderImports.set(contractName, importFn)
}

/**
 * Charge dynamiquement le décodeur statique pour un contrat
 */
function loadStaticDecoder(contractName: string): any {
  if (staticDecoders.has(contractName)) {
    return staticDecoders.get(contractName)
  }

  // Essayer d'abord avec un import enregistré
  const importFn = staticDecoderImports.get(contractName)
  if (importFn) {
    try {
      const decoderModule = importFn()
      staticDecoders.set(contractName, decoderModule)
      return decoderModule
    } catch (error) {
      throw new Error(
        `Failed to load registered static decoder for contract "${contractName}". ` +
        `Error: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  // Fallback : import dynamique
  try {
    // Import dynamique du décodeur généré
    // Format attendu : src/types/ink/{contractName}/index.ts
    const decoderModule = require(`../types/ink/${contractName}`)
    
    if (!decoderModule) {
      throw new Error(`Static decoder module not found for contract: ${contractName}`)
    }

    staticDecoders.set(contractName, decoderModule)
    return decoderModule
  } catch (error) {
    throw new Error(
      `Failed to load static decoder for contract "${contractName}". ` +
      `Make sure you have run "yarn gen:decoders" to generate the decoders. ` +
      `Error: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Wrapper pour le décodeur statique qui implémente l'interface Decoder
 */
export class StaticDecoder implements Decoder {
  private contractName: string
  private decoderModule: any

  constructor(config: StaticDecoderConfig) {
    this.contractName = config.contract
    this.decoderModule = loadStaticDecoder(this.contractName)
  }

  async decodeEvent(
    eventData: string,
    topics: string[],
    contractAddress?: string,
    blockHeight?: number
  ): Promise<DecodedEvent | null> {
    if (!topics || topics.length === 0) {
      return null
    }

    // Extraire la signature (topics[0] sans le préfixe 0x)
    const signatureHex = topics[0].startsWith('0x') 
      ? topics[0].slice(2) 
      : topics[0]

    // Utiliser decodeEventWithRouting si disponible (avec routing de version)
    if (this.decoderModule.decodeEventWithRouting && contractAddress && blockHeight !== undefined) {
      const decoded = await this.decoderModule.decodeEventWithRouting(
        signatureHex,
        eventData,
        topics,
        {
          address: contractAddress,
          blockHeight: blockHeight
        }
      )
      
      if (!decoded) {
        return null
      }

      // Adapter le format de sortie pour correspondre à DecodedEvent
      if (!decoded.eventType) {
        console.warn(`[StaticDecoder] decoded.eventType is undefined. Decoded object:`, JSON.stringify(decoded))
        console.warn(`  Signature: ${signatureHex}`)
        console.warn(`  Topics:`, topics)
      }
      return {
        eventType: decoded.eventType,
        data: decoded.data || {},
        topics: topics
      }
    }

    // Fallback : utiliser decodeEvent directement depuis la version par défaut
    // Le module peut exporter directement decodeEvent ou via une version spécifique
    if (this.decoderModule.decodeEvent) {
      const decoded = await this.decoderModule.decodeEvent(signatureHex, eventData, topics)
      
      if (!decoded) {
        return null
      }

      if (!decoded.eventType) {
        console.warn(`[StaticDecoder] decoded.eventType is undefined (fallback). Decoded object:`, JSON.stringify(decoded))
        console.warn(`  Signature: ${signatureHex}`)
      }
      return {
        eventType: decoded.eventType,
        data: decoded.data || {},
        topics: topics
      }
    }

    // Essayer avec v0_1_0 comme fallback
    if (this.decoderModule.v0_1_0 && this.decoderModule.v0_1_0.decodeEvent) {
      const decoded = await this.decoderModule.v0_1_0.decodeEvent(signatureHex, eventData, topics)
      
      if (!decoded) {
        return null
      }

      return {
        eventType: decoded.eventType,
        data: decoded.data || {},
        topics: topics
      }
    }

    throw new Error(
      `Static decoder for "${this.contractName}" does not export decodeEventWithRouting or decodeEvent. ` +
      `Available exports: ${Object.keys(this.decoderModule).join(', ')}`
    )
  }
}

/**
 * Factory pour créer un décodeur statique
 */
export function createStaticDecoder(config: StaticDecoderConfig): Decoder {
  return new StaticDecoder(config)
}

