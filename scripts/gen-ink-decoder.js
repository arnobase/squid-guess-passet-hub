#!/usr/bin/env node
/*
 * Codegen CLI for generating Ink! contract decoders into src/types/ink
 * 
 * This generator reads Ink! v6 metadata JSON and produces TypeScript decoders
 * that can decode event data using SCALE codec.
 * 
 * MODE 1: Configuration file (recommended)
 *   node scripts/gen-ink-decoder.js --config ink-contracts.json
 *   node scripts/gen-ink-decoder.js --config ink-contracts.json --contract my_contract
 * 
 *   Generates all contracts and versions defined in the config file.
 *   Supports versioning with automatic registry merging.
 * 
 * MODE 2: Individual version (legacy)
 *   node scripts/gen-ink-decoder.js \
 *     --meta guess_the_number.json \
 *     --contractName guess_the_number \
 *     --versionTag v0.1.0 \
 *     --outRoot src/types/ink \
 *     --register --address 0x1234... --from 12345678
 * 
 * Arguments:
 *   --config: Path to configuration JSON file (enables config mode)
 *   --contract: Filter to generate only a specific contract (optional, requires --config)
 *   --outRoot: Output root directory (default: src/types/ink)
 * 
 *   Legacy mode (when --config not provided):
 *     --meta (required): Path to Ink! v6 metadata JSON file
 *     --contractName (required): Name of the contract
 *     --versionTag (required): Version identifier (e.g., v0.1.0, v1.0.0)
 *     --register (flag): Register this version in the registry
 *     --address (repeatable): Contract address(es) using this version
 *     --from (optional): Starting block height for this version
 *     --to (optional): Ending block height (use 'null' for open-ended)
 */

const fs = require('fs')
const path = require('path')

/**
 * Parse command line arguments
 * @param {string[]} argv - Process argv array
 * @returns {Object} Parsed arguments
 */
function parseArgs(argv) {
  const out = {
    config: '',
    contract: '',
    meta: '',
    contractName: '',
    versionTag: '',
    outRoot: 'src/types/ink',
    register: false,
    addresses: [],
    from: undefined,
    to: undefined,
  }
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    const v = argv[i + 1]
    switch (a) {
      case '--config': out.config = v; i++; break
      case '--contract': out.contract = v; i++; break
      case '--meta': out.meta = v; i++; break
      case '--contractName': out.contractName = v; i++; break
      case '--versionTag': out.versionTag = v; i++; break
      case '--outRoot': out.outRoot = v; i++; break
      case '--register': out.register = true; break
      case '--address': out.addresses.push(v); i++; break
      case '--from': out.from = Number(v); i++; break
      case '--to': out.to = v === 'null' ? null : Number(v); i++; break
      default: break
    }
  }
  // If --config is provided, don't require individual args
  if (out.config) {
    return out
  }
  // Legacy mode: require individual args
  if (!out.meta || !out.contractName || !out.versionTag) {
    throw new Error('Missing required args: either --config OR (--meta, --contractName, --versionTag)')
  }
  return out
}

/**
 * Read and parse configuration file
 * Supports both simple format (squid-gen-ink compatible) and extended format with versioning
 * @param {string} configPath - Path to config JSON file
 * @returns {Object} Parsed configuration
 */
function readConfigFile(configPath) {
  const configDir = path.dirname(path.resolve(configPath))
  const content = fs.readFileSync(configPath, 'utf-8')
  const config = JSON.parse(content)
  
  if (!config.contracts || !Array.isArray(config.contracts)) {
    throw new Error('Config file must contain a "contracts" array')
  }
  
  // Normalize contracts to extended format
  const normalizedContracts = []
  
  config.contracts.forEach(function(contract) {
    // Check if it's simple format (no versions) or extended format (with versions)
    if (contract.versions && Array.isArray(contract.versions)) {
      // Extended format with versioning
      const versions = contract.versions.map(function(version) {
        // Resolve metadata path (relative to config file)
        const metadataPath = version.metadata || version.abi || contract.metadata || contract.abi
        if (!metadataPath) {
          throw new Error('Metadata path required for version ' + version.tag)
        }
        const resolvedMetadata = path.resolve(configDir, metadataPath)
        
        // Get addresses (support both 'address' and 'addresses')
        const addresses = version.addresses || (version.address ? [version.address] : [])
        if (addresses.length === 0 && contract.address) {
          addresses.push(contract.address)
        }
        
        // Get block range (support both 'range' and 'blockRange')
        const blockRange = version.blockRange || version.range || {}
        
        return {
          tag: version.tag,
          metadata: resolvedMetadata,
          addresses: addresses,
          from: blockRange.from !== undefined ? blockRange.from : version.from,
          to: blockRange.to !== undefined ? blockRange.to : (version.to !== undefined ? version.to : null),
          codeHash: version.codeHash || null
        }
      })
      
      normalizedContracts.push({
        name: contract.name,
        versions: versions
      })
    } else {
      // Simple format (squid-gen-ink compatible) - convert to single version
      const metadataPath = contract.metadata || contract.abi
      if (!metadataPath) {
        throw new Error('Metadata/ABI path required for contract ' + contract.name)
      }
      const resolvedMetadata = path.resolve(configDir, metadataPath)
      
      // Extract version from metadata file (contract.version field)
      let versionTag = 'v1.0.0' // Default fallback
      try {
        if (fs.existsSync(resolvedMetadata)) {
          const metadataContent = fs.readFileSync(resolvedMetadata, 'utf-8')
          const metadata = JSON.parse(metadataContent)
          if (metadata.contract && metadata.contract.version) {
            const version = metadata.contract.version
            // Normalize version: ensure it starts with 'v' prefix
            versionTag = version.startsWith('v') ? version : 'v' + version
          }
        }
      } catch (err) {
        // If metadata parsing fails, use default version
        console.warn('Warning: Could not extract version from metadata ' + resolvedMetadata + ', using default v1.0.0')
      }
      
      const addresses = contract.addresses || (contract.address ? [contract.address] : [])
      if (addresses.length === 0) {
        throw new Error('At least one address required for contract ' + contract.name)
      }
      
      const blockRange = contract.range || contract.blockRange || {}
      
      normalizedContracts.push({
        name: contract.name,
        versions: [{
          tag: versionTag, // Extracted from metadata or default
          metadata: resolvedMetadata,
          addresses: addresses,
          from: blockRange.from !== undefined ? blockRange.from : 0,
          to: blockRange.to !== undefined ? blockRange.to : null,
          codeHash: null
        }]
      })
    }
  })
  
  return { contracts: normalizedContracts }
}

