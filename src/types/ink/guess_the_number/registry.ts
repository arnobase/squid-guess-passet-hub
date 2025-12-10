/**
 * Version registry for contract decoder routing
 * 
 * Maps contract addresses and block heights to decoder versions.
 * When multiple versions exist, this determines which decoder to use.
 * 
 * @generated - Do not edit manually, regenerate with gen-ink-decoder.js
 */

import * as v0_1_0 from './v0.1.0'

/**
 * Version entry in registry
 */
export type VersionEntry = {
  version: string
  addresses?: string[]
  codeHash?: string
  from?: number
  to?: number | null
}

/**
 * Registry of all decoder versions for this contract
 * Sorted by starting block height
 */
const registry: VersionEntry[] = [
  { version: 'v0.1.0', addresses: ['0xe75cbd47620dbb2053cf2a98d06840f06baaf141'], from: 1934744, to: null }
]

/**
 * Resolve which decoder version to use based on contract address and block height
 * @param _address - Contract address
 * @param _blockHeight - Current block height
 * @param _codeHash - Optional contract code hash (for more precise matching)
 * @returns Decoder module for the resolved version
 */
export function resolveDecoder(_address: string, _blockHeight: number, _codeHash?: string) {
  // Filter entries matching address
  const addressMatches = registry.filter(function(e) {
    if (e.addresses && e.addresses.length > 0) {
      return e.addresses.indexOf(_address) !== -1
    }
    return true // No address filter
  })
  
  // Find entries matching block height range
  const rangeMatches = addressMatches.filter(function(e) {
    const fromMatch = !e.from || _blockHeight >= e.from
    const toMatch = !e.to || _blockHeight < e.to
    return fromMatch && toMatch
  })
  
  // If no range match, use first address match (fallback)
  const candidates = rangeMatches.length > 0 ? rangeMatches : addressMatches
  
  if (candidates.length === 0) {
    throw new Error('No decoder version found for address ' + _address)
  }
  
  // Sort by 'from' descending (most recent first)
  // This ensures that when multiple versions match (e.g., both have to: null),
  // we prefer the most recent version (highest 'from' block)
  candidates.sort(function(a, b) {
    const aFrom = a.from !== undefined ? a.from : 0
    const bFrom = b.from !== undefined ? b.from : 0
    return bFrom - aFrom // Descending order
  })
  
  const entry = candidates[0]
  
  switch (entry.version) {
      case 'v0.1.0': return v0_1_0
    default: throw new Error('Version not found: ' + entry.version)
  }
}

/**
 * Decode an event with automatic version routing
 * @param signatureHex - Event signature (topics[0] without 0x)
 * @param dataHex - Event data hex string
 * @param topics - Array of topic hex strings
 * @param ctx - Context with address, blockHeight, and optional codeHash
 * @returns Decoded event or null
 */
export function decodeEventWithRouting(signatureHex: string, dataHex: string, topics: string[], ctx: { address: string; blockHeight: number; codeHash?: string }) {
  const v = resolveDecoder(ctx.address, ctx.blockHeight, ctx.codeHash)
  return v.decodeEvent(signatureHex, dataHex, topics)
}
