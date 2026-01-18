#!/usr/bin/env node
/**
 * Script pour tester le décodeur PAPI avec de vraies données du processor
 * 
 * Utilise les données extraites des logs du processor
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Essayer d'importer le décodeur compilé
let PapiDecoder;
try {
    const decoderPath = join(__dirname, '..', 'packages', 'subsquid-ink-v6-decoder', 'lib', 'papi-decoder.js');
    if (existsSync(decoderPath)) {
        const decoderModule = await import(decoderPath);
        PapiDecoder = decoderModule.PapiDecoder;
    } else {
        console.log('⚠️  Le décodeur n\'est pas encore compilé.');
        console.log('   Compilez d\'abord: cd packages/subsquid-ink-v6-decoder && npx tsc');
        process.exit(1);
    }
} catch (error) {
    console.error('❌ Erreur lors du chargement du décodeur:', error.message);
    console.error(error.stack);
    process.exit(1);
}

// Données réelles extraites des logs
const testCases = [
    {
        name: 'GUESS_MADE @ Block 13413469',
        eventType: 'guess_made',
        eventData: '0x010000000000000000000000000000004b2ffed90d51b8fd818c35346d999182d9473e11010000000100',
        topics: [
            '0xf5b23c2011134ba2467787da32da9ddda148939ab974db7735944b8ea67c3e5d',
            '0x0100000000000000000000000000000000000000000000000000000000000000',
            '0x4b2ffed90d51b8fd818c35346d999182d9473e11000000000000000000000000'
        ],
        expected: {
            game_number: '1',
            player: '0x6d999182d9473e11000000000000000000000000',
            attempt: 1,
            guess: 1
        }
    },
    {
        name: 'GUESS_MADE @ Block 13415004',
        eventType: 'guess_made',
        eventData: '0x020000000000000000000000000000009621dde636de098b43efb0fa9b61facfe328f99d010000000500',
        topics: [
            '0xf5b23c2011134ba2467787da32da9ddda148939ab974db7735944b8ea67c3e5d',
            '0x0200000000000000000000000000000000000000000000000000000000000000',
            '0x9621dde636de098b43efb0fa9b61facfe328f99d000000000000000000000000'
        ],
        expected: {
            game_number: '2',
            player: '0x9b61facfe328f99d000000000000000000000000',
            attempt: 1,
            guess: 5
        }
    },
    {
        name: 'CLUE_GIVEN @ Block 13415037',
        eventType: 'clue_given',
        eventData: '0x010000000000000000000000000000004b2ffed90d51b8fd818c35346d999182d9473e1102000000010000',
        topics: [
            '0x6fbbc2beca7d1247dbf89f89623d64c4431ae74cc6ec660f6ce708d846997769',
            '0x0100000000000000000000000000000000000000000000000000000000000000',
            '0x4b2ffed90d51b8fd818c35346d999182d9473e11000000000000000000000000'
        ],
        expected: {
            game_number: '1',
            player: '0x6d999182d9473e11000000000000000000000000',
            attempt: 2,
            guess: 1,
            clue: 'More'
        }
    },
    {
        name: 'CLUE_GIVEN @ Block 13417301 (Less)',
        eventType: 'clue_given',
        eventData: '0x010000000000000000000000000000004b2ffed90d51b8fd818c35346d999182d9473e1104000000640001',
        topics: [
            '0x6fbbc2beca7d1247dbf89f89623d64c4431ae74cc6ec660f6ce708d846997769',
            '0x0100000000000000000000000000000000000000000000000000000000000000',
            '0x4b2ffed90d51b8fd818c35346d999182d9473e11000000000000000000000000'
        ],
        expected: {
            game_number: '1',
            player: '0x6d999182d9473e11000000000000000000000000',
            attempt: 4,
            guess: 100,
            clue: 'Less'
        }
    },
    {
        name: 'GUESS_MADE @ Block 13417299',
        eventType: 'guess_made',
        eventData: '0x010000000000000000000000000000004b2ffed90d51b8fd818c35346d999182d9473e11040000006400',
        topics: [
            '0xf5b23c2011134ba2467787da32da9ddda148939ab974db7735944b8ea67c3e5d',
            '0x0100000000000000000000000000000000000000000000000000000000000000',
            '0x4b2ffed90d51b8fd818c35346d999182d9473e11000000000000000000000000'
        ],
        expected: {
            game_number: '1',
            player: '0x6d999182d9473e11000000000000000000000000',
            attempt: 4,
            guess: 100
        }
    }
];

async function main() {
    console.log('🧪 TEST DU DÉCODEUR PAPI AVEC DONNÉES RÉELLES');
    console.log('==============================================');
    console.log('');

    const metadataPath = join(__dirname, '..', 'metadata', 'guess_the_number_westend.json');
    
    if (!existsSync(metadataPath)) {
        console.error('❌ Métadonnées non trouvées:', metadataPath);
        process.exit(1);
    }

    const rpcEndpoint = process.env.RPC_PASSET_HUB_WS || 'wss://westend-asset-hub-rpc.polkadot.io';

    console.log('🔌 Création du client PAPI...');
    console.log(`   Metadata: ${metadataPath}`);
    console.log(`   Endpoint: ${rpcEndpoint}`);
    console.log('');

    let decoder;
    try {
        decoder = new PapiDecoder({
            metadataPath,
            rpcEndpoint,
            debugMode: true
        });
    } catch (error) {
        console.error('❌ Erreur lors de la création du décodeur:', error.message);
        console.error(error.stack);
        process.exit(1);
    }

    // Attendre un peu pour que le client s'initialise
    setTimeout(() => {
        console.log('🔍 Démarrage des tests...');
        console.log('');

        let passed = 0;
        let failed = 0;

        (async () => {
            for (const [index, testCase] of testCases.entries()) {
            console.log(`\n📋 Test ${index + 1}/${testCases.length}: ${testCase.name}`);
            console.log(`   Type: ${testCase.eventType}`);
            console.log(`   EventData: ${testCase.eventData}`);
            console.log(`   Topics: ${testCase.topics.length} topics`);
            console.log('');

            try {
                const decoded = await decoder.decodeEvent(testCase.eventData, testCase.topics);

                if (!decoded) {
                    console.error(`   ❌ ÉCHEC: Le décodage a retourné null`);
                    failed++;
                    continue;
                }

                console.log(`   ✅ Décodage réussi:`);
                console.log(`   ${JSON.stringify(decoded, (k, v) => typeof v === 'bigint' ? v.toString() : v, 2)}`);
                console.log('');

                // Vérifier les valeurs attendues
                let testPassed = true;
                for (const [key, expectedValue] of Object.entries(testCase.expected)) {
                    const actualValue = decoded[key];
                    if (actualValue === undefined) {
                        console.error(`   ⚠️  Champ manquant: ${key}`);
                        testPassed = false;
                    } else {
                        const actualStr = typeof actualValue === 'bigint' ? actualValue.toString() : String(actualValue);
                        const expectedStr = String(expectedValue);
                        if (actualStr !== expectedStr) {
                            console.error(`   ⚠️  ${key}: attendu "${expectedStr}", obtenu "${actualStr}"`);
                            testPassed = false;
                        }
                    }
                }

                if (testPassed) {
                    console.log(`   ✅ Tous les champs correspondent aux valeurs attendues`);
                    passed++;
                } else {
                    console.error(`   ❌ Certains champs ne correspondent pas`);
                    failed++;
                }

            } catch (error) {
                console.error(`   ❌ ERREUR: ${error.message}`);
                console.error(error.stack);
                failed++;
            }
        }

            console.log('\n');
            console.log('═══════════════════════════════════════');
            console.log(`📊 RÉSULTATS: ${passed} réussis, ${failed} échoués sur ${testCases.length} tests`);
            console.log('═══════════════════════════════════════');

            // Nettoyer
            decoder.cleanup().catch(console.error);

            if (failed > 0) {
                process.exit(1);
            }
        })();
    }, 3000); // Attendre 3 secondes pour l'initialisation du client
}

main();
