# Configuration GitHub Actions pour Passet Hub Indexer

## Workflows disponibles

### 1. `ci.yml` - Pipeline complet CI/CD
**Déclenchement** : Push sur `main`/`develop`, PR vers `main`, workflow_dispatch

**Jobs** :
- **test** : Validation du code TypeScript, génération des types, build
- **build** : Construction et push des images Docker vers GitHub Container Registry
- **integration-test** : Tests d'intégration avec Docker Compose
- **deploy** : Déploiement en production (branche main uniquement)
- **security** : Scan de sécurité avec Trivy

### 2. `quick-test.yml` - Tests rapides
**Déclenchement** : Push sur `develop`, PR vers `develop`

**Jobs** :
- **quick-test** : Tests rapides sans déploiement

## Configuration requise

### Secrets GitHub (Settings > Secrets and variables > Actions)
```
GITHUB_TOKEN (automatique)
```

### Variables d'environnement (optionnelles)
```
RPC_PASSET_HUB_WS=wss://passet-hub-paseo.ibp.network
DB_PORT=5435
```

## Images Docker générées

### Indexer
- `ghcr.io/username/passet-hub-indexer-indexer:latest`
- `ghcr.io/username/passet-hub-indexer-indexer:main`
- `ghcr.io/username/passet-hub-indexer-indexer:develop`

### API
- `ghcr.io/username/passet-hub-indexer-api:latest`
- `ghcr.io/username/passet-hub-indexer-api:main`
- `ghcr.io/username/passet-hub-indexer-api:develop`

## Utilisation

### Développement
```bash
# Push sur develop déclenche quick-test
git push origin develop

# PR vers develop déclenche quick-test
git checkout -b feature/new-feature
git push origin feature/new-feature
# Créer PR vers develop
```

### Production
```bash
# Push sur main déclenche le pipeline complet
git push origin main

# Déploiement manuel
# Aller dans Actions > Passet Hub Indexer CI/CD > Run workflow
```

## Tests d'intégration

Le workflow `integration-test` vérifie :
- ✅ L'indexer démarre et traite des blocs
- ✅ L'API GraphQL répond sur le port 4000
- ✅ La base de données PostgreSQL est accessible
- ✅ Les services Docker Compose fonctionnent ensemble

## Sécurité

- Scan de vulnérabilités avec Trivy
- Résultats uploadés dans GitHub Security tab
- Images Docker signées et vérifiées

## Monitoring

Les logs des workflows sont disponibles dans :
- Actions > Passet Hub Indexer CI/CD
- Actions > Quick Build and Test

## Personnalisation

Pour adapter le déploiement en production, modifier la section `deploy` dans `ci.yml` :

```yaml
- name: Deploy to production
  run: |
    # Votre logique de déploiement ici
    # Exemples :
    # - kubectl apply -f k8s/
    # - docker service update --image $IMAGE_NAME
    # - ansible-playbook deploy.yml
```
