/**
 * Module de décodage d'événements Ink! v6 pour Subsquid
 * 
 * Ce module fournit un décodeur spécifique pour le contrat "Guess the Number"
 */

// Décodeur spécifique pour le contrat "Guess the Number"
//export { decodeContractEvent } from './event-decoder'

// Module générique réutilisable pour Ink! v6 (ARCHIVÉ)
export { 
    SubsquidInkDecoder, 
    createInkDecoder, 
    InkDecoderConfig,
    InkDecodedEvent,
    InkContractMetadata,
    InkEventMetadata,
    InkTypeDefinition
} from './subsquid-inkv6-decoder'

// Types communs
export type { InkDecodedEvent as DecodedEvent } from './subsquid-inkv6-decoder'
