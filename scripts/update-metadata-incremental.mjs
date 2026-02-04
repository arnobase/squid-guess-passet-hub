#!/usr/bin/env node
/**
 * Script pour compléter le fichier de métadonnées Westend Asset Hub (Subsquid archive).
 * Ajoute uniquement les nouvelles versions depuis le dernier bloc couvert.
 *
 * For the guess-the-number-node chain, use: yarn metadata:chain (dumps from RPC).
 *
 * Usage: node scripts/update-metadata-incremental.mjs [maxBlock]
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'

const METADATA_URL = 'https://v2.archive.subsquid.io/metadata/asset-hub-westend'
const OUTPUT_FILE = './westend-asset-hub-metadata-filtered.jsonl'
const MAX_BLOCK = process.argv[2] ? parseInt(process.argv[2]) : null // Optionnel : limite max pour éviter DisallowSigned

async function updateMetadataIncremental() {
  console.log(`📥 Téléchargement des métadonnées depuis ${METADATA_URL}...`)
  
  // Lire le fichier existant pour trouver le dernier bloc
  let existingLines = []
  let lastBlock = 0
  let lastSpecVersion = 0
  
  if (existsSync(OUTPUT_FILE)) {
    console.log(`📂 Lecture du fichier existant: ${OUTPUT_FILE}`)
    const existingContent = readFileSync(OUTPUT_FILE, 'utf-8')
    existingLines = existingContent.trim().split('\n').filter(line => line.trim())
    
    if (existingLines.length > 0) {
      // Trouver le dernier bloc dans le fichier existant
      for (const line of existingLines) {
        try {
          const meta = JSON.parse(line)
          const blockNumber = meta.blockNumber || 0
          const specVersion = meta.specVersion || 0
          if (blockNumber > lastBlock) {
            lastBlock = blockNumber
            lastSpecVersion = specVersion
          }
        } catch (e) {
          // Ignorer les lignes invalides
        }
      }
      console.log(`✅ Fichier existant: ${existingLines.length} versions, dernier bloc: ${lastBlock} (specVersion: ${lastSpecVersion})`)
    }
  } else {
    console.log(`⚠️  Fichier ${OUTPUT_FILE} non trouvé, création d'un nouveau fichier`)
  }
  
  try {
    const response = await fetch(METADATA_URL)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const text = await response.text()
    const allLines = text.trim().split('\n').filter(line => line.trim())
    
    console.log(`✅ ${allLines.length} versions disponibles depuis Subsquid`)
    
    // Filtrer pour ne garder que les nouvelles versions (après le dernier bloc)
    const newVersions = []
    let newLastBlock = lastBlock
    let addedCount = 0
    
    for (const line of allLines) {
      try {
        const meta = JSON.parse(line)
        const blockNumber = meta.blockNumber || 0
        const specVersion = meta.specVersion || 0
        
        // Garder seulement les versions après le dernier bloc existant
        if (blockNumber > lastBlock) {
          // Vérifier aussi la limite max si spécifiée (pour éviter DisallowSigned)
          if (MAX_BLOCK && blockNumber > MAX_BLOCK) {
            console.log(`⚠️  Exclusion du bloc ${blockNumber} (dépasse MAX_BLOCK ${MAX_BLOCK} pour éviter DisallowSigned)`)
            break // Arrêter dès qu'on dépasse la limite
          }
          
          newVersions.push(line)
          newLastBlock = Math.max(newLastBlock, blockNumber)
          addedCount++
        }
      } catch (e) {
        console.warn(`⚠️  Erreur lors du parsing: ${e.message}`)
      }
    }
    
    if (newVersions.length === 0) {
      console.log(`✅ Aucune nouvelle version à ajouter. Le fichier est déjà à jour.`)
      return
    }
    
    // Fusionner les versions existantes avec les nouvelles
    const allVersions = [...existingLines, ...newVersions]
    
    // Trier par blockNumber pour s'assurer que l'ordre est correct
    allVersions.sort((a, b) => {
      try {
        const metaA = JSON.parse(a)
        const metaB = JSON.parse(b)
        return (metaA.blockNumber || 0) - (metaB.blockNumber || 0)
      } catch {
        return 0
      }
    })
    
    // Écrire le fichier complet
    writeFileSync(OUTPUT_FILE, allVersions.join('\n') + '\n')
    
    console.log(`\n✅ ${addedCount} nouvelles versions ajoutées`)
    console.log(`📊 Total: ${allVersions.length} versions dans ${OUTPUT_FILE}`)
    console.log(`📊 Dernier bloc couvert: ${newLastBlock} (était ${lastBlock})`)
    console.log(`\n💡 Pour utiliser ces métadonnées, exécutez: yarn codegen`)
    
  } catch (error) {
    console.error(`❌ Erreur: ${error.message}`)
    process.exit(1)
  }
}

updateMetadataIncremental()
