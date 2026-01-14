/**
 * Module générique pour décoder les événements Ink! v6 avec Subsquid
 * Compatible avec tous les contrats Ink! v6
 * 
 * Usage:
 * ```typescript
 * import { createInkDecoder } from './decoders'
 * 
 * const decoder = createInkDecoder({
 *     metadataPath: './my-contract.json',
 *     contractAddress: '0x...',
 *     eventTypeMapping: { 'MyEvent': 'my_event' },
 *     debugMode: true
 * })
 * 
 * const decoded = decoder.decodeEvent(eventData, topics, contractAddress)
 * ```
 */

import { readFileSync } from 'fs'
import { join } from 'path'
// ✅ SUPPRIMÉ: Import du patch - plus nécessaire avec la correction du bug

// Types pour les métadonnées Ink! v6
export interface InkEventMetadata {
    label: string
    args: Array<{
        label: string
        type: number
        indexed?: boolean
    }>
    signature_topic: string
}

export interface InkTypeDefinition {
    id: number
    type: {
        def: {
            primitive?: string
            variant?: {
                variants: Array<{
                    index: number
                    name: string
                }>
            }
            composite?: {
                fields: Array<{
                    name?: string
                    type: number
                    typeName?: string
                }>
            }
            array?: {
                len: number
                type: number
            }
            tuple?: number[]
        }
        params?: Array<{
            name: string
            type: number
        }>
    }
}

export interface InkContractMetadata {
    events: InkEventMetadata[]
    types: InkTypeDefinition[]
}

export interface InkDecodedEvent {
    eventType: string
    data: Record<string, any>
    topics?: string[]
}

export interface InkDecoderConfig {
    metadataPath: string
    contractAddress: string
    eventTypeMapping?: Record<string, string>
    debugMode?: boolean
}

/**
 * Décodeur générique pour les événements Ink! v6
 */
export class SubsquidInkDecoder {
    private eventCache: Map<string, InkEventMetadata> = new Map()
    private typeCache: Map<number, InkTypeDefinition> = new Map()
    private config: InkDecoderConfig

    constructor(config: InkDecoderConfig) {
        this.config = config
        this.loadMetadata()
        
        // ✅ SUPPRIMÉ: Patch appliqué directement dans getPatchedTypeDefinition
    }

    /**
     * Charge les métadonnées du contrat
     */
    private loadMetadata(): void {
        try {
            const metadataContent = readFileSync(this.config.metadataPath, 'utf-8')
            const rawMetadata = JSON.parse(metadataContent)
            
            // Extraire les métadonnées selon le format Ink! v6
            const metadata: InkContractMetadata = {
                events: rawMetadata.spec?.events || [],
                types: rawMetadata.types || []
            }

            // Créer le cache des événements (signatures normalisées)
            metadata.events.forEach(event => {
                const normalizedKey = event.signature_topic.startsWith('0x') 
                    ? event.signature_topic.slice(2) 
                    : event.signature_topic
                this.eventCache.set(normalizedKey, event)
            })

            // Créer le cache des types
            metadata.types.forEach(type => {
                this.typeCache.set(type.id, type)
            })

            if (this.config.debugMode) {
                console.log(`📊 Loaded ${metadata.events.length} events and ${metadata.types.length} types`)
                console.log(`🎯 Available events: ${metadata.events.map(e => e.label).join(', ')}`)
            }
        } catch (error) {
            console.error('❌ Failed to load contract metadata:', error)
            throw new Error(`Failed to load metadata from ${this.config.metadataPath}`)
        }
    }

    /**
     * Décode un événement Ink! v6
     */
    public decodeEvent(eventData: string, topics: string[], contractAddress?: string): InkDecodedEvent | null {
        try {
            if (topics.length === 0) {
                return null
            }

            // Normaliser la signature
            const signatureHex = topics[0].startsWith('0x') ? topics[0].slice(2) : topics[0]
            const eventMetadata = this.eventCache.get(signatureHex)

            if (!eventMetadata) {
                if (this.config.debugMode) {
                    console.log(`❌ Event metadata not found for signature: ${signatureHex}`)
                }
                return null
            }

            if (this.config.debugMode) {
                console.log(`🔍 Decoding ${eventMetadata.label} event`)
            }

            // Décode les données de l'événement
            const eventBytes = this.hexToBytes(eventData)
            const decodedData = this.decodeEventData(eventBytes, eventMetadata, topics)

            // Mapper le type d'événement si nécessaire
            const eventType = this.config.eventTypeMapping?.[eventMetadata.label] || eventMetadata.label.toLowerCase()

            return {
                eventType,
                data: decodedData,
                topics
            }
        } catch (error) {
            console.error('❌ Error decoding event:', error)
            return null
        }
    }

