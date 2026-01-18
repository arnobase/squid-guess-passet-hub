# 🚀 Procédure Complète : Recréer la Base de Données

Ce guide décrit la procédure complète pour recréer la base de données après avoir vidé le volume Docker ou supprimé la base.

## 📋 Prérequis

- Docker et Docker Compose installés et fonctionnels
- Base de données PostgreSQL accessible (via Docker Compose)
- Variables d'environnement configurées dans `.env`

## 🔧 Configuration de la Base de Données

Vérifiez que votre fichier `.env` contient les bonnes informations :

```env
DB_HOST=localhost
DB_PORT=5435
DB_NAME=passet_hub_indexer
DB_USER=postgres
DB_PASS=postgres
```

## 📝 Procédure Complète

### 1. Démarrer les Services Docker

```bash
docker compose up -d
```

Cela démarre PostgreSQL et crée la base de données si elle n'existe pas.

### 2. Vérifier que la Base de Données Existe

```bash
docker compose exec db psql -U postgres -c "\l" | grep passet_hub_indexer
```

Si la base n'existe pas, créez-la :

```bash
docker compose exec db psql -U postgres -c "CREATE DATABASE passet_hub_indexer;"
```

### 3. Générer les Types TypeORM depuis le Schéma GraphQL

Cette étape génère les classes TypeScript des entités à partir de `schema.graphql` :

```bash
yarn type:generate
```

**Résultat attendu :** Les fichiers dans `src/model/generated/` sont créés/mis à jour.

### 4. Générer les Types Substrate

Génère les types TypeScript pour les événements Substrate :

```bash
yarn codegen
```

**Résultat attendu :** Les fichiers dans `src/types/` sont créés/mis à jour.

### 5. Générer les Décodeurs Ink! v6

Génère les décodeurs statiques pour les contrats Ink! v6 :

```bash
yarn gen:decoders
```

**Résultat attendu :** Les fichiers dans `src/types/ink/` sont créés/mis à jour.

### 6. Compiler le Projet TypeScript

Compile le code TypeScript (nécessaire pour que TypeORM puisse lire les entités) :

```bash
yarn build
```

**Résultat attendu :** Le dossier `lib/` est créé avec le code JavaScript compilé.

### 7. Nettoyer les Anciennes Migrations (si nécessaire)

Si vous avez des migrations existantes et que vous voulez repartir de zéro :

```bash
yarn db:clean
```

⚠️ **Attention :** Cette commande supprime toutes les migrations existantes.

### 8. Générer les Migrations SQL

Génère les migrations SQL en comparant les entités TypeORM avec l'état actuel de la base de données :

```bash
yarn migration:generate CreateSchema
```

**Résultat attendu :** Un fichier de migration est créé dans `db/migrations/` avec le SQL pour créer toutes les tables.

**Note :** Le nom `CreateSchema` est arbitraire, vous pouvez utiliser n'importe quel nom descriptif.

### 9. Appliquer les Migrations

Applique les migrations générées à la base de données :

```bash
yarn db:migrate
```

**Résultat attendu :** Toutes les tables sont créées dans la base de données `passet_hub_indexer`.

### 10. Vérifier que les Tables sont Créées

```bash
docker compose exec db psql -U postgres -d passet_hub_indexer -c "\dt"
```

Vous devriez voir toutes les tables :
- `contract`
- `game`
- `game_started_event`
- `guess_submitted_event`
- `clue_given_event`
- `game_over_event`
- `game_cancelled_event`
- `max_attempts_updated_event`
- `migrations`

## 🔄 Workflow Complet en Une Commande

Pour exécuter toutes les étapes en une fois (sauf le nettoyage) :

```bash
yarn type:generate && \
yarn codegen && \
yarn gen:decoders && \
yarn build && \
yarn migration:generate CreateSchema && \
yarn db:migrate
```

## 🐛 Dépannage

### Erreur : "Cannot find module '../types/ink/guess_the_number'"

**Solution :** Régénérez les décodeurs Ink! :
```bash
yarn gen:decoders
```

### Erreur : "database does not exist"

**Solution :** Créez la base de données :
```bash
docker compose exec db psql -U postgres -c "CREATE DATABASE passet_hub_indexer;"
```

### Erreur : "Unable to open file: typeorm.config.ts"

**Solution :** Assurez-vous que le projet est compilé :
```bash
yarn build
```

### Erreur : "migration is empty"

**Solution :** Vérifiez que :
1. Les entités sont bien générées (`yarn type:generate`)
2. Le projet est compilé (`yarn build`)
3. La base de données est vide ou dans l'état attendu

### Les Tables ne sont pas Créées

**Solution :** Vérifiez que la migration contient du SQL :
```bash
cat db/migrations/*.js | grep -A 5 "async up"
```

Si la migration est vide, supprimez-la et régénérez :
```bash
yarn db:clean
yarn migration:generate CreateSchema
yarn db:migrate
```

## 📚 Commandes Utiles

- **Voir l'état des migrations :**
  ```bash
  docker compose exec db psql -U postgres -d passet_hub_indexer -c "SELECT * FROM migrations;"
  ```

- **Revert la dernière migration :**
  ```bash
  yar migration:revert
  ```

- **Voir toutes les tables :**
  ```bash
  docker compose exec db psql -U postgres -d passet_hub_indexer -c "\dt"
  ```

- **Voir la structure d'une table :**
  ```bash
  docker compose exec db psql -U postgres -d passet_hub_indexer -c "\d game"
  ```

## ✅ Checklist de Vérification

Après avoir suivi cette procédure, vérifiez que :

- [ ] La base de données `passet_hub_indexer` existe
- [ ] Toutes les tables sont créées (voir liste ci-dessus)
- [ ] La table `migrations` contient au moins une entrée
- [ ] Le projet compile sans erreur (`yarn build`)
- [ ] Les types Ink! sont générés (`src/types/ink/guess_the_number/` existe)
- [ ] Les modèles TypeORM sont générés (`src/model/generated/` contient les fichiers)

## 🎯 Prochaines Étapes

Une fois la base de données créée, vous pouvez :

1. **Démarrer l'indexeur :**
   ```bash
   yarn processor
   ```

2. **Démarrer l'API GraphQL :**
   ```bash
   yarn serve
   ```

3. **Accéder à GraphiQL :**
   Ouvrez `http://localhost:4000/graphql` dans votre navigateur

---

**Note :** Cette procédure est spécifique à ce projet. Pour d'autres projets Subsquid, adaptez les noms de base de données et les chemins selon votre configuration.
