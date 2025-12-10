/**
 * Generated event decoders for Ink! contract
 * 
 * This file contains SCALE decoders for all contract events.
 * Indexed event arguments are decoded from topics, non-indexed from event data.
 * 
 * @generated - Do not edit manually, regenerate with gen-ink-decoder.js
 */

import {hexToBytes, bytesToHex, readU8, readU16, readU32, readU64, readU128, readString, readCompactU32, assert} from '../../support'

/**
 * Event signature mapping (normalized hex without 0x prefix)
 */
export const EVENT_SIGNATURES = {
  'c8a7c5d86cdaf43555273e08a00e4cdaa93cf22046685231d5eb1b6c0d29fa92': 'new_game',
  'bfe3e4de23c556408a7c400baf6b27364bdb763595ac8f3547c20db70131083a': 'guess_made',
  'd30c753e3012d98d428abde3eebaae62a09d7d043d8018f1ecb4e6c5d3dc9429': 'clue_given',
  '4ee61a2092334a28b8ce7389a8ba2a9c1a9909e0c95b01cbbafb07b7bb576048': 'meta_transaction_decoded',
  '9fcfc0869a89de6464b06891fcfa026e1ac809ce01300cd76a342e696297dd20': 'role_granted',
  '67cf5731bde3ef79029b3c63ea7a49b0e816d53d665ff88e412b696684ab9c11': 'role_revoked',
  'cfd8f7cee62376e0a894a1c5d124ec219dc678fd742bcb7f183455a362744aa1': 'message_queued',
  'db1dbb06d6c5f62bcd2d0b8e2b251826b43e15a2b17b80080837dc8cd561a283': 'message_processed',
} as const

export function decodeNewGame(dataHex: string, topics: string[]): Record<string, unknown> {
  const data = hexToBytes(dataHex)
  const result: Record<string, unknown> = {}
  let offset = 0
  let topicIndex = 1
  {
    assert(topicIndex < topics.length, 'Missing topic for indexed arg game_number')
    const t = topics[topicIndex++]
    const tb = hexToBytes(t)
    assert(tb.length >= 32, 'Invalid topic length for indexed arg game_number')
    const r = readU128(tb, 0); result['game_number'] = r.value
  }
  {
    assert(topicIndex < topics.length, 'Missing topic for indexed arg player')
    const t = topics[topicIndex++]
    const tb = hexToBytes(t)
    assert(tb.length >= 32, 'Invalid topic length for indexed arg player')
    const hex = bytesToHex(tb.slice(tb.length - 20)); result['player'] = hex
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

export function decodeGuessMade(dataHex: string, topics: string[]): Record<string, unknown> {
  const data = hexToBytes(dataHex)
  const result: Record<string, unknown> = {}
  let offset = 0
  let topicIndex = 1
  {
    assert(topicIndex < topics.length, 'Missing topic for indexed arg game_number')
    const t = topics[topicIndex++]
    const tb = hexToBytes(t)
    assert(tb.length >= 32, 'Invalid topic length for indexed arg game_number')
    const r = readU128(tb, 0); result['game_number'] = r.value
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

export function decodeClueGiven(dataHex: string, topics: string[]): Record<string, unknown> {
  const data = hexToBytes(dataHex)
  const result: Record<string, unknown> = {}
  let offset = 0
  let topicIndex = 1
  {
    assert(topicIndex < topics.length, 'Missing topic for indexed arg game_number')
    const t = topics[topicIndex++]
    const tb = hexToBytes(t)
    assert(tb.length >= 32, 'Invalid topic length for indexed arg game_number')
    const r = readU128(tb, 0); result['game_number'] = r.value
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

export function decodeMetaTransactionDecoded(dataHex: string, topics: string[]): Record<string, unknown> {
  const data = hexToBytes(dataHex)
  const result: Record<string, unknown> = {}
  let offset = 0
  let topicIndex = 1
  return result
}

export function decodeRoleGranted(dataHex: string, topics: string[]): Record<string, unknown> {
  const data = hexToBytes(dataHex)
  const result: Record<string, unknown> = {}
  let offset = 0
  let topicIndex = 1
  {
    assert(topicIndex < topics.length, 'Missing topic for indexed arg role')
    const t = topics[topicIndex++]
    const tb = hexToBytes(t)
    assert(tb.length >= 32, 'Invalid topic length for indexed arg role')
    const r = readU32(tb, 0); result['role'] = r.value
  }
  {
    assert(topicIndex < topics.length, 'Missing topic for indexed arg grantee')
    const t = topics[topicIndex++]
    const tb = hexToBytes(t)
    assert(tb.length >= 32, 'Invalid topic length for indexed arg grantee')
    const hex = bytesToHex(tb.slice(tb.length - 20)); result['grantee'] = hex
  }
  {
    assert(offset <= data.length, 'Offset overflow for arg grantor')
    const r = (() => { const result: Record<string, any> = {};
    let currentOffset = offset
    const f_0 = (() => {
    const arr = []
    let arrOffset = currentOffset
    for (let i = 0; i < 20; i++) {
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
  let offset = 0
  let topicIndex = 1
  {
    assert(topicIndex < topics.length, 'Missing topic for indexed arg role')
    const t = topics[topicIndex++]
    const tb = hexToBytes(t)
    assert(tb.length >= 32, 'Invalid topic length for indexed arg role')
    const r = readU32(tb, 0); result['role'] = r.value
  }
  {
    assert(topicIndex < topics.length, 'Missing topic for indexed arg account')
    const t = topics[topicIndex++]
    const tb = hexToBytes(t)
    assert(tb.length >= 32, 'Invalid topic length for indexed arg account')
    const hex = bytesToHex(tb.slice(tb.length - 20)); result['account'] = hex
  }
  {
    assert(offset <= data.length, 'Offset overflow for arg sender')
    const r = (() => { const result: Record<string, any> = {};
    let currentOffset = offset
    const f_0 = (() => {
    const arr = []
    let arrOffset = currentOffset
    for (let i = 0; i < 20; i++) {
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

export function decodeMessageQueued(dataHex: string, topics: string[]): Record<string, unknown> {
  const data = hexToBytes(dataHex)
  const result: Record<string, unknown> = {}
  let offset = 0
  let topicIndex = 1
  {
    assert(topicIndex < topics.length, 'Missing topic for indexed arg id')
    const t = topics[topicIndex++]
    const tb = hexToBytes(t)
    assert(tb.length >= 32, 'Invalid topic length for indexed arg id')
    const r = readU32(tb, 0); result['id'] = r.value
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
  let offset = 0
  let topicIndex = 1
  {
    assert(topicIndex < topics.length, 'Missing topic for indexed arg id')
    const t = topics[topicIndex++]
    const tb = hexToBytes(t)
    assert(tb.length >= 32, 'Invalid topic length for indexed arg id')
    const r = readU32(tb, 0); result['id'] = r.value
  }
  return result
}

/**
 * Union type of all decodable events
 */
export type AnyDecodedEvent =
  | { eventType: 'new_game'; data: ReturnType<typeof decodeNewGame> }
  | { eventType: 'guess_made'; data: ReturnType<typeof decodeGuessMade> }
  | { eventType: 'clue_given'; data: ReturnType<typeof decodeClueGiven> }
  | { eventType: 'meta_transaction_decoded'; data: ReturnType<typeof decodeMetaTransactionDecoded> }
  | { eventType: 'role_granted'; data: ReturnType<typeof decodeRoleGranted> }
  | { eventType: 'role_revoked'; data: ReturnType<typeof decodeRoleRevoked> }
  | { eventType: 'message_queued'; data: ReturnType<typeof decodeMessageQueued> }
  | { eventType: 'message_processed'; data: ReturnType<typeof decodeMessageProcessed> }

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
    case 'bfe3e4de23c556408a7c400baf6b27364bdb763595ac8f3547c20db70131083a': return { eventType: 'guess_made', data: decodeGuessMade(dataHex, topics) }
    case 'd30c753e3012d98d428abde3eebaae62a09d7d043d8018f1ecb4e6c5d3dc9429': return { eventType: 'clue_given', data: decodeClueGiven(dataHex, topics) }
    case '4ee61a2092334a28b8ce7389a8ba2a9c1a9909e0c95b01cbbafb07b7bb576048': return { eventType: 'meta_transaction_decoded', data: decodeMetaTransactionDecoded(dataHex, topics) }
    case '9fcfc0869a89de6464b06891fcfa026e1ac809ce01300cd76a342e696297dd20': return { eventType: 'role_granted', data: decodeRoleGranted(dataHex, topics) }
    case '67cf5731bde3ef79029b3c63ea7a49b0e816d53d665ff88e412b696684ab9c11': return { eventType: 'role_revoked', data: decodeRoleRevoked(dataHex, topics) }
    case 'cfd8f7cee62376e0a894a1c5d124ec219dc678fd742bcb7f183455a362744aa1': return { eventType: 'message_queued', data: decodeMessageQueued(dataHex, topics) }
    case 'db1dbb06d6c5f62bcd2d0b8e2b251826b43e15a2b17b80080837dc8cd561a283': return { eventType: 'message_processed', data: decodeMessageProcessed(dataHex, topics) }
    default: return null
  }
}
