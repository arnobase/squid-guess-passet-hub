#!/bin/bash

# Script de déploiement local pour Squid Guess Indexer
# Usage: ./deploy.sh [environment]

set -e

ENVIRONMENT=${1:-local}
PROJECT_NAME="squid-guess-indexer"

echo "🚀 Déploiement de $PROJECT_NAME en environnement: $ENVIRONMENT"

# Fonction de logging
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# Vérifier les prérequis
check_prerequisites() {
    log "🔍 Vérification des prérequis..."
    
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker n'est pas installé"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        echo "❌ Docker Compose n'est pas installé"
        exit 1
    fi
    
    if ! command -v yarn &> /dev/null; then
        echo "❌ Yarn n'est pas installé"
        exit 1
    fi
    
    log "✅ Prérequis vérifiés"
}

# Build des images
build_images() {
    log "🔨 Construction des images Docker..."
    
    case $ENVIRONMENT in
        "local")
            docker-compose build
            ;;
        "staging")
            docker-compose -f docker-compose.yml -f docker-compose.staging.yml build
            ;;
        "production")
            docker-compose -f docker-compose.yml -f docker-compose.prod.yml build
            ;;
        *)
            echo "❌ Environnement non reconnu: $ENVIRONMENT"
            exit 1
            ;;
    esac
    
    log "✅ Images construites"
}

# Tests locaux
run_tests() {
    log "🧪 Exécution des tests locaux..."
    
    # Type check
    yarn tsc --noEmit
    
    # Build
    yarn build
    
    # Génération des types
    yarn codegen
    
    log "✅ Tests locaux réussis"
}

# Déploiement
deploy() {
    log "🚀 Déploiement en cours..."
    
    case $ENVIRONMENT in
        "local")
            docker-compose up -d
            ;;
        "staging")
            docker-compose -f docker-compose.yml -f docker-compose.staging.yml up -d
            ;;
        "production")
            docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
            ;;
    esac
    
    log "✅ Déploiement terminé"
}

# Vérification de santé
health_check() {
    log "🏥 Vérification de santé des services..."
    
    # Attendre que les services démarrent
    sleep 30
    
    # Vérifier l'indexer
    if docker-compose logs indexer | grep -q "Processing.*blocks"; then
        log "✅ Indexer fonctionne"
    else
        log "❌ Indexer ne fonctionne pas"
        return 1
    fi
    
    # Vérifier l'API
    sleep 10
    if curl -f http://localhost:4000/graphql -X POST -H "Content-Type: application/json" -d '{"query":"{ __schema { types { name } } }"}' > /dev/null 2>&1; then
        log "✅ API fonctionne"
    else
        log "❌ API ne fonctionne pas"
        return 1
    fi
    
    # Vérifier la base de données
    if docker-compose exec -T db psql -U postgres -d squid_guess_indexer -c "SELECT 1;" > /dev/null 2>&1; then
        log "✅ Base de données fonctionne"
    else
        log "❌ Base de données ne fonctionne pas"
        return 1
    fi
    
    log "✅ Tous les services sont opérationnels"
}

# Nettoyage
cleanup() {
    log "🧹 Nettoyage..."
    docker-compose down -v
    docker system prune -f
    log "✅ Nettoyage terminé"
}

# Fonction principale
main() {
    log "🎯 Début du déploiement $PROJECT_NAME"
    
    check_prerequisites
    run_tests
    build_images
    deploy
    health_check
    
    log "🎉 Déploiement réussi !"
    log "📊 Services disponibles :"
    log "   - Indexer: http://localhost:4000 (GraphQL)"
    log "   - Database: localhost:5435 (squid_guess_indexer)"
    log "   - Logs: docker-compose logs -f"
}

# Gestion des erreurs
trap 'log "❌ Erreur détectée, nettoyage en cours..."; cleanup; exit 1' ERR

# Exécution
main "$@"
