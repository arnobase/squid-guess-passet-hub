#!/bin/bash

# Script de test pour vérifier les migrations
echo "🧪 Test des migrations..."

# Vérifier que les fichiers de migration existent
if [ -d "db/migrations" ]; then
    echo "✅ Répertoire db/migrations trouvé"
    ls -la db/migrations/
else
    echo "❌ Répertoire db/migrations non trouvé"
    exit 1
fi

# Vérifier que le fichier de configuration TypeORM existe
if [ -f "typeorm.config.ts" ]; then
    echo "✅ Fichier typeorm.config.ts trouvé"
else
    echo "❌ Fichier typeorm.config.ts non trouvé"
    exit 1
fi

# Vérifier que les dépendances sont installées
if command -v yarn &> /dev/null; then
    echo "✅ Yarn disponible"
else
    echo "❌ Yarn non disponible"
    exit 1
fi

echo "✅ Tous les prérequis sont satisfaits!"