/**
 * Ensure a directory exists, creating it if necessary
 * @param {string} dirPath - Directory path
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true })
}

/**
 * Write content to a file, creating parent directories if needed
 * @param {string} filePath - Target file path
 * @param {string} content - File content
 */
function write(filePath, content) {
  ensureDir(path.dirname(filePath))
  fs.writeFileSync(filePath, content)
}

/**
 * Sanitize contract name for use in file/folder names
 * @param {string} name - Contract name
 * @returns {string} Sanitized name
 */
function sanitizeContractName(name) {
  return name.replace(/[^a-zA-Z0-9_\-]/g, '_')
}

/**
 * Validate Ink! v6 metadata structure
 * @param {Object} metadata - Parsed metadata JSON
 * @throws {Error} If metadata is invalid
 */
function validateMetadata(metadata) {
  if (!metadata) throw new Error('Invalid metadata: empty or null')
  if (metadata.version !== 6) throw new Error('Unsupported Ink! version: ' + metadata.version + ', expected 6')
  if (!metadata.spec || !metadata.spec.events || !Array.isArray(metadata.spec.events)) throw new Error('Missing or invalid spec.events')
  if (!metadata.types || !Array.isArray(metadata.types)) throw new Error('Missing or invalid types array')
  // Check at least one event has a signature_topic
  const hasSig = metadata.spec.events.some(function(e) { return e.signature_topic })
  if (!hasSig) throw new Error('No events with signature_topic found')
}

/**
 * Generate contract index.ts file (barrel exports)
 * Includes all version exports found in the directory
 * @param {string} contractDir - Contract directory path
 * @param {string} contractName - Contract name
 * @param {string} newVersionTag - New version tag to ensure is exported
 * @returns {string} TypeScript code
 */
function generateIndexTs(contractDir, contractName, newVersionTag) {
  const exports = []
  const versionVar = newVersionTag.replace(/\./g, '_')
  exports.push('export * as ' + versionVar + ' from \'./' + newVersionTag + '\'')
  
  // Find all version directories
  if (fs.existsSync(contractDir)) {
    const entries = fs.readdirSync(contractDir, { withFileTypes: true })
    entries.forEach(function(entry) {
      if (entry.isDirectory() && entry.name.startsWith('v') && entry.name !== newVersionTag) {
        const versionVar = entry.name.replace(/\./g, '_')
        exports.push('export * as ' + versionVar + ' from \'./' + entry.name + '\'')
      }
    })
  }
  
  // Deduplicate and sort
  const uniqueExports = []
  const seen = {}
  exports.forEach(function(e) {
    if (!seen[e]) {
      seen[e] = true
      uniqueExports.push(e)
    }
  })
  uniqueExports.sort()
  
  return uniqueExports.join('\n') + '\n\nexport { decodeEventWithRouting, resolveDecoder } from \'./registry\'\n'
}

/**
 * Generate registry.ts file for version routing
 * Maps contract addresses/block heights to decoder versions
 * @param {string} contractName - Contract name
 * @param {string} versionTag - Version tag
 * @param {string[]} addresses - Contract addresses using this version
 * @param {number|undefined} from - Starting block height
 * @param {number|null|undefined} to - Ending block height
 * @returns {string} TypeScript code
 */
