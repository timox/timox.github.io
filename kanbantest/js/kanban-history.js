class KanbanHistory {
  static updateStatusHistory(record, newStatus, userId = null) {
    const now = new Date().toISOString();
    
    try {
      let historyData;
      if (record.historique_statuts) {
        historyData = JSON.parse(record.historique_statuts);
      } else {
        historyData = { historique: [], version: 1 };
        
        if (record.statut) {
          const estimatedStartDate = record.date_creation || 
                                   record.date_debut || 
                                   new Date(Date.now() - 24*60*60*1000).toISOString();
          
          historyData.historique.push({
            statut: record.statut,
            date_entree: estimatedStartDate,
            date_sortie: now,
            duree_minutes: Math.round((new Date(now) - new Date(estimatedStartDate)) / (1000 * 60)),
            utilisateur: userId,
            note: "Reconstitué automatiquement"
          });
        }
      }
      
      if (historyData.historique.length > 0) {
        const dernierStatut = historyData.historique[historyData.historique.length - 1];
        if (dernierStatut.date_sortie === null) {
          dernierStatut.date_sortie = now;
          dernierStatut.duree_minutes = Math.round(
            (new Date(now) - new Date(dernierStatut.date_entree)) / (1000 * 60)
          );
        }
      }
      
      historyData.historique.push({
        statut: newStatus,
        date_entree: now,
        date_sortie: null,
        duree_minutes: null,
        utilisateur: userId
      });
      
      return {
        historique_statuts: JSON.stringify(historyData),
        date_derniere_maj: now,
        statut_precedent: record.statut
      };
      
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'historique:', error);
      
      const fallbackHistory = {
        historique: [{
          statut: newStatus,
          date_entree: now,
          date_sortie: null,
          duree_minutes: null,
          utilisateur: userId,
          note: "Historique reconstruit après erreur"
        }],
        version: 1
      };
      
      return {
        historique_statuts: JSON.stringify(fallbackHistory),
        date_derniere_maj: now,
        statut_precedent: record.statut || 'Inconnu'
      };
    }
  }

  static exportGanttData(records) {
    return records.map(task => {
      let history = [];
      try {
        const historyData = JSON.parse(task.historique_statuts || '{"historique":[]}');
        history = historyData.historique || [];
      } catch (e) {
        console.warn(`Erreur parsing historique tâche ${task.id}:`, e);
      }
      
      return {
        id: task.id,
        titre: task.titre,
        projet: task.projet,
        statut_actuel: task.statut,
        date_creation: task.date_creation || task.date_debut,
        date_echeance: task.date_echeance,
        historique: history,
        duree_totale_minutes: history.reduce((total, entry) => {
          return total + (entry.duree_minutes || 0);
        }, 0),
        nombre_changements: history.length
      };
    });
  }
}