    /**
     * Décode les données d'un événement
     */
    private decodeEventData(eventBytes: Uint8Array, eventMetadata: InkEventMetadata, topics: string[] = []): Record<string, any> {
        const result: Record<string, any> = {}
        let offset = 0
        let topicIndex = 1 // topics[0] est la signature

        // D'abord, décoder tous les arguments indexés depuis les topics
        for (const arg of eventMetadata.args) {
            if (arg.indexed) {
                if (topicIndex < topics.length) {
                    const topicHex = topics[topicIndex]
                    const typeId = typeof arg.type === 'object' ? (arg.type as any).type : arg.type
                    const typeDef = this.typeCache.get(typeId)
                    
                    if (typeDef) {
                        // Décoder le topic (32 bytes, données paddées)
                        const topicBytes = this.hexToBytes(topicHex)
                        const { value } = this.decodeValue(topicBytes, 0, typeDef)
                        result[arg.label] = value
                        if (this.config.debugMode) {
                            console.log(`🔍 Decoded indexed arg ${arg.label}:`, value, `from topic: ${topicHex}`)
                        }
                    } else {
                        console.warn(`⚠️ Type definition not found for indexed arg ${arg.label}`)
                    }
                    topicIndex++
                }
            }
        }

        // Ensuite, décoder uniquement les arguments non-indexés depuis eventData
        // Mais d'abord, calculer l'offset en sautant les arguments indexés
        let dataOffset = 0
        
        // Calculer l'offset en sautant les arguments indexés dans les données
        for (const arg of eventMetadata.args) {
            if (arg.indexed) {
                // Sauter cet argument dans les données (il est dans les topics)
                const typeId = typeof arg.type === 'object' ? (arg.type as any).type : arg.type
                const typeDef = this.typeCache.get(typeId)
                if (typeDef) {
                    const { newOffset } = this.decodeValue(eventBytes, dataOffset, typeDef)
                    dataOffset = newOffset
                    if (this.config.debugMode) {
                        console.log(`🔍 Skipped indexed arg ${arg.label} in data, new offset: ${dataOffset}`)
                    }
                }
            }
        }
        
        // Maintenant décoder les arguments non-indexés depuis le bon offset
        for (const arg of eventMetadata.args) {
            if (arg.indexed) {
                continue // Ignorer les arguments indexés
            }

            const typeId = typeof arg.type === 'object' ? (arg.type as any).type : arg.type
            if (this.config.debugMode && arg.type === undefined) {
                console.log(`🔍 Debug arg:`, arg)
            }
            
            const typeDef = this.typeCache.get(typeId)
            if (!typeDef) {
                console.warn(`⚠️ Type definition not found for type ${typeId}, skipping`)
                continue
            }

            const { value, newOffset } = this.decodeValue(eventBytes, dataOffset, typeDef)
            result[arg.label] = value
            dataOffset = newOffset
            
            if (this.config.debugMode) {
                console.log(`🔍 Decoded non-indexed arg ${arg.label}:`, value)
            }
        }

        return result
    }

    /**
     * Décode une valeur selon son type
     */
    private decodeValue(bytes: Uint8Array, offset: number, typeDef: InkTypeDefinition): { value: any, newOffset: number } {
        const def = typeDef.type.def

        if (def.primitive) {
            return this.decodePrimitive(bytes, offset, def.primitive)
        } else if (def.composite) {
            const result = this.decodeComposite(bytes, offset, def.composite)
            // Convertir les adresses en hexadécimal (format brut)
            if (this.isAddressType(typeDef)) {
                result.value = this.convertAddressToHex(result.value)
            }
            return result
        } else if (def.variant) {
            return this.decodeVariant(bytes, offset, def.variant)
        } else if (def.array) {
            return this.decodeArray(bytes, offset, def.array)
        } else if (def.tuple) {
            return this.decodeTuple(bytes, offset, def.tuple)
        }

        throw new Error(`Unsupported type definition: ${JSON.stringify(def)}`)
    }

