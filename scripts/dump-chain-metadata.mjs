#!/usr/bin/env node
/**
 * Dump chain metadata from the configured RPC (guess-the-number-node or any Substrate chain).
 * Uses @subsquid/substrate-metadata-explorer. Output is used by typegen (specVersions).
 *
 * Prerequisites: RPC_URL_WS in .env (or environment).
 * Usage: node scripts/dump-chain-metadata.mjs [--fromBlock N] [--toBlock N]
 *        yarn metadata:chain
 */

import { spawnSync } from 'child_process'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const rootDir = resolve(__dirname, '..')

// Load .env if present (dotenv not necessarily installed at script level; prefer env from caller)
const RPC_URL_WS = process.env.RPC_URL_WS
const OUTPUT_FILE = process.env.CHAIN_METADATA_OUTPUT || resolve(rootDir, 'metadata', 'chain-metadata.jsonl')

if (!RPC_URL_WS || !String(RPC_URL_WS).trim()) {
  console.error('❌ RPC_URL_WS is required. Set it in .env or run: RPC_URL_WS=wss://... yarn metadata:chain')
  process.exit(1)
}

const fromBlock = process.argv.includes('--fromBlock')
  ? process.argv[process.argv.indexOf('--fromBlock') + 1]
  : undefined
const toBlock = process.argv.includes('--toBlock')
  ? process.argv[process.argv.indexOf('--toBlock') + 1]
  : undefined

console.log(`📥 Dumping chain metadata from RPC: ${RPC_URL_WS}`)
console.log(`📄 Output: ${OUTPUT_FILE}`)

const args = [
  'squid-substrate-metadata-explorer',
  '--rpc', RPC_URL_WS.trim(),
  '--out', OUTPUT_FILE
]
if (fromBlock) args.push('--fromBlock', fromBlock)
if (toBlock) args.push('--toBlock', toBlock)

const result = spawnSync('npx', args, {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true
})

if (result.status !== 0) {
  console.error(`❌ squid-substrate-metadata-explorer exited with ${result.status}`)
  process.exit(result.status || 1)
}

console.log(`\n✅ Chain metadata written to ${OUTPUT_FILE}`)
console.log('💡 Run: yarn codegen')
