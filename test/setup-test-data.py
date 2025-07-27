#!/usr/bin/env python3
"""
Script de création de données de test pour l'environnement Kanban
Utilise les données existantes dans /debug/ pour créer un jeu de test cohérent
"""

import json
import csv
import os
from datetime import datetime, timedelta
import random

def generate_test_strategies():
    """Génère des données stratégiques de test"""
    strategies = [
        {
            "id": 1,
            "id2": 1,
            "objectif": "Sécurité Infrastructure",
            "sous_objectif": "Mise à jour systèmes",
            "action": "Déployer patches sécurité",
            "responsable": "SSIR",
            "echeance": "2025-12-31",
            "portee": "Critique"
        },
        {
            "id": 2,
            "id2": 2,
            "objectif": "Conformité RGPD",
            "sous_objectif": "Audit données",
            "action": "Révision politiques",
            "responsable": "DPO",
            "echeance": "2025-06-30",
            "portee": "Importante"
        },
        {
            "id": 3,
            "id2": 3,
            "objectif": "Continuité Service",
            "sous_objectif": "Plan de reprise",
            "action": "Tests disaster recovery",
            "responsable": "Admin",
            "echeance": "2025-09-30",
            "portee": "Majeure"
        }
    ]
    return strategies

def generate_test_tasks():
    """Génère des tâches de test avec données cohérentes"""
    now = datetime.now()
    tasks = []
    
    statuts = ["Backlog", "À faire", "En cours", "En attente", "Validation", "Terminé"]
    bureaux = ["Dev", "Test", "Réseau", "Admin", "SSIR", "DPO"]
    responsables = ["TestUser1", "TestUser2", "AdminTest", "DevTest"]
    urgences = ["Faible", "Moyenne", "Élevée"]
    impacts = ["Mineur", "Majeur", "Critique"]
    projets = ["Sécurité", "Migration", "Maintenance", "Conformité"]
    
    for i in range(1, 21):  # 20 tâches de test
        task = {
            "id": i,
            "titre": f"Tâche de Test {i:02d}",
            "description": f"Description automatique pour tâche {i}",
            "statut": random.choice(statuts),
            "bureau": random.sample(bureaux, random.randint(1, 3)),
            "qui": random.sample(responsables, random.randint(1, 2)),
            "urgence": random.choice(urgences),
            "impact": random.choice(impacts),
            "projet": random.choice(projets),
            "strategie_id": [random.randint(1, 3)] if random.random() > 0.3 else [],
            "notes": json.dumps({
                "content": f"Notes initiales pour tâche {i}",
                "history": [
                    {
                        "timestamp": (now - timedelta(days=random.randint(1, 30))).isoformat(),
                        "user": random.choice(responsables),
                        "action": "creation",
                        "details": f"Tâche {i} créée"
                    }
                ]
            }),
            "date_debut": (now - timedelta(days=random.randint(0, 10))).strftime("%Y-%m-%d"),
            "date_echeance": (now + timedelta(days=random.randint(1, 60))).strftime("%Y-%m-%d"),
            "date_creation": (now - timedelta(days=random.randint(1, 30))).isoformat(),
            "date_derniere_maj": (now - timedelta(days=random.randint(0, 5))).isoformat(),
            "Cree_par": random.choice(responsables),
            "jalons": json.dumps([
                {
                    "date": (now + timedelta(days=random.randint(10, 30))).strftime("%Y-%m-%d"),
                    "titre": f"Jalon test {i}",
                    "description": f"Description jalon pour tâche {i}"
                }
            ]) if random.random() > 0.5 else ""
        }
        tasks.append(task)
    
    return tasks

def save_csv_files():
    """Sauvegarde les données en CSV pour import Grist"""
    
    # Créer le dossier de sortie
    output_dir = "test_data_export"
    os.makedirs(output_dir, exist_ok=True)
    
    # Générer et sauvegarder les stratégies
    strategies = generate_test_strategies()
    with open(f"{output_dir}/test_strategies.csv", "w", newline="", encoding="utf-8") as f:
        if strategies:
            writer = csv.DictWriter(f, fieldnames=strategies[0].keys())
            writer.writeheader()
            writer.writerows(strategies)
    
    # Générer et sauvegarder les tâches
    tasks = generate_test_tasks()
    with open(f"{output_dir}/test_tasks.csv", "w", newline="", encoding="utf-8") as f:
        if tasks:
            writer = csv.DictWriter(f, fieldnames=tasks[0].keys())
            writer.writeheader()
            writer.writerows(tasks)
    
    print(f"✅ Données de test générées dans {output_dir}/")
    print(f"📊 {len(strategies)} stratégies créées")
    print(f"📝 {len(tasks)} tâches créées")
    print("\n📋 Prochaines étapes :")
    print("1. Créer un nouveau document Grist")
    print("2. Créer les tables Ssir_strategie2 et Ssir_principale_task")
    print("3. Importer test_strategies.csv dans Ssir_strategie2")
    print("4. Importer test_tasks.csv dans Ssir_principale_task")
    print("5. Récupérer le DOC_ID et l'API key")
    print("6. Mettre à jour la configuration dans /test/js/config/constants.js")

def create_config_template():
    """Crée un template de configuration pour le nouvel environnement"""
    config_template = '''
// Configuration pour environnement de test isolé
// À mettre dans /test/js/config/constants.js

export const GRIST_CONFIG = {
  DOC_ID: "VOTRE_DOC_ID_TEST_ICI",          // À récupérer depuis Grist
  API_KEY: "VOTRE_API_KEY_TEST_ICI",        // À récupérer depuis Grist
  SERVER: "https://grist.numerique.gouv.fr"
};

export const TABLE_ID = "Ssir_principale_task";
export const STRATEGIES_TABLE_ID = "Ssir_strategie2";

// Données de test en dur (backup)
export const TEST_MODE = true;
export const TEST_DATA_AVAILABLE = true;
'''
    
    with open("test_data_export/config_template.js", "w", encoding="utf-8") as f:
        f.write(config_template)
    
    print("📄 Template de configuration créé : test_data_export/config_template.js")

if __name__ == "__main__":
    print("🧪 Génération des données de test pour Kanban SSIR")
    print("=" * 50)
    
    save_csv_files()
    create_config_template()
    
    print("\n🎯 Environnement de test prêt à être configuré !")