# @luckyweb3/subsquid-ink-v6-decoder

Unified decoder for Ink! v6 contract events in Subsquid indexers. Supports both static (generated) and runtime (metadata-based) decoding modes.

## Installation

```bash
npm install @luckyweb3/subsquid-ink-v6-decoder
# or
yarn add @luckyweb3/subsquid-ink-v6-decoder
```

## Features

- ✅ **Dual Mode**: Static (generated types) or Runtime (metadata-based)
- ✅ **TypeScript**: Full type safety
- ✅ **Performance**: Static mode is faster (no JSON parsing)
- ✅ **Flexibility**: Runtime mode works with any contract without recompilation
- ✅ **Version Routing**: Automatic decoder version selection based on block height

## Usage

### Static Mode (Recommended)

Static mode uses pre-generated TypeScript decoders. It's faster and doesn't require metadata files at runtime.

**Prerequisites**: Generate decoders first using `@subsquid/ink-typegen` or similar tools.

```typescript
import { createDecoder, DecoderMode } from '@luckyweb3/subsquid-ink-v6-decoder'

// Create a static decoder (no metadata JSON needed)
const decoder = createDecoder({
  mode: DecoderMode.STATIC,
  contract: 'guess_the_number'  // Contract name
})

// Decode an event
const decoded = decoder.decodeEvent(
  eventData,      // Hex string of event data
  topics,         // Array of topic hex strings (topics[0] is signature)
  contractAddress, // Optional: for version routing
  blockHeight      // Optional: for version routing
)

if (decoded) {
  console.log('Event type:', decoded.eventType)
  console.log('Event data:', decoded.data)
}
```

### Runtime Mode

Runtime mode loads metadata JSON files at runtime. It's more flexible but slower.

```typescript
import { createDecoder, DecoderMode } from '@luckyweb3/subsquid-ink-v6-decoder'

// Create a runtime decoder (requires metadata JSON)
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

// Decode an event
const decoded = decoder.decodeEvent(eventData, topics, contractAddress)
```

## API

### `createDecoder(config: DecoderConfig): Decoder`

Factory function to create a decoder instance.

**Parameters:**
- `config.mode`: `DecoderMode.STATIC` or `DecoderMode.RUNTIME`
- For STATIC mode:
  - `contract`: Contract name (string)
- For RUNTIME mode:
  - `metadataPath`: Path to metadata JSON file
  - `contractAddress`: Contract address
  - `eventTypeMapping?`: Optional event type mapping
  - `debugMode?`: Optional debug flag

**Returns:** `Decoder` instance

### `Decoder.decodeEvent(eventData, topics, contractAddress?, blockHeight?): DecodedEvent | null`

Decode an Ink! v6 event.

**Parameters:**
- `eventData`: Hex string of event data
- `topics`: Array of topic hex strings (topics[0] is the event signature)
- `contractAddress?`: Optional contract address (for version routing)
- `blockHeight?`: Optional block height (for version routing)

**Returns:** `DecodedEvent | null`

### `DecodedEvent`

```typescript
interface DecodedEvent {
  eventType: string
  data: Record<string, any>
  topics?: string[]
}
```

## Examples

### Basic Usage

```typescript
import { createDecoder, DecoderMode } from '@luckyweb3/subsquid-ink-v6-decoder'

// Static mode
const decoder = createDecoder({
  mode: DecoderMode.STATIC,
  contract: 'my_contract'
})

// In your processor
processor.run(new TypeormDatabase(), async (ctx) => {
  for (const block of ctx.blocks) {
    for (const event of block.events) {
      if (event.name === 'Contracts.ContractEmitted') {
        const decoded = decoder.decodeEvent(
          event.args.data,
          event.args.topics,
          event.args.contract,
          block.header.height
        )
        
        if (decoded) {
          console.log('Decoded event:', decoded.eventType, decoded.data)
        }
      }
    }
  }
})
```

### Multi-Contract Support

```typescript
import { createDecoder, DecoderMode } from '@luckyweb3/subsquid-ink-v6-decoder'

// Create decoders for multiple contracts
const decoders = new Map([
  ['0x1234...', createDecoder({
    mode: DecoderMode.STATIC,
    contract: 'contract_a'
  })],
  ['0x5678...', createDecoder({
    mode: DecoderMode.STATIC,
    contract: 'contract_b'
  })]
])

// Use the appropriate decoder
const contractAddress = event.args.contract
const decoder = decoders.get(contractAddress)
if (decoder) {
  const decoded = decoder.decodeEvent(eventData, topics, contractAddress)
}
```

## Performance

- **Static Mode**: ~10-100x faster (no JSON parsing, compiled TypeScript)
- **Runtime Mode**: Slower but more flexible (parses JSON metadata at runtime)

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