    /**
     * Décode les types primitifs
     */
    private decodePrimitive(bytes: Uint8Array, offset: number, primitive: string): { value: any, newOffset: number } {
        switch (primitive) {
            case 'u8':
                return { value: bytes[offset], newOffset: offset + 1 }
            case 'u16':
                return { value: this.readU16(bytes, offset), newOffset: offset + 2 }
            case 'u32':
                return { value: this.readU32(bytes, offset), newOffset: offset + 4 }
            case 'u64':
                return { value: this.readU64(bytes, offset), newOffset: offset + 8 }
            case 'u128':
                return { value: this.readU128(bytes, offset), newOffset: offset + 16 }
            case 'i8':
                return { value: this.readI8(bytes, offset), newOffset: offset + 1 }
            case 'i16':
                return { value: this.readI16(bytes, offset), newOffset: offset + 2 }
            case 'i32':
                return { value: this.readI32(bytes, offset), newOffset: offset + 4 }
            case 'i64':
                return { value: this.readI64(bytes, offset), newOffset: offset + 8 }
            case 'i128':
                return { value: this.readI128(bytes, offset), newOffset: offset + 16 }
            case 'bool':
                return { value: bytes[offset] !== 0, newOffset: offset + 1 }
            case 'str':
                return this.decodeString(bytes, offset)
            default:
                throw new Error(`Unsupported primitive type: ${primitive}`)
        }
    }

    /**
     * Décode les types composites
     */
    private decodeComposite(bytes: Uint8Array, offset: number, composite: any): { value: any, newOffset: number } {
        const result: Record<string, any> = {}
        let currentOffset = offset

        for (const field of composite.fields) {
            const typeId = typeof field.type === 'object' ? (field.type as any).id : field.type
            const typeDef = this.typeCache.get(typeId)
            if (!typeDef) {
                console.warn(`⚠️ Type definition not found for field type ${typeId}`)
                continue
            }

            const { value, newOffset } = this.decodeValue(bytes, currentOffset, typeDef)
            result[field.name || 'field'] = value
            currentOffset = newOffset
        }

        return { value: result, newOffset: currentOffset }
    }

    /**
     * Décode les variants (enums)
     */
    private decodeVariant(bytes: Uint8Array, offset: number, variant: any): { value: any, newOffset: number } {
        const variantIndex = bytes[offset]
        const variantDef = variant.variants[variantIndex]
        
        if (!variantDef) {
            throw new Error(`Invalid variant index: ${variantIndex}`)
        }

        return { value: variantDef.name, newOffset: offset + 1 }
    }

    /**
     * Décode les tableaux
     */
    private decodeArray(bytes: Uint8Array, offset: number, array: any): { value: any, newOffset: number } {
        const result: any[] = []
        let currentOffset = offset

        for (let i = 0; i < array.len; i++) {
            const typeDef = this.typeCache.get(array.type)
            if (!typeDef) {
                console.warn(`⚠️ Type definition not found for array element type ${array.type}`)
                continue
            }

            const { value, newOffset } = this.decodeValue(bytes, currentOffset, typeDef)
            result.push(value)
            currentOffset = newOffset
        }

        return { value: result, newOffset: currentOffset }
    }

    /**
     * Décode les tuples
     */
    private decodeTuple(bytes: Uint8Array, offset: number, tuple: number[]): { value: any, newOffset: number } {
        const result: any[] = []
        let currentOffset = offset

        for (const typeId of tuple) {
            const typeDef = this.typeCache.get(typeId)
            if (!typeDef) {
                console.warn(`⚠️ Type definition not found for tuple element type ${typeId}`)
                continue
            }

            const { value, newOffset } = this.decodeValue(bytes, currentOffset, typeDef)
            result.push(value)
            currentOffset = newOffset
        }

        return { value: result, newOffset: currentOffset }
    }

