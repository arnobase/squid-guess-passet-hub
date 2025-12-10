# Analyse de l'Application Passet Hub Indexer

## Vue d'ensemble

**Passet Hub Indexer** est un indexeur blockchain basé sur **Subsquid** qui indexe les événements émis par des contrats **Ink! v6** déployés sur le réseau **Passet Hub** (réseau Substrate/Polkadot). L'application se concentre spécifiquement sur l'indexation d'un jeu "Guess the Number" déployé via la pallet **Revive**.

## Architecture Générale

### Stack Technologique

- **Framework d'indexation** : Subsquid (`@subsquid/substrate-processor`)
- **Langage** : TypeScript
- **Base de données** : PostgreSQL avec TypeORM
- **API** : GraphQL via `@subsquid/graphql-server`
- **Gestionnaire de paquets** : Yarn 4.10.3
- **Déploiement** : Docker avec Docker Compose

### Composants Principaux

```
src/
├── main.ts              # Point d'entrée principal, logique de traitement des blocs
├── processor.ts         # Configuration du SubstrateBatchProcessor
├── decoders/            # Système de décodage des événements Ink! v6
│   ├── index.ts
│   └── subsquid-inkv6-decoder.ts  # Décodeur générique Ink! v6
├── services/
│   └── game-manager.ts  # Gestionnaire de logique métier pour les jeux
├── model/               # Modèles de données TypeORM générés
│   └── generated/
│       ├── game.model.ts
│       ├── contract.model.ts
│       ├── gameStartedEvent.model.ts
│       ├── guessSubmittedEvent.model.ts
│       └── clueGivenEvent.model.ts
└── utils/
    └── logger.ts        # Système de logging configurable
```

## Fonctionnalités Principales

### 1. Indexation des Événements Blockchain

L'application écoute les événements suivants de la pallet Revive :
- `Revive.ContractEmitted` : Événements émis par les contrats Ink!
- `Revive.ContractInstantiated` : Instanciation de nouveaux contrats
- `Revive.CodeStored` : Stockage de code de contrat

### 2. Décodage des Événements Ink! v6

Le système utilise un **décodeur générique** (`SubsquidInkDecoder`) qui :
- Charge les métadonnées du contrat depuis un fichier JSON
- Décode les événements selon le format Ink! v6
- Gère les types primitifs (u8, u16, u32, u64, u128, i8-i128, bool, str)
- Supporte les types composites, variants (enums), tableaux et tuples
- Décode les arguments indexés depuis les topics et non-indexés depuis les données

**Contrat cible** : `guess_the_number` à l'adresse `0xe75cbd47620dbb2053cf2a98d06840f06baaf141`

**Événements décodés** :
- `NewGame` → `game_started`
- `GuessMade` → `guess_submitted`
- `ClueGiven` → `clue_given`

### 3. Modèle de Données

#### Entités GraphQL

1. **Contract** : Représente un contrat déployé
   - `id`, `codeHash`, `instantiatedAt`, `instantiatedAtBlock`, `instantiatedBy`
   - Relations vers les événements de jeu

2. **GameStartedEvent** : Événement de démarrage de jeu
   - `gameNumber`, `player`, `minNumber`, `maxNumber`

3. **GuessSubmittedEvent** : Événement de soumission de tentative
   - `gameNumber`, `attemptNumber`, `guess`

4. **ClueGivenEvent** : Événement d'indice donné
   - `gameNumber`, `attemptNumber`, `guess`, `result`

5. **Game** : Entité agrégée représentant l'état d'un jeu
   - `gameNumber`, `player`, `minNumber`, `maxNumber`
   - `attempt`, `lastGuess`, `lastClue`
   - `guessHistory` : Historique des tentatives (JSONB)

### 4. Gestion des Jeux (GameManager)

Le `GameManager` maintient l'état des jeux en mémoire pendant le traitement des batches :
- Crée un nouveau jeu lors d'un événement `game_started`
- Met à jour l'état du jeu pour les événements `guess_submitted` et `clue_given`
- Gère l'historique des tentatives avec leurs résultats
- Fusionne les jeux existants avec les nouveaux événements

**Note importante** : Le GameManager est persistant entre les batches pour maintenir la cohérence.

### 5. Conversion d'Adresses

L'application convertit les adresses EVM (20 bytes) et Substrate (32 bytes) en format SS58 :
- Supporte les adresses EVM (20 bytes) avec padding à 32 bytes
- Supporte les adresses Substrate natives (32 bytes)
- Utilise le format SS58 avec prefix 42 (Passet Hub)

## Configuration

### Variables d'Environnement

