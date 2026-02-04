// Central configuration for RPC endpoint and contract addresses
// This keeps defaults and environment handling in one place.

// Central RPC URL (WebSocket) used by the processor
// Renamed env var: RPC_URL_WS (was RPC_PASSET_HUB_WS)
// ❗ No hardcoded default: if RPC_URL_WS is missing/empty, we fail fast.
if (!process.env.RPC_URL_WS || process.env.RPC_URL_WS.trim().length === 0) {
  throw new Error(
    'RPC_URL_WS environment variable is required but not set. ' +
      'Please define it in your .env (or Docker/CI env) before starting the indexer.'
  )
}

export const RPC_URL: string = process.env.RPC_URL_WS.trim()

function parseRequiredAddressList(envName: string): string[] {
  const raw = process.env[envName]
  if (!raw || raw.trim().length === 0) {
    throw new Error(
      `${envName} environment variable is required but not set. ` +
        'Please define it in your .env (or Docker/CI env) as a comma-separated list of contract addresses.'
    )
  }

  const list = raw
    .split(',')
    .map((addr) => addr.trim())
    .filter((addr) => addr.length > 0)

  if (list.length === 0) {
    throw new Error(
      `${envName} environment variable is defined but empty after parsing. ` +
        'Provide at least one contract address.'
    )
  }

  return list
}

// Contract addresses (no hardcoded defaults, must come from env)
// Required:
// - GUESS_THE_NUMBER_CONTRACTS
// - ERC721_CONTRACTS
export const GUESS_THE_NUMBER_CONTRACTS: string[] =
  parseRequiredAddressList('GUESS_THE_NUMBER_CONTRACTS')

export const ERC721_CONTRACTS: string[] = parseRequiredAddressList('ERC721_CONTRACTS')

// Full target contracts list (lowercased) used for filtering/logging
// If TARGET_CONTRACTS is not provided, we build it from the two required groups.
const rawTargetContracts =
  process.env.TARGET_CONTRACTS && process.env.TARGET_CONTRACTS.trim().length > 0
    ? process.env.TARGET_CONTRACTS
    : [...GUESS_THE_NUMBER_CONTRACTS, ...ERC721_CONTRACTS].join(',')

export const TARGET_CONTRACTS: string[] = rawTargetContracts
  .split(',')
  .map((addr) => addr.trim().toLowerCase())
  .filter((addr) => addr.length > 0)

// Logging / environment
export const LOG_LEVEL: string = process.env.LOG_LEVEL || 'info'
export const NODE_ENV: string = process.env.NODE_ENV || 'development'

