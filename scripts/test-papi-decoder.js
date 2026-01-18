#!/usr/bin/env node
/**
 * Script pour tester le décodeur PAPI avec client complet
 * 
 * Usage:
 *   node scripts/test-papi-decoder.js <eventData> <topic1> <topic2> <eventType>
 * 
 * Exemple:
 *   node scripts/test-papi-decoder.js \
 *     "0x000000000000000000000000000000007837e92fbf72f1ed3c6690a82c7e5195635a0432020000000600" \
 *     "0x0000000000000000000000000000000000000000000000000000000000000000" \
 *     "0x7837e92fbf72f1ed3c6690a82c7e5195635a0432000000000000000000000000" \
 *     "guess_made"
 */

const path = require('path');
const fs = require('fs');

// Essayer d'importer le décodeur compilé
let PapiDecoder;
try {
    const decoderPath = path.join(__dirname, '..', 'packages', 'subsquid-ink-v6-decoder', 'lib', 'papi-decoder.js');
    if (fs.existsSync(decoderPath)) {
        PapiDecoder = require(decoderPath).PapiDecoder;
    } else {
        console.log('⚠️  Le décodeur n\'est pas encore compilé.');
        console.log('   Compilez d\'abord: cd packages/subsquid-ink-v6-decoder && npx tsc');
        process.exit(1);
    }
} catch (error) {
    console.error('❌ Erreur lors du chargement du décodeur:', error.message);
    process.exit(1);
}

function main() {
    if (process.argv.length < 6) {
        console.log('Usage: node scripts/test-papi-decoder.js <eventData> <topic1> <topic2> <eventType>');
        process.exit(1);
    }

    const eventData = process.argv[2];
    const topic1 = process.argv[3];
    const topic2 = process.argv[4];
    const eventType = process.argv[5];

    console.log('🧪 TEST DU DÉCODEUR PAPI AVEC CLIENT COMPLET');
    console.log('============================================');
    console.log(`EventType: ${eventType}`);
    console.log(`EventData: ${eventData}`);
    console.log(`Topic[1]: ${topic1}`);
    console.log(`Topic[2]: ${topic2}`);
    console.log('');

    const metadataPath = path.join(__dirname, '..', 'metadata', 'guess_the_number_westend.json');
    
    if (!fs.existsSync(metadataPath)) {
        console.error('❌ Métadonnées non trouvées:', metadataPath);
        process.exit(1);
    }

    // Trouver la signature de l'événement depuis les métadonnées
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    const events = metadata.spec?.events || [];
    
    const eventNameMap = {
        'guess_made': 'GuessMade',
        'clue_given': 'ClueGiven',
        'new_game': 'NewGame',
        'game_over': 'GameOver'
    };
    
    const targetEventName = eventNameMap[eventType];
    const targetEvent = events.find(e => e.label === targetEventName);
    
    if (!targetEvent) {
        console.error('❌ Événement non trouvé dans les métadonnées');
        console.log('   Événements disponibles:', events.map(e => e.label).join(', '));
        process.exit(1);
    }

    const signatureTopic = targetEvent.signature_topic;
    const allTopics = [signatureTopic, topic1, topic2];

    console.log(`📋 Événement trouvé: ${targetEvent.label}`);
    console.log(`   Signature: ${signatureTopic}`);
    console.log('');

    // RPC endpoint (peut être minimal pour le décodage seul)
    const rpcEndpoint = process.env.RPC_PASSET_HUB_WS || 'wss://westend-asset-hub-rpc.polkadot.io';

    try {
        console.log('🔌 Création du client PAPI...');
        console.log(`   Endpoint: ${rpcEndpoint}`);
        console.log('');

        const decoder = new PapiDecoder({
            metadataPath,
            rpcEndpoint,
            debugMode: true
        });

        // Attendre un peu pour que le client s'initialise
        setTimeout(() => {
            console.log('🔍 Tentative de décodage avec PAPI...');
            console.log('');

            const decoded = decoder.decodeEvent(eventData, allTopics);

            if (decoded) {
                console.log('✅ Décodage réussi avec PAPI:');
                console.log(JSON.stringify(decoded, (k, v) => typeof v === 'bigint' ? v.toString() : v, 2));
                
                // Nettoyer
                decoder.cleanup().catch(console.error);
            } else {
                console.error('❌ Le décodage a échoué');
                decoder.cleanup().catch(console.error);
                process.exit(1);
            }
        }, 2000); // Attendre 2 secondes pour l'initialisation du client

    } catch (error) {
        console.error('❌ Erreur:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

main();