function generateRegistryTs(contractName, versionTag, addresses, from, to) {
  const versionVar = versionTag.replace(/\./g, '_')
  const header = '/**\n * Version registry for contract decoder routing\n * \n * Maps contract addresses and block heights to decoder versions.\n * When multiple versions exist, this determines which decoder to use.\n * \n * @generated - Do not edit manually, regenerate with gen-ink-decoder.js\n */\n\n'
  
  // Build registry entry parts (same format as merged registry)
  const parts = ['version: \'' + versionTag + '\'']
  if (addresses && addresses.length > 0) {
    const addrArray = addresses.map(function(a) { return '\'' + a + '\'' }).join(', ')
    parts.push('addresses: [' + addrArray + ']')
  }
  if (from !== undefined) {
    parts.push('from: ' + from.toString())
  }
  if (to !== undefined) {
    parts.push('to: ' + (to === null ? 'null' : to.toString()))
  }
  
  const registryEntry = '  { ' + parts.join(', ') + ' }'
  
  return header + 'import * as ' + versionVar + ' from \'./' + versionTag + '\'\n\n/**\n * Version entry in registry\n */\nexport type VersionEntry = {\n  version: string\n  addresses?: string[]\n  codeHash?: string\n  from?: number\n  to?: number | null\n}\n\n/**\n * Registry of all decoder versions for this contract\n * Sorted by starting block height\n */\nconst registry: VersionEntry[] = [\n' + registryEntry + '\n]\n\n/**\n * Resolve which decoder version to use based on contract address and block height\n * @param _address - Contract address\n * @param _blockHeight - Current block height\n * @param _codeHash - Optional contract code hash (for more precise matching)\n * @returns Decoder module for the resolved version\n */\nexport function resolveDecoder(_address: string, _blockHeight: number, _codeHash?: string) {\n  // Filter entries matching address\n  const addressMatches = registry.filter(function(e) {\n    if (e.addresses && e.addresses.length > 0) {\n      return e.addresses.indexOf(_address) !== -1\n    }\n    return true // No address filter\n  })\n  \n  // Find entries matching block height range\n  const rangeMatches = addressMatches.filter(function(e) {\n    const fromMatch = !e.from || _blockHeight >= e.from\n    const toMatch = !e.to || _blockHeight < e.to\n    return fromMatch && toMatch\n  })\n  \n  // If no range match, use first address match (fallback)\n  const candidates = rangeMatches.length > 0 ? rangeMatches : addressMatches\n  \n  if (candidates.length === 0) {\n    throw new Error(\'No decoder version found for address \' + _address)\n  }\n  \n  // Sort by \'from\' descending (most recent first)\n  // This ensures that when multiple versions match (e.g., both have to: null),\n  // we prefer the most recent version (highest \'from\' block)\n  candidates.sort(function(a, b) {\n    const aFrom = a.from !== undefined ? a.from : 0\n    const bFrom = b.from !== undefined ? b.from : 0\n    return bFrom - aFrom // Descending order\n  })\n  \n  const entry = candidates[0]\n  \n  switch (entry.version) {\n      case \'' + versionTag + '\': return ' + versionVar + '\n    default: throw new Error(\'Version not found: \' + entry.version)\n  }\n}\n\n/**\n * Decode an event with automatic version routing\n * @param signatureHex - Event signature (topics[0] without 0x)\n * @param dataHex - Event data hex string\n * @param topics - Array of topic hex strings\n * @param ctx - Context with address, blockHeight, and optional codeHash\n * @returns Decoded event or null\n */\nexport function decodeEventWithRouting(signatureHex: string, dataHex: string, topics: string[], ctx: { address: string; blockHeight: number; codeHash?: string }) {\n  const v = resolveDecoder(ctx.address, ctx.blockHeight, ctx.codeHash)\n  return v.decodeEvent(signatureHex, dataHex, topics)\n}\n'
}

function generateVersionIndexTs() {
  return 'export * from \'./events\'\nexport * from \'./types\'\n'
}

/**
 * Parse existing registry.ts to extract version entries
 * @param {string} registryPath - Path to registry.ts
 * @returns {Array} Array of version entries {version, addresses, from, to}
 */
function parseExistingRegistry(registryPath) {
  if (!fs.existsSync(registryPath)) return []
  
  try {
    const content = fs.readFileSync(registryPath, 'utf-8')
    // Extract registry array - find the opening bracket and match until closing bracket
    // Account for nested arrays/objects by finding the matching closing bracket
    const startPattern = 'const registry: VersionEntry[] = ['
    const startIdx = content.indexOf(startPattern)
    if (startIdx === -1) return []
    
    // Start after the opening bracket
    let bracketCount = 1
    let entriesStart = startIdx + startPattern.length
    let entriesEnd = -1
    
    for (let i = entriesStart; i < content.length; i++) {
      if (content[i] === '[') {
        bracketCount++
      } else if (content[i] === ']') {
        bracketCount--
        if (bracketCount === 0) {
          entriesEnd = i
          break
        }
      }
    }
    
    if (entriesEnd === -1) return []
    
    const entriesText = content.substring(entriesStart, entriesEnd).trim()
    const entries = []
    
    // Parse entries by finding complete objects
    // Look for patterns like: { version: '...', addresses: [...], from: ... }
    const entryRegex = /\{\s*version:\s*['"]([^'"]+)['"]([^}]*)\}/g
    let match
    while ((match = entryRegex.exec(entriesText)) !== null) {
      const version = match[1]
      const rest = match[2] // Everything after version in the object
      
      // Extract addresses - handle array or omitted property
      let addresses = undefined
      const addrMatch = rest.match(/addresses:\s*\[([^\]]*)\]/)
      if (addrMatch) {
        const addrContent = addrMatch[1]
        addresses = addrContent.split(',').map(function(a) {
          return a.trim().replace(/['"]/g, '')
        }).filter(function(a) { return a && a.length > 0 })
        if (addresses.length === 0) addresses = undefined
      }
      
      // Extract from (number or omitted)
      let from = undefined
      const fromMatch = rest.match(/from:\s*(\d+)/)
      if (fromMatch) {
        from = parseInt(fromMatch[1], 10)
      }
      
      // Extract to (number, null, or omitted)
      let to = undefined
      const toMatch = rest.match(/to:\s*(null|\d+)/)
      if (toMatch) {
        to = toMatch[1] === 'null' ? null : parseInt(toMatch[1], 10)
      }
      
      entries.push({ version: version, addresses: addresses, from: from, to: to })
    }
    
    return entries
  } catch (e) {
    // If parsing fails, return empty array (will regenerate)
    console.warn('Warning: Failed to parse existing registry, will regenerate:', e.message)
    return []
  }
}

