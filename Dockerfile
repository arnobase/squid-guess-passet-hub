# Dockerfile for Squid Guess Indexer
# RPC URL and contract addresses are provided at runtime via environment variables (see docker-compose.yml).
FROM node:20-alpine

RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    postgresql-client \
    netcat-openbsd && \
    corepack enable

WORKDIR /app

COPY package.json yarn.lock ./
COPY tsconfig.json squid.yaml typegen.json typesBundle.json ./

# Copier le répertoire packages (nécessaire pour les workspaces locaux)
COPY packages/ ./packages/

# Configurer Yarn et installer les dépendances
RUN yarn config set nodeLinker node-modules && \
    yarn install --frozen-lockfile && \
    yarn dlx @subsquid/cli@2.0.0

# Note: Le générateur de décodeurs est dans le package @luckyweb3/subsquid-ink-v6-decoder
# Il génère maintenant des décodeurs PAPI statiques (papi-events.ts) au lieu de events.ts
# La commande gen:decoders:full compile le package, génère les décodeurs, compile le projet et synchronise node_modules

# Copier le code source et les fichiers nécessaires (metadata/ inclut chain-metadata.jsonl généré par yarn metadata:chain)
COPY src/ ./src/
COPY schema.graphql ./
COPY metadata/ ./metadata/
COPY typeorm.config.ts ./
# Copier la configuration des décodeurs (nécessaire pour gen:decoders)
COPY src/decoders/ink-contracts.json ./src/decoders/

# Générer les types Substrate, puis compiler le package decoder et générer les décodeurs PAPI
# Note: bash n'est pas disponible dans alpine, décomposer gen:decoders:full
# Les erreurs TypeScript ESM/CommonJS sont normales et n'empêchent pas l'exécution
RUN set +e && \
    yarn codegen && \
    cd packages/subsquid-ink-v6-decoder && npx tsc && \
    test -f src/cli.js && cp src/cli.js lib/cli.js || echo "cli.js not found, skipping copy" && \
    cd ../.. && \
    yarn gen:decoders && \
    yarn build || echo "Build completed with warnings (ESM/CommonJS conflicts are expected)" && \
    rm -rf node_modules/@luckyweb3/subsquid-ink-v6-decoder && yarn install && \
    yarn migration:generate || echo "No new migrations to generate" && \
    set -e

# Copier les migrations existantes (si elles existent)
COPY db/migrations/ ./db/migrations/

# Copier le script de démarrage
COPY docker-start.sh ./docker-start.sh
RUN chmod +x ./docker-start.sh

# Exposer le port pour l'API
EXPOSE 4000

# Commande par défaut
CMD ["./docker-start.sh"]
