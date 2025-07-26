#!/usr/bin/env python3
import csv
import json

def convert_tasks_csv_to_js():
    tasks = []
    
    with open('/home/timo/app/timox.github.io/test/debug/kanban-Ssir_principale_task(1).csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            task = {
                "id": int(row['id_task']) if row['id_task'] else 0,
                "type_tache_id": row['type_tache_id'].strip() if row['type_tache_id'] else "",
                "titre": row['titre'].strip() if row['titre'] else "",
                "description": row['description'].strip() if row['description'] else "",
                "bureau": row['bureau'].strip() if row['bureau'] else "",
                "qui": row['qui'].strip() if row['qui'] else "",
                "priorite": row['priorite'].strip() if row['priorite'] else "",
                "impact": row['impact'].strip() if row['impact'] else "",
                "statut": row['statut'].strip() if row['statut'] else "",
                "date_echeance": row['date_echeance'].strip() if row['date_echeance'] else "",
                "jalons": row['jalons'].strip() if row['jalons'] else "",
                "notes": row['notes'].strip() if row['notes'] else "",
                "projet": row['projet'].strip() if row['projet'] else "",
                "urgence": row['urgence'].strip() if row['urgence'] else "",
                "strategie_id": row['strategie_id'].strip() if row['strategie_id'] else ""
            }
            tasks.append(task)
    
    # Générer le fichier JavaScript
    js_content = """// === config/taskDataHardcoded.js ===
// Données des tâches principales de production - Générées automatiquement depuis Grist
// Dernière mise à jour: """ + "2025-07-26" + """

export const TASK_DATA = """ + json.dumps(tasks, indent=2, ensure_ascii=False) + """;

export default TASK_DATA;
"""
    
    with open('/home/timo/app/timox.github.io/kanban/js/config/taskDataHardcoded.js', 'w', encoding='utf-8') as f:
        f.write(js_content)
    
    print(f"✅ Conversion terminée ! {len(tasks)} tâches converties")
    print("📁 Fichier généré: /home/timo/app/timox.github.io/kanban/js/config/taskDataHardcoded.js")
    
    # Afficher un échantillon
    print("\n📋 Échantillon des tâches :")
    for i, t in enumerate(tasks[:3]):
        print(f"  {t['id']}: {t['titre']} ({t['statut']})")
    print(f"  ... et {len(tasks)-3} autres")

if __name__ == "__main__":
    convert_tasks_csv_to_js()