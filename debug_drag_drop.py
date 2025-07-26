#!/usr/bin/env python3
import requests
import json

# Configuration Grist
GRIST_URL = "https://grist.numerique.gouv.fr"
DOC_ID = "5UqT5e2BAEUt6An73e1pTd"
TABLE_ID = "Tasks"

# Headers pour l'API
headers = {
    'Content-Type': 'application/json'
}

def check_task_status(task_id):
    """Vérifier le statut d'une tâche dans Grist"""
    try:
        url = f"{GRIST_URL}/api/docs/{DOC_ID}/tables/{TABLE_ID}/records"
        response = requests.get(url, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            records = data.get('records', [])
            
            task = next((r for r in records if r['id'] == task_id), None)
            if task:
                print(f"✅ Tâche {task_id} trouvée:")
                print(f"   Titre: {task['fields'].get('titre', 'N/A')}")
                print(f"   Statut: {task['fields'].get('statut', 'N/A')}")
                print(f"   Date maj: {task['fields'].get('date_derniere_maj', 'N/A')}")
                return task['fields'].get('statut')
            else:
                print(f"❌ Tâche {task_id} non trouvée")
                return None
        else:
            print(f"❌ Erreur API: {response.status_code}")
            print(response.text)
            return None
            
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return None

def list_all_statuses():
    """Lister tous les statuts disponibles"""
    try:
        url = f"{GRIST_URL}/api/docs/{DOC_ID}/tables/{TABLE_ID}/records"
        response = requests.get(url, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            records = data.get('records', [])
            
            statuses = {}
            for record in records:
                status = record['fields'].get('statut', 'N/A')
                if status in statuses:
                    statuses[status] += 1
                else:
                    statuses[status] = 1
            
            print("📊 Répartition des statuts:")
            for status, count in statuses.items():
                print(f"   {status}: {count} tâches")
                
            return statuses
        else:
            print(f"❌ Erreur API: {response.status_code}")
            return None
            
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return None

if __name__ == "__main__":
    print("🔍 Debug drag & drop - Vérification Grist")
    print("=" * 50)
    
    # Vérifier la tâche 124
    print("\n1. Vérification tâche 124:")
    status = check_task_status(124)
    
    # Lister tous les statuts
    print("\n2. Tous les statuts:")
    list_all_statuses()
    
    print("\n✅ Debug terminé")