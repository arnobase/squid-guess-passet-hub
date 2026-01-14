#!/usr/bin/env node
/**
 * Script de test local pour vérifier que le module fonctionne
 * avant publication sur npm
 * 
 * Usage: node test-local.js
 */

const { createDecoder, DecoderMode } = require('./lib/index')

console.log('🧪 Test du module @luckyweb3/subsquid-ink-v6-decoder\n')

// Test 1: Vérifier que les exports sont disponibles
console.log('✅ Test 1: Vérification des exports')
console.log('  - createDecoder:', typeof createDecoder === 'function' ? '✅' : '❌')
console.log('  - DecoderMode:', typeof DecoderMode !== 'undefined' ? '✅' : '❌')
console.log('  - DecoderMode.STATIC:', DecoderMode.STATIC === 'static' ? '✅' : '❌')
console.log('  - DecoderMode.RUNTIME:', DecoderMode.RUNTIME === 'runtime' ? '✅' : '❌')

// Test 2: Créer un décodeur en mode STATIC (nécessite les types générés)
console.log('\n✅ Test 2: Création d\'un décodeur STATIC')
try {
  const staticDecoder = createDecoder({
    mode: DecoderMode.STATIC,
    contract: 'guess_the_number'
  })
  console.log('  - Décodeur STATIC créé:', typeof staticDecoder.decodeEvent === 'function' ? '✅' : '❌')
} catch (error) {
  console.log('  - ⚠️  Erreur (normal si les types ne sont pas générés):', error.message)
}

// Test 3: Créer un décodeur en mode RUNTIME
console.log('\n✅ Test 3: Création d\'un décodeur RUNTIME')
try {
  const runtimeDecoder = createDecoder({
    mode: DecoderMode.RUNTIME,
    metadataPath: '../../metadata/guess_the_number.json',
    contractAddress: '0xe75cbd47620dbb2053cf2a98d06840f06baaf141',
    eventTypeMapping: {
      'NewGame': 'game_started',
      'GuessMade': 'guess_submitted',
      'ClueGiven': 'clue_given'
    }
  })
  console.log('  - Décodeur RUNTIME créé:', typeof runtimeDecoder.decodeEvent === 'function' ? '✅' : '❌')
  
  // Test de décodage avec des données d'exemple
  const testEventData = '0x000100020003'
  const testTopics = [
    '0xc8a7c5d86cdaf43555273e08a00e4cdaa93cf22046685231d5eb1b6c0d29fa92', // NewGame signature
    '0x0000000000000000000000000000000000000000000000000000000000000001', // game_number
    '0x000000000000000000000000e75cbd47620dbb2053cf2a98d06840f06baaf141'  // player
  ]
  
  const decoded = runtimeDecoder.decodeEvent(testEventData, testTopics, '0xe75cbd47620dbb2053cf2a98d06840f06baaf141')
  console.log('  - Décodage test:', decoded ? '✅' : '❌')
  if (decoded) {
    console.log('    Event type:', decoded.eventType)
    console.log('    Data keys:', Object.keys(decoded.data).join(', '))
  }
} catch (error) {
  console.log('  - ❌ Erreur:', error.message)
}

console.log('\n✨ Tests terminés!')
console.log('\n💡 Pour tester dans votre projet:')
console.log('   1. yarn build (dans packages/subsquid-ink-v6-decoder)')
console.log('   2. yarn install (à la racine)')
console.log('   3. yarn build (à la racine pour compiler votre projet)')

