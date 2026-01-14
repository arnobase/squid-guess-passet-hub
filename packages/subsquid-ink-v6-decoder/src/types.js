"use strict";
/**
 * Types communs pour les décodeurs Ink! v6
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DecoderMode = void 0;
/**
 * Mode de décodage
 */
var DecoderMode;
(function (DecoderMode) {
    /** Mode statique : utilise les types générés (recommandé, plus performant) */
    DecoderMode["STATIC"] = "static";
    /** Mode runtime : charge les métadonnées JSON à l'exécution (flexible mais plus lent) */
    DecoderMode["RUNTIME"] = "runtime";
})(DecoderMode || (exports.DecoderMode = DecoderMode = {}));
//# sourceMappingURL=types.js.map