# Squid Guess Indexer

Subsquid indexer for Ink! contracts **guess_the_number** and **ERC721** on a Substrate node (guess-the-number-node). Data is persisted in PostgreSQL and exposed via GraphQL.

## Prerequisites

- **Node.js** ≥ 16
- **Yarn** (package manager)
- **PostgreSQL** (or Docker for the database)

## Configuration

1. Copy the example file:

   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and set the **required** variables:

   | Variable | Description |
   |----------|-------------|
   | `RPC_URL_WS` | WebSocket URL of the chain (e.g. `wss://query.substrate.fi/guess-the-number-node`). **Required**; no default. |
   | `GUESS_THE_NUMBER_CONTRACTS` | Address(es) of the guess_the_number contract, comma-separated. **Required.** |
   | `ERC721_CONTRACTS` | Address(es) of the ERC721 contract, comma-separated. **Required.** |
   | `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS` | PostgreSQL connection. **Required** for the indexer. |

   **Optional:** `START_BLOCK`, `END_BLOCK`, `LOG_LEVEL` (e.g. `info`, `debug`), `SUBSQUID_GATEWAY` (leave unset for RPC-only mode), `FINALITY_CONFIRMATION`, `NODE_ENV`.

---

## Important: Contract addresses and decoders

The indexer decodes Ink! events using **address-based registries** generated from `src/decoders/ink-contracts.json`. For decoding to work:

1. **The contract addresses in `.env` must match the addresses in `src/decoders/ink-contracts.json`.**

2. **If you change contract addresses** (e.g. for a different chain or deployment):
   - Update `src/decoders/ink-contracts.json` with the new addresses (under `contracts[].versions[].addresses`).
   - Run **`yarn gen:decoders`** to regenerate the Ink! decoder registries (`src/types/ink/guess_the_number/registry.ts`, `src/types/ink/erc721/registry.ts`, and the static registry).
   - Then run `yarn build` again.

If addresses in `.env` and `ink-contracts.json` are out of sync, you will see errors like:  
`No decoder version found for address 0x...` when processing `Revive.ContractEmitted` events.

---

## Chain metadata (guess-the-number node)

This indexer targets the **guess-the-number-node** chain. Chain metadata is **not** bundled from Westend; it must be generated from your RPC.

1. **Generate chain metadata once** (requires `RPC_URL_WS` in `.env` and a reachable node):

   ```bash
   yarn metadata:chain
   ```

   This writes `metadata/chain-metadata.jsonl` using the Substrate metadata explorer. You need this file before `yarn codegen` or any Docker build.

2. **Then** run codegen and build as usual (see [First-time setup](#first-time-setup) below).

For Docker: ensure `metadata/chain-metadata.jsonl` exists (run `yarn metadata:chain` locally first so the `metadata/` folder contains it before building the image).

---

## First-time setup

Recommended order for a clean run:

1. **Configure**
   - Copy `.env.example` to `.env` and set `RPC_URL_WS`, `GUESS_THE_NUMBER_CONTRACTS`, `ERC721_CONTRACTS`, and DB credentials.

2. **Chain metadata**
   ```bash
   yarn metadata:chain
   ```

3. **Codegen and decoders**
   ```bash
   yarn codegen
   yarn gen:decoders
   yarn build
   ```

4. **Database**
   ```bash
   docker compose up -d db   # if using Docker for PostgreSQL
   yarn db:migrate
   ```

5. **Run**
   - Indexer: `yarn processor`
   - API: `yarn serve` (e.g. `http://localhost:4000/graphql`)

---

## Running the indexer

1. **Start the database** (if using Docker):

   ```bash
   docker compose up -d db
   ```

2. **Apply migrations** (if not already done):

   ```bash
   yarn build
   yarn db:migrate
   ```

3. **Run the processor** (indexing):

   ```bash
   yarn processor
   ```

4. **Run the GraphQL API** (in another terminal):

   ```bash
   yarn serve
   ```

   The API is available at `http://localhost:4000/graphql`.

---

## Docker

Build and run with Docker Compose. The indexer container reads **environment variables from your `.env`** (RPC URL and contract addresses are not baked into the image).

**Before building:**

- Run `yarn metadata:chain` so `metadata/chain-metadata.jsonl` exists.
- Ensure `src/decoders/ink-contracts.json` contains the same contract addresses as `GUESS_THE_NUMBER_CONTRACTS` and `ERC721_CONTRACTS` in `.env` (and that you have run `yarn gen:decoders` if you changed them).

**Required env vars for the container:**

- `RPC_URL_WS` – WebSocket RPC URL
- `GUESS_THE_NUMBER_CONTRACTS` – guess_the_number contract address(es), comma-separated
- `ERC721_CONTRACTS` – ERC721 contract address(es), comma-separated
- DB connection: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS`

```bash
cp .env.example .env
# Edit .env with the variables above
docker compose up -d
```

---

## Command summary

| Command | Purpose |
|--------|--------|
| `yarn metadata:chain` | Dump chain metadata from RPC → `metadata/chain-metadata.jsonl` (run before first codegen/build) |
| `yarn codegen` | Generate Substrate types from `chain-metadata.jsonl` |
| `yarn gen:decoders` | Regenerate Ink! decoders from `src/decoders/ink-contracts.json` (run after changing contract addresses there) |
| `yarn build` | Build the project |
| `yarn db:migrate` | Apply SQL migrations |
| `yarn processor` | Run the indexer (reads chain and fills the DB) |
| `yarn serve` | Start the GraphQL server |