    /**
     * Décode une chaîne de caractères
     */
    private decodeString(bytes: Uint8Array, offset: number): { value: string, newOffset: number } {
        const length = this.readU32(bytes, offset)
        const stringBytes = bytes.slice(offset + 4, offset + 4 + length)
        const value = new TextDecoder().decode(stringBytes)
        return { value, newOffset: offset + 4 + length }
    }

    // Méthodes utilitaires pour lire les types numériques
    private readU8(bytes: Uint8Array, offset: number): number {
        return bytes[offset]
    }

    private readU16(bytes: Uint8Array, offset: number): number {
        return bytes[offset] | (bytes[offset + 1] << 8)
    }

    private readU32(bytes: Uint8Array, offset: number): number {
        return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)
    }

    private readU64(bytes: Uint8Array, offset: number): bigint {
        let result = 0n
        for (let i = 0; i < 8; i++) {
            result |= BigInt(bytes[offset + i]) << BigInt(i * 8)
        }
        return result
    }

    private readU128(bytes: Uint8Array, offset: number): bigint {
        let result = 0n
        for (let i = 0; i < 16; i++) {
            result |= BigInt(bytes[offset + i]) << BigInt(i * 8)
        }
        return result
    }

    private readI8(bytes: Uint8Array, offset: number): number {
        const value = bytes[offset]
        return value > 127 ? value - 256 : value
    }

    private readI16(bytes: Uint8Array, offset: number): number {
        const value = this.readU16(bytes, offset)
        return value > 32767 ? value - 65536 : value
    }

    private readI32(bytes: Uint8Array, offset: number): number {
        const value = this.readU32(bytes, offset)
        return value > 2147483647 ? value - 4294967296 : value
    }

    private readI64(bytes: Uint8Array, offset: number): bigint {
        const value = this.readU64(bytes, offset)
        return value > 9223372036854775807n ? value - 18446744073709551616n : value
    }

    private readI128(bytes: Uint8Array, offset: number): bigint {
        const value = this.readU128(bytes, offset)
        return value > 170141183460469231731687303715884105727n ? value - 340282366920938463463374607431768211456n : value
    }

    /**
     * Convertit une chaîne hexadécimale en bytes
     */
    private hexToBytes(hex: string): Uint8Array {
        const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex
        const bytes = new Uint8Array(cleanHex.length / 2)
        for (let i = 0; i < cleanHex.length; i += 2) {
            bytes[i / 2] = parseInt(cleanHex.substr(i, 2), 16)
        }
        return bytes
    }

    /**
     * Vérifie si un type est une adresse
     */
    private isAddressType(typeDef: InkTypeDefinition): boolean {
        // Vérifier si c'est un type composite avec un champ "field" de 20 bytes
        if (typeDef.type?.def?.composite?.fields) {
            const fields = typeDef.type.def.composite.fields
            if (fields.length === 1 && fields[0].name === 'value') {
                const fieldType = fields[0].type
                if (typeof fieldType === 'string' && fieldType === 'u8' && (fields[0] as any).size === 20) {
                    return true
                }
            }
        }
        return false
    }

    /**
     * Convertit une adresse décodée en hexadécimal
     */
    private convertAddressToHex(addressValue: any): string {
        if (addressValue && typeof addressValue === 'object' && addressValue.field && Array.isArray(addressValue.field)) {
            // Convertir le tableau de bytes en hexadécimal
            const hexBytes = addressValue.field.map((byte: number) => byte.toString(16).padStart(2, '0')).join('')
            return `0x${hexBytes}`
        }
        return addressValue
    }

}

/**
 * Factory function pour créer un décodeur Ink! v6
 */
export function createInkDecoder(config: InkDecoderConfig): SubsquidInkDecoder {
    return new SubsquidInkDecoder(config)
}

/**
 * Configuration par défaut pour le contrat "Guess the Number"
 * (Gardé pour compatibilité)
 */
export function createGuessTheNumberDecoder(contractAddress: string, debugMode = false): SubsquidInkDecoder {
    return createInkDecoder({
        metadataPath: join(__dirname, '../../../guess_the_number.json'),
        contractAddress,
        eventTypeMapping: {
            'NewGame': 'game_started',
            'GuessMade': 'guess_submitted',
            'ClueGiven': 'clue_given'
        },
        debugMode
    })
}
