#!/usr/bin/env node
/**
 * Script pour générer un décodeur statique basé sur PAPI
 * 
 * Usage:
 *   node scripts/generate-papi-static-decoder.mjs \
 *     --metadata metadata/guess_the_number_westend.json \
 *     --output src/types/ink/guess_the_number/v0.1.3/papi-events.ts \
 *     --contract guess_the_number \
 *     --version v0.1.3
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Parser les arguments
const args = process.argv.slice(2)
const config = {
    metadataPath: '',
    outputPath: '',
    contractName: '',
    versionTag: ''
}

for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg.startsWith('--')) {
        const key = arg.replace('--', '')
        const value = args[i + 1]
        if (value && !value.startsWith('--')) {
            // Map les clés courtes aux clés complètes
            const keyMap = {
                'metadata': 'metadataPath',
                'output': 'outputPath',
                'contract': 'contractName',
                'version': 'versionTag'
            }
            const mappedKey = keyMap[key] || key
            config[mappedKey] = value
            i++ // Skip next arg as it's the value
        }
    }
}

if (!config.metadataPath || !config.outputPath || !config.contractName || !config.versionTag) {
    console.error('Usage: node scripts/generate-papi-static-decoder.mjs \\')
    console.error('  --metadata <path> \\')
    console.error('  --output <path> \\')
    console.error('  --contract <name> \\')
    console.error('  --version <tag>')
    console.error('')
    console.error('Config reçue:', JSON.stringify(config, null, 2))
    process.exit(1)
}

// Charger PAPI
const { getInkLookup, getInkDynamicBuilder } = await import('@polkadot-api/ink-contracts')

// Charger les métadonnées
const metadata = JSON.parse(readFileSync(config.metadataPath, 'utf-8'))

// Créer le lookup et builder
const lookup = getInkLookup(metadata)
const builder = getInkDynamicBuilder(lookup)

// Extraire les événements
const events = metadata.spec.events || []

// Générer le code
const code = generateCode(config, events)

// Créer le répertoire si nécessaire
const outputDir = dirname(config.outputPath)
try {
    mkdirSync(outputDir, { recursive: true })
} catch (e) {
    // Directory might already exist
}

// Écrire le fichier
writeFileSync(config.outputPath, code, 'utf-8')

console.log(`✅ Décodeur statique PAPI généré: ${config.outputPath}`)

function generateCode(config, events) {
    const lines = []
    
    // En-tête
    lines.push('/**')
    lines.push(' * Décodeur statique basé sur PAPI pour ' + config.contractName)
    lines.push(' * ')
    lines.push(' * Ce fichier est généré automatiquement.')
    lines.push(' * Le cache des types PAPI est pré-calculé, évitant le parsing des métadonnées.')
    lines.push(' * ')
    lines.push(' * @generated - Ne pas modifier manuellement')
    lines.push(' * @version ' + config.versionTag)
    lines.push(' */')
    lines.push('')
    
    // Métadonnées embarquées
    lines.push('// Métadonnées pour créer le lookup (chargées une seule fois)')
    lines.push('const METADATA = ' + JSON.stringify(metadata, null, 2) + ' as any')
    lines.push('')
    
    // Cache
    lines.push('// Cache du lookup et builder (créés une seule fois au chargement du module)')
    lines.push('let cachedLookup: any = null')
    lines.push('let cachedBuilder: any = null')
    lines.push('let papiModule: any = null')
    lines.push('const codecCache: Map<string, any> = new Map()')
    lines.push('')
    
    // Initialisation avec import dynamique (pour compatibilité ESM/CommonJS)
    lines.push('async function ensureInitialized(): Promise<void> {')
    lines.push('  if (cachedLookup && cachedBuilder) return')
    lines.push('  ')
    lines.push('  // Import dynamique pour éviter les problèmes ESM/CommonJS')
    lines.push('  if (!papiModule) {')
    lines.push('    papiModule = await import(\'@polkadot-api/ink-contracts\')')
    lines.push('  }')
    lines.push('  ')
    lines.push('  cachedLookup = papiModule.getInkLookup(METADATA)')
    lines.push('  cachedBuilder = papiModule.getInkDynamicBuilder(cachedLookup)')
    lines.push('}')
    lines.push('')
    
    // Obtenir codec avec cache
    lines.push('async function getEventCodec(signatureTopic: string): Promise<any> {')
    lines.push('  await ensureInitialized()')
    lines.push('  ')
    lines.push('  let codec = codecCache.get(signatureTopic)')
    lines.push('  if (codec) return codec')
    lines.push('  ')
    lines.push('  codec = cachedBuilder.buildEvent(signatureTopic)')
    lines.push('  if (codec) codecCache.set(signatureTopic, codec)')
    lines.push('  return codec')
    lines.push('}')
    lines.push('')
    
    // Mapping des signatures
    lines.push('export const EVENT_SIGNATURES = {')
    events.forEach(evt => {
        if (evt.signature_topic) {
            const sig = evt.signature_topic.startsWith('0x') ? evt.signature_topic.slice(2) : evt.signature_topic
            const name = evt.label.toLowerCase().replace(/([A-Z])/g, '_$1').toLowerCase()
            lines.push(`  '${sig}': '${name}',`)
        }
    })
    lines.push('} as const')
    lines.push('')
    
    // Helper functions for topic extraction
    lines.push('// Helper functions for topic extraction')
    lines.push('function hexToBytes(hex: string): Uint8Array {')
    lines.push('  const cleanHex = hex.startsWith(\'0x\') ? hex.slice(2) : hex')
    lines.push('  const bytes = new Uint8Array(cleanHex.length / 2)')
    lines.push('  for (let i = 0; i < cleanHex.length; i += 2) {')
    lines.push('    bytes[i / 2] = parseInt(cleanHex.substr(i, 2), 16)')
    lines.push('  }')
    lines.push('  return bytes')
    lines.push('}')
    lines.push('')
    lines.push('function bytesToHex(bytes: Uint8Array): string {')
    lines.push('  return Array.from(bytes).map(b => b.toString(16).padStart(2, \'0\')).join(\'\')')
    lines.push('}')
    lines.push('')
    
    // Build indexed fields map from events metadata
    const indexedFieldsMap = {}
    events.forEach(evt => {
        if (!evt.signature_topic || !evt.args) return
        const sig = evt.signature_topic.startsWith('0x') ? evt.signature_topic.slice(2) : evt.signature_topic
        indexedFieldsMap[sig] = evt.args
            .map((arg, idx) => ({ ...arg, index: idx }))
            .filter(arg => arg.indexed)
    })
    
    // Fonction principale
    lines.push('/**')
    lines.push(' * Décode un événement avec signature (compatible avec le format attendu par le registry)')
    lines.push(' * @param signatureHex - Signature de l\'événement (topics[0] sans 0x)')
    lines.push(' * @param dataHex - Données de l\'événement (hex string)')
    lines.push(' * @param topics - Topics de l\'événement')
    lines.push(' * @returns Événement décodé avec eventType et data, ou null')
    lines.push(' */')
    lines.push('export async function decodeEvent(')
    lines.push('  signatureHex: string,')
    lines.push('  dataHex: string,')
    lines.push('  topics: string[]')
    lines.push('): Promise<{ eventType: string; data: Record<string, any> } | null> {')
    lines.push('  try {')
    lines.push('    if (topics.length === 0) return null')
    lines.push('    ')
    lines.push('    const signatureTopic = signatureHex.startsWith(\'0x\')')
    lines.push('      ? signatureHex')
    lines.push('      : \'0x\' + signatureHex')
    lines.push('    ')
    lines.push('    const eventCodec = await getEventCodec(signatureTopic)')
    lines.push('    ')
    lines.push('    if (!eventCodec) {')
    lines.push('      console.warn(`Event not found for signature: ${signatureTopic}`)')
    lines.push('      return null')
    lines.push('    }')
    lines.push('    ')
    lines.push('    // Convertir eventData en Uint8Array')
    lines.push('    const hex = dataHex.startsWith(\'0x\') ? dataHex.slice(2) : dataHex')
    lines.push('    const dataBytes = new Uint8Array(Buffer.from(hex, \'hex\'))')
    lines.push('    ')
    lines.push('    // Décoder avec le codec PAPI')
    lines.push('    const decoded = eventCodec.dec(dataBytes)')
    lines.push('    ')
    lines.push('    // Debug: vérifier la structure de decoded')
    lines.push('    if (!decoded || typeof decoded !== \'object\') {')
    lines.push('      console.warn(`Invalid decoded structure: ${typeof decoded}`, decoded)')
    lines.push('      return null')
    lines.push('    }')
    lines.push('    ')
    lines.push('    // Normaliser les valeurs')
    lines.push('    const result: Record<string, any> = {}')
    lines.push('    ')
    lines.push('    // decoded peut avoir différentes structures selon PAPI')
    lines.push('    // Vérifier si c\'est decoded.value ou decoded directement')
    lines.push('    const decodedValue = (decoded as any).value || decoded')
    lines.push('    ')
    lines.push('    // ✅ FIX: Extract indexed fields from topics before normalizing')
    lines.push('    const sigWithout0x = signatureTopic.startsWith(\'0x\') ? signatureTopic.slice(2) : signatureTopic')
    lines.push('    const indexedFields = METADATA.spec.events.find((e: any) => {')
    lines.push('      const eSig = e.signature_topic?.startsWith(\'0x\') ? e.signature_topic.slice(2) : e.signature_topic')
    lines.push('      return eSig === sigWithout0x')
    lines.push('    })?.args?.filter((a: any) => a.indexed) || []')
    lines.push('    ')
    lines.push('    let topicIndex = 1 // Start after signature (topics[0])')
    lines.push('    ')
    lines.push('    if (decodedValue && typeof decodedValue === \'object\') {')
    lines.push('      for (const [key, value] of Object.entries(decodedValue)) {')
    lines.push('        // ✅ FIX: Extract indexed fields from topics')
    lines.push('        const indexedField = indexedFields.find((f: any) => f.label === key)')
    lines.push('        if (indexedField && topicIndex < topics.length) {')
    lines.push('          const topicBytes = hexToBytes(topics[topicIndex])')
    lines.push('          if (topicBytes.length >= 32) {')
    lines.push('            // Determine field type and extract accordingly')
    lines.push('            const typeId = typeof indexedField.type === \'object\' ? indexedField.type.type : indexedField.type')
    lines.push('            const typeDef = METADATA.types.find((t: any) => t.id === typeId)')
    lines.push('            ')
    lines.push('            if (typeDef?.def?.primitive === \'U128\' || typeDef?.def?.primitive === \'U256\') {')
    lines.push('              // Read u128/u256 from first 16/32 bytes (little-endian)')
    lines.push('              const bytesToRead = typeDef.def.primitive === \'U128\' ? 16 : 32')
    lines.push('              let num = 0n')
    lines.push('              for (let i = 0; i < bytesToRead; i++) {')
    lines.push('                num += BigInt(topicBytes[i]) << BigInt(i * 8)')
    lines.push('              }')
    lines.push('              result[key] = num.toString()')
    lines.push('            } else if (typeDef?.def?.composite?.fields) {')
    lines.push('              // H160/H256 address - extract from last 20/32 bytes')
    lines.push('              const fieldType = typeDef.def.composite.fields[0]?.type')
    lines.push('              const fieldTypeDef = METADATA.types.find((t: any) => t.id === fieldType)')
    lines.push('              if (fieldTypeDef?.def?.primitive === \'U8\') {')
    lines.push('                // Array of U8 - likely H160 (20 bytes) or H256 (32 bytes)')
    lines.push('                const arrayLen = typeDef.def.composite.fields.length')
    lines.push('                const addrBytes = topicBytes.slice(topicBytes.length - arrayLen)')
    lines.push('                result[key] = bytesToHex(addrBytes)')
    lines.push('              } else {')
    lines.push('                // Fallback: extract last 20 bytes (H160)')
    lines.push('                const addrBytes = topicBytes.slice(topicBytes.length - 20)')
    lines.push('                result[key] = bytesToHex(addrBytes)')
    lines.push('              }')
    lines.push('            } else {')
    lines.push('              // Fallback for H160: extract last 20 bytes')
    lines.push('              const addrBytes = topicBytes.slice(topicBytes.length - 20)')
    lines.push('              result[key] = bytesToHex(addrBytes)')
    lines.push('            }')
    lines.push('            topicIndex++')
    lines.push('            continue')
    lines.push('          }')
    lines.push('        }')
    lines.push('        ')
    lines.push('        result[key] = normalizeValue(value)')
    lines.push('      }')
    lines.push('    }')
    lines.push('    ')
    lines.push('    // Retourner au format attendu : { eventType, data }')
    lines.push('    // decoded.type peut être dans decoded.type ou décodé depuis la signature')
    lines.push('    let eventType: string')
    lines.push('    if ((decoded as any).type) {')
    lines.push('      eventType = convertEventTypeToSnakeCase((decoded as any).type)')
    lines.push('    } else {')
    lines.push('      // Fallback: utiliser la signature pour trouver le nom de l\'événement')
    lines.push('      const eventName = EVENT_SIGNATURES[sigWithout0x as keyof typeof EVENT_SIGNATURES]')
    lines.push('      if (eventName) {')
    lines.push('        eventType = eventName')
    lines.push('      } else {')
    lines.push('        console.warn(`Could not determine eventType for signature ${signatureTopic}`)')
    lines.push('        return null')
    lines.push('      }')
    lines.push('    }')
    lines.push('    ')
    lines.push('    return {')
    lines.push('      eventType,')
    lines.push('      data: result')
    lines.push('    } as { eventType: string; data: Record<string, any> }')
    lines.push('  } catch (error) {')
    lines.push('    console.error(\'Error decoding event:\', error)')
    lines.push('    return null')
    lines.push('  }')
    lines.push('}')
    lines.push('')
    
    // Helper function for event type conversion
    lines.push('function convertEventTypeToSnakeCase(pascalCase: string): string {')
    lines.push('  return pascalCase')
    lines.push('    .replace(/([A-Z])/g, \'_$1\')')
    lines.push('    .toLowerCase()')
    lines.push('    .replace(/^_/, \'\')')
    lines.push('}')
    lines.push('')
    
    // Normalisation
    lines.push('function normalizeValue(value: any): any {')
    lines.push('  if (value === null || value === undefined) return value')
    lines.push('  if (typeof value === \'bigint\') return value.toString()')
    lines.push('  if (typeof value !== \'object\') return value')
    lines.push('  ')
    lines.push('  // FixedSizeBinary ou Binary')
    lines.push('  if (typeof value.asHex === \'function\') return value.asHex()')
    lines.push('  ')
    lines.push('  // ✅ FIX: Handle H160 addresses with field property (Uint8Array)')
    lines.push('  if (value.field && Array.isArray(value.field)) {')
    lines.push('    // Convert byte array to hexadecimal string')
    lines.push('    const hexBytes = value.field.map((byte: number) => byte.toString(16).padStart(2, \'0\')).join(\'\')')
    lines.push('    return hexBytes')
    lines.push('  }')
    lines.push('  ')
    lines.push('  // ✅ FIX: Handle Uint8Array directly')
    lines.push('  if (value instanceof Uint8Array) {')
    lines.push('    return Array.from(value).map((byte: number) => byte.toString(16).padStart(2, \'0\')).join(\'\')')
    lines.push('  }')
    lines.push('  ')
    lines.push('  // Enum/Variant')
    lines.push('  if (\'type\' in value && typeof value.type === \'string\') {')
    lines.push('    if (\'value\' in value && value.value !== undefined) {')
    lines.push('      return { type: value.type, value: normalizeValue(value.value) }')
    lines.push('    }')
    lines.push('    return value.type')
    lines.push('  }')
    lines.push('  ')
    lines.push('  // Tableau')
    lines.push('  if (Array.isArray(value)) return value.map(v => normalizeValue(v))')
    lines.push('  ')
    lines.push('  // Objet')
    lines.push('  const normalized: Record<string, any> = {}')
    lines.push('  for (const [k, v] of Object.entries(value)) {')
    lines.push('    if (typeof v !== \'function\') {')
    lines.push('      normalized[k] = normalizeValue(v)')
    lines.push('    }')
    lines.push('  }')
    lines.push('  return normalized')
    lines.push('}')
    lines.push('')
    
    // Fonctions par événement
    events.forEach(evt => {
        if (!evt.signature_topic) return
        
        const sig = evt.signature_topic.startsWith('0x') ? evt.signature_topic.slice(2) : evt.signature_topic
        const funcName = 'decode' + evt.label
        
        lines.push(`export async function ${funcName}(dataHex: string, topics: string[]): Promise<Record<string, unknown> | null> {`)
        lines.push(`  const sig = '${sig}'`)
        lines.push(`  const decoded = await decodeEvent(sig, dataHex, topics)`)
        lines.push(`  return decoded?.data || null`)
        lines.push(`}`)
        lines.push('')
    })
    
    return lines.join('\n')
}
