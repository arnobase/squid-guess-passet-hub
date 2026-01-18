/**
 * Generated event decoders for Ink! contract
 * 
 * This file contains SCALE decoders for all contract events.
 * Indexed event arguments are decoded from topics, non-indexed from event data.
 * 
 * @generated - Do not edit manually, regenerate with gen-ink-decoder.js
 */

import {hexToBytes, bytesToHex, readU8, readU16, readU32, readU64, readU128, readString, readCompactU32, assert} from '@luckyweb3/subsquid-ink-v6-decoder/support'

/**
 * Event signature mapping (normalized hex without 0x prefix)
 */
export const EVENT_SIGNATURES = {
  'c8a7c5d86cdaf43555273e08a00e4cdaa93cf22046685231d5eb1b6c0d29fa92': 'new_game',
  '3db1630316e0f6c2b1c4274ba861a905acb84d336a2ba821871076503558da72': 'game_over',
  '6fbbc2beca7d1247dbf89f89623d64c4431ae74cc6ec660f6ce708d846997769': 'clue_given',
  'f5b23c2011134ba2467787da32da9ddda148939ab974db7735944b8ea67c3e5d': 'guess_made',
  'e1c579bb2a3625a2352da9d7e54506f12b7b582ceb069232e25005bddcbbbb21': 'game_cancelled',
  '732f6678ce566a0ec18049af450298a2ebd0f38244d07ed84d01af908a9b6e20': 'max_attempts_updated',
  'cfd8f7cee62376e0a894a1c5d124ec219dc678fd742bcb7f183455a362744aa1': 'message_queued',
  'db1dbb06d6c5f62bcd2d0b8e2b251826b43e15a2b17b80080837dc8cd561a283': 'message_processed',
  '9fcfc0869a89de6464b06891fcfa026e1ac809ce01300cd76a342e696297dd20': 'role_granted',
  '67cf5731bde3ef79029b3c63ea7a49b0e816d53d665ff88e412b696684ab9c11': 'role_revoked',
  '4ee61a2092334a28b8ce7389a8ba2a9c1a9909e0c95b01cbbafb07b7bb576048': 'meta_transaction_decoded',
} as const

export function decodeNewGame(dataHex: string, topics: string[]): Record<string, unknown> {
  const data = hexToBytes(dataHex)
  const result: Record<string, unknown> = {}
  let offset = 1
  let topicIndex = 1
  {
    assert(topicIndex < topics.length, 'Missing topic for indexed arg game_number')
    const t = topics[topicIndex++]
    const tb = hexToBytes(t)
    assert(tb.length >= 32, 'Invalid topic length for indexed arg game_number')
    const r = readU128(tb, 0); result['game_number'] = r.value
    // Skip this indexed field in event data (it's also encoded in data, not just topics)
    const skip_r = readU128(data, offset)
    offset = skip_r.offset
  }
  {
    assert(topicIndex < topics.length, 'Missing topic for indexed arg player')
    const t = topics[topicIndex++]
    const tb = hexToBytes(t)
    assert(tb.length >= 32, 'Invalid topic length for indexed arg player')
    const hex = bytesToHex(tb.slice(tb.length - 20)); result['player'] = hex
    // Skip this indexed field in event data (it's also encoded in data, not just topics)
    // SPECIAL: H160 addresses are 19 bytes in event data (not 20) when in composite types
    offset = offset + 19
  }
  {
    assert(offset <= data.length, 'Offset overflow for arg min_number')
    const r = readU16(data, offset)
    result['min_number'] = r.value
    offset = r.offset
  }
  {
    assert(offset <= data.length, 'Offset overflow for arg max_number')
    const r = readU16(data, offset)
    result['max_number'] = r.value
    offset = r.offset
  }
  return result
}

