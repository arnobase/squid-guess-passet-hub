#!/usr/bin/env node
/**
 * Script pour capturer les événements depuis les logs et tester automatiquement
 * 
 * Usage:
 *   yarn dev 2>&1 | node scripts/capture-and-test-events.js
 * 
 * OU:
 *   tail -f logs.txt | node scripts/capture-and-test-events.js
 */

const { spawn } = require('child_process');
const path = require('path');

const testScript = path.join(__dirname, 'test-scale-decode.js');

let currentEventData = null;
let currentTopic2 = null;
let currentEventType = null;
let buffer = '';

process.stdin.on('data', (data) => {
  buffer += data.toString();
  const lines = buffer.split('\n');
  buffer = lines.pop() || ''; // Garder la dernière ligne incomplète
  
  for (const line of lines) {
    // Chercher les logs DEBUG
    if (line.includes('DEBUG GUESS_MADE') || line.includes('DEBUG CLUE_GIVEN')) {
      const match = line.match(/DEBUG (\w+)/);
      if (match) {
        currentEventType = match[1].toLowerCase();
        console.log(`\n🔍 Événement détecté: ${currentEventType}`);
      }
    }
    
    // Capturer eventData
    if (line.includes('Raw eventData:')) {
      const match = line.match(/Raw eventData: (0x[a-fA-F0-9]+)/);
      if (match) {
        currentEventData = match[1];
        console.log(`  📦 EventData capturé: ${currentEventData.substring(0, 50)}...`);
      }
    }
    
    // Capturer Topics[2] - plusieurs formats possibles
    if (line.includes('Topics:') && currentEventData) {
      // Format 1: Topics: [ "0x...", "0x...", "0x..." ]
      let topicsMatch = line.match(/Topics:\s*\[(.*?)\]/);
      if (!topicsMatch) {
        // Format 2: Topics:  [ '0x...', '0x...', '0x...' ]
        topicsMatch = line.match(/Topics:\s*\[(.*?)\]/);
      }
      
      if (topicsMatch) {
        const topicsStr = topicsMatch[1];
        // Extraire tous les topics (supporter "0x..." et '0x...')
        const topicMatches = topicsStr.match(/['"]?(0x[a-fA-F0-9]+)['"]?/g);
        if (topicMatches && topicMatches.length >= 3) {
          currentTopic2 = topicMatches[2].replace(/['"]/g, '');
          console.log(`  📦 Topic[2] capturé: ${currentTopic2.substring(0, 50)}...`);
          
          // Tester immédiatement
          if (currentEventData && currentTopic2 && currentEventType) {
            console.log('\n🧪 Lancement du test...\n');
            const testProcess = spawn('node', [testScript, currentEventData, currentTopic2, currentEventType], {
              stdio: 'inherit'
            });
            
            testProcess.on('close', (code) => {
              console.log(`\n✅ Test terminé avec code ${code}\n`);
              console.log('🎯 En attente du prochain événement...\n');
            });
            
            // Réinitialiser pour le prochain événement
            currentEventData = null;
            currentTopic2 = null;
            currentEventType = null;
          }
        }
      }
    }
  }
});

process.stdin.on('end', () => {
  console.log('\n📋 Fin de la capture');
});

console.log('🎯 En attente d\'événements DEBUG...');
console.log('   (Lancez l\'indexeur avec les logs DEBUG activés)');
