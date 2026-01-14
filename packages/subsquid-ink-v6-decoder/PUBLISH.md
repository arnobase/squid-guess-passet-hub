# Guide de Publication sur npm

## Créer une Organisation npm `@luckyweb3`

### Étape 1 : Créer l'organisation sur npmjs.com

1. Allez sur [npmjs.com](https://www.npmjs.com)
2. Connectez-vous avec votre compte npm
3. Cliquez sur votre avatar (en haut à droite)
4. Sélectionnez "Add Organization"
5. Entrez le nom `luckyweb3` (sans le @)
6. Choisissez le plan (gratuit pour les organisations publiques)
7. Confirmez la création

### Étape 2 : Ajouter des membres (optionnel)

Si vous voulez ajouter d'autres développeurs :
1. Allez dans les paramètres de l'organisation `@luckyweb3`
2. Cliquez sur "Members"
3. Ajoutez les membres par leur nom d'utilisateur npm

### Étape 3 : Configurer le package pour la publication

Le `package.json` est déjà configuré avec :
- `name: "@luckyweb3/subsquid-ink-v6-decoder"`
- `publishConfig` (à ajouter si nécessaire)

## Publier le Package

### Option 1 : Publication Manuelle

```bash
cd packages/subsquid-ink-v6-decoder

# 1. Vérifier que vous êtes connecté à npm
npm whoami

# 2. Si pas connecté, se connecter
npm login

# 3. Vérifier que vous avez les droits sur @luckyweb3
npm org ls luckyweb3

# 4. Compiler le package
yarn build

# 5. Publier (première fois)
npm publish --access public

# 6. Pour les versions suivantes, mettre à jour la version dans package.json
# puis :
npm publish
```

### Option 2 : Avec npm version (recommandé)

```bash
cd packages/subsquid-ink-v6-decoder

# 1. Mettre à jour la version (patch, minor, ou major)
npm version patch  # 1.0.0 -> 1.0.1
npm version minor  # 1.0.0 -> 1.1.0
npm version major  # 1.0.0 -> 2.0.0

# 2. Le script prepublishOnly compile automatiquement
npm publish --access public
```

## Vérifier la Publication

Après publication, vérifiez que le package est disponible :

```bash
npm view @luckyweb3/subsquid-ink-v6-decoder
```

Ou visitez : https://www.npmjs.com/package/@luckyweb3/subsquid-ink-v6-decoder

## Installation par les Utilisateurs

Une fois publié, les utilisateurs peuvent installer le package :

```bash
npm install @luckyweb3/subsquid-ink-v6-decoder
# ou
yarn add @luckyweb3/subsquid-ink-v6-decoder
```

## Notes Importantes

1. **Première publication** : Utilisez `--access public` pour les scoped packages (`@luckyweb3/...`)
2. **Versions** : Respectez le [Semantic Versioning](https://semver.org/)
3. **Tests** : Assurez-vous que tout fonctionne avant de publier
4. **Documentation** : Le README.md sera affiché sur npm

## Dépannage

### Erreur : "You do not have permission to publish"

- Vérifiez que vous êtes membre de l'organisation `@luckyweb3`
- Vérifiez que vous êtes connecté avec le bon compte npm

### Erreur : "Package name already exists"

- Le nom `@luckyweb3/subsquid-ink-v6-decoder` est peut-être déjà pris
- Choisissez un autre nom ou contactez le propriétaire

### Erreur : "Organization does not exist"

- Vérifiez que l'organisation `@luckyweb3` a bien été créée
- Vérifiez que vous êtes membre de l'organisation