export function decodeGameOver(dataHex: string, topics: string[]): Record<string, unknown> {
  const data = hexToBytes(dataHex)
  const result: Record<string, unknown> = {}
  let offset = 1
  let topicIndex = 1
  {
    assert(topicIndex < topics.length, 'Missing topic for indexed arg game_number')
    const t = topics[topicIndex++]
    const tb = hexToBytes(t)
    assert(tb.length >= 32, 'Invalid topic length for indexed arg game_number')
    const r = readU128(tb, 0); result['game_number'] = r.value
    // Skip this indexed field in event data (it's also encoded in data, not just topics)
    const skip_r = readU128(data, offset)
    offset = skip_r.offset
  }
  {
    assert(topicIndex < topics.length, 'Missing topic for indexed arg player')
    const t = topics[topicIndex++]
    const tb = hexToBytes(t)
    assert(tb.length >= 32, 'Invalid topic length for indexed arg player')
    const hex = bytesToHex(tb.slice(tb.length - 20)); result['player'] = hex
    // Skip this indexed field in event data (it's also encoded in data, not just topics)
    // SPECIAL: H160 addresses are 19 bytes in event data (not 20) when in composite types
    offset = offset + 19
  }
  {
    assert(offset <= data.length, 'Offset overflow for arg win')
    const r = (() => { const b = data[offset] !== 0; return { value: b, offset: offset + 1 } })()
    result['win'] = r.value
    offset = r.offset
  }
  {
    assert(offset <= data.length, 'Offset overflow for arg target')
    const r = readU16(data, offset)
    result['target'] = r.value
    offset = r.offset
  }
  return result
}

export function decodeClueGiven(dataHex: string, topics: string[]): Record<string, unknown> {
  const data = hexToBytes(dataHex)
  const result: Record<string, unknown> = {}
  let offset = 1
  let topicIndex = 1
  {
    assert(topicIndex < topics.length, 'Missing topic for indexed arg game_number')
    const t = topics[topicIndex++]
    const tb = hexToBytes(t)
    assert(tb.length >= 32, 'Invalid topic length for indexed arg game_number')
    const r = readU128(tb, 0); result['game_number'] = r.value
    // Skip this indexed field in event data (it's also encoded in data, not just topics)
    const skip_r = readU128(data, offset)
    offset = skip_r.offset
  }
  {
    assert(topicIndex < topics.length, 'Missing topic for indexed arg player')
    const t = topics[topicIndex++]
    const tb = hexToBytes(t)
    assert(tb.length >= 32, 'Invalid topic length for indexed arg player')
    const hex = bytesToHex(tb.slice(tb.length - 20)); result['player'] = hex
    // Skip this indexed field in event data (it's also encoded in data, not just topics)
    // SPECIAL: H160 addresses are 19 bytes in event data (not 20) when in composite types
    offset = offset + 19
  }
  {
    assert(offset <= data.length, 'Offset overflow for arg attempt')
    const r = readU32(data, offset)
    result['attempt'] = r.value
    offset = r.offset
  }
  {
    assert(offset <= data.length, 'Offset overflow for arg guess')
    const r = readU16(data, offset)
    result['guess'] = r.value
    offset = r.offset
  }
  {
    assert(offset <= data.length, 'Offset overflow for arg clue')
    const r = (() => { const idx = data[offset]; const map = ["More","Less","Found"]; return { value: map[idx] || 'Unknown', offset: offset + 1 } })()
    result['clue'] = r.value
    offset = r.offset
  }
  return result
}

export function decodeGuessMade(dataHex: string, topics: string[]): Record<string, unknown> {
  const data = hexToBytes(dataHex)
  const result: Record<string, unknown> = {}
  let offset = 1
  let topicIndex = 1
  {
    assert(topicIndex < topics.length, 'Missing topic for indexed arg game_number')
    const t = topics[topicIndex++]
    const tb = hexToBytes(t)
    assert(tb.length >= 32, 'Invalid topic length for indexed arg game_number')
    const r = readU128(tb, 0); result['game_number'] = r.value
    // Skip this indexed field in event data (it's also encoded in data, not just topics)
    const skip_r = readU128(data, offset)
    offset = skip_r.offset
  }
  {
    assert(topicIndex < topics.length, 'Missing topic for indexed arg player')
    const t = topics[topicIndex++]
    const tb = hexToBytes(t)
    assert(tb.length >= 32, 'Invalid topic length for indexed arg player')
    const hex = bytesToHex(tb.slice(tb.length - 20)); result['player'] = hex
    // Skip this indexed field in event data (it's also encoded in data, not just topics)
    // SPECIAL: H160 addresses are 19 bytes in event data (not 20) when in composite types
    offset = offset + 19
  }
  {
    assert(offset <= data.length, 'Offset overflow for arg attempt')
    const r = readU32(data, offset)
    result['attempt'] = r.value
    offset = r.offset
  }
  {
    assert(offset <= data.length, 'Offset overflow for arg guess')
    const r = readU16(data, offset)
    result['guess'] = r.value
    offset = r.offset
  }
  return result
}