**Blockchain** :
- `RPC_PASSET_HUB_WS` : URL WebSocket du nœud RPC (défaut: `wss://passet-hub-paseo.ibp.network`)
- `START_BLOCK` : Bloc de départ (défaut: `1888457`)
- `END_BLOCK` : Bloc de fin (optionnel, défaut: continu)
- `FINALITY_CONFIRMATION` : Nombre de blocs pour finalité (défaut: `1`)

**Base de données** :
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS`

**Logging** :
- `LOG_LEVEL` : `error`, `warn`, `info`, `debug` (défaut: `info`)
- `TARGET_CONTRACTS` : Liste d'adresses de contrats à surveiller (séparées par virgules)

### Configuration Processor

Le processor est configuré pour :
- Traiter les événements par batches
- Supporter les hot blocks (blocs non finalisés)
- Filtrer uniquement les événements Revive pertinents
- Extraire les arguments d'événements, hash d'extrinsics, timestamps

## Flux de Traitement

```
1. Processor écoute les nouveaux blocs via WebSocket RPC
   ↓
2. Extraction des événements Revive.ContractEmitted
   ↓
3. Filtrage par adresse de contrat cible
   ↓
4. Décodage des événements Ink! v6 via SubsquidInkDecoder
   ↓
5. Création d'événements typés (GameStartedEvent, etc.)
   ↓
6. Traitement via GameManager pour créer/mettre à jour les jeux
   ↓
7. Fusion avec les jeux existants en base de données
   ↓
8. Sauvegarde en batch dans PostgreSQL
   ↓
9. API GraphQL expose les données indexées
```

## Points Forts

### ✅ Architecture Modulaire
- Séparation claire des responsabilités (décodage, gestion métier, persistance)
- Code réutilisable pour d'autres contrats Ink! v6

### ✅ Gestion d'État Robuste
- GameManager maintient la cohérence des jeux
- Fusion intelligente avec les données existantes
- Historique complet des tentatives

### ✅ Système de Logging Configurable
- Niveaux de log ajustables
- Filtrage par contrat cible
- Logs structurés pour le debugging

### ✅ Décodage Générique Ink! v6
- Support complet des types Ink! v6
- Gestion des arguments indexés/non-indexés
- Extensible à d'autres contrats

### ✅ Déploiement Docker
- Configuration Docker Compose complète
- Gestion automatique des migrations
- Scripts de démarrage robustes

## Points d'Attention / Améliorations Possibles

### ⚠️ Gestion de la Mémoire
- Le GameManager persistant peut accumuler des jeux en mémoire
- **Suggestion** : Implémenter un système de cache avec limite ou éviction

### ⚠️ Gestion des Erreurs
- Certaines erreurs de décodage sont silencieusement ignorées
- **Suggestion** : Ajouter des métriques pour les événements non décodables

### ⚠️ Performance
- Traitement séquentiel des événements dans un batch
- **Suggestion** : Paralléliser le traitement des événements indépendants

### ⚠️ Tests
- Pas de tests unitaires visibles dans le codebase
- **Suggestion** : Ajouter des tests pour le décodage et le GameManager

### ⚠️ Documentation
- Documentation dispersée dans plusieurs fichiers
- **Suggestion** : Centraliser la documentation dans un README principal

## Structure de Déploiement

### Docker Compose

L'application utilise 3 services :
1. **db** : PostgreSQL 15
2. **indexer** : Service d'indexation (processor)
3. **api** : Service GraphQL

### Scripts Disponibles

- `yarn build` : Compilation TypeScript
- `yarn codegen` : Génération des types Substrate
- `yarn db:generate` : Génération des modèles TypeORM
- `yarn db:migrate` : Application des migrations
- `yarn processor` : Lancement de l'indexeur
- `yarn serve` : Lancement de l'API GraphQL

## Sécurité

- Les mots de passe de base de données sont configurables via variables d'environnement
- Pas de secrets hardcodés dans le code
- Support des connexions sécurisées WebSocket (wss://)

## Évolutivité

L'architecture permet facilement :
- Ajouter de nouveaux contrats Ink! v6
- Ajouter de nouveaux types d'événements
- Étendre le modèle de données
- Ajouter de nouvelles requêtes GraphQL

## Conclusion

Cette application est un **indexeur Subsquid bien structuré** pour indexer les événements de contrats Ink! v6 sur Passet Hub. L'architecture modulaire et le décodage générique permettent une extension facile à d'autres contrats. Les principaux axes d'amélioration concernent la gestion mémoire, les tests et la documentation.

---

**Date d'analyse** : 2025-01-27
**Version analysée** : Basée sur le code actuel du dépôt


