#!/usr/bin/env node
/**
 * Test réel du décodeur natif @subsquid/ink-abi
 */

const path = require('path');
const fs = require('fs');

// Essayer d'importer le décodeur compilé
let NativeInkAbiDecoder;
try {
    const decoderPath = path.join(__dirname, '..', 'packages', 'subsquid-ink-v6-decoder', 'lib', 'native-ink-abi-decoder.js');
    if (fs.existsSync(decoderPath)) {
        NativeInkAbiDecoder = require(decoderPath).NativeInkAbiDecoder;
    } else {
        console.log('⚠️  Le décodeur n\'est pas encore compilé.');
        console.log('   Compilez d\'abord: cd packages/subsquid-ink-v6-decoder && yarn build');
        process.exit(1);
    }
} catch (error) {
    console.error('❌ Erreur lors du chargement du décodeur:', error.message);
    process.exit(1);
}

function main() {
    if (process.argv.length < 6) {
        console.log('Usage: node scripts/test-native-decoder-real.js <eventData> <topic1> <topic2> <eventType>');
        process.exit(1);
    }

    const eventData = process.argv[2];
    const topic1 = process.argv[3];
    const topic2 = process.argv[4];
    const eventType = process.argv[5];

    console.log('🧪 TEST RÉEL DU DÉCODEUR NATIF');
    console.log('================================');
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

    try {
        const decoder = new NativeInkAbiDecoder({
            metadataPath,
            debugMode: true
        });

        // Construire les topics complets (signature + champs indexés)
        // Pour Ink! v6, topics[0] est la signature de l'événement
        // On doit trouver la signature depuis les métadonnées
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

        console.log('🔍 Tentative de décodage avec @subsquid/ink-abi...');
        console.log('');

        const decoded = decoder.decodeEvent(eventData, allTopics);

        if (decoded) {
            console.log('✅ Décodage réussi avec le décodeur natif:');
            console.log(JSON.stringify(decoded, (k, v) => typeof v === 'bigint' ? v.toString() : v, 2));
        } else {
            console.error('❌ Le décodage a échoué');
            process.exit(1);
        }
    } catch (error) {
        console.error('❌ Erreur:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

main();
