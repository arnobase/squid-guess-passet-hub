#!/bin/sh

# Script de démarrage pour Docker avec gestion des migrations
set -e

echo "🚀 Starting Squid Guess indexer..."

# Attendre que la base de données soit prête
echo "⏳ Attente de la base de données..."
#sleep 15

# Vérifier la connexion à la base de données avec une approche simple
echo "🔍 Vérification de la connexion à la base de données..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
  if nc -z $DB_HOST $DB_PORT 2>/dev/null; then
    echo "✅ Base de données disponible!"
    break
  fi
  echo "Base de données non disponible, attente... (tentative $((attempt + 1))/$max_attempts)"
  sleep 2
  attempt=$((attempt + 1))
done

if [ $attempt -eq $max_attempts ]; then
  echo "❌ Impossible de se connecter à la base de données après $max_attempts tentatives"
  exit 1
fi

# Appliquer les migrations
echo "📦 Application des migrations..."
yarn db:migrate

echo "✅ Migrations appliquées avec succès!"

# Démarrer l'indexeur
echo "🏃 Démarrage de l'indexeur..."
exec yarn processor
