#!/usr/bin/env node
/**
 * Script pour valider le décodage avec Polkadot.js Abi.decodeEvent()
 * 
 * Ce script utilise l'approche standard de Polkadot.js qui décode automatiquement
 * les événements sans avoir à deviner les tailles de bytes.
 * 
 * Usage:
 *   node scripts/validate-with-polkadot-js.js <eventData> <topics...>
 * 
 * Exemple:
 *   node scripts/validate-with-polkadot-js.js \
 *     "0x000000000000000000000000000000007837e92fbf72f1ed3c6690a82c7e5195635a0432020000000600" \
 *     "0xf5b23c2011134ba2467787da32da9ddda148939ab974db7735944b8ea67c3e5d" \
 *     "0x0000000000000000000000000000000000000000000000000000000000000000" \
 *     "0x7837e92fbf72f1ed3c6690a82c7e5195635a0432000000000000000000000000"
 */

const { Abi } = require('@polkadot/api-contract');
const fs = require('fs');
const path = require('path');

function main() {
  if (process.argv.length < 3) {
    console.log('Usage: node scripts/validate-with-polkadot-js.js <eventData> <topic1> <topic2> ...');
    console.log('');
    console.log('Exemple:');
    console.log('  node scripts/validate-with-polkadot-js.js \\');
    console.log('    "0x000000000000000000000000000000007837e92fbf72f1ed3c6690a82c7e5195635a0432020000000600" \\');
    console.log('    "0xf5b23c2011134ba2467787da32da9ddda148939ab974db7735944b8ea67c3e5d" \\');
    console.log('    "0x0000000000000000000000000000000000000000000000000000000000000000" \\');
    console.log('    "0x7837e92fbf72f1ed3c6690a82c7e5195635a0432000000000000000000000000"');
    process.exit(1);
  }

  const eventData = process.argv[2];
  const topics = process.argv.slice(3);

  console.log('🔍 Validation avec Polkadot.js Abi.decodeEvent()');
  console.log('================================================');
  console.log('');
  console.log('EventData:', eventData);
  console.log('Topics:', topics);
  console.log('');

  // Charger les métadonnées du contrat
  const metadataPath = path.join(__dirname, '..', 'metadata', 'guess_the_number_westend.json');
  
  if (!fs.existsSync(metadataPath)) {
    console.error('❌ Métadonnées non trouvées:', metadataPath);
    process.exit(1);
  }

  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));

  try {
    // Créer l'ABI depuis les métadonnées
    const abi = new Abi(metadata);

    // Construire l'objet ContractEmitted
    // Format: { contract: AccountId, data: Bytes }
    // Pour décoder, on a besoin de construire l'objet Bytes depuis eventData
    const { U8a } = require('@polkadot/types');
    
    // Convertir eventData en Uint8Array
    const cleanData = eventData.startsWith('0x') ? eventData.slice(2) : eventData;
    const dataBytes = Buffer.from(cleanData, 'hex');
    
    // Créer un objet compatible avec ContractEmitted
    // Note: Polkadot.js attend un format spécifique pour les événements
    // Il faut construire l'objet Bytes correctement
    
    console.log('📋 Tentative de décodage avec Abi.decodeEvent()...');
    console.log('');
    
    // Essayer de décoder directement
    // Note: Abi.decodeEvent() attend un objet avec la structure de l'événement
    // Il faut construire l'objet correctement depuis les topics et data
    
    // Pour les événements Ink!, la structure est:
    // - topics[0]: signature de l'événement
    // - topics[1+]: champs indexés
    // - data: champs non-indexés (avec discriminant au début)
    
    // Construire l'objet événement pour Polkadot.js
    const eventObj = {
      data: dataBytes,
      topics: topics.map(t => {
        const clean = t.startsWith('0x') ? t.slice(2) : t;
        return Buffer.from(clean, 'hex');
      })
    };

    // Décoder avec Abi
    const decoded = abi.decodeEvent(eventObj);
    
    console.log('✅ Décodage réussi avec Polkadot.js:');
    console.log(JSON.stringify(decoded, (k, v) => {
      if (typeof v === 'bigint') return v.toString();
      if (Buffer.isBuffer(v)) return '0x' + v.toString('hex');
      return v;
    }, 2));
    
  } catch (error) {
    console.error('❌ Erreur lors du décodage:', error.message);
    console.error('');
    console.error('💡 Note: Polkadot.js Abi.decodeEvent() nécessite un format spécifique');
    console.error('   pour les événements. Il faut construire l\'objet événement correctement.');
    console.error('');
    console.error('   Notre approche manuelle est plus adaptée pour un indexeur car:');
    console.error('   1. On contrôle exactement le format des données');
    console.error('   2. On peut gérer les cas spéciaux (ex: 19 bytes pour H160)');
    console.error('   3. On n\'a pas besoin de dépendre de Polkadot.js');
    process.exit(1);
  }
}

main();
