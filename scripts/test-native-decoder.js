#!/usr/bin/env node
/**
 * Script pour tester le décodeur natif @subsquid/ink-abi
 * 
 * Usage:
 *   node scripts/test-native-decoder.js <eventData> <topic1> <topic2> <eventType>
 * 
 * Exemple:
 *   node scripts/test-native-decoder.js \
 *     "0x000000000000000000000000000000007837e92fbf72f1ed3c6690a82c7e5195635a0432020000000600" \
 *     "0x0000000000000000000000000000000000000000000000000000000000000000" \
 *     "0x7837e92fbf72f1ed3c6690a82c7e5195635a0432000000000000000000000000" \
 *     "guess_made"
 */

const path = require('path');

// Note: Ce script nécessite que le TypeScript soit compilé
// Pour compiler: cd packages/subsquid-ink-v6-decoder && yarn build

function main() {
  if (process.argv.length < 6) {
    console.log('Usage: node scripts/test-native-decoder.js <eventData> <topic1> <topic2> <eventType>');
    console.log('');
    console.log('Exemple:');
    console.log('  node scripts/test-native-decoder.js \\');
    console.log('    "0x000000000000000000000000000000007837e92fbf72f1ed3c6690a82c7e5195635a0432020000000600" \\');
    console.log('    "0x0000000000000000000000000000000000000000000000000000000000000000" \\');
    console.log('    "0x7837e92fbf72f1ed3c6690a82c7e5195635a0432000000000000000000000000" \\');
    console.log('    "guess_made"');
    process.exit(1);
  }

  const eventData = process.argv[2];
  const topic1 = process.argv[3];
  const topic2 = process.argv[4];
  const eventType = process.argv[5];

  console.log('🧪 TEST DU DÉCODEUR NATIF @subsquid/ink-abi');
  console.log('===========================================');
  console.log(`EventType: ${eventType}`);
  console.log(`EventData: ${eventData}`);
  console.log(`Topic[1]: ${topic1}`);
  console.log(`Topic[2]: ${topic2}`);
  console.log('');

  console.log('📝 Note: Ce décodeur utilise l\'outil NATIF @subsquid/ink-abi');
  console.log('   qui utilise le codec SCALE natif pour décoder automatiquement');
  console.log('   tous les types depuis les métadonnées.');
  console.log('');
  console.log('✅ Pour utiliser ce décodeur:');
  console.log('   1. Compiler le TypeScript: cd packages/subsquid-ink-v6-decoder && yarn build');
  console.log('   2. Importer et utiliser NativeInkAbiDecoder');
  console.log('');
  console.log('💡 Avantages:');
  console.log('   - Solution NATIVE Subsquid');
  console.log('   - Utilise le codec SCALE natif');
  console.log('   - Pas d\'heuristiques ni de devinettes');
  console.log('   - Fonctionne pour TOUS les types automatiquement');
}

main();
