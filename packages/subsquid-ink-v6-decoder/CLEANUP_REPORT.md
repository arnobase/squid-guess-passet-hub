# Rapport d'Analyse et Nettoyage du Package

## 📊 Fichiers Actuellement Présents

### ✅ Fichiers Actifs (à conserver)

1. **Point d'entrée** :
   - `src/index.ts` - Module principal, exporte `createDecoder`

2. **Décodeurs actifs** :
   - `src/static.ts` - Décodeur statique (mode STATIC)
   - `src/runtime.ts` - Décodeur runtime (mode RUNTIME)
   - `src/subsquid-inkv6-decoder.ts` - Utilisé par `runtime.ts` et exporté pour compatibilité

3. **Générateurs** :
   - `src/papi-static-generator.ts` - Génère les décodeurs PAPI statiques
   - `src/cli.js` - CLI pour générer les décodeurs

4. **Utilitaires** :
   - `src/support.ts` - Utilitaires SCALE codec
   - `src/types.ts` - Types TypeScript
   - `src/static-registry.ts` - Registry des décodeurs statiques

### ❌ Fichiers Obsolètes (à supprimer)

1. **Anciens décodeurs non utilisés** :
   - `src/native-scale-decoder.ts` - Exclu de la compilation, non utilisé
   - `src/metadata-based-decoder.ts` - Exclu de la compilation, non utilisé
   - `src/native-ink-abi-decoder.ts` - Exclu de la compilation, non utilisé
   - `src/papi-decoder.ts` - Remplacé par `papi-static-generator.ts`

2. **Fichiers compilés dans src/** (ne devraient pas être là) :
   - `src/*.js` - Tous les fichiers JavaScript compilés
   - `src/*.js.map` - Tous les fichiers source maps

3. **Documentation redondante** :
   - `src/README.md` - Redondant avec `README.md` à la racine

### 📝 Fichiers Compilés dans lib/ (à nettoyer après suppression)

Les fichiers suivants dans `lib/` seront automatiquement supprimés lors de la prochaine compilation après suppression des sources :
- `lib/native-scale-decoder.*`
- `lib/metadata-based-decoder.*`
- `lib/native-ink-abi-decoder.*`
- `lib/papi-decoder.*`

## 🔍 Analyse des Dépendances

### `subsquid-inkv6-decoder.ts` - **CONSERVER**
- ✅ Utilisé par `runtime.ts` (mode RUNTIME)
- ✅ Exporté dans `index.ts` pour compatibilité avec l'ancien code (@deprecated)
- ⚠️ Marqué comme déprécié mais toujours nécessaire pour le mode RUNTIME

### `papi-decoder.ts` - **SUPPRIMER**
- ❌ Non utilisé dans le code
- ❌ Remplacé par `papi-static-generator.ts` qui génère les décodeurs statiques

### Anciens décodeurs - **SUPPRIMER**
- ❌ `native-scale-decoder.ts` - Exclu de tsconfig.json, non utilisé
- ❌ `metadata-based-decoder.ts` - Exclu de tsconfig.json, non utilisé  
- ❌ `native-ink-abi-decoder.ts` - Exclu de tsconfig.json, non utilisé

## 🧹 Plan de Nettoyage

### Étape 1 : Supprimer les fichiers obsolètes

```bash
# Anciens décodeurs
rm src/native-scale-decoder.ts
rm src/metadata-based-decoder.ts
rm src/native-ink-abi-decoder.ts
rm src/papi-decoder.ts

# Fichiers compilés dans src/
rm src/*.js
rm src/*.js.map

# Documentation redondante
rm src/README.md
```

### Étape 2 : Nettoyer tsconfig.json

Supprimer les exclusions devenues inutiles :
```json
"exclude": [
  "node_modules",
  "lib",
  "**/*.test.ts",
  "**/*.spec.ts"
  // Supprimer les lignes suivantes (fichiers n'existent plus) :
  // "src/native-scale-decoder.ts",
  // "src/metadata-based-decoder.ts",
  // "src/native-ink-abi-decoder.ts"
]
```

### Étape 3 : Recompiler

```bash
cd packages/subsquid-ink-v6-decoder
yarn build
```

### Étape 4 : Vérifier

```bash
# Vérifier que les fichiers obsolètes ne sont plus dans lib/
ls lib/ | grep -E "(native-scale|metadata-based|native-ink-abi|papi-decoder)"
# Ne devrait rien retourner
```

## 📦 Structure Finale Attendue

```
src/
├── cli.js                    # CLI générateur
├── index.ts                  # Point d'entrée
├── runtime.ts                # Décodeur runtime
├── static.ts                 # Décodeur statique
├── static-registry.ts        # Registry des décodeurs statiques
├── subsquid-inkv6-decoder.ts # Décodeur legacy (pour compatibilité)
├── papi-static-generator.ts  # Générateur PAPI statique
├── support.ts                # Utilitaires SCALE
└── types.ts                  # Types TypeScript
```

## ⚠️ Notes Importantes

1. **`subsquid-inkv6-decoder.ts`** doit être conservé car :
   - Il est utilisé par `runtime.ts` pour le mode RUNTIME
   - Il est exporté pour compatibilité avec l'ancien code
   - Il sera marqué comme `@deprecated` mais reste nécessaire

2. **Fichiers compilés** : Les fichiers `.js` et `.js.map` dans `src/` ne devraient pas être là. Ils sont générés dans `lib/` par TypeScript.

3. **Mode RUNTIME** : Le mode RUNTIME utilise toujours `subsquid-inkv6-decoder.ts`, donc ce fichier ne peut pas être supprimé tant que le mode RUNTIME est supporté.
