# 📊 Exemples de Requêtes GraphQL pour Passet Hub Indexer

Ce document contient des exemples de requêtes GraphQL pour interroger les données indexées du contrat "Guess the Number".

## 🔗 Endpoint GraphQL

Par défaut, l'API GraphQL est disponible sur : `http://localhost:4000/graphql`

## 📋 Table des Matières

1. [Requêtes de Base](#requêtes-de-base)
2. [Requêtes sur les Jeux](#requêtes-sur-les-jeux)
3. [Requêtes sur les Événements](#requêtes-sur-les-événements)
4. [Requêtes sur les Contrats](#requêtes-sur-les-contrats)
5. [Requêtes avec Filtres](#requêtes-avec-filtres)
6. [Requêtes avec Pagination](#requêtes-avec-pagination)
7. [Requêtes Agregées](#requêtes-agrégées)

---

## Requêtes de Base

### 1. Lister tous les contrats

```graphql
query GetAllContracts {
  contracts {
    id
    codeHash
    instantiatedAt
    instantiatedAtBlock
    instantiatedBy
  }
}
```

### 2. Obtenir un contrat par son adresse

```graphql
query GetContract($id: String!) {
  contract(id: $id) {
    id
    codeHash
    instantiatedAt
    instantiatedAtBlock
    instantiatedBy
  }
}
```

**Variables :**
```json
{
  "id": "0xe75cbd47620dbb2053cf2a98d06840f06baaf141"
}
```

---

## Requêtes sur les Jeux

### 3. Lister tous les jeux

```graphql
query GetAllGames {
  games {
    id
    gameNumber
    player
    minNumber
    maxNumber
    attempt
    lastGuess
    lastClue
    createdAt
    createdAtBlock
    contract {
      id
    }
    guessHistory {
      attemptNumber
      guess
      result
    }
  }
}
```

### 4. Obtenir un jeu spécifique

```graphql
query GetGame($id: String!) {
  game(id: $id) {
    id
    gameNumber
    player
    minNumber
    maxNumber
    attempt
    lastGuess
    lastClue
    createdAt
    createdAtBlock
    contract {
      id
      instantiatedAt
    }
    guessHistory {
      attemptNumber
      guess
      result
    }
  }
}
```

**Variables :**
```json
{
  "id": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY-1"
}
```

### 5. Trouver les jeux d'un joueur spécifique

```graphql
query GetGamesByPlayer($player: String!) {
  games(where: { player_eq: $player }) {
    id
    gameNumber
    minNumber
    maxNumber
    attempt
    lastGuess
    lastClue
    createdAt
    guessHistory {
      attemptNumber
      guess
      result
    }
  }
}
```

**Variables :**
```json
{
  "player": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
}
```

### 6. Trouver les jeux actifs (avec tentatives en cours)

```graphql
query GetActiveGames {
  games(where: { attempt_gt: 0 }) {
    id
    gameNumber
    player
    attempt
    lastGuess
    lastClue
    createdAt
  }
}
```

### 7. Trouver les jeux récents

```graphql
query GetRecentGames($limit: Int!) {
  games(
    orderBy: createdAt_DESC
    limit: $limit
  ) {
    id
    gameNumber
    player
    attempt
    lastGuess
    lastClue
    createdAt
  }
}
```

**Variables :**
```json
{
  "limit": 10
}
```

---

## Requêtes sur les Événements

### 8. Lister tous les événements de démarrage de jeu

```graphql
query GetAllGameStartedEvents {
  gameStartedEvents {
    id
    blockNumber
    timestamp
    extrinsicHash
    contractAddress
    gameNumber
    player
    minNumber
    maxNumber
    contract {
      id
    }
  }
}
```

### 9. Trouver les événements de démarrage pour un jeu spécifique

```graphql
query GetGameStartedEventsByGameNumber($gameNumber: BigInt!) {
  gameStartedEvents(where: { gameNumber_eq: $gameNumber }) {
    id
    blockNumber
    timestamp
    contractAddress
    player
    minNumber
    maxNumber
  }
}
```

**Variables :**
```json
{
  "gameNumber": "1"
}
```

### 10. Lister toutes les tentatives soumises

```graphql
query GetAllGuessSubmittedEvents {
  guessSubmittedEvents {
    id
    blockNumber
    timestamp
    extrinsicHash
    contractAddress
    gameNumber
    attemptNumber
    guess
    contract {
      id
    }
  }
}
```

### 11. Trouver les tentatives pour un jeu spécifique

```graphql
query GetGuessesForGame($gameNumber: BigInt!) {
  guessSubmittedEvents(where: { gameNumber_eq: $gameNumber }) {
    id
    attemptNumber
    guess
    timestamp
    blockNumber
  }
}
```

**Variables :**
```json
{
  "gameNumber": "1"
}
```

### 12. Lister tous les indices donnés

```graphql
query GetAllClueGivenEvents {
  clueGivenEvents {
    id
    blockNumber
    timestamp
    extrinsicHash
    contractAddress
    gameNumber
    attemptNumber
    guess
    result
    contract {
      id
    }
  }
}
```

### 13. Trouver les indices pour un jeu spécifique

```graphql
query GetCluesForGame($gameNumber: BigInt!) {
  clueGivenEvents(where: { gameNumber_eq: $gameNumber }) {
    id
    attemptNumber
    guess
    result
    timestamp
    blockNumber
  }
}
```

**Variables :**
```json
{
  "gameNumber": "1"
}
```

---

## Requêtes sur les Contrats

### 14. Obtenir un contrat avec tous ses événements

```graphql
query GetContractWithEvents($id: String!) {
  contract(id: $id) {
    id
    instantiatedAt
    instantiatedAtBlock
    instantiatedBy
    gameStartedEvents {
      id
      gameNumber
      player
      timestamp
    }
    guessSubmittedEvents {
      id
      gameNumber
      attemptNumber
      guess
      timestamp
    }
    clueGivenEvents {
      id
      gameNumber
      attemptNumber
      result
      timestamp
    }
  }
}
```

**Variables :**
```json
{
  "id": "0xe75cbd47620dbb2053cf2a98d06840f06baaf141"
}
```

---

## Requêtes avec Filtres

### 15. Jeux créés dans une plage de dates

```graphql
query GetGamesByDateRange($from: DateTime!, $to: DateTime!) {
  games(
    where: {
      createdAt_gte: $from
      createdAt_lte: $to
    }
    orderBy: createdAt_DESC
  ) {
    id
    gameNumber
    player
    createdAt
    attempt
  }
}
```

**Variables :**
```json
{
  "from": "2024-01-01T00:00:00Z",
  "to": "2024-12-31T23:59:59Z"
}
```

### 16. Jeux créés dans une plage de blocs

```graphql
query GetGamesByBlockRange($fromBlock: Int!, $toBlock: Int!) {
  games(
    where: {
      createdAtBlock_gte: $fromBlock
      createdAtBlock_lte: $toBlock
    }
    orderBy: createdAtBlock_DESC
  ) {
    id
    gameNumber
    player
    createdAtBlock
    attempt
  }
}
```

**Variables :**
```json
{
  "fromBlock": 1934744,
  "toBlock": 2000000
}
```

### 17. Événements par hash d'extrinsic

```graphql
query GetEventsByExtrinsicHash($hash: String!) {
  gameStartedEvents(where: { extrinsicHash_eq: $hash }) {
    id
    gameNumber
    player
    timestamp
  }
  guessSubmittedEvents(where: { extrinsicHash_eq: $hash }) {
    id
    gameNumber
    attemptNumber
    guess
  }
  clueGivenEvents(where: { extrinsicHash_eq: $hash }) {
    id
    gameNumber
    attemptNumber
    result
  }
}
```

**Variables :**
```json
{
  "hash": "0x1234567890abcdef..."
}
```

---

## Requêtes avec Pagination

### 18. Pagination des jeux

```graphql
query GetGamesPaginated($limit: Int!, $offset: Int!) {
  games(
    limit: $limit
    offset: $offset
    orderBy: createdAt_DESC
  ) {
    id
    gameNumber
    player
    attempt
    createdAt
  }
}
```

**Variables :**
```json
{
  "limit": 20,
  "offset": 0
}
```

### 19. Pagination avec curseur (par ID)

```graphql
query GetGamesAfterCursor($after: String!, $limit: Int!) {
  games(
    where: { id_gt: $after }
    limit: $limit
    orderBy: id_ASC
  ) {
    id
    gameNumber
    player
    createdAt
  }
}
```

**Variables :**
```json
{
  "after": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY-1",
  "limit": 10
}
```

---

## Requêtes Agrégées

### 20. Compter le nombre total de jeux

```graphql
query CountGames {
  gamesConnection {
    totalCount
  }
}
```

### 21. Compter les jeux par joueur

```graphql
query CountGamesByPlayer($player: String!) {
  gamesConnection(where: { player_eq: $player }) {
    totalCount
  }
}
```

**Variables :**
```json
{
  "player": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
}
```

### 22. Statistiques complètes d'un jeu

```graphql
query GetGameStats($gameId: String!) {
  game(id: $gameId) {
    id
    gameNumber
    player
    attempt
    minNumber
    maxNumber
    lastGuess
    lastClue
    createdAt
    guessHistory {
      attemptNumber
      guess
      result
    }
  }
  guessSubmittedEventsConnection(where: { gameNumber_eq: $gameId }) {
    totalCount
  }
  clueGivenEventsConnection(where: { gameNumber_eq: $gameId }) {
    totalCount
  }
}
```

**Variables :**
```json
{
  "gameId": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY-1"
}
```

---

## Requêtes Complexes

### 23. Historique complet d'un jeu avec tous les événements

```graphql
query GetCompleteGameHistory($gameNumber: BigInt!, $contractAddress: String!) {
  # Événement de démarrage
  gameStartedEvents(
    where: {
      gameNumber_eq: $gameNumber
      contractAddress_eq: $contractAddress
    }
  ) {
    id
    blockNumber
    timestamp
    player
    minNumber
    maxNumber
  }
  
  # Toutes les tentatives
  guessSubmittedEvents(
    where: {
      gameNumber_eq: $gameNumber
      contractAddress_eq: $contractAddress
    }
    orderBy: attemptNumber_ASC
  ) {
    id
    attemptNumber
    guess
    timestamp
    blockNumber
  }
  
  # Tous les indices
  clueGivenEvents(
    where: {
      gameNumber_eq: $gameNumber
      contractAddress_eq: $contractAddress
    }
    orderBy: attemptNumber_ASC
  ) {
    id
    attemptNumber
    guess
    result
    timestamp
    blockNumber
  }
}
```

**Variables :**
```json
{
  "gameNumber": "1",
  "contractAddress": "0xe75cbd47620dbb2053cf2a98d06840f06baaf141"
}
```

### 24. Tableau de bord : statistiques globales

```graphql
query GetDashboardStats {
  gamesConnection {
    totalCount
  }
  gameStartedEventsConnection {
    totalCount
  }
  guessSubmittedEventsConnection {
    totalCount
  }
  clueGivenEventsConnection {
    totalCount
  }
  games(
    orderBy: createdAt_DESC
    limit: 5
  ) {
    id
    gameNumber
    player
    attempt
    createdAt
  }
}
```

### 25. Top joueurs (joueurs avec le plus de jeux)

```graphql
query GetTopPlayers {
  games(
    orderBy: createdAt_DESC
  ) {
    player
    gameNumber
    createdAt
  }
}
```

*Note: Le groupement par joueur devra être fait côté client ou via une requête SQL directe.*

---

## 🔧 Utilisation avec cURL

### Exemple de requête avec cURL

```bash
curl -X POST \
  http://localhost:4000/graphql \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "query { games(limit: 10) { id gameNumber player attempt } }"
  }'
```

### Exemple avec variables

```bash
curl -X POST \
  http://localhost:4000/graphql \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "query GetGame($id: String!) { game(id: $id) { id gameNumber player } }",
    "variables": {
      "id": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY-1"
    }
  }'
```

---

## 📝 Notes Importantes

1. **Format des IDs** : Les IDs des jeux sont au format `{contractAddressSS58}-{gameNumber}`
2. **BigInt** : Les `gameNumber` sont de type `BigInt` et doivent être passés comme des chaînes
3. **DateTime** : Les dates sont au format ISO 8601 (ex: `2024-01-01T00:00:00Z`)
4. **Pagination** : Utilisez `limit` et `offset` pour la pagination, ou `*Connection` pour obtenir `totalCount`
5. **Filtres** : Subsquid supporte de nombreux opérateurs : `_eq`, `_gt`, `_gte`, `_lt`, `_lte`, `_in`, `_contains`, etc.

---

## 🚀 Explorer l'API GraphQL

Vous pouvez utiliser GraphQL Playground ou un outil similaire pour explorer l'API :

1. Ouvrez votre navigateur sur `http://localhost:4000/graphql`
2. Utilisez l'éditeur GraphQL pour tester les requêtes
3. Consultez la documentation automatique (schema introspection)

---

**Dernière mise à jour** : Basé sur le schéma GraphQL actuel du projet

