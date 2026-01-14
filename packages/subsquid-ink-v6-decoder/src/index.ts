/**
 * Module unifié de décodage d'événements Ink! v6 pour Subsquid
 * 
 * Ce module expose deux modes de décodage :
 * 
 * 1. MODE STATIQUE (recommandé) :
 *    - Utilise les types générés par gen-ink-decoder.js
 *    - Plus performant, pas besoin de métadonnées JSON à l'exécution
 *    - Nécessite de générer les types au préalable (yarn gen:decoders)
 * 
 *    Exemple :
 *    ```typescript
 *    import { createDecoder, DecoderMode } from './decoders'
 *    const decoder = createDecoder({
 *      mode: DecoderMode.STATIC,
 *      contract: 'guess_the_number'
 *    })
 *    ```
 * 
 * 2. MODE RUNTIME :
 *    - Charge les métadonnées JSON à l'exécution
 *    - Plus flexible, peut décoder n'importe quel contrat sans recompilation
 *    - Nécessite les fichiers de métadonnées à l'exécution
 * 
 *    Exemple :
 *    ```typescript
 *    import { createDecoder, DecoderMode } from './decoders'
 *    const decoder = createDecoder({
 *      mode: DecoderMode.RUNTIME,
 *      metadataPath: './guess_the_number.json',
 *      contractAddress: '0xe75cbd47620dbb2053cf2a98d06840f06baaf141',
 *      eventTypeMapping: {
 *        'NewGame': 'game_started',
 *        'GuessMade': 'guess_submitted',
 *        'ClueGiven': 'clue_given'
 *      }
 *    })
 *    ```
 */

import { Decoder, DecoderMode, DecodedEvent } from './types'
import { createRuntimeDecoder, RuntimeDecoderConfig } from './runtime'
import { createStaticDecoder, StaticDecoderConfig } from './static'

// Charger le registry des décodeurs statiques (imports statiques)
// Cela permet d'avoir des imports résolus au build time plutôt que des require() dynamiques
try {
  require('./static-registry')
} catch (error) {
  // Le fichier static-registry.ts n'existe pas encore, ce n'est pas grave
  // Les imports dynamiques seront utilisés en fallback
}

/**
 * Configuration pour créer un décodeur (union type)
 */
export type DecoderConfig = 
  | ({ mode: DecoderMode.STATIC } & StaticDecoderConfig)
  | ({ mode: DecoderMode.RUNTIME } & RuntimeDecoderConfig)

/**
 * Factory pour créer un décodeur selon le mode choisi
 * 
 * @param config - Configuration du décodeur (statique ou runtime)
 * @returns Instance du décodeur implémentant l'interface Decoder
 * 
 * @example
 * ```typescript
 * // Mode statique (recommandé)
 * const decoder = createDecoder({
 *   mode: DecoderMode.STATIC,
 *   contract: 'guess_the_number'
 * })
 * 
 * // Mode runtime
 * const decoder = createDecoder({
 *   mode: DecoderMode.RUNTIME,
 *   metadataPath: './guess_the_number.json',
 *   contractAddress: '0xe75cbd47620dbb2053cf2a98d06840f06baaf141'
 * })
 * ```
 */
export function createDecoder(config: DecoderConfig): Decoder {
  switch (config.mode) {
    case DecoderMode.STATIC:
      return createStaticDecoder(config)
    
    case DecoderMode.RUNTIME:
      return createRuntimeDecoder(config)
    
    default:
      throw new Error(`Unknown decoder mode: ${(config as any).mode}`)
  }
}

// Exports publics
export { DecoderMode, DecodedEvent, Decoder } from './types'
export type { RuntimeDecoderConfig } from './runtime'
export type { StaticDecoderConfig } from './static'
export { registerStaticDecoder } from './static'

// Export SCALE codec utilities for generated decoders
export * from './support'

// Exports pour compatibilité avec l'ancien code (déprécié)
/** @deprecated Utilisez createDecoder avec DecoderMode.RUNTIME à la place */
export { 
  SubsquidInkDecoder, 
  createInkDecoder, 
  InkDecoderConfig,
  InkDecodedEvent,
  InkContractMetadata,
  InkEventMetadata,
  InkTypeDefinition
} from './subsquid-inkv6-decoder'
