#!/bin/bash

# Script pour lancer les tests API Grist

echo "🧪 Lancement des tests API Grist..."
echo "================================"
echo ""

# Vérifier Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js non installé. Installation requise."
    exit 1
fi

echo "✅ Node.js disponible: $(node --version)"
echo ""

# Lancer les tests
echo "🚀 Exécution des tests..."
echo ""

node api-test-suite.js

echo ""
echo "✅ Tests terminés"