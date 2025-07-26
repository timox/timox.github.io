#!/usr/bin/env python3
import csv
import json

def convert_csv_to_js():
    strategies = []
    
    with open('/home/timo/app/timox.github.io/test/debug/kanban-Ssir_strategie2.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            strategy = {
                "id": int(row['id']),
                "objectif": row['objectif'].strip(),
                "sous_objectif": row['sous_objectif'].strip(),
                "action": row['action'].strip(),
                "responsable": row['responsable'].strip(),
                "echeance": row['echeance'].strip(),
                "portee": row['portee'].strip()
            }
            strategies.append(strategy)
    
    # Générer le fichier JavaScript
    js_content = """// === config/strategyDataHardcoded.js ===
// Données stratégiques de production - Générées automatiquement depuis Grist
// Dernière mise à jour: """ + "2025-07-26" + """

export const STRATEGY_DATA = """ + json.dumps(strategies, indent=2, ensure_ascii=False) + """;

export default STRATEGY_DATA;
"""
    
    with open('/home/timo/app/timox.github.io/kanban/js/config/strategyDataHardcoded.js', 'w', encoding='utf-8') as f:
        f.write(js_content)
    
    print(f"✅ Conversion terminée ! {len(strategies)} stratégies converties")
    print("📁 Fichier généré: /home/timo/app/timox.github.io/kanban/js/config/strategyDataHardcoded.js")
    
    # Afficher un échantillon
    print("\n📋 Échantillon des stratégies :")
    for i, s in enumerate(strategies[:3]):
        print(f"  {s['id']}: {s['objectif']} → {s['action']}")
    print(f"  ... et {len(strategies)-3} autres")

if __name__ == "__main__":
    convert_csv_to_js()