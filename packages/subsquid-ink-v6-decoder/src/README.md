# Ink! v6 Decoding Module

This module unifies two Ink! v6 event decoding systems:

1. **STATIC Mode** (recommended): Uses generated types
2. **RUNTIME Mode**: Loads JSON metadata at runtime

## Usage

### Static Mode (Recommended)

```typescript
import { createDecoder, DecoderMode } from './decoders'

// Create a static decoder (no JSON metadata needed)
const decoder = createDecoder({
  mode: DecoderMode.STATIC,
  contract: 'guess_the_number'  // Contract name
})

// Use the decoder
const decoded = decoder.decodeEvent(
  eventData,
  topics,
  contractAddress,  // Optional, for version routing
  blockHeight        // Optional, for version routing
)
```

**Advantages:**
- ✅ Better performance (no JSON parsing)
- ✅ Compiled TypeScript types
- ✅ No metadata files needed at runtime
- ✅ Type checking at build time

**Prerequisites:**
- Generate types with `yarn gen:decoders` before using

### Runtime Mode

```typescript
import { createDecoder, DecoderMode } from './decoders'

// Create a runtime decoder (requires JSON metadata)
const decoder = createDecoder({
  mode: DecoderMode.RUNTIME,
  metadataPath: './guess_the_number.json',
  contractAddress: '0xe75cbd47620dbb2053cf2a98d06840f06baaf141',
  eventTypeMapping: {
    'NewGame': 'game_started',
    'GuessMade': 'guess_submitted',
    'ClueGiven': 'clue_given'
  },
  debugMode: true  // Optional
})

// Use the decoder
const decoded = decoder.decodeEvent(eventData, topics, contractAddress)
```

**Advantages:**
- ✅ Flexible (can decode any contract without recompilation)
- ✅ No need to generate types beforehand

**Disadvantages:**
- ⚠️ Slower (loads and parses JSON metadata)
- ⚠️ Requires metadata files at runtime

## Migration from the Old System

### Before (old code)

```typescript
import { createInkDecoder } from './decoders'

const inkDecoder = createInkDecoder({
  metadataPath: './guess_the_number.json',
  contractAddress: '0xe75cbd47620dbb2053cf2a98d06840f06baaf141',
  eventTypeMapping: { ... },
  debugMode: true
})

const decoded = inkDecoder.decodeEvent(eventData, topics, contractAddress)
```

### After (new code - Static Mode)

```typescript
import { createDecoder, DecoderMode } from './decoders'

const decoder = createDecoder({
  mode: DecoderMode.STATIC,
  contract: 'guess_the_number'
})

const decoded = decoder.decodeEvent(eventData, topics, contractAddress, blockHeight)
```

### After (new code - Runtime Mode)

```typescript
import { createDecoder, DecoderMode } from './decoders'

const decoder = createDecoder({
  mode: DecoderMode.RUNTIME,
  metadataPath: './guess_the_number.json',
  contractAddress: '0xe75cbd47620dbb2053cf2a98d06840f06baaf141',
  eventTypeMapping: { ... }
})

const decoded = decoder.decodeEvent(eventData, topics, contractAddress)
```

## Module Structure

```
src/decoders/
├── index.ts              # Main entry point with createDecoder()
├── types.ts              # Common types (DecoderMode, DecodedEvent, Decoder)
├── runtime.ts            # Runtime decoder implementation
├── static.ts             # Static decoder implementation
├── static-registry.ts    # Registry of static imports
└── subsquid-inkv6-decoder.ts  # Runtime decoder (old system)
```

## Adding a New Contract

### For Static Mode

1. Generate types:
   ```bash
   yarn gen:decoders
   ```

2. Register the import in `static-registry.ts`:
   ```typescript
   import * as newContractDecoder from '../types/ink/new_contract'
   
   registerStaticDecoder('new_contract', () => newContractDecoder)
   ```

3. Use the decoder:
   ```typescript
   const decoder = createDecoder({
     mode: DecoderMode.STATIC,
     contract: 'new_contract'
   })
   ```

### For Runtime Mode

No additional steps needed, just provide the path to the JSON metadata file.
