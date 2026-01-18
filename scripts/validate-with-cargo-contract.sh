#!/bin/bash
# Script pour valider le décodage avec cargo-contract
# Basé sur: https://substrate.stackexchange.com/questions/587/how-to-decode-ink-smart-contract-call-and-event-data
#
# Usage:
#   ./scripts/validate-with-cargo-contract.sh <eventData> <eventType>
#
# Exemple:
#   ./scripts/validate-with-cargo-contract.sh "0x000000000000000000000000000000007837e92fbf72f1ed3c6690a82c7e5195635a0432020000000600" "guess_made"

set -e

if [ $# -lt 2 ]; then
    echo "Usage: $0 <eventData> <eventType>"
    echo ""
    echo "Exemple:"
    echo "  $0 \"0x000000000000000000000000000000007837e92fbf72f1ed3c6690a82c7e5195635a0432020000000600\" \"guess_made\""
    exit 1
fi

EVENT_DATA="$1"
EVENT_TYPE="$2"

# Vérifier si cargo-contract est installé
if ! command -v cargo-contract &> /dev/null; then
    echo "❌ cargo-contract n'est pas installé"
    echo ""
    echo "Pour l'installer:"
    echo "  cargo install cargo-contract --force"
    echo ""
    echo "Ou utilisez le script de test JavaScript à la place:"
    echo "  node scripts/test-scale-decode.js <eventData> <topic1> <topic2> <eventType>"
    exit 1
fi

# Chemin vers le contrat (si on a le code source)
CONTRACT_SRC_DIR="/tmp/guess-the-number-contract/examples/guess-the-number/ink-v6-contracts"

if [ ! -d "$CONTRACT_SRC_DIR" ]; then
    echo "⚠️  Code source du contrat non trouvé dans: $CONTRACT_SRC_DIR"
    echo ""
    echo "Pour télécharger le code source:"
    echo "  ./scripts/fetch-contract-source.sh"
    echo ""
    echo "Ou utilisez le script de test JavaScript à la place:"
    echo "  node scripts/test-scale-decode.js <eventData> <topic1> <topic2> <eventType>"
    exit 1
fi

cd "$CONTRACT_SRC_DIR"

echo "🔍 Validation avec cargo-contract"
echo "=================================="
echo "EventType: $EVENT_TYPE"
echo "EventData: $EVENT_DATA"
echo ""

# Décoder avec cargo-contract
# Note: cargo-contract ne peut pas savoir quel événement décoder automatiquement
# Il faut spécifier le type d'événement
echo "📋 Décodage avec cargo-contract..."
echo ""

# Retirer le préfixe 0x si présent
CLEAN_DATA="${EVENT_DATA#0x}"

# Décoder l'événement
# Note: cargo-contract decode nécessite le type d'événement
# Pour guess_made, on doit spécifier le nom exact de l'événement dans le contrat
case "$EVENT_TYPE" in
    "guess_made")
        EVENT_NAME="GuessMade"
        ;;
    "clue_given")
        EVENT_NAME="ClueGiven"
        ;;
    "new_game")
        EVENT_NAME="NewGame"
        ;;
    "game_over")
        EVENT_NAME="GameOver"
        ;;
    *)
        echo "⚠️  Type d'événement non reconnu: $EVENT_TYPE"
        echo "   Types supportés: guess_made, clue_given, new_game, game_over"
        exit 1
        ;;
esac

echo "🎯 Décodage de l'événement: $EVENT_NAME"
echo ""

# Utiliser cargo-contract decode
# Format: cargo contract decode -d <data_hex> -t event
# Mais il faut spécifier quel événement décoder
# On peut essayer de décoder directement les données
cargo contract decode -d "$CLEAN_DATA" -t event 2>&1 || {
    echo ""
    echo "⚠️  cargo-contract decode nécessite de spécifier quel événement décoder"
    echo "   Les données ne contiennent pas l'ID de l'événement"
    echo ""
    echo "✅ Notre système de décodage utilise la signature dans topics[0]"
    echo "   pour identifier l'événement, ce qui est plus fiable"
    echo ""
    echo "💡 Utilisez plutôt le script JavaScript pour valider:"
    echo "   node scripts/test-scale-decode.js <eventData> <topic1> <topic2> <eventType>"
}