export function decodeGameCancelled(dataHex: string, topics: string[]): Record<string, unknown> {
  const data = hexToBytes(dataHex)
  const result: Record<string, unknown> = {}
  let offset = 1
  let topicIndex = 1
  {
    assert(topicIndex < topics.length, 'Missing topic for indexed arg game_number')
    const t = topics[topicIndex++]
    const tb = hexToBytes(t)
    assert(tb.length >= 32, 'Invalid topic length for indexed arg game_number')
    const r = readU128(tb, 0); result['game_number'] = r.value
    // Skip this indexed field in event data (it's also encoded in data, not just topics)
    const skip_r = readU128(data, offset)
    offset = skip_r.offset
  }
  {
    assert(topicIndex < topics.length, 'Missing topic for indexed arg player')
    const t = topics[topicIndex++]
    const tb = hexToBytes(t)
    assert(tb.length >= 32, 'Invalid topic length for indexed arg player')
    const hex = bytesToHex(tb.slice(tb.length - 20)); result['player'] = hex
    // Skip this indexed field in event data (it's also encoded in data, not just topics)
    // SPECIAL: H160 addresses are 19 bytes in event data (not 20) when in composite types
    offset = offset + 19
  }
  return result
}

export function decodeMaxAttemptsUpdated(dataHex: string, topics: string[]): Record<string, unknown> {
  const data = hexToBytes(dataHex)
  const result: Record<string, unknown> = {}
  let offset = 1
  let topicIndex = 1
  {
    assert(topicIndex < topics.length, 'Missing topic for indexed arg game_number')
    const t = topics[topicIndex++]
    const tb = hexToBytes(t)
    assert(tb.length >= 32, 'Invalid topic length for indexed arg game_number')
    const r = readU128(tb, 0); result['game_number'] = r.value
    // Skip this indexed field in event data (it's also encoded in data, not just topics)
    const skip_r = readU128(data, offset)
    offset = skip_r.offset
  }
  {
    assert(topicIndex < topics.length, 'Missing topic for indexed arg player')
    const t = topics[topicIndex++]
    const tb = hexToBytes(t)
    assert(tb.length >= 32, 'Invalid topic length for indexed arg player')
    const hex = bytesToHex(tb.slice(tb.length - 20)); result['player'] = hex
    // Skip this indexed field in event data (it's also encoded in data, not just topics)
    // SPECIAL: H160 addresses are 19 bytes in event data (not 20) when in composite types
    offset = offset + 19
  }
  {
    assert(offset <= data.length, 'Offset overflow for arg max_attempts')
    const r = readU32(data, offset)
    result['max_attempts'] = r.value
    offset = r.offset
  }
  return result
}

export function decodeMessageQueued(dataHex: string, topics: string[]): Record<string, unknown> {
  const data = hexToBytes(dataHex)
  const result: Record<string, unknown> = {}
  let offset = 1
  let topicIndex = 1
  {
    assert(topicIndex < topics.length, 'Missing topic for indexed arg id')
    const t = topics[topicIndex++]
    const tb = hexToBytes(t)
    assert(tb.length >= 32, 'Invalid topic length for indexed arg id')
    const r = readU32(tb, 0); result['id'] = r.value
    // Skip this indexed field in event data (it's also encoded in data, not just topics)
    const skip_r = readU32(data, offset)
    offset = skip_r.offset
  }
  {
    assert(offset <= data.length, 'Offset overflow for arg data')
    const r = (() => { const len = readCompactU32(data, offset); const start = len.offset; const end = start + Number(len.value); return { value: data.slice(start, end), offset: end } })()
    result['data'] = r.value
    offset = r.offset
  }
  return result
}

