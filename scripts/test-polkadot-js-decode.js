#!/usr/bin/env node
/**
 * Script pour tester le décodage avec Polkadot.js Abi.decodeEvent()
 * et comparer avec notre approche manuelle
 * 
 * Usage:
 *   node scripts/test-polkadot-js-decode.js <eventData> <topic1> <topic2> <eventType>
 * 
 * Exemple:
 *   node scripts/test-polkadot-js-decode.js \
 *     "0x000000000000000000000000000000007837e92fbf72f1ed3c6690a82c7e5195635a0432020000000600" \
 *     "0x0000000000000000000000000000000000000000000000000000000000000000" \
 *     "0x7837e92fbf72f1ed3c6690a82c7e5195635a0432000000000000000000000000" \
 *     "guess_made"
 */

const { Abi } = require('@polkadot/api-contract');
const { createType } = require('@polkadot/types');
const fs = require('fs');
const path = require('path');

// Charger notre décodage manuel pour comparaison
const { decodeGuessMade, decodeClueGiven } = require('../src/types/ink/guess_the_number/v0.1.3/events');

function hexToBytes(hex) {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  return Buffer.from(cleanHex, 'hex');
}

function main() {
  if (process.argv.length < 6) {
    console.log('Usage: node scripts/test-polkadot-js-decode.js <eventData> <topic1> <topic2> <eventType>');
    console.log('');
    console.log('Exemple:');
    console.log('  node scripts/test-polkadot-js-decode.js \\');
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

  console.log('🧪 TEST DE DÉCODAGE : Polkadot.js vs Notre approche');
  console.log('==================================================');
  console.log(`EventType: ${eventType}`);
  console.log(`EventData: ${eventData}`);
  console.log(`Topic[1]: ${topic1}`);
  console.log(`Topic[2]: ${topic2}`);
  console.log('');

  // Charger les métadonnées
  const metadataPath = path.join(__dirname, '..', 'metadata', 'guess_the_number_westend.json');
  if (!fs.existsSync(metadataPath)) {
    console.error('❌ Métadonnées non trouvées:', metadataPath);
    process.exit(1);
  }

  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));

  // Test 1: Notre approche manuelle
  console.log('═══════════════════════════════════════════════════════════');
  console.log('1️⃣  NOTRE APPROCHE MANUELLE');
  console.log('═══════════════════════════════════════════════════════════');
  try {
    const topics = [topic1, topic2];
    let ourResult;
    
    if (eventType === 'guess_made') {
      ourResult = decodeGuessMade(eventData, topics);
    } else if (eventType === 'clue_given') {
      ourResult = decodeClueGiven(eventData, topics);
    } else {
      console.log('⚠️  Type d\'événement non supporté pour la comparaison');
      ourResult = null;
    }

    if (ourResult) {
      console.log('✅ Résultat:');
      console.log(JSON.stringify(ourResult, (k, v) => typeof v === 'bigint' ? v.toString() : v, 2));
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error.stack);
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('2️⃣  POLKADOT.JS Abi.decodeEvent()');
  console.log('═══════════════════════════════════════════════════════════');

  try {
    // Créer l'ABI
    const abi = new Abi(metadata);

    // Convertir eventData en Uint8Array
    const dataBytes = hexToBytes(eventData);
    
    // Construire l'objet événement pour Polkadot.js
    // Format attendu par Abi.decodeEvent():
    // - data: Uint8Array (les données de l'événement)
    // - topics: Array<Uint8Array> (les topics, avec la signature en premier)
    
    // Pour Ink! v6, la structure est:
    // - topics[0]: signature de l'événement (hash)
    // - topics[1+]: champs indexés
    // - data: champs non-indexés (avec discriminant au début)
    
    // Construire les topics complets (signature + champs indexés)
    const allTopics = [
      // La signature doit être calculée depuis les métadonnées
      // Pour l'instant, on va essayer de trouver l'événement par ses topics
      hexToBytes(topic1),
      hexToBytes(topic2)
    ];

    // Trouver l'événement correspondant dans les métadonnées
    const events = metadata.spec?.events || [];
    let targetEvent = null;
    
    // Chercher l'événement par son type
    const eventNameMap = {
      'guess_made': 'GuessMade',
      'clue_given': 'ClueGiven',
      'new_game': 'NewGame',
      'game_over': 'GameOver'
    };
    
    const targetEventName = eventNameMap[eventType];
    if (targetEventName) {
      targetEvent = events.find(e => e.label === targetEventName);
    }

    if (!targetEvent) {
      console.log('⚠️  Événement non trouvé dans les métadonnées');
      console.log('   Événements disponibles:', events.map(e => e.label).join(', '));
      return;
    }

    console.log(`📋 Événement trouvé: ${targetEvent.label}`);
    console.log(`   Signature: ${targetEvent.signature_topic}`);
    console.log('');

    // Construire l'objet événement complet avec la signature
    const signatureBytes = hexToBytes(targetEvent.signature_topic);
    const completeTopics = [signatureBytes, ...allTopics];

    // Essayer de décoder avec Abi.decodeEvent()
    // Note: Abi.decodeEvent() attend un objet avec la structure de l'événement
    // Il faut construire l'objet correctement
    
    console.log('🔍 Tentative de décodage avec Abi.decodeEvent()...');
    console.log('');

    // Construire l'objet événement au format attendu par Polkadot.js
    // Abi.decodeEvent() attend un objet avec:
    // - data: Uint8Array (les données de l'événement)
    // - topics: Array<Uint8Array> (les topics complets)
    // 
    // Pour Ink! v6, les topics sont:
    // - topics[0]: signature de l'événement
    // - topics[1+]: champs indexés
    
    const eventObj = {
      data: dataBytes,
      topics: completeTopics
    };

    console.log('📦 Format de l\'événement:');
    console.log(`   data length: ${dataBytes.length} bytes`);
    console.log(`   topics count: ${completeTopics.length}`);
    console.log('');

    // Décoder avec Abi.decodeEvent()
    // Note: Cette méthode peut nécessiter un format spécifique
    // Si ça ne fonctionne pas, c'est que notre approche manuelle est nécessaire
    const decoded = abi.decodeEvent(eventObj);
    
    console.log('✅ Décodage réussi avec Polkadot.js:');
    console.log(JSON.stringify(decoded, (k, v) => {
      if (typeof v === 'bigint') return v.toString();
      if (Buffer.isBuffer(v)) return '0x' + v.toString('hex');
      if (v && typeof v === 'object' && v.toHuman) return v.toHuman();
      return v;
    }, 2));

  } catch (error) {
    console.error('❌ Erreur lors du décodage avec Polkadot.js:');
    console.error('   Message:', error.message);
    console.error('   Stack:', error.stack);
    console.log('');
    console.log('💡 Note: Polkadot.js Abi.decodeEvent() peut nécessiter');
    console.log('   un format spécifique pour les événements Ink! v6.');
    console.log('   Notre approche manuelle peut être plus adaptée.');
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 COMPARAISON');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('Si Polkadot.js fonctionne, on devrait migrer vers cette approche.');
  console.log('Sinon, notre approche manuelle reste nécessaire.');
}

main();
