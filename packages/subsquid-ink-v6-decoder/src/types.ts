/**
 * Types communs pour les décodeurs Ink! v6
 */

/**
 * Mode de décodage
 */
export enum DecoderMode {
  /** Mode statique : utilise les types générés (recommandé, plus performant) */
  STATIC = 'static',
  /** Mode runtime : charge les métadonnées JSON à l'exécution (flexible mais plus lent) */
  RUNTIME = 'runtime'
}

/**
 * Événement décodé
 */
export interface DecodedEvent {
  eventType: string
  data: Record<string, any>
  topics?: string[]
}

/**
 * Interface commune pour tous les décodeurs
 */
export interface Decoder {
  /**
   * Décode un événement Ink! v6
   * @param eventData - Données hexadécimales de l'événement
   * @param topics - Tableau des topics (topics[0] est la signature)
   * @param contractAddress - Adresse du contrat (optionnel, pour routing)
   * @param blockHeight - Hauteur du bloc (optionnel, pour routing de version)
   * @returns Événement décodé ou null si non décodable
   * 
   * Note: Cette méthode peut être async si le décodeur utilise des imports dynamiques
   */
  decodeEvent(
    eventData: string,
    topics: string[],
    contractAddress?: string,
    blockHeight?: number
  ): DecodedEvent | null | Promise<DecodedEvent | null>
}

