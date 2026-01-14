"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createInkDecoder = exports.SubsquidInkDecoder = exports.registerStaticDecoder = exports.DecoderMode = void 0;
exports.createDecoder = createDecoder;
const types_1 = require("./types");
const runtime_1 = require("./runtime");
const static_1 = require("./static");
// Charger le registry des décodeurs statiques (imports statiques)
// Cela permet d'avoir des imports résolus au build time plutôt que des require() dynamiques
try {
    require('./static-registry');
}
catch (error) {
    // Le fichier static-registry.ts n'existe pas encore, ce n'est pas grave
    // Les imports dynamiques seront utilisés en fallback
}
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
function createDecoder(config) {
    switch (config.mode) {
        case types_1.DecoderMode.STATIC:
            return (0, static_1.createStaticDecoder)(config);
        case types_1.DecoderMode.RUNTIME:
            return (0, runtime_1.createRuntimeDecoder)(config);
        default:
            throw new Error(`Unknown decoder mode: ${config.mode}`);
    }
}
// Exports publics
var types_2 = require("./types");
Object.defineProperty(exports, "DecoderMode", { enumerable: true, get: function () { return types_2.DecoderMode; } });
var static_2 = require("./static");
Object.defineProperty(exports, "registerStaticDecoder", { enumerable: true, get: function () { return static_2.registerStaticDecoder; } });
// Exports pour compatibilité avec l'ancien code (déprécié)
/** @deprecated Utilisez createDecoder avec DecoderMode.RUNTIME à la place */
var subsquid_inkv6_decoder_1 = require("./subsquid-inkv6-decoder");
Object.defineProperty(exports, "SubsquidInkDecoder", { enumerable: true, get: function () { return subsquid_inkv6_decoder_1.SubsquidInkDecoder; } });
Object.defineProperty(exports, "createInkDecoder", { enumerable: true, get: function () { return subsquid_inkv6_decoder_1.createInkDecoder; } });
//# sourceMappingURL=index.js.map