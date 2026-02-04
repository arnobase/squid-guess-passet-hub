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
  '581d34008439cf4f831ebf644557ad936486a69c1c25362f1fcdf760c0bc23b8': 'mint',
  '5bfef3a00bd4b3e098b33798349507ea2903ee5c3bdb0755eea18a94ba9da921': 'burnt',
  '230595c0c31141bf6ce57e0231b6fa081deaaff70e3a316fac62677d5aed068d': 'approval',
  '388e8026865b1896d7ca08222af78c786d606407d62ab2896b98ffb03becd410': 'transfer',
  'c488ece6da933c3137b43557ffeb77ffe7b5b394f6bc3c8ca08a715e8161ba08': 'approval_for_all',
} as const

export function decodeMint(dataHex: string, topics: string[]): Record<string, unknown> {
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
    assert(offset <= data.length, 'Offset overflow for arg max_attempts')
    const r = readU32(data, offset)
    result['max_attempts'] = r.value
    offset = r.offset
  }
  return result
}

export function decodeBurnt(dataHex: string, topics: string[]): Record<string, unknown> {
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

export function decodeApproval(dataHex: string, topics: string[]): Record<string, unknown> {
  const data = hexToBytes(dataHex)
  const result: Record<string, unknown> = {}
  let offset = 1
  let topicIndex = 1
  {
    assert(topicIndex < topics.length, 'Missing topic for indexed arg from')
    const t = topics[topicIndex++]
    const tb = hexToBytes(t)
    assert(tb.length >= 32, 'Invalid topic length for indexed arg from')
    const hex = bytesToHex(tb.slice(tb.length - 20)); result['from'] = hex
    // Skip this indexed field in event data (it's also encoded in data, not just topics)
    // SPECIAL: H160 addresses are 19 bytes in event data (not 20) when in composite types
    offset = offset + 19
  }
  {
    assert(topicIndex < topics.length, 'Missing topic for indexed arg to')
    const t = topics[topicIndex++]
    const tb = hexToBytes(t)
    assert(tb.length >= 32, 'Invalid topic length for indexed arg to')
    const hex = bytesToHex(tb.slice(tb.length - 20)); result['to'] = hex
    // Skip this indexed field in event data (it's also encoded in data, not just topics)
    // SPECIAL: H160 addresses are 19 bytes in event data (not 20) when in composite types
    offset = offset + 19
  }
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

export function decodeTransfer(dataHex: string, topics: string[]): Record<string, unknown> {
  const data = hexToBytes(dataHex)
  const result: Record<string, unknown> = {}
  let offset = 1
  let topicIndex = 1
  {
    assert(topicIndex < topics.length, 'Missing topic for indexed arg from')
    const t = topics[topicIndex++]
    const tb = hexToBytes(t)
    assert(tb.length >= 32, 'Invalid topic length for indexed arg from')
    // Fallback: store raw topic for unsupported type
    result['from'] = t
    // Skip this indexed field in event data (it's also encoded in data, not just topics)
    const skip_r = (() => {
    const discriminant = data[offset]
    let variantOffset = offset + 1
    switch (discriminant) {
      case 0: return { value: 'None', offset: variantOffset }
      case 1: {
        const fields: any[] = []
        const f0 = (() => { const result: Record<string, any> = {};
    let currentOffset = variantOffset
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
    return { value: result, offset: currentOffset } })(); fields.push(f0.value); variantOffset = f0.offset
        return { value: { tag: 'Some', value: fields }, offset: variantOffset }
      }
      default: return { value: { tag: 'UnknownVariant', index: discriminant }, offset: variantOffset }
    }
  })()
    offset = skip_r.offset
  }
  {
    assert(topicIndex < topics.length, 'Missing topic for indexed arg to')
    const t = topics[topicIndex++]
    const tb = hexToBytes(t)
    assert(tb.length >= 32, 'Invalid topic length for indexed arg to')
    // Fallback: store raw topic for unsupported type
    result['to'] = t
    // Skip this indexed field in event data (it's also encoded in data, not just topics)
    const skip_r = (() => {
    const discriminant = data[offset]
    let variantOffset = offset + 1
    switch (discriminant) {
      case 0: return { value: 'None', offset: variantOffset }
      case 1: {
        const fields: any[] = []
        const f0 = (() => { const result: Record<string, any> = {};
    let currentOffset = variantOffset
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
    return { value: result, offset: currentOffset } })(); fields.push(f0.value); variantOffset = f0.offset
        return { value: { tag: 'Some', value: fields }, offset: variantOffset }
      }
      default: return { value: { tag: 'UnknownVariant', index: discriminant }, offset: variantOffset }
    }
  })()
    offset = skip_r.offset
  }
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

export function decodeApprovalForAll(dataHex: string, topics: string[]): Record<string, unknown> {
  const data = hexToBytes(dataHex)
  const result: Record<string, unknown> = {}
  let offset = 1
  let topicIndex = 1
  {
    assert(topicIndex < topics.length, 'Missing topic for indexed arg owner')
    const t = topics[topicIndex++]
    const tb = hexToBytes(t)
    assert(tb.length >= 32, 'Invalid topic length for indexed arg owner')
    const hex = bytesToHex(tb.slice(tb.length - 20)); result['owner'] = hex
    // Skip this indexed field in event data (it's also encoded in data, not just topics)
    // SPECIAL: H160 addresses are 19 bytes in event data (not 20) when in composite types
    offset = offset + 19
  }
  {
    assert(topicIndex < topics.length, 'Missing topic for indexed arg operator')
    const t = topics[topicIndex++]
    const tb = hexToBytes(t)
    assert(tb.length >= 32, 'Invalid topic length for indexed arg operator')
    const hex = bytesToHex(tb.slice(tb.length - 20)); result['operator'] = hex
    // Skip this indexed field in event data (it's also encoded in data, not just topics)
    // SPECIAL: H160 addresses are 19 bytes in event data (not 20) when in composite types
    offset = offset + 19
  }
  {
    assert(offset <= data.length, 'Offset overflow for arg approved')
    const r = (() => { const b = data[offset] !== 0; return { value: b, offset: offset + 1 } })()
    result['approved'] = r.value
    offset = r.offset
  }
  return result
}

/**
 * Union type of all decodable events
 */
export type AnyDecodedEvent =
  | { eventType: 'mint'; data: ReturnType<typeof decodeMint> }
  | { eventType: 'burnt'; data: ReturnType<typeof decodeBurnt> }
  | { eventType: 'approval'; data: ReturnType<typeof decodeApproval> }
  | { eventType: 'transfer'; data: ReturnType<typeof decodeTransfer> }
  | { eventType: 'approval_for_all'; data: ReturnType<typeof decodeApprovalForAll> }

/**
 * Decode an event by signature
 * @param signatureHex - Event signature (topics[0] without 0x)
 * @param dataHex - Event data hex string
 * @param topics - Array of topic hex strings
 * @returns Decoded event or null if signature not found
 */
export function decodeEvent(signatureHex: string, dataHex: string, topics: string[]): AnyDecodedEvent | null {
  switch (signatureHex) {
    case '581d34008439cf4f831ebf644557ad936486a69c1c25362f1fcdf760c0bc23b8': return { eventType: 'mint', data: decodeMint(dataHex, topics) }
    case '5bfef3a00bd4b3e098b33798349507ea2903ee5c3bdb0755eea18a94ba9da921': return { eventType: 'burnt', data: decodeBurnt(dataHex, topics) }
    case '230595c0c31141bf6ce57e0231b6fa081deaaff70e3a316fac62677d5aed068d': return { eventType: 'approval', data: decodeApproval(dataHex, topics) }
    case '388e8026865b1896d7ca08222af78c786d606407d62ab2896b98ffb03becd410': return { eventType: 'transfer', data: decodeTransfer(dataHex, topics) }
    case 'c488ece6da933c3137b43557ffeb77ffe7b5b394f6bc3c8ca08a715e8161ba08': return { eventType: 'approval_for_all', data: decodeApprovalForAll(dataHex, topics) }
    default: return null
  }
}
