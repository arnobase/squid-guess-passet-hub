#!/usr/bin/env node
/**
 * Script pour mettre à jour les métadonnées Westend Asset Hub (Subsquid archive).
 * Exclut les versions qui causent des problèmes avec Subsquid (ex: DisallowSigned).
 *
 * For the guess-the-number-node chain, use: yarn metadata:chain (dumps from RPC).
 *
 * Usage: node scripts/update-metadata-safe.mjs [maxBlock]
 */

import { readFileSync, writeFileSync } from 'fs'

const METADATA_URL = 'https://v2.archive.subsquid.io/metadata/asset-hub-westend'
const OUTPUT_FILE = './westend-asset-hub-metadata-filtered.jsonl'
const MAX_BLOCK = process.argv[2] ? parseInt(process.argv[2]) : 13297591 // Dernier bloc connu qui fonctionne

async function updateMetadataSafe() {
  console.log(`📥 Téléchargement des métadonnées depuis ${METADATA_URL}...`)
  console.log(`🔒 Filtrage jusqu'au bloc ${MAX_BLOCK} (pour éviter DisallowSigned)`)
  
  try {
    const response = await fetch(METADATA_URL)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const text = await response.text()
    const lines = text.trim().split('\n').filter(line => line.trim())
    
    console.log(`✅ ${lines.length} versions téléchargées`)
    
    // Filtrer pour ne garder que les versions jusqu'au bloc max
    const filtered = []
    let lastBlock = 0
    
    for (const line of lines) {
      try {
        const meta = JSON.parse(line)
        const blockNumber = meta.blockNumber || 0
        
        if (blockNumber <= MAX_BLOCK) {
          filtered.push(line)
          lastBlock = Math.max(lastBlock, blockNumber)
        } else {
          // Arrêter dès qu'on dépasse le bloc max
          break
        }
      } catch (e) {
        console.warn(`⚠️  Erreur lors du parsing: ${e.message}`)
      }
    }
    
    // Écrire le fichier filtré
    writeFileSync(OUTPUT_FILE, filtered.join('\n') + '\n')
    
    console.log(`✅ ${filtered.length} versions sauvegardées dans ${OUTPUT_FILE}`)
    console.log(`📊 Dernier bloc couvert: ${lastBlock}`)
    console.log(`\n💡 Pour utiliser ces métadonnées, exécutez: yarn codegen`)
    
  } catch (error) {
    console.error(`❌ Erreur: ${error.message}`)
    process.exit(1)
  }
}

updateMetadataSafe()
