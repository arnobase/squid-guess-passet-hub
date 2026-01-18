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
    
    // Imports
    lines.push("import { getInkLookup, getInkDynamicBuilder } from '@polkadot-api/ink-contracts'")
    lines.push('')
    
    // Métadonnées embarquées
    lines.push('// Métadonnées pour créer le lookup (chargées une seule fois)')
    lines.push('const METADATA = ' + JSON.stringify(metadata, null, 2) + ' as any')
    lines.push('')
    
    // Cache
    lines.push('// Cache du lookup et builder (créés une seule fois au chargement du module)')
    lines.push('let cachedLookup: any = null')
    lines.push('let cachedBuilder: any = null')
    lines.push('const codecCache: Map<string, any> = new Map()')
    lines.push('')
    
    // Initialisation
    lines.push('function ensureInitialized(): void {')
    lines.push('  if (cachedLookup && cachedBuilder) return')
    lines.push('  ')
    lines.push('  cachedLookup = getInkLookup(METADATA)')
    lines.push('  cachedBuilder = getInkDynamicBuilder(cachedLookup)')
    lines.push('}')
    lines.push('')
    
    // Obtenir codec avec cache
    lines.push('function getEventCodec(signatureTopic: string): any {')
    lines.push('  ensureInitialized()')
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
    
    // Fonction principale
    lines.push('/**')
    lines.push(' * Décode un événement en utilisant PAPI avec cache pré-calculé')
    lines.push(' */')
    lines.push('export function decodeEvent(')
    lines.push('  eventData: string,')
    lines.push('  topics: string[]')
    lines.push('): Record<string, any> | null {')
    lines.push('  try {')
    lines.push('    if (topics.length === 0) return null')
    lines.push('    ')
    lines.push('    const signatureTopic = topics[0]')
    lines.push('    const eventCodec = getEventCodec(signatureTopic)')
    lines.push('    ')
    lines.push('    if (!eventCodec) {')
    lines.push('      console.warn(`Event not found for signature: ${signatureTopic}`)')
    lines.push('      return null')
    lines.push('    }')
    lines.push('    ')
    lines.push('    // Convertir eventData en Uint8Array')
    lines.push('    const hex = eventData.startsWith(\'0x\') ? eventData.slice(2) : eventData')
    lines.push('    const dataBytes = new Uint8Array(Buffer.from(hex, \'hex\'))')
    lines.push('    ')
    lines.push('    // Décoder avec le codec PAPI')
    lines.push('    const decoded = eventCodec.dec(dataBytes)')
    lines.push('    ')
    lines.push('    // Normaliser les valeurs')
    lines.push('    const result: Record<string, any> = {}')
    lines.push('    for (const [key, value] of Object.entries(decoded.value as Record<string, any>)) {')
    lines.push('      result[key] = normalizeValue(value)')
    lines.push('    }')
    lines.push('    ')
    lines.push('    return result')
    lines.push('  } catch (error) {')
    lines.push('    console.error(\'Error decoding event:\', error)')
    lines.push('    return null')
    lines.push('  }')
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
        
        const funcName = 'decode' + evt.label
        
        lines.push(`export function ${funcName}(dataHex: string, topics: string[]): Record<string, unknown> | null {`)
        lines.push(`  return decodeEvent(dataHex, topics)`)
        lines.push(`}`)
        lines.push('')
    })
    
    return lines.join('\n')
}
