/**
 * Registry des imports statiques pour les décodeurs générés
 * 
 * Ce fichier est vide par défaut dans le package npm.
 * Les utilisateurs doivent créer leur propre registry dans leur projet
 * pour enregistrer leurs décodeurs statiques générés.
 * 
 * Exemple d'utilisation dans votre projet :
 * 
 * ```typescript
 * // Dans votre projet (ex: src/decoders/static-registry.ts)
 * import { registerStaticDecoder } from '@subsquid/ink-decoder'
 * import * as myContractDecoder from '../types/ink/my_contract'
 * 
 * registerStaticDecoder('my_contract', () => myContractDecoder)
 * ```
 * 
 * Puis importez ce fichier avant d'utiliser les décodeurs statiques.
 */

import { registerStaticDecoder } from './static'

/**
 * Enregistre tous les décodeurs statiques disponibles
 * Cette fonction est appelée automatiquement lors de l'import du module
 * 
 * Par défaut, cette fonction est vide. Les utilisateurs doivent créer
 * leur propre registry dans leur projet pour enregistrer leurs décodeurs.
 */
export function registerAllStaticDecoders(): void {
  // Vide par défaut - les utilisateurs doivent créer leur propre registry
  // dans leur projet pour enregistrer leurs décodeurs statiques générés
}

// Enregistrer automatiquement au chargement du module
registerAllStaticDecoders()

