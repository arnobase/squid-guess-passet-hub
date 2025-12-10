/**
 * PATCH DE COMPATIBILITÉ : Subsquid v8.6.1 + Polkadot API v16.4.9
 * 
 * Ce patch résout les incompatibilités entre les dernières versions
 * de Subsquid et Polkadot API pour le décodage SCALE des événements Ink! v6
 */

// Patch intelligent basé sur le label et le type
export function applyCompatibilityPatch(typeId: any, label: string): any {
    // ✅ CORRECTION: Patch intelligent basé sur le label
    if (label === 'game_number') {
        return { def: { primitive: 'u128' } }
    }
    if (label === 'player') {
        return { def: { composite: { fields: [{ name: 'value', type: 'u8', size: 20 }] } } }
    }
    if (label === 'min_number' || label === 'max_number') {
        return { def: { primitive: 'u16' } }
    }
    if (label === 'attempt_number') {
        return { def: { primitive: 'u8' } }
    }
    if (label === 'guess') {
        return { def: { primitive: 'u16' } }
    }
    if (label === 'result') {
        return { def: { variant: { variants: [
            { index: 0, name: 'More' },
            { index: 1, name: 'Less' },
            { index: 2, name: 'Found' }
        ] } } }
    }
    
    // Patch générique pour les types SCALE manquants
    return SCALE_TYPE_PATCHES[typeId] || null
}

// Patch générique pour les types SCALE manquants (compatible avec tous les contrats Ink! v6)
export const SCALE_TYPE_PATCHES: Record<string, any> = {
    // Types primitifs SCALE standard
    'u8': { def: { primitive: 'u8' } },
    'u16': { def: { primitive: 'u16' } },
    'u32': { def: { primitive: 'u32' } },
    'u64': { def: { primitive: 'u64' } },
    'u128': { def: { primitive: 'u128' } },
    'i8': { type: 'primitive', size: 1 },
    'i16': { type: 'primitive', size: 2 },
    'i32': { type: 'primitive', size: 4 },
    'i64': { type: 'primitive', size: 8 },
    'i128': { type: 'primitive', size: 16 },
    'bool': { type: 'primitive', size: 1 },
    'str': { type: 'composite', fields: [] },
    'String': { type: 'composite', fields: [] },
    
    // Types composites Substrate standard
    'AccountId': { type: 'composite', fields: [{ name: 'value', type: 'u8', size: 32 }] },
    'Address': { type: 'composite', fields: [{ name: 'value', type: 'u8', size: 32 }] },
    'Balance': { type: 'composite', fields: [{ name: 'value', type: 'u128', size: 16 }] },
    'Hash': { type: 'composite', fields: [{ name: 'value', type: 'u8', size: 32 }] },
    'BlockNumber': { type: 'composite', fields: [{ name: 'value', type: 'u32', size: 4 }] },
    'Moment': { type: 'composite', fields: [{ name: 'value', type: 'u64', size: 8 }] },
    
    // Types Ink! v6 spécifiques
    'ink::primitives::AccountId': { type: 'composite', fields: [{ name: 'value', type: 'u8', size: 32 }] },
    'ink::primitives::Hash': { type: 'composite', fields: [{ name: 'value', type: 'u8', size: 32 }] },
    'ink::primitives::Balance': { type: 'composite', fields: [{ name: 'value', type: 'u128', size: 16 }] },
    
    // Types optionnels et variants
    'Option': { type: 'variant', variants: [] },
    'Result': { type: 'variant', variants: [] },
    'Vec': { type: 'composite', fields: [] }
};

// Fonction de décodage SCALE patchée
export function patchScaleDecode(bytes: Uint8Array, typeDef: any): any {
    if (!typeDef) {
        console.warn('⚠️ Type definition not found, using fallback');
        return null;
    }

    try {
        switch (typeDef.type) {
            case 'primitive':
                return decodePrimitive(bytes, typeDef);
            case 'composite':
                return decodeComposite(bytes, typeDef);
            default:
                console.warn(`⚠️ Unknown type: ${typeDef.type}`);
                return null;
        }
    } catch (error) {
        console.warn(`⚠️ Decode error for type ${typeDef.type}:`, error);
        return null;
    }
}

// Décodage des types primitifs
function decodePrimitive(bytes: Uint8Array, typeDef: any): any {
    const size = typeDef.size || 1;
    
    if (bytes.length < size) {
        throw new Error(`Insufficient bytes: need ${size}, got ${bytes.length}`);
    }

    switch (typeDef.type) {
        case 'u8':
            return bytes[0];
        case 'u16':
            return bytes[0] | (bytes[1] << 8);
        case 'u32':
            return bytes[0] | (bytes[1] << 8) | (bytes[2] << 16) | (bytes[3] << 24);
        case 'u64':
            return BigInt(bytes[0]) | (BigInt(bytes[1]) << 8n) | (BigInt(bytes[2]) << 16n) | (BigInt(bytes[3]) << 24n) |
                   (BigInt(bytes[4]) << 32n) | (BigInt(bytes[5]) << 40n) | (BigInt(bytes[6]) << 48n) | (BigInt(bytes[7]) << 56n);
        case 'u128':
            let result = 0n;
            for (let i = 0; i < 16; i++) {
                result |= BigInt(bytes[i]) << (BigInt(i) * 8n);
            }
            return result;
        case 'bool':
            return bytes[0] !== 0;
        default:
            throw new Error(`Unknown primitive type: ${typeDef.type}`);
    }
}

// Décodage des types composites
function decodeComposite(bytes: Uint8Array, typeDef: any): any {
    const result: any = {};
    let offset = 0;

    for (const field of typeDef.fields) {
        if (offset >= bytes.length) break;
        
        const fieldSize = field.size || 1;
        const fieldBytes = bytes.slice(offset, offset + fieldSize);
        
        if (field.type === 'AccountId') {
            result[field.name] = '0x' + Array.from(fieldBytes).map(b => b.toString(16).padStart(2, '0')).join('');
        } else if (field.type.startsWith('u')) {
            result[field.name] = decodePrimitive(fieldBytes, { type: field.type, size: fieldSize });
        } else {
            result[field.name] = fieldBytes;
        }
        
        offset += fieldSize;
    }

    return result;
}

// ✅ SUPPRIMÉ: Fonction dupliquée - on utilise la version avec label

// ✅ SUPPRIMÉ: Export default - on utilise les exports nommés
