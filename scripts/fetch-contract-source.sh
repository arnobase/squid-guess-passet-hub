#!/bin/bash
# Script pour télécharger et analyser le code source du contrat

REPO_URL="https://github.com/GuiGou12358/sc-rollup"
CONTRACT_PATH="examples/guess-the-number/ink-v6-contracts"
TEMP_DIR="/tmp/guess-the-number-contract"

echo "🔍 Téléchargement du code source du contrat..."
echo "Repository: $REPO_URL"
echo "Path: $CONTRACT_PATH"
echo ""

# Créer un dossier temporaire
mkdir -p "$TEMP_DIR"
cd "$TEMP_DIR"

# Télécharger le repository (ou au moins les fichiers du contrat)
echo "📥 Téléchargement..."
git clone --depth 1 "$REPO_URL" . 2>/dev/null || {
    echo "⚠️  Impossible de cloner le repository automatiquement."
    echo "   Veuillez télécharger manuellement depuis:"
    echo "   $REPO_URL/tree/main/$CONTRACT_PATH"
    echo ""
    echo "   Ou utilisez:"
    echo "   git clone $REPO_URL"
    echo "   cd sc-rollup/$CONTRACT_PATH"
    exit 1
}

if [ -d "$CONTRACT_PATH" ]; then
    cd "$CONTRACT_PATH"
    echo "✅ Code source trouvé dans: $(pwd)"
    echo ""
    echo "📋 Fichiers trouvés:"
    ls -la
    echo ""
    echo "🔍 Recherche de la définition des événements..."
    echo ""
    
    # Chercher les définitions d'événements
    echo "=== ÉVÉNEMENTS (#[ink::event]) ==="
    grep -r "#\[ink::event\]" . --include="*.rs" -A 10 || echo "Aucun événement trouvé"
    echo ""
    
    # Chercher les définitions de Address/H160
    echo "=== TYPE Address/H160 ==="
    grep -r "type Address\|H160\|Address\s*=" . --include="*.rs" -A 5 || echo "Aucune définition trouvée"
    echo ""
    
    # Chercher les émissions d'événements
    echo "=== ÉMISSION D'ÉVÉNEMENTS (emit_event) ==="
    grep -r "emit_event\|emit" . --include="*.rs" -A 5 | head -20 || echo "Aucune émission trouvée"
    
else
    echo "❌ Dossier $CONTRACT_PATH non trouvé"
    exit 1
fi
