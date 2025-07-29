#!/bin/bash

# ===================================================================
# SCRIPT DE DÉPLOIEMENT SÉCURISÉ VERS PRODUCTION
# Version: 2025-07-29
# ===================================================================

set -e  # Arrêter en cas d'erreur

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Configuration
TEST_DIR="./test"
PROD_DIR="./kanban"
BACKUP_PREFIX="backup_avant_deploy"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_PREFIX}_${TIMESTAMP}"

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}====================================================================${NC}"
echo -e "${BLUE}🚀 DÉPLOIEMENT VERS PRODUCTION - $(date)${NC}"
echo -e "${BLUE}====================================================================${NC}"

# Vérifications préalables
echo -e "${YELLOW}📋 VÉRIFICATIONS PRÉALABLES...${NC}"

if [[ ! -d "$TEST_DIR" ]]; then
    echo -e "${RED}❌ Erreur: Dossier test '$TEST_DIR' introuvable${NC}"
    exit 1
fi

if [[ ! -d "$PROD_DIR" ]]; then
    echo -e "${RED}❌ Erreur: Dossier production '$PROD_DIR' introuvable${NC}"
    exit 1
fi

# Vérifier les fichiers critiques dans test
CRITICAL_FILES=(
    "$TEST_DIR/js/kanban-app.js"
    "$TEST_DIR/js/managers/ModalManager.js"
    "$TEST_DIR/js/managers/HistoryManager.js"
    "$TEST_DIR/js/stats-app.js"
    "$TEST_DIR/index.html"
    "$TEST_DIR/stats.html"
)

echo -e "${YELLOW}🔍 Vérification des fichiers critiques...${NC}"
for file in "${CRITICAL_FILES[@]}"; do
    if [[ ! -f "$file" ]]; then
        echo -e "${RED}❌ Fichier critique manquant: $file${NC}"
        exit 1
    fi
    
    # Vérifier que les fichiers JS contiennent du code
    if [[ "$file" == *.js ]]; then
        if ! grep -q "function\|class\|=>" "$file"; then
            echo -e "${RED}❌ Fichier JS suspect (pas de code): $file${NC}"
            exit 1
        fi
    fi
    
    echo -e "${GREEN}✅ $file${NC}"
done

# Créer sauvegarde complète de production
echo -e "${YELLOW}💾 SAUVEGARDE DE PRODUCTION...${NC}"
mkdir -p "$BACKUP_DIR"
cp -r "$PROD_DIR" "${BACKUP_DIR}/production_complete"

# Ajouter à .gitignore si pas déjà fait
if ! grep -q "backup_avant_deploy_" .gitignore 2>/dev/null; then
    echo "backup_avant_deploy_*" >> .gitignore
    echo -e "${GREEN}✅ Backups ajoutés au .gitignore${NC}"
fi

echo -e "${GREEN}✅ Sauvegarde créée: $BACKUP_DIR${NC}"

# Confirmation utilisateur
echo -e "${YELLOW}⚠️  ATTENTION: Vous êtes sur le point de déployer vers PRODUCTION${NC}"
echo -e "${YELLOW}   - Tous les fichiers de production seront remplacés${NC}"
echo -e "${YELLOW}   - Une sauvegarde a été créée dans: $BACKUP_DIR${NC}"
echo -e "${YELLOW}   - Les modifications incluent:${NC}"
echo -e "${YELLOW}     • Correction lien modal historique${NC}"
echo -e "${YELLOW}     • Refactorisation saveCommentEdit()${NC}"
echo -e "${YELLOW}     • Correction parseMultipleValues (stats)${NC}"
echo -e "${YELLOW}     • Améliorations de robustesse${NC}"
echo ""
read -p "Continuer le déploiement? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}🚫 Déploiement annulé${NC}"
    exit 0
fi

# DÉPLOIEMENT
echo -e "${BLUE}🚀 DÉBUT DU DÉPLOIEMENT...${NC}"

# Liste des fichiers/dossiers à déployer
DEPLOY_ITEMS=(
    "js/kanban-app.js"
    "js/managers/ModalManager.js"
    "js/managers/HistoryManager.js"
    "js/stats-app.js"
    "js/config/constants.js"
    "js/utils/badges.js"
    "index.html"
    "stats.html"
)

echo -e "${YELLOW}📁 Copie des fichiers modifiés...${NC}"
for item in "${DEPLOY_ITEMS[@]}"; do
    src="$TEST_DIR/$item"
    dest="$PROD_DIR/$item"
    
    if [[ -f "$src" ]]; then
        # Créer le dossier de destination si nécessaire
        dest_dir=$(dirname "$dest")
        mkdir -p "$dest_dir"
        
        cp "$src" "$dest"
        echo -e "${GREEN}✅ $item${NC}"
    else
        echo -e "${YELLOW}⚠️  $item (fichier non trouvé, ignoré)${NC}"
    fi
done

# Vérification post-déploiement
echo -e "${YELLOW}🔍 VÉRIFICATION POST-DÉPLOIEMENT...${NC}"

# Vérifier que les fichiers déployés sont intègres
for item in "${DEPLOY_ITEMS[@]}"; do
    dest="$PROD_DIR/$item"
    if [[ -f "$dest" ]]; then
        if [[ "$dest" == *.js ]]; then
            if ! grep -q "function\|class\|=>" "$dest"; then
                echo -e "${RED}❌ ERREUR: Fichier déployé corrompu: $dest${NC}"
                echo -e "${RED}💡 Restauration recommandée depuis: $BACKUP_DIR${NC}"
                exit 1
            fi
        fi
    fi
done

# Générer rapport de déploiement
REPORT_FILE="deployment_report_${TIMESTAMP}.txt"
cat > "$REPORT_FILE" << EOF
=== RAPPORT DE DÉPLOIEMENT ===
Date: $(date)
Sauvegarde: $BACKUP_DIR
Fichiers déployés:
$(printf "  %s\n" "${DEPLOY_ITEMS[@]}")

Corrections incluses:
- Fix lien modal historique (openTaskModal → openTaskModalById)
- Refactorisation saveCommentEdit() avec méthodes centralisées
- Correction parseMultipleValues pour éviter erreur v.trim()
- Validation de cohérence des IDs de tâches
- Amélioration de la robustesse générale

Status: SUCCÈS ✅
EOF

echo -e "${GREEN}✅ Rapport généré: $REPORT_FILE${NC}"

# Message final
echo -e "${BLUE}====================================================================${NC}"
echo -e "${GREEN}🎉 DÉPLOIEMENT TERMINÉ AVEC SUCCÈS!${NC}"
echo -e "${BLUE}====================================================================${NC}"
echo -e "${GREEN}📝 Prochaines étapes recommandées:${NC}"
echo -e "${GREEN}   1. Tester l'application en production${NC}"
echo -e "${GREEN}   2. Vérifier que les modales fonctionnent${NC}"
echo -e "${GREEN}   3. Tester la page statistiques${NC}"
echo -e "${GREEN}   4. En cas de problème, restaurer depuis: $BACKUP_DIR${NC}"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Ne pas supprimer $BACKUP_DIR avant confirmation que tout fonctionne${NC}"
echo ""