/**
 * Merge new version entry with existing registry entries
 * @param {Array} existingEntries - Existing version entries
 * @param {string} newVersion - New version tag
 * @param {Array} newAddresses - New addresses
 * @param {number|undefined} newFrom - New from block
 * @param {number|null|undefined} newTo - New to block
 * @returns {string} Updated registry.ts content
 */
function generateMergedRegistryTs(contractName, existingEntries, newVersion, newAddresses, newFrom, newTo) {
  // Check if version already exists
  const existingIndex = existingEntries.findIndex(function(e) { return e.version === newVersion })
  if (existingIndex >= 0) {
    // Update existing entry
    existingEntries[existingIndex] = { version: newVersion, addresses: newAddresses, from: newFrom, to: newTo }
  } else {
    // Add new entry
    existingEntries.push({ version: newVersion, addresses: newAddresses, from: newFrom, to: newTo })
  }
  
  // Sort by 'from' block (undefined/lower comes first)
  existingEntries.sort(function(a, b) {
    const aFrom = a.from !== undefined ? a.from : -1
    const bFrom = b.from !== undefined ? b.from : -1
    return aFrom - bFrom
  })
  
  // Collect all unique version imports
  const versionImports = existingEntries.map(function(e) {
    return { version: e.version, var: e.version.replace(/\./g, '_') }
  })
  
  const imports = versionImports.map(function(v) {
    return 'import * as ' + v.var + ' from \'./' + v.version + '\''
  }).join('\n')
  
  const registryEntries = existingEntries.map(function(e) {
    const parts = ['version: \'' + e.version + '\'']
    if (e.addresses && e.addresses.length > 0) {
      parts.push('addresses: [' + e.addresses.map(function(a) { return '\'' + a + '\'' }).join(', ') + ']')
    }
    if (e.from !== undefined) {
      parts.push('from: ' + e.from.toString())
    }
    if (e.to !== undefined) {
      parts.push('to: ' + (e.to === null ? 'null' : e.to.toString()))
    }
    
    return '  { ' + parts.join(', ') + ' }'
  }).join(',\n')
  
  // Generate resolveDecoder switch statement
  const resolveSwitch = existingEntries.map(function(e) {
    const versionVar = e.version.replace(/\./g, '_')
    return '      case \'' + e.version + '\': return ' + versionVar
  }).join('\n')
  
  const header = '/**\n * Version registry for contract decoder routing\n * \n * Maps contract addresses and block heights to decoder versions.\n * When multiple versions exist, this determines which decoder to use.\n * \n * @generated - Do not edit manually, regenerate with gen-ink-decoder.js\n */\n\n'
  
  return header + imports + '\n\n/**\n * Version entry in registry\n */\nexport type VersionEntry = {\n  version: string\n  addresses?: string[]\n  codeHash?: string\n  from?: number\n  to?: number | null\n}\n\n/**\n * Registry of all decoder versions for this contract\n * Sorted by starting block height\n */\nconst registry: VersionEntry[] = [\n' + registryEntries + '\n]\n\n/**\n * Resolve which decoder version to use based on contract address and block height\n * @param _address - Contract address\n * @param _blockHeight - Current block height\n * @param _codeHash - Optional contract code hash (for more precise matching)\n * @returns Decoder module for the resolved version\n */\nexport function resolveDecoder(_address: string, _blockHeight: number, _codeHash?: string) {\n  // Filter entries matching address\n  const addressMatches = registry.filter(function(e) {\n    if (e.addresses && e.addresses.length > 0) {\n      return e.addresses.indexOf(_address) !== -1\n    }\n    return true // No address filter\n  })\n  \n  // Find entries matching block height range\n  const rangeMatches = addressMatches.filter(function(e) {\n    const fromMatch = !e.from || _blockHeight >= e.from\n    const toMatch = !e.to || _blockHeight < e.to\n    return fromMatch && toMatch\n  })\n  \n  // If no range match, use first address match (fallback)\n  const candidates = rangeMatches.length > 0 ? rangeMatches : addressMatches\n  \n  if (candidates.length === 0) {\n    throw new Error(\'No decoder version found for address \' + _address)\n  }\n  \n  // Sort by \'from\' descending (most recent first)\n  // This ensures that when multiple versions match (e.g., both have to: null),\n  // we prefer the most recent version (highest \'from\' block)\n  candidates.sort(function(a, b) {\n    const aFrom = a.from !== undefined ? a.from : 0\n    const bFrom = b.from !== undefined ? b.from : 0\n    return bFrom - aFrom // Descending order\n  })\n  \n  const entry = candidates[0]\n  \n  switch (entry.version) {\n' + resolveSwitch + '\n    default: throw new Error(\'Version not found: \' + entry.version)\n  }\n}\n\n/**\n * Decode an event with automatic version routing\n * @param signatureHex - Event signature (topics[0] without 0x)\n * @param dataHex - Event data hex string\n * @param topics - Array of topic hex strings\n * @param ctx - Context with address, blockHeight, and optional codeHash\n * @returns Decoded event or null\n */\nexport function decodeEventWithRouting(signatureHex: string, dataHex: string, topics: string[], ctx: { address: string; blockHeight: number; codeHash?: string }) {\n  const v = resolveDecoder(ctx.address, ctx.blockHeight, ctx.codeHash)\n  return v.decodeEvent(signatureHex, dataHex, topics)\n}\n'
}

/**
 * Generate events.ts file with SCALE decoders for all contract events
 * This is the core function that generates TypeScript code to decode
 * event data according to SCALE codec specifications.
 * 
 * @param {Object} metadata - Parsed Ink! v6 metadata
 * @returns {string} TypeScript code with event decoders
 */
function generateEventsTs(metadata) {
  const events = (metadata.spec && metadata.spec.events) ? metadata.spec.events : []
  const types = metadata.types || []
  
  // Extract event information: signature, label, snake_case name, and args
  const entries = events.map(function(e) {
    const sig = (e.signature_topic || '').replace(/^0x/, '')
    const label = e.label || 'UnknownEvent'
    const snake = label.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase()
    return { sig: sig, label: label, snake: snake, args: e.args || [] }
  })

  const sigMap = entries.map(function(e) { return '  \'' + e.sig + '\': \'' + e.snake + '\',' }).join('\n')

  /**
   * Find type definition by ID in metadata types array
   * @param {number} typeId - Type ID from metadata
   * @returns {Object|null} Type definition or null
   */
  function findType(typeId) {
    const tt = types.find(function(t) { return t.id === typeId })
    return tt ? tt.type : null
  }

  /**
   * Generate SCALE decode call for a given type
   * Recursively handles primitives, composites, variants, arrays, sequences
   * @param {number} typeId - Type ID from metadata
   * @param {string} varName - Variable name for the data buffer (usually 'data')
   * @param {string} offsetVar - Variable name for current offset (usually 'offset')
   * @returns {string} TypeScript code that decodes the type
   */
  function generateDecodeCall(typeId, varName, offsetVar) {
    const t = findType(typeId)
    if (!t) return '(() => { assert(false, \'Unknown type ' + typeId + '\'); return { value: null, offset: ' + offsetVar + ' } })()'
    
    const def = t.def || {}
    
    // Decode primitive types (u8, u16, u32, u64, u128, i8, i16, i32, bool, str)
    if (def.primitive) {
      switch (def.primitive) {
        case 'u8': return 'readU8(' + varName + ', ' + offsetVar + ')'
        case 'u16': return 'readU16(' + varName + ', ' + offsetVar + ')'
        case 'u32': return 'readU32(' + varName + ', ' + offsetVar + ')'
        case 'u64': return 'readU64(' + varName + ', ' + offsetVar + ')'
        case 'u128': return 'readU128(' + varName + ', ' + offsetVar + ')'
        case 'i8': return '(() => { const v = readU8(' + varName + ', ' + offsetVar + '); return { value: v > 127 ? v - 256 : v, offset: ' + offsetVar + ' + 1 } })()'
        case 'i16': return '(() => { const r = readU16(' + varName + ', ' + offsetVar + '); return { value: r.value > 32767 ? r.value - 65536 : r.value, offset: r.offset } })()'
        case 'i32': return '(() => { const r = readU32(' + varName + ', ' + offsetVar + '); return { value: r.value > 2147483647 ? r.value - 4294967296 : r.value, offset: r.offset } })()'
        case 'bool': return '(() => { const b = ' + varName + '[' + offsetVar + '] !== 0; return { value: b, offset: ' + offsetVar + ' + 1 } })()'
        case 'str': return 'readString(' + varName + ', ' + offsetVar + ')'
        // NOTE: Additional primitives (char, u256, i128, i256) rarely used in Ink! contracts
        // Add support only if actually encountered in metadata
        default: return '(() => { assert(false, \'Unsupported primitive: ' + def.primitive + '\'); return { value: null, offset: ' + offsetVar + ' } })()'
      }
    }
    
    // Decode composite types (structs with named fields)
    // Fields are decoded sequentially in declaration order
    if (def.composite && def.composite.fields && Array.isArray(def.composite.fields)) {
      const fieldLines = []
      let currentOffset = 'currentOffset'
      fieldLines.push('    let ' + currentOffset + ' = ' + offsetVar)
      def.composite.fields.forEach(function(f, idx) {
        const fieldName = f.name || 'field' + idx
        const fieldType = typeof f.type === 'object' ? f.type.id : f.type
        const decodeCall = generateDecodeCall(fieldType, varName, currentOffset)
        fieldLines.push('    const f_' + idx + ' = ' + decodeCall)
        fieldLines.push('    result[\'' + fieldName + '\'] = f_' + idx + '.value')
        fieldLines.push('    ' + currentOffset + ' = f_' + idx + '.offset')
      })
      return '(() => { const result: Record<string, any> = {};\n' + fieldLines.join('\n') + '\n    return { value: result, offset: ' + currentOffset + ' } })()'
    }
    
    // Decode variant types (enums)
    // Supports unit variants (no fields) and variants with fields (tuple-like and struct-like)
    if (def.variant && Array.isArray(def.variant.variants)) {
      const variants = def.variant.variants.map(function(v) {
        return { index: v.index, name: v.name, fields: v.fields || [] }
      })
      const unitVariants = variants.filter(function(v) { return !v.fields.length })
      if (unitVariants.length === variants.length) {
        // All variants are unit variants (no fields) - simple mapping
        const names = unitVariants.map(function(v) { return v.name })
        return '(() => { const idx = ' + varName + '[' + offsetVar + ']; const map = ' + JSON.stringify(names) + '; return { value: map[idx] || \'Unknown\', offset: ' + offsetVar + ' + 1 } })()'
      }
      
      // Variant with fields: decode discriminant then decode fields based on variant
      const cases = []
      let currentOffsetVar = 'variantOffset'
      cases.push('    const discriminant = ' + varName + '[' + offsetVar + ']')
      cases.push('    let ' + currentOffsetVar + ' = ' + offsetVar + ' + 1')
      cases.push('    switch (discriminant) {')
      
      variants.forEach(function(v) {
        if (!v.fields || v.fields.length === 0) {
          // Unit variant
          cases.push('      case ' + v.index + ': return { value: \'' + v.name + '\', offset: ' + currentOffsetVar + ' }')
        } else {
          // Variant with fields - check if tuple-like or struct-like
          const hasNamedFields = v.fields.some(function(f) { return f.name })
          if (hasNamedFields) {
            // Struct-like variant: fields have names
            const fieldLines = []
            v.fields.forEach(function(f, idx) {
              const fieldName = f.name || 'field' + idx
              const fieldType = typeof f.type === 'object' ? f.type.id : f.type
              const decodeCall = generateDecodeCall(fieldType, varName, currentOffsetVar)
              fieldLines.push('        const f' + idx + ' = ' + decodeCall + '; fields[\'' + fieldName + '\'] = f' + idx + '.value; ' + currentOffsetVar + ' = f' + idx + '.offset')
            })
            cases.push('      case ' + v.index + ': {')
            cases.push('        const fields: Record<string, any> = {}')
            cases.push(fieldLines.join('\n'))
            cases.push('        return { value: { tag: \'' + v.name + '\', ...fields }, offset: ' + currentOffsetVar + ' }')
            cases.push('      }')
          } else {
            // Tuple-like variant: fields are positionally encoded
            const fieldLines = []
            v.fields.forEach(function(f, idx) {
              const fieldType = typeof f.type === 'object' ? f.type.id : f.type
              const decodeCall = generateDecodeCall(fieldType, varName, currentOffsetVar)
              fieldLines.push('        const f' + idx + ' = ' + decodeCall + '; fields.push(f' + idx + '.value); ' + currentOffsetVar + ' = f' + idx + '.offset')
            })
            cases.push('      case ' + v.index + ': {')
            cases.push('        const fields: any[] = []')
            cases.push(fieldLines.join('\n'))
            cases.push('        return { value: { tag: \'' + v.name + '\', value: fields }, offset: ' + currentOffsetVar + ' }')
            cases.push('      }')
          }
        }
      })
      
      cases.push('      default: return { value: { tag: \'UnknownVariant\', index: discriminant }, offset: ' + currentOffsetVar + ' }')
      cases.push('    }')
      
      return '(() => {\n' + cases.join('\n') + '\n  })()'
    }
    
    // Decode sequence types (Vec<T>)
    // Length is encoded as compact u32, followed by elements
    if (def.sequence) {
      const elementType = def.sequence.type
      if (elementType === 5) {
        // Vec<u8> special case: return as Uint8Array slice
        return '(() => { const len = readCompactU32(' + varName + ', ' + offsetVar + '); const start = len.offset; const end = start + Number(len.value); return { value: ' + varName + '.slice(start, end), offset: end } })()'
      } else {
        // Vec<T> for any type T: decode length then decode each element
        const vecOffset = 'vecOffset'
        const decodeCall = generateDecodeCall(elementType, varName, vecOffset)
        return '(() => { const len = readCompactU32(' + varName + ', ' + offsetVar + '); const arr = []; let ' + vecOffset + ' = len.offset; const count = Number(len.value); for (let i = 0; i < count; i++) { const elem = ' + decodeCall + '; arr.push(elem.value); ' + vecOffset + ' = elem.offset } return { value: arr, offset: ' + vecOffset + ' } })()'
      }
    }
    
    // Decode array types ([T; N] - fixed-size arrays)
    // Elements are decoded sequentially using a loop for cleaner code
    if (def.array && typeof def.array.len === 'number' && def.array.type) {
      const elementType = def.array.type
      const len = def.array.len
      
      // For small arrays (<= 4), inline decoding for better performance
      // For larger arrays, use a loop for cleaner code
      if (len <= 4) {
        const arrLines = []
        let arrOffset = 'arrOffset'
        arrLines.push('    let ' + arrOffset + ' = ' + offsetVar)
        for (let i = 0; i < len; i++) {
          const decodeCall = generateDecodeCall(elementType, varName, arrOffset)
          arrLines.push('    const e' + i + ' = ' + decodeCall + '; arr.push(e' + i + '.value); ' + arrOffset + ' = e' + i + '.offset')
        }
        return '(() => { const arr = [];\n' + arrLines.join('\n') + '\n    return { value: arr, offset: ' + arrOffset + ' } })()'
      } else {
        // Large arrays: use a loop for cleaner code (formatted on multiple lines)
        const arrOffset = 'arrOffset'
        const decodeCall = generateDecodeCall(elementType, varName, arrOffset)
        const loopBody = '      const elem = ' + decodeCall + '\n      arr.push(elem.value)\n      ' + arrOffset + ' = elem.offset'
        return '(() => {\n    const arr = []\n    let ' + arrOffset + ' = ' + offsetVar + '\n    for (let i = 0; i < ' + len + '; i++) {\n' + loopBody + '\n    }\n    return { value: arr, offset: ' + arrOffset + ' }\n  })()'
      }
    }
    
    // Decode H160 address type (Ethereum-style 20-byte address)
    // Special handling for primitive_types.H160 path
    if (t.path && Array.isArray(t.path) && t.path.join('.') === 'primitive_types.H160') {
      return '(() => { assert(' + offsetVar + ' + 20 <= ' + varName + '.length, \'H160 read overflow\'); const hex = bytesToHex(' + varName + '.slice(' + offsetVar + ', ' + offsetVar + ' + 20)); return { value: hex, offset: ' + offsetVar + ' + 20 } })()'
    }
    
    // NOTE: Additional SCALE types (tuples, Option/Result, BitSequence) not yet encountered
    // Add support when needed based on actual contract metadata
    // Unsupported type - return error
    return '(() => { assert(false, \'Unsupported type ' + typeId + '\'); return { value: null, offset: ' + offsetVar + ' } })()'
  }

  /**
   * Generate decoder function for a single event
   * Handles indexed args (from topics) and non-indexed args (from data)
   * @param {Object} e - Event metadata entry
   * @returns {string} TypeScript function code
   */
  function generateEventDecoder(e) {
    const lines = []
    lines.push('export function decode' + e.label + '(dataHex: string, topics: string[]): Record<string, unknown> {')
    lines.push('  const data = hexToBytes(dataHex)')
    lines.push('  const result: Record<string, unknown> = {}')
    lines.push('  let offset = 0')
    lines.push('  let topicIndex = 1') // topics[0] is the event signature
    
    // Process each event argument
    e.args.forEach(function(arg) {
      const typeId = typeof arg.type === 'object' ? arg.type.type : arg.type
      const label = arg.label || 'field'
      
      // Indexed arguments are stored in topics (32-byte padded)
      // They're indexed for efficient filtering but must be decoded from topics
      if (arg.indexed) {
        lines.push('  {')
        lines.push('    assert(topicIndex < topics.length, \'Missing topic for indexed arg ' + label + '\')')
        lines.push('    const t = topics[topicIndex++]')
        lines.push('    const tb = hexToBytes(t)')
        lines.push('    assert(tb.length >= 32, \'Invalid topic length for indexed arg ' + label + '\')')
        
        const tdef = findType(typeId)
        if (tdef && tdef.def && tdef.def.primitive === 'u128') {
          lines.push('    const r = readU128(tb, 0); result[\'' + label + '\'] = r.value')
        } else if (tdef && tdef.path && Array.isArray(tdef.path) && tdef.path.join('.') === 'primitive_types.H160') {
          lines.push('    const hex = bytesToHex(tb.slice(tb.length - 20)); result[\'' + label + '\'] = hex')
        } else if (tdef && tdef.def && tdef.def.primitive === 'u32') {
          lines.push('    const r = readU32(tb, 0); result[\'' + label + '\'] = r.value')
        } else if (tdef && tdef.def && tdef.def.primitive === 'u16') {
          lines.push('    const r = readU16(tb, 0); result[\'' + label + '\'] = r.value')
        } else {
          // NOTE: Unsupported indexed type - store raw topic hex
          // TODO: Add AccountId32/H256 support if encountered (32-byte types in topics)
          // Topics that are blake2_256 hashes cannot be decoded anyway (only store hex)
          lines.push('    // Fallback: store raw topic for unsupported type')
          lines.push('    result[\'' + label + '\'] = t')
        }
        lines.push('  }')
      } else {
        // Non-indexed arguments are stored in the event data (dataHex)
        // They follow SCALE encoding in order
        lines.push('  {')
        lines.push('    assert(offset <= data.length, \'Offset overflow for arg ' + label + '\')')
        const decodeCall = generateDecodeCall(typeId, 'data', 'offset')
        lines.push('    const r = ' + decodeCall)
        lines.push('    result[\'' + label + '\'] = r.value')
        lines.push('    offset = r.offset')
        lines.push('  }')
      }
    })
    
    lines.push('  return result')
    lines.push('}')
    return lines.join('\n')
  }

  const decoders = entries.map(generateEventDecoder).join('\n\n')
  const switchCases = entries.map(function(e) { return '    case \'' + e.sig + '\': return { eventType: \'' + e.snake + '\', data: decode' + e.label + '(dataHex, topics) }' }).join('\n')

  const unionTypes = entries.map(function(e) { return '  | { eventType: \'' + e.snake + '\'; data: ReturnType<typeof decode' + e.label + '> }' }).join('\n')

  const header = '/**\n * Generated event decoders for Ink! contract\n * \n * This file contains SCALE decoders for all contract events.\n * Indexed event arguments are decoded from topics, non-indexed from event data.\n * \n * @generated - Do not edit manually, regenerate with gen-ink-decoder.js\n */\n\n'

  return header + 'import {hexToBytes, bytesToHex, readU8, readU16, readU32, readU64, readU128, readString, readCompactU32, assert} from \'../../support\'\n\n/**\n * Event signature mapping (normalized hex without 0x prefix)\n */\nexport const EVENT_SIGNATURES = {\n' + sigMap + '\n} as const\n\n' + decoders + '\n\n/**\n * Union type of all decodable events\n */\nexport type AnyDecodedEvent =\n' + unionTypes + '\n\n/**\n * Decode an event by signature\n * @param signatureHex - Event signature (topics[0] without 0x)\n * @param dataHex - Event data hex string\n * @param topics - Array of topic hex strings\n * @returns Decoded event or null if signature not found\n */\nexport function decodeEvent(signatureHex: string, dataHex: string, topics: string[]): AnyDecodedEvent | null {\n  switch (signatureHex) {\n' + switchCases + '\n    default: return null\n  }\n}\n'
}

/**
 * Generate types.ts file (placeholder for future type exports)
 * TODO: Generate TypeScript interfaces for composite types, enums, and custom types
 *       from metadata.types array. This would provide better type safety for decoded values.
 * @returns {string} TypeScript code
 */
function generateTypesTs() {
  return '/**\n * Generated type definitions for this contract version\n * \n * Currently a placeholder. Future versions may export TypeScript interfaces\n * derived from contract metadata.\n * \n * TODO: Generate TypeScript interfaces for:\n * - Composite types (structs) used in events\n * - Variant types (enums) with proper discriminated unions\n * - Type aliases (AccountId32, Balance, etc.) for better type safety\n * - Helper types for Option<T> and Result<T, E>\n * \n * @generated - Do not edit manually, regenerate with gen-ink-decoder.js\n */\n\nexport {}\n'
}

/**
 * Generate a single contract version
 * @param {string} contractName - Contract name
 * @param {string} versionTag - Version tag
 * @param {string} metadataPath - Path to metadata JSON
 * @param {string[]} addresses - Contract addresses
 * @param {number|undefined} from - Starting block
 * @param {number|null|undefined} to - Ending block
 * @param {string} outRoot - Output root directory
 * @param {boolean} register - Whether to register in registry
 */
function generateSingleVersion(contractName, versionTag, metadataPath, addresses, from, to, outRoot, register) {
  const contract = sanitizeContractName(contractName)
  const outDir = path.join(outRoot, contract)
  const versionDir = path.join(outDir, versionTag)

  // Read and validate metadata
  if (!fs.existsSync(metadataPath)) {
    throw new Error('Metadata file not found: ' + metadataPath + ' (for ' + contract + '@' + versionTag + ')')
  }
  const raw = fs.readFileSync(metadataPath, 'utf-8')
  const metadata = JSON.parse(raw)
  validateMetadata(metadata)

  // Write version files
  write(path.join(versionDir, 'index.ts'), generateVersionIndexTs())
  write(path.join(versionDir, 'events.ts'), generateEventsTs(metadata))
  write(path.join(versionDir, 'types.ts'), generateTypesTs())

  // Registry
  const registryPath = path.join(outDir, 'registry.ts')
  if (!fs.existsSync(registryPath)) {
    write(registryPath, generateRegistryTs(contract, versionTag, addresses, from, to))
  } else if (register) {
    // Merge new version with existing registry entries
    const existingEntries = parseExistingRegistry(registryPath)
    write(registryPath, generateMergedRegistryTs(contract, existingEntries, versionTag, addresses, from, to))
  }

  // Contract barrel: regenerate to include all version exports
  write(path.join(outDir, 'index.ts'), generateIndexTs(outDir, contract, versionTag))
  
  // Root ink barrel
  const inkIndex = path.join(outRoot, 'index.ts')
  if (!fs.existsSync(inkIndex)) {
    write(inkIndex, 'export * as ' + contract + ' from \'./' + contract + '\'\n')
  } else {
    const cur = fs.readFileSync(inkIndex, 'utf-8')
    const line = 'export * as ' + contract + ' from \'./' + contract + '\'\n'
    if (cur.indexOf(line) === -1) write(inkIndex, cur + line)
  }

  console.log('Generated Ink! decoder for ' + contract + '@' + versionTag + ' in ' + versionDir)
}

