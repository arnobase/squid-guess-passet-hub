#!/usr/bin/env node
/**
 * Script pour récupérer des événements réels depuis la blockchain et les tester
 * 
 * Usage:
 *   node scripts/fetch-real-events.js [blockNumber]
 */

const { ApiPromise, WsProvider } = require('@polkadot/api');
const path = require('path');
const { spawn } = require('child_process');

const testScript = path.join(__dirname, 'test-scale-decode.js');
const RPC_URL = process.env.RPC_PASSET_HUB_WS || 'wss://westend-asset-hub-rpc.polkadot.io';
const CONTRACT_ADDRESS = '0xe75cbd47620dbb2053cf2a98d06840f06baaf141';

async function fetchEventsFromBlock(api, blockNumber) {
  console.log(`🔍 Récupération des événements du bloc ${blockNumber}...\n`);
  
  try {
    const blockHash = await api.rpc.chain.getBlockHash(blockNumber);
    const signedBlock = await api.rpc.chain.getBlock(blockHash);
    
    const events = await api.query.system.events.at(blockHash);
    
    console.log(`📦 Bloc ${blockNumber}: ${events.length} événement(s) trouvé(s)\n`);
    
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const eventData = event.event.data;
      
      // Chercher les événements Revive::ContractEmitted
      if (event.event.section === 'revive' && event.event.method === 'ContractEmitted') {
        const contract = eventData[0].toString();
        const data = eventData[1].toString();
        const topics = eventData[2].toJSON();
        
        // Vérifier si c'est notre contrat
        if (contract.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()) {
          console.log(`✅ Événement trouvé à l'index ${i}:\n`);
          console.log(`  Contract: ${contract}`);
          console.log(`  Data: ${data.substring(0, 100)}...`);
          console.log(`  Topics: ${JSON.stringify(topics).substring(0, 200)}...\n`);
          
          // Extraire topic[2] pour player
          if (topics && topics.length >= 3) {
            const topic2 = topics[2];
            
            // Déterminer le type d'événement depuis la signature (topic[0])
            const signature = topics[0];
            const eventType = getEventTypeFromSignature(signature);
            
            if (eventType === 'guess_made' || eventType === 'clue_given') {
              console.log(`🎯 Événement ${eventType.toUpperCase()} détecté !\n`);
              console.log(`🧪 Lancement du test...\n`);
              
              const testProcess = spawn('node', [testScript, data, topic2, eventType], {
                stdio: 'inherit'
              });
              
              testProcess.on('close', (code) => {
                console.log(`\n✅ Test terminé avec code ${code}\n`);
              });
              
              return; // Tester seulement le premier événement trouvé
            }
          }
        }
      }
    }
    
    console.log('⚠️  Aucun événement guess_made ou clue_given trouvé dans ce bloc');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

function getEventTypeFromSignature(signature) {
  // Signatures des événements depuis events.ts
  const signatures = {
    'f5b23c2011134ba2467787da32da9ddda148939ab974db7735944b8ea67c3e5d': 'guess_made',
    '6fbbc2beca7d1247dbf89f89623d64c4431ae74cc6ec660f6ce708d846997769': 'clue_given',
  };
  
  // Normaliser la signature (enlever 0x si présent)
  const normalized = signature.startsWith('0x') ? signature.slice(2) : signature;
  return signatures[normalized] || null;
}

async function main() {
  const blockNumber = process.argv[2] ? parseInt(process.argv[2]) : null;
  
  console.log('🚀 Connexion à la blockchain...\n');
  console.log(`RPC: ${RPC_URL}\n`);
  
  const provider = new WsProvider(RPC_URL);
  const api = await ApiPromise.create({ provider });
  
  try {
    if (blockNumber) {
      await fetchEventsFromBlock(api, blockNumber);
    } else {
      // Chercher dans les derniers blocs
      const lastBlock = await api.rpc.chain.getHeader();
      const currentBlock = lastBlock.number.toNumber();
      
      console.log(`📊 Bloc actuel: ${currentBlock}\n`);
      console.log(`🔍 Recherche dans les 10 derniers blocs...\n`);
      
      for (let i = 0; i < 10; i++) {
        const blockToCheck = currentBlock - i;
        await fetchEventsFromBlock(api, blockToCheck);
        await new Promise(resolve => setTimeout(resolve, 500)); // Pause entre les blocs
      }
    }
  } finally {
    await api.disconnect();
  }
}

main().catch(console.error);