export function decodeMessageProcessed(dataHex: string, topics: string[]): Record<string, unknown> {
  const data = hexToBytes(dataHex)
  const result: Record<string, unknown> = {}
  let offset = 1
  let topicIndex = 1
  {
    assert(topicIndex < topics.length, 'Missing topic for indexed arg id')
    const t = topics[topicIndex++]
    const tb = hexToBytes(t)
    assert(tb.length >= 32, 'Invalid topic length for indexed arg id')
    const r = readU32(tb, 0); result['id'] = r.value
    // Skip this indexed field in event data (it's also encoded in data, not just topics)
    const skip_r = readU32(data, offset)
    offset = skip_r.offset
  }
  return result
}

export function decodeRoleGranted(dataHex: string, topics: string[]): Record<string, unknown> {
  const data = hexToBytes(dataHex)
  const result: Record<string, unknown> = {}
  let offset = 1
  let topicIndex = 1
  {
    assert(topicIndex < topics.length, 'Missing topic for indexed arg role')
    const t = topics[topicIndex++]
    const tb = hexToBytes(t)
    assert(tb.length >= 32, 'Invalid topic length for indexed arg role')
    const r = readU32(tb, 0); result['role'] = r.value
    // Skip this indexed field in event data (it's also encoded in data, not just topics)
    const skip_r = readU32(data, offset)
    offset = skip_r.offset
  }
  {
    assert(topicIndex < topics.length, 'Missing topic for indexed arg grantee')
    const t = topics[topicIndex++]
    const tb = hexToBytes(t)
    assert(tb.length >= 32, 'Invalid topic length for indexed arg grantee')
    const hex = bytesToHex(tb.slice(tb.length - 20)); result['grantee'] = hex
    // Skip this indexed field in event data (it's also encoded in data, not just topics)
    // SPECIAL: H160 addresses are 19 bytes in event data (not 20) when in composite types
    offset = offset + 19
  }
  {
    assert(offset <= data.length, 'Offset overflow for arg grantor')
    const r = (() => { const result: Record<string, any> = {};
    let currentOffset = offset
    const f_0 = (() => {
    const arr = []
    let arrOffset = currentOffset
    for (let i = 0; i < 19 /* H160: 19 bytes in event data, not 20 */; i++) {
      const elem = readU8(data, arrOffset)
      arr.push(elem.value)
      arrOffset = elem.offset
    }
    return { value: arr, offset: arrOffset }
  })()
    result['field0'] = f_0.value
    currentOffset = f_0.offset
    return { value: result, offset: currentOffset } })()
    result['grantor'] = r.value
    offset = r.offset
  }
  return result
}

export function decodeRoleRevoked(dataHex: string, topics: string[]): Record<string, unknown> {
  const data = hexToBytes(dataHex)
  const result: Record<string, unknown> = {}
  let offset = 1
  let topicIndex = 1
  {
    assert(topicIndex < topics.length, 'Missing topic for indexed arg role')
    const t = topics[topicIndex++]
    const tb = hexToBytes(t)
    assert(tb.length >= 32, 'Invalid topic length for indexed arg role')
    const r = readU32(tb, 0); result['role'] = r.value
    // Skip this indexed field in event data (it's also encoded in data, not just topics)
    const skip_r = readU32(data, offset)
    offset = skip_r.offset
  }
  {
    assert(topicIndex < topics.length, 'Missing topic for indexed arg account')
    const t = topics[topicIndex++]
    const tb = hexToBytes(t)
    assert(tb.length >= 32, 'Invalid topic length for indexed arg account')
    const hex = bytesToHex(tb.slice(tb.length - 20)); result['account'] = hex
    // Skip this indexed field in event data (it's also encoded in data, not just topics)
    // SPECIAL: H160 addresses are 19 bytes in event data (not 20) when in composite types
    offset = offset + 19
  }
  {
    assert(offset <= data.length, 'Offset overflow for arg sender')
    const r = (() => { const result: Record<string, any> = {};
    let currentOffset = offset
    const f_0 = (() => {
    const arr = []
    let arrOffset = currentOffset
    for (let i = 0; i < 19 /* H160: 19 bytes in event data, not 20 */; i++) {
      const elem = readU8(data, arrOffset)
      arr.push(elem.value)
      arrOffset = elem.offset
    }
    return { value: arr, offset: arrOffset }
  })()
    result['field0'] = f_0.value
    currentOffset = f_0.offset
    return { value: result, offset: currentOffset } })()
    result['sender'] = r.value
    offset = r.offset
  }
  return result
}

