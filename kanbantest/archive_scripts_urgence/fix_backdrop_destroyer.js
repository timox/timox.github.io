// === DESTRUCTEUR RADICAL DE BACKDROPS ===
console.log('💥 === DESTRUCTEUR RADICAL BACKDROPS ===');

class BackdropDestroyer {
  constructor() {
    this.isDestroying = false;
    this.init();
  }

  init() {
    console.log('🔧 Initialisation destructeur backdrops...');
    
    // Surveillance continue des backdrops
    this.startBackdropMonitoring();
    
    // Intercepter TOUS les clics
    this.interceptAllClicks();
    
    // Nettoyage d'urgence toutes les 2 secondes
    this.startEmergencyCleanup();
    
    console.log('✅ Destructeur backdrops initialisé');
  }

  startBackdropMonitoring() {
    // Observer les mutations DOM pour détecter les nouveaux backdrops
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1 && node.classList && node.classList.contains('modal-backdrop')) {
              console.log('🚨 NOUVEAU BACKDROP DÉTECTÉ - DESTRUCTION IMMÉDIATE');
              this.destroyBackdrop(node);
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    console.log('👁️ Surveillance backdrops activée');
  }

  interceptAllClicks() {
    document.addEventListener('click', (e) => {
      console.log('👆 Clic détecté sur:', e.target.className);
      
      // Nettoyage préventif à chaque clic
      this.destroyAllBackdrops();
      
      // Si c'est un timeline
      const timelineBtn = e.target.closest('.btn-timeline');
      if (timelineBtn && timelineBtn.dataset.taskId) {
        console.log('⚡ TIMELINE - Préparation totale');
        
        // Bloquer l'événement
        e.preventDefault();
        e.stopPropagation();
        
        // Nettoyage radical
        this.totalCleanup();
        
        // Attendre un peu puis ouvrir
        setTimeout(() => {
          this.openTimelineSafe(timelineBtn.dataset.taskId);
        }, 200);
        
        return;
      }
      
      // Si c'est un titre de carte
      const card = e.target.closest('.kanban-item');
      if (card && (e.target.classList.contains('item-title') || e.target.classList.contains('editable-zone'))) {
        console.log('📝 CARTE - Nettoyage avant ouverture');
        
        // Nettoyage mais laisser passer l'événement
        this.destroyAllBackdrops();
        return;
      }
      
    }, true); // Capture prioritaire
  }

  startEmergencyCleanup() {
    setInterval(() => {
      const backdrops = document.querySelectorAll('.modal-backdrop');
      if (backdrops.length > 0) {
        console.log(`🚨 NETTOYAGE D'URGENCE: ${backdrops.length} backdrops détectés`);
        this.destroyAllBackdrops();
      }
    }, 2000);
  }

  destroyBackdrop(backdrop) {
    if (!backdrop || backdrop.parentNode !== document.body) return;
    
    console.log('💥 Destruction backdrop:', backdrop.className);
    
    try {
      // Méthode 1: Suppression directe
      backdrop.remove();
      
      // Méthode 2: Style forcé
      backdrop.style.display = 'none !important';
      backdrop.style.visibility = 'hidden !important';
      backdrop.style.opacity = '0 !important';
      
      // Méthode 3: Classes supprimées  
      backdrop.classList.remove('show', 'fade');
      backdrop.classList.add('d-none');
      
    } catch (error) {
      console.log('❌ Erreur destruction backdrop:', error);
    }
  }

  destroyAllBackdrops() {
    if (this.isDestroying) return;
    this.isDestroying = true;
    
    const backdrops = document.querySelectorAll('.modal-backdrop');
    console.log(`🧹 Destruction ${backdrops.length} backdrops`);
    
    backdrops.forEach((backdrop, index) => {
      console.log(`   💥 Backdrop ${index + 1}`);
      this.destroyBackdrop(backdrop);
    });
    
    // Réinitialiser body
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    document.body.removeAttribute('style');
    
    // Réinitialiser toutes les modales
    document.querySelectorAll('.modal').forEach(modal => {
      if (modal.classList.contains('show')) {
        modal.classList.remove('show');
        modal.style.display = 'none';
      }
    });
    
    setTimeout(() => {
      this.isDestroying = false;
    }, 500);
  }

  totalCleanup() {
    console.log('🔥 NETTOYAGE TOTAL EN COURS...');
    
    // Détruire TOUS les backdrops
    this.destroyAllBackdrops();
    
    // Attendre et détruire encore
    setTimeout(() => {
      this.destroyAllBackdrops();
    }, 100);
    
    setTimeout(() => {
      this.destroyAllBackdrops();
    }, 300);
    
    console.log('✅ Nettoyage total terminé');
  }

