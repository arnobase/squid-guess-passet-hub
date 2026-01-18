#!/usr/bin/env node
/**
 * Script pour analyser la représentation d'un player sur 19 vs 20 bytes
 * 
 * Usage:
 *   node scripts/analyze-player-bytes.js <eventData> <topic2>
 * 
 * Exemple:
 *   node scripts/analyze-player-bytes.js \
 *     "0x03..." \
 *     "0x000000000000000000000000abcd1234567890abcdef1234567890abcdef12"
 */

function hexToBytes(hex) {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex
  const bytes = []
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes.push(parseInt(cleanHex.substr(i, 2), 16))
  }
  return bytes
}

function bytesToHex(bytes) {
  return '0x' + bytes.map(b => b.toString(16).padStart(2, '0')).join('')
}

function analyzePlayer(eventDataHex, topic2Hex) {
  console.log('🔍 ANALYSE D\'UN PLAYER RÉEL\n')
  
  // Parser les données
  const eventData = hexToBytes(eventDataHex)
  const topic2 = hexToBytes(topic2Hex)
  
  console.log('=== DONNÉES BRUTES ===')
  console.log(`EventData (${eventData.length} bytes):`, eventDataHex)
  console.log(`Topic[2] (${topic2.length} bytes):`, topic2Hex)
  console.log('')
  
  // Player depuis TOPICS (20 bytes complets)
  // Topic est 32 bytes, player est aux 20 derniers bytes
  const playerFromTopic = topic2.slice(-20)
  const playerFromTopicHex = bytesToHex(playerFromTopic)
  
  console.log('=== PLAYER DEPUIS TOPICS (20 bytes complets) ===')
  console.log('Hex:', playerFromTopicHex)
  console.log('Bytes:', playerFromTopic.map(b => b.toString(16).padStart(2, '0')).join(' '))
  console.log('')
  
  // Player depuis DATA
  // Structure: discriminant (1) + game_number (16) = offset 17
  const playerStartOffset = 1 + 16 // offset 17
  
  // 19 bytes
  const player19Bytes = eventData.slice(playerStartOffset, playerStartOffset + 19)
  const player19Hex = bytesToHex(player19Bytes)
  
  // 20 bytes
  const player20Bytes = eventData.slice(playerStartOffset, playerStartOffset + 20)
  const player20Hex = bytesToHex(player20Bytes)
  
  console.log('=== PLAYER DEPUIS DATA (19 bytes) ===')
  console.log('Hex:', player19Hex)
  console.log('Bytes:', player19Bytes.map(b => b.toString(16).padStart(2, '0')).join(' '))
  console.log('')
  
  console.log('=== PLAYER DEPUIS DATA (20 bytes) ===')
  console.log('Hex:', player20Hex)
  console.log('Bytes:', player20Bytes.map(b => b.toString(16).padStart(2, '0')).join(' '))
  console.log('')
  
  // Comparaison
  console.log('=== COMPARAISON ===')
  console.log('Player depuis TOPICS (20 bytes):', playerFromTopicHex)
  console.log('Player depuis DATA (19 bytes):  ', player19Hex)
  console.log('Player depuis DATA (20 bytes):  ', player20Hex)
  console.log('')
  
  // Vérifier si les 19 premiers bytes correspondent
  const topic19Bytes = playerFromTopic.slice(0, 19)
  const topic19Hex = bytesToHex(topic19Bytes)
  
  console.log('=== VÉRIFICATION ===')
  console.log('19 premiers bytes depuis TOPICS:', topic19Hex)
  console.log('19 bytes depuis DATA:          ', player19Hex)
  console.log('Correspondent ?', topic19Hex.toLowerCase() === player19Hex.toLowerCase() ? '✅ OUI' : '❌ NON')
  console.log('')
  
  if (player20Bytes.length === 20) {
    const lastByteFromTopic = playerFromTopic[19]
    const lastByteFromData = player20Bytes[19]
    console.log('20ème byte depuis TOPICS:', lastByteFromTopic.toString(16).padStart(2, '0'))
    console.log('20ème byte depuis DATA:  ', lastByteFromData.toString(16).padStart(2, '0'))
    console.log('Correspondent ?', lastByteFromTopic === lastByteFromData ? '✅ OUI' : '❌ NON')
  }
}

// Main
if (process.argv.length < 4) {
  console.log('Usage: node scripts/analyze-player-bytes.js <eventData> <topic2>')
  console.log('')
  console.log('Exemple:')
  console.log('  node scripts/analyze-player-bytes.js \\')
  console.log('    "0x03..." \\')
  console.log('    "0x000000000000000000000000abcd1234567890abcdef1234567890abcdef12"')
  process.exit(1)
}

const eventData = process.argv[2]
const topic2 = process.argv[3]

analyzePlayer(eventData, topic2)