export function decodeMetaTransactionDecoded(dataHex: string, topics: string[]): Record<string, unknown> {
  const data = hexToBytes(dataHex)
  const result: Record<string, unknown> = {}
  let offset = 1
  let topicIndex = 1
  return result
}

/**
 * Union type of all decodable events
 */
export type AnyDecodedEvent =
  | { eventType: 'new_game'; data: ReturnType<typeof decodeNewGame> }
  | { eventType: 'game_over'; data: ReturnType<typeof decodeGameOver> }
  | { eventType: 'clue_given'; data: ReturnType<typeof decodeClueGiven> }
  | { eventType: 'guess_made'; data: ReturnType<typeof decodeGuessMade> }
  | { eventType: 'game_cancelled'; data: ReturnType<typeof decodeGameCancelled> }
  | { eventType: 'max_attempts_updated'; data: ReturnType<typeof decodeMaxAttemptsUpdated> }
  | { eventType: 'message_queued'; data: ReturnType<typeof decodeMessageQueued> }
  | { eventType: 'message_processed'; data: ReturnType<typeof decodeMessageProcessed> }
  | { eventType: 'role_granted'; data: ReturnType<typeof decodeRoleGranted> }
  | { eventType: 'role_revoked'; data: ReturnType<typeof decodeRoleRevoked> }
  | { eventType: 'meta_transaction_decoded'; data: ReturnType<typeof decodeMetaTransactionDecoded> }

/**
 * Decode an event by signature
 * @param signatureHex - Event signature (topics[0] without 0x)
 * @param dataHex - Event data hex string
 * @param topics - Array of topic hex strings
 * @returns Decoded event or null if signature not found
 */
export function decodeEvent(signatureHex: string, dataHex: string, topics: string[]): AnyDecodedEvent | null {
  switch (signatureHex) {
    case 'c8a7c5d86cdaf43555273e08a00e4cdaa93cf22046685231d5eb1b6c0d29fa92': return { eventType: 'new_game', data: decodeNewGame(dataHex, topics) }
    case '3db1630316e0f6c2b1c4274ba861a905acb84d336a2ba821871076503558da72': return { eventType: 'game_over', data: decodeGameOver(dataHex, topics) }
    case '6fbbc2beca7d1247dbf89f89623d64c4431ae74cc6ec660f6ce708d846997769': return { eventType: 'clue_given', data: decodeClueGiven(dataHex, topics) }
    case 'f5b23c2011134ba2467787da32da9ddda148939ab974db7735944b8ea67c3e5d': return { eventType: 'guess_made', data: decodeGuessMade(dataHex, topics) }
    case 'e1c579bb2a3625a2352da9d7e54506f12b7b582ceb069232e25005bddcbbbb21': return { eventType: 'game_cancelled', data: decodeGameCancelled(dataHex, topics) }
    case '732f6678ce566a0ec18049af450298a2ebd0f38244d07ed84d01af908a9b6e20': return { eventType: 'max_attempts_updated', data: decodeMaxAttemptsUpdated(dataHex, topics) }
    case 'cfd8f7cee62376e0a894a1c5d124ec219dc678fd742bcb7f183455a362744aa1': return { eventType: 'message_queued', data: decodeMessageQueued(dataHex, topics) }
    case 'db1dbb06d6c5f62bcd2d0b8e2b251826b43e15a2b17b80080837dc8cd561a283': return { eventType: 'message_processed', data: decodeMessageProcessed(dataHex, topics) }
    case '9fcfc0869a89de6464b06891fcfa026e1ac809ce01300cd76a342e696297dd20': return { eventType: 'role_granted', data: decodeRoleGranted(dataHex, topics) }
    case '67cf5731bde3ef79029b3c63ea7a49b0e816d53d665ff88e412b696684ab9c11': return { eventType: 'role_revoked', data: decodeRoleRevoked(dataHex, topics) }
    case '4ee61a2092334a28b8ce7389a8ba2a9c1a9909e0c95b01cbbafb07b7bb576048': return { eventType: 'meta_transaction_decoded', data: decodeMetaTransactionDecoded(dataHex, topics) }
    default: return null
  }
}