  openTimelineSafe(taskId) {
    console.log('🚀 Ouverture timeline SÉCURISÉE pour:', taskId);
    
    // Trouver la tâche
    let task = null;
    if (window.kanbanManager && window.kanbanManager.currentRecords) {
      task = window.kanbanManager.currentRecords.find(r => r.id == taskId);
    }
    
    if (!task) {
      console.log('❌ Tâche non trouvée');
      alert(`Tâche ${taskId} non trouvée`);
      return;
    }
    
    console.log('✅ Tâche trouvée:', task.titre);
    
    // S'assurer que pas de backdrops
    this.destroyAllBackdrops();
    
    const modal = document.getElementById('history-modal');
    if (!modal) {
      alert('Modale history-modal introuvable');
      return;
    }
    
    // Remplir le contenu
    this.fillHistoryModal(modal, task);
    
    // Ouvrir avec méthode brutale
    this.forceShowModal(modal);
  }

  fillHistoryModal(modal, task) {
    // Titre
    const title = document.getElementById('history-modal-label');
    if (title) {
      title.innerHTML = `
        <i class="bi bi-clock-history me-2"></i>
        📖 Historique - ${task.titre}
      `;
    }
    
    // Contenu
    const body = modal.querySelector('.modal-body');
    if (body) {
      let content = '<div class="alert alert-info">📖 Historique de la tâche</div>';
      
      try {
        if (task.notes) {
          const notes = typeof task.notes === 'string' ? JSON.parse(task.notes) : task.notes;
          if (notes.history && Array.isArray(notes.history)) {
            content = '<div class="history-list">';
            notes.history.forEach((entry, index) => {
              const date = new Date(entry.timestamp).toLocaleString('fr-FR');
              content += `
                <div class="card mb-2">
                  <div class="card-body py-2">
                    <div class="d-flex justify-content-between">
                      <strong>${entry.user || 'Utilisateur'}</strong>
                      <small class="text-muted">${date}</small>
                    </div>
                    <div class="mt-1">${entry.details || entry.action || 'Action'}</div>
                  </div>
                </div>
              `;
            });
            content += '</div>';
          }
        }
      } catch (e) {
        content = `<div class="alert alert-warning">Erreur historique: ${e.message}</div>`;
      }
      
      // Bouton de fermeture d'urgence
      content += `
        <div class="text-center mt-3">
          <button onclick="backdropDestroyer.closeModal()" class="btn btn-danger">
            ❌ FERMER CETTE MODALE
          </button>
        </div>
      `;
      
      body.innerHTML = content;
    }
  }

  forceShowModal(modal) {
    console.log('💪 FORÇAGE BRUTAL MODALE...');
    
    // Détruire les backdrops une dernière fois
    this.destroyAllBackdrops();
    
    // CSS brutal
    modal.style.display = 'block';
    modal.style.position = 'fixed';
    modal.style.zIndex = '99999';
    modal.style.top = '50px';
    modal.style.left = '50%';
    modal.style.transform = 'translateX(-50%)';
    modal.style.width = '90%';
    modal.style.maxWidth = '800px';
    modal.style.backgroundColor = 'white';
    modal.style.border = '3px solid #007bff';
    modal.style.borderRadius = '8px';
    modal.style.boxShadow = '0 10px 50px rgba(0,0,0,0.5)';
    modal.style.opacity = '1';
    modal.style.visibility = 'visible';
    
    modal.classList.add('show');
    modal.classList.remove('fade'); // Pas d'animation
    
    // PAS de backdrop - on n'en veut plus !
    document.body.style.overflow = 'hidden';
    
    console.log('✅ Modale forcée visible');
  }

  closeModal() {
    console.log('🔒 Fermeture modale manuelle');
    
    const modal = document.getElementById('history-modal');
    if (modal) {
      modal.style.display = 'none';
      modal.classList.remove('show');
    }
    
    this.destroyAllBackdrops();
    document.body.style.overflow = '';
    
    console.log('✅ Modale fermée');
  }

  // Méthode d'urgence accessible via console
  emergencyCleanup() {
    console.log('🚨 NETTOYAGE D\'URGENCE MANUEL');
    this.totalCleanup();
    
    // Fermer toutes les modales
    document.querySelectorAll('.modal').forEach(modal => {
      modal.style.display = 'none';
      modal.classList.remove('show');
    });
    
    console.log('🆘 Nettoyage d\'urgence terminé');
  }
}

// Création et activation du destructeur
const backdropDestroyer = new BackdropDestroyer();

// Export global pour usage d'urgence
window.backdropDestroyer = backdropDestroyer;
window.emergencyCleanup = () => backdropDestroyer.emergencyCleanup();

console.log('💥 DESTRUCTEUR BACKDROPS ACTIF !');
console.log('');
console.log('🔧 Fonctions d\'urgence:');
console.log('   → emergencyCleanup() - nettoyage d\'urgence');
console.log('   → backdropDestroyer.closeModal() - fermer modale');
console.log('');
console.log('🎯 Le destructeur surveille en permanence et détruit les backdrops automatiquement !');