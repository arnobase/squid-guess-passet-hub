#!/usr/bin/env node
/**
 * Script pour tester le décodeur basé sur les métadonnées
 * 
 * Usage:
 *   node scripts/test-metadata-decoder.js <eventData> <topic1> <topic2> <eventType>
 */

const path = require('path');
const fs = require('fs');

// Charger le décodeur basé sur les métadonnées
// Note: Il faut d'abord compiler le TypeScript
const metadataPath = path.join(__dirname, '..', 'metadata', 'guess_the_number_westend.json');

function main() {
  if (process.argv.length < 6) {
    console.log('Usage: node scripts/test-metadata-decoder.js <eventData> <topic1> <topic2> <eventType>');
    process.exit(1);
  }

  const eventData = process.argv[2];
  const topic1 = process.argv[3];
  const topic2 = process.argv[4];
  const eventType = process.argv[5];

  console.log('🧪 TEST DU DÉCODEUR BASÉ SUR LES MÉTADONNÉES');
  console.log('===========================================');
  console.log(`EventType: ${eventType}`);
  console.log(`EventData: ${eventData}`);
  console.log(`Topic[1]: ${topic1}`);
  console.log(`Topic[2]: ${topic2}`);
  console.log('');

  // Pour l'instant, on affiche juste les informations
  // Le décodeur TypeScript doit être compilé d'abord
  console.log('📝 Note: Ce décodeur calcule automatiquement les tailles depuis les métadonnées');
  console.log('   Il n\'utilise pas d\'heuristiques ni de devinettes');
  console.log('');
  console.log('✅ Pour utiliser ce décodeur:');
  console.log('   1. Compiler le TypeScript: cd packages/subsquid-ink-v6-decoder && yarn build');
  console.log('   2. Importer et utiliser MetadataBasedDecoder');
  console.log('');
  console.log('💡 Avantages:');
  console.log('   - Fonctionne pour TOUS les types, pas seulement H160');
  console.log('   - Basé sur les métadonnées (source de vérité)');
  console.log('   - Pas de heuristiques ni de devinettes');
}

main();
