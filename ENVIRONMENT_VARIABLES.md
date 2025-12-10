# Configuration des Variables d'Environnement

Ce document explique les variables d'environnement disponibles pour configurer le Passet Hub Indexer.

## Variables de Configuration Blockchain

### `RPC_PASSET_HUB_WS`
- **Description** : URL WebSocket du nœud RPC Passet Hub
- **Valeur par défaut** : `wss://passet-hub-paseo.ibp.network`
- **Exemple** : `wss://passet-hub-paseo.ibp.network`

### `START_BLOCK`
- **Description** : Numéro du bloc de départ pour l'indexation
- **Valeur par défaut** : `1888457`
- **Exemple** : `1888457`
- **Note** : Utilisez `0` pour commencer depuis le début de la blockchain

### `END_BLOCK`
- **Description** : Numéro du bloc de fin pour l'indexation (optionnel)
- **Valeur par défaut** : `undefined` (indexation continue)
- **Exemple** : `2000000`
- **Note** : Si non défini ou `0`, l'indexation continue indéfiniment

### `FINALITY_CONFIRMATION`
- **Description** : Nombre de blocs à attendre pour confirmer la finalité
- **Valeur par défaut** : `1`
- **Exemple** : `1`
- **Note** : Plus la valeur est élevée, plus l'indexation est sûre mais lente

## Variables de Configuration Base de Données

### `DB_HOST`
- **Description** : Adresse du serveur de base de données
- **Valeur par défaut** : `localhost` (ou `db` dans Docker)
- **Exemple** : `db`

### `DB_PORT`
- **Description** : Port du serveur de base de données
- **Valeur par défaut** : `5432`
- **Exemple** : `5432`

### `DB_NAME`
- **Description** : Nom de la base de données
- **Valeur par défaut** : `passet_hub_indexer`
- **Exemple** : `passet_hub_indexer`

### `DB_USER`
- **Description** : Nom d'utilisateur de la base de données
- **Valeur par défaut** : `postgres`
- **Exemple** : `postgres`

### `DB_PASS`
- **Description** : Mot de passe de la base de données
- **Valeur par défaut** : `postgres`
- **Exemple** : `postgres`

## Variables de Configuration API

### `API_PORT`
- **Description** : Port de l'API GraphQL
- **Valeur par défaut** : `4000`
- **Exemple** : `4000`

### `API_HOST`
- **Description** : Adresse d'écoute de l'API
- **Valeur par défaut** : `0.0.0.0`
- **Exemple** : `0.0.0.0`

## Variables de Configuration Logs

### `LOG_LEVEL`
- **Description** : Niveau de log
- **Valeurs possibles** : `error`, `warn`, `info`, `debug`
- **Valeur par défaut** : `info`
- **Exemple** : `debug`

### `LOG_FORMAT`
- **Description** : Format des logs
- **Valeurs possibles** : `json`, `text`
- **Valeur par défaut** : `json`
- **Exemple** : `text`

## Variables de Configuration Métriques

### `METRICS_PORT`
- **Description** : Port des métriques Prometheus
- **Valeur par défaut** : `9090`
- **Exemple** : `9090`

### `ENABLE_METRICS`
- **Description** : Activer les métriques Prometheus
- **Valeurs possibles** : `true`, `false`
- **Valeur par défaut** : `true`
- **Exemple** : `true`

## Variables de Configuration Contrats

### `TARGET_CONTRACTS`
- **Description** : Adresses des contrats à surveiller (séparées par des virgules)
- **Valeur par défaut** : `""` (tous les contrats)
- **Exemple** : `0x1234...,0x5678...`
- **Note** : Si vide, tous les contrats Revive sont surveillés

## Variables d'Environnement

### `NODE_ENV`
- **Description** : Environnement d'exécution
- **Valeurs possibles** : `development`, `staging`, `production`
- **Valeur par défaut** : `development`
- **Exemple** : `production`

## Exemples de Configuration

### Développement Local
```bash
RPC_PASSET_HUB_WS=wss://passet-hub-paseo.ibp.network
START_BLOCK=1888457
END_BLOCK=
FINALITY_CONFIRMATION=1
DB_HOST=localhost
DB_PORT=5435
LOG_LEVEL=debug
NODE_ENV=development
```

### Production
```bash
RPC_PASSET_HUB_WS=wss://passet-hub-paseo.ibp.network
START_BLOCK=1888457
END_BLOCK=
FINALITY_CONFIRMATION=3
DB_HOST=db-prod
DB_PORT=5432
LOG_LEVEL=info
NODE_ENV=production
ENABLE_METRICS=true
```

### Test avec Blocs Limités
```bash
RPC_PASSET_HUB_WS=wss://passet-hub-paseo.ibp.network
START_BLOCK=1888457
END_BLOCK=1890000
FINALITY_CONFIRMATION=1
LOG_LEVEL=debug
NODE_ENV=development
```

## Utilisation avec Docker

Les variables d'environnement sont automatiquement passées au conteneur Docker via le fichier `docker-compose.yml`. Assurez-vous que votre fichier `.env` contient les valeurs souhaitées.

## Utilisation avec GitHub Actions

Les variables d'environnement peuvent être configurées dans les secrets GitHub Actions pour les déploiements automatisés.