/**
 * Generate decoders from configuration file
 * @param {string} configPath - Path to config JSON file
 * @param {string} outRoot - Output root directory
 * @param {string|undefined} contractFilter - Optional contract name to filter
 */
function generateFromConfig(configPath, outRoot, contractFilter) {
  const config = readConfigFile(configPath)
  
  console.log('Reading configuration from ' + configPath)
  console.log('Found ' + config.contracts.length + ' contract(s)')
  
  config.contracts.forEach(function(contract) {
    if (contractFilter && contract.name !== contractFilter) {
      console.log('Skipping contract ' + contract.name + ' (filter: ' + contractFilter + ')')
      return
    }
    
    console.log('\nGenerating decoders for contract: ' + contract.name)
    console.log('  Versions: ' + contract.versions.length)
    
    contract.versions.forEach(function(version) {
      console.log('  - ' + version.tag + ' (from block ' + (version.from !== undefined ? version.from : 0) + ')')
      generateSingleVersion(
        contract.name,
        version.tag,
        version.metadata,
        version.addresses,
        version.from,
        version.to,
        outRoot,
        true // Always register when using config file
      )
    })
  })
  
  console.log('\n✅ All decoders generated successfully!')
}

/**
 * Main entry point
 * Reads metadata, validates it, and generates all decoder files
 * Supports both config file mode and legacy CLI mode
 */
function main() {
  const args = parseArgs(process.argv)
  
  // Mode 1: Config file mode
  if (args.config) {
    generateFromConfig(args.config, args.outRoot, args.contract)
    return
  }
  
  // Mode 2: Legacy CLI mode (individual version)
  if (!args.addresses || args.addresses.length === 0) {
    throw new Error('At least one --address is required')
  }
  
  generateSingleVersion(
    args.contractName,
    args.versionTag,
    args.meta,
    args.addresses,
    args.from,
    args.to,
    args.outRoot,
    args.register
  )
}

main()