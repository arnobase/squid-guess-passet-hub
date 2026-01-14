"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeDecoder = void 0;
exports.createRuntimeDecoder = createRuntimeDecoder;
const subsquid_inkv6_decoder_1 = require("./subsquid-inkv6-decoder");
/**
 * Wrapper pour le décodeur runtime qui implémente l'interface Decoder
 */
class RuntimeDecoder {
    constructor(config) {
        const inkConfig = {
            metadataPath: config.metadataPath,
            contractAddress: config.contractAddress,
            eventTypeMapping: config.eventTypeMapping,
            debugMode: config.debugMode || false
        };
        this.decoder = (0, subsquid_inkv6_decoder_1.createInkDecoder)(inkConfig);
    }
    decodeEvent(eventData, topics, contractAddress, blockHeight) {
        const decoded = this.decoder.decodeEvent(eventData, topics, contractAddress);
        if (!decoded) {
            return null;
        }
        return {
            eventType: decoded.eventType,
            data: decoded.data,
            topics: decoded.topics
        };
    }
}
exports.RuntimeDecoder = RuntimeDecoder;
/**
 * Factory pour créer un décodeur runtime
 */
function createRuntimeDecoder(config) {
    return new RuntimeDecoder(config);
}
//# sourceMappingURL=runtime.js.map