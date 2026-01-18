#!/usr/bin/env node
/**
 * Script pour tester le décodage SCALE et comparer 19 vs 20 bytes pour H160
 * 
 * Usage:
 *   node scripts/test-scale-decode.js <eventData> <topic2> <eventType>
 * 
 * Exemple:
 *   node scripts/test-scale-decode.js \
 *     "0x03..." \
 *     "0x000000000000000000000000abcd1234567890abcdef1234567890abcdef12" \
 *     "guess_made"
 */

const fs = require('fs');
const path = require('path');

// Fonctions utilitaires SCALE (simplifiées depuis events.ts)
function hexToBytes(hex) {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = [];
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes.push(parseInt(cleanHex.substr(i, 2), 16));
  }
  return bytes;
}

function bytesToHex(bytes) {
  return '0x' + bytes.map(b => b.toString(16).padStart(2, '0')).join('');
}

function readU8(data, offset) {
  return { value: data[offset], offset: offset + 1 };
}

function readU16(data, offset) {
  const value = data[offset] | (data[offset + 1] << 8);
  return { value, offset: offset + 2 };
}

function readU32(data, offset) {
  const value = data[offset] | 
                (data[offset + 1] << 8) | 
                (data[offset + 2] << 16) | 
                (data[offset + 3] << 24);
  return { value, offset: offset + 4 };
}

function readU128(data, offset) {
  let value = 0n;
  for (let i = 0; i < 16; i++) {
    value |= BigInt(data[offset + i]) << BigInt(i * 8);
  }
  return { value, offset: offset + 16 };
}

function testDecodeWithSize(eventDataHex, topic1Hex, topic2Hex, eventType, h160SizeInData) {
  console.log(`\n🔍 TEST avec H160 = ${h160SizeInData} bytes dans DATA\n`);
  
  const data = hexToBytes(eventDataHex);
  const topic1 = hexToBytes(topic1Hex);
  const topic2 = hexToBytes(topic2Hex);
  
  // game_number depuis TOPICS (u128, 16 bytes)
  const gameNumFromTopic = readU128(topic1, 0);
  
  // Player depuis TOPICS (20 bytes complets)
  const playerFromTopic = topic2.slice(-20);
  const playerFromTopicHex = bytesToHex(playerFromTopic);
  
  console.log('=== DÉCODAGE ===');
  console.log(`EventData: ${eventDataHex}`);
  console.log(`Topic[1] (game_number): ${topic1Hex}`);
  console.log(`Topic[2] (player): ${topic2Hex}`);
  console.log('');
  
  let offset = 1; // Skip discriminant
  const result = {};
  
  // Décode game_number (indexé, lu depuis TOPICS, mais skip dans DATA)
  if (eventType === 'guess_made' || eventType === 'clue_given') {
    result.game_number = gameNumFromTopic.value;
    console.log(`game_number depuis TOPIC: ${result.game_number}`);
    
    // Skip game_number dans DATA (il est aussi présent dans data)
    const skipGameNum = readU128(data, offset);
    offset = skipGameNum.offset;
    console.log(`game_number dans DATA (skip): ${skipGameNum.value} (offset ${offset})`);
    
    // Skip player dans DATA
    const playerStart = offset;
    const playerEnd = offset + h160SizeInData;
    const playerFromData = data.slice(playerStart, playerEnd);
    const playerFromDataHex = bytesToHex(playerFromData);
    
    console.log(`player depuis DATA (${h160SizeInData} bytes): ${playerFromDataHex}`);
    console.log(`player depuis TOPICS (20 bytes): ${playerFromTopicHex}`);
    
    // Vérifier si les bytes correspondent
    const topic19Bytes = playerFromTopic.slice(0, h160SizeInData);
    const topic19Hex = bytesToHex(topic19Bytes);
    const match = topic19Hex.toLowerCase() === playerFromDataHex.toLowerCase();
    console.log(`Correspondent ? ${match ? '✅ OUI' : '❌ NON'}`);
    
    offset = playerEnd;
    console.log(`Offset après player: ${offset}`);
    
    // Décode attempt (u32, 4 bytes)
    if (offset + 4 <= data.length) {
      const r = readU32(data, offset);
      result.attempt = r.value;
      offset = r.offset;
      console.log(`attempt: ${result.attempt} (offset ${offset})`);
    }
    
    // Décode guess (u16, 2 bytes)
    if (offset + 2 <= data.length) {
      const r = readU16(data, offset);
      result.guess = r.value;
      offset = r.offset;
      console.log(`guess: ${result.guess} (offset ${offset})`);
    }
    
    // Décode clue (si clue_given)
    if (eventType === 'clue_given' && offset < data.length) {
      const r = readU8(data, offset);
      const clueMap = ["More", "Less", "Found"];
      result.clue = clueMap[r.value] || 'Unknown';
      offset = r.offset;
      console.log(`clue: ${result.clue} (offset ${offset})`);
    }
    
    console.log('');
    console.log('=== RÉSULTAT DÉCODÉ ===');
    console.log(JSON.stringify(result, (k, v) => typeof v === 'bigint' ? v.toString() : v, 2));
    console.log('');
    console.log(`Offset final: ${offset} / ${data.length} bytes`);
    
    return { result, offset, match };
  }
  
  return { result, offset: 0, match: false };
}

function main() {
  if (process.argv.length < 6) {
    console.log('Usage: node scripts/test-scale-decode.js <eventData> <topic1> <topic2> <eventType>');
    console.log('');
    console.log('Exemple:');
    console.log('  node scripts/test-scale-decode.js \\');
    console.log('    "0x03..." \\');
    console.log('    "0x0000000000000000000000000000000000000000000000000000000000000000" \\');
    console.log('    "0x000000000000000000000000abcd1234567890abcdef1234567890abcdef12" \\');
    console.log('    "guess_made"');
    process.exit(1);
  }
  
  const eventData = process.argv[2];
  const topic1 = process.argv[3];
  const topic2 = process.argv[4];
  const eventType = process.argv[5];
  
  console.log('🧪 TEST DE DÉCODAGE SCALE');
  console.log('==========================');
  console.log(`EventType: ${eventType}`);
  console.log('');
  
  // Test avec 19 bytes
  console.log('═══════════════════════════════════════════════════════════');
  const test19 = testDecodeWithSize(eventData, topic1, topic2, eventType, 19);
  
  // Test avec 20 bytes
  console.log('═══════════════════════════════════════════════════════════');
  const test20 = testDecodeWithSize(eventData, topic1, topic2, eventType, 20);
  
  // Comparaison
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 COMPARAISON');
  console.log('');
  console.log('Avec 19 bytes:');
  console.log(`  - Offset final: ${test19.offset} / ${hexToBytes(eventData).length}`);
  console.log(`  - Bytes correspondent: ${test19.match ? '✅' : '❌'}`);
  console.log(`  - attempt: ${test19.result.attempt}`);
  console.log(`  - guess: ${test19.result.guess}`);
  if (test19.result.clue) console.log(`  - clue: ${test19.result.clue}`);
  console.log('');
  console.log('Avec 20 bytes:');
  console.log(`  - Offset final: ${test20.offset} / ${hexToBytes(eventData).length}`);
  console.log(`  - Bytes correspondent: ${test20.match ? '✅' : '❌'}`);
  console.log(`  - attempt: ${test20.result.attempt}`);
  console.log(`  - guess: ${test20.result.guess}`);
  if (test20.result.clue) console.log(`  - clue: ${test20.result.clue}`);
  console.log('');
  
  // Déterminer quelle taille est correcte
  const dataLength = hexToBytes(eventData).length;
  const correct19 = test19.offset <= dataLength && test19.match;
  const correct20 = test20.offset <= dataLength && test20.match;
  
  console.log('🎯 CONCLUSION:');
  if (correct19 && !correct20) {
    console.log('  ✅ 19 bytes est la taille correcte');
  } else if (correct20 && !correct19) {
    console.log('  ✅ 20 bytes est la taille correcte');
  } else if (correct19 && correct20) {
    console.log('  ⚠️  Les deux fonctionnent, mais 19 bytes correspond mieux');
  } else {
    console.log('  ❌ Aucune des deux tailles ne fonctionne parfaitement');
  }
}

main();
