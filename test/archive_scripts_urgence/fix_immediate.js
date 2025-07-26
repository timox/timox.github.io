// === CORRECTIF IMMÉDIAT SANS ATTENTE ===
console.log('⚡ === CORRECTIF IMMÉDIAT TIMELINE ===');

function applyImmediateFix() {
  console.log('🔧 Application correctif immédiat...');
  
  // Écouter tous les clics et intercepter timeline
  document.addEventListener('click', function(e) {
    // Chercher si c'est un bouton timeline
    const timelineBtn = e.target.closest('.btn-timeline');
    if (timelineBtn && timelineBtn.dataset.taskId) {
      
      console.log('⚡ IMMÉDIAT: Timeline intercepté pour taskId:', timelineBtn.dataset.taskId);
      
      // Bloquer l'événement
      e.preventDefault();
      e.stopPropagation();
      
      const taskId = parseInt(timelineBtn.dataset.taskId);
      
      // Trouver la tâche
      let task = null;
      if (window.kanbanManager && window.kanbanManager.currentRecords) {
        task = window.kanbanManager.currentRecords.find(r => r.id === taskId);
      }
      
      if (!task) {
        console.log('❌ Tâche non trouvée pour ID:', taskId);
        return;
      }
      
      console.log('✅ Tâche trouvée:', task.titre);
      
      // Ouvrir la modale directement
      openTimelineModal(task);
    }
  }, true); // true = capture, priorité maximale
  
  console.log('✅ Correctif immédiat appliqué (capture prioritaire)');
}

function openTimelineModal(task) {
  console.log('🚀 Ouverture timeline modale pour:', task.titre);
  
  const modal = document.getElementById('history-modal');
  if (!modal) {
    console.log('❌ history-modal introuvable');
    alert('Erreur: Modale d\'historique introuvable');
    return;
  }
  
  // Nettoyage radical
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    console.log('🧹 Suppression backdrop:', backdrop.className);
    backdrop.remove();
  });
  
  // Réinitialiser body
  document.body.classList.remove('modal-open');
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
  
  // Fermer toutes les autres modales
  document.querySelectorAll('.modal.show').forEach(m => {
    if (m !== modal) {
      console.log('🔒 Fermeture modale:', m.id);
      m.classList.remove('show');
      m.style.display = 'none';
    }
  });
  
  // Mettre à jour le titre
  const title = document.getElementById('history-modal-label');
  if (title) {
    title.innerHTML = `
      <i class="bi bi-clock-history me-2"></i>
      Historique - ${task.titre}
    `;
  }
  
  // Remplir le contenu
  const body = modal.querySelector('.modal-body');
  if (body) {
    let content = '<div class="alert alert-info">📖 Chargement historique...</div>';
    
    try {
      if (task.notes) {
        let notes;
        if (typeof task.notes === 'string') {
          notes = JSON.parse(task.notes);
        } else {
          notes = task.notes;
        }
        
        if (notes.history && Array.isArray(notes.history)) {
          content = '<div class="timeline-container">';
          notes.history.forEach((entry, index) => {
            const date = new Date(entry.timestamp).toLocaleString('fr-FR');
            const type = entry.action || 'Action';
            const details = entry.details || entry.newValue || 'Aucun détail';
            const user = entry.user || 'Utilisateur';
            
            content += `
              <div class="timeline-entry mb-3 p-3 border-start border-primary border-3" style="margin-left: 1rem;">
                <div class="d-flex justify-content-between align-items-start">
                  <div>
                    <strong class="text-primary">${user}</strong>
                    <small class="text-muted ms-2">(${type})</small>
                  </div>
                  <small class="text-muted">${date}</small>
                </div>
                <div class="mt-2">${details}</div>
              </div>
            `;
          });
          content += '</div>';
        } else {
          content = '<div class="alert alert-info">Historique présent mais format non reconnu</div>';
        }
      } else {
        content = '<div class="alert alert-info">Aucun historique disponible pour cette tâche</div>';
      }
    } catch (e) {
      console.log('❌ Erreur parsing historique:', e.message);
      content = `<div class="alert alert-danger">Erreur lecture historique: ${e.message}</div>`;
    }
    
    body.innerHTML = content;
  }
  
  // Triple méthode d'ouverture pour être sûr
  try {
    // Méthode 1: Bootstrap classique
    console.log('🔧 Tentative Bootstrap...');
    const bsModal = new bootstrap.Modal(modal, {
      backdrop: true,
      keyboard: true,
      focus: true
    });
    bsModal.show();
    console.log('✅ Bootstrap show() appelé');
  } catch (error) {
    console.log('❌ Bootstrap échoué:', error.message);
  }
  
  // Méthode 2: CSS direct (toujours appliqué)
  setTimeout(() => {
    console.log('🔧 Application CSS direct...');
    modal.style.display = 'block';
    modal.style.zIndex = '9999';
    modal.style.position = 'fixed';
    modal.style.top = '10%';
    modal.style.left = '50%';
    modal.style.transform = 'translateX(-50%)';
    modal.style.width = '80%';
    modal.style.maxWidth = '800px';
    modal.style.opacity = '1';
    modal.style.visibility = 'visible';
    modal.classList.add('show');
    
    // Backdrop manuel
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop fade show';
    backdrop.style.zIndex = '9998';
    backdrop.style.opacity = '0.5';
    backdrop.onclick = () => {
      console.log('🔒 Fermeture via backdrop');
      closeTimelineModal();
    };
    document.body.appendChild(backdrop);
    
    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
    
    console.log('✅ CSS direct appliqué');
  }, 100);
  
  // Vérification finale
  setTimeout(() => {
    const isVisible = window.getComputedStyle(modal).display !== 'none';
    console.log('📊 Vérification finale - visible:', isVisible);
    
    if (!isVisible) {
      console.log('🚨 FORÇAGE ULTIME...');
      modal.style.display = 'block !important';
      modal.style.zIndex = '99999';
      modal.style.backgroundColor = 'white';
      modal.style.border = '3px solid red';
      modal.style.boxShadow = '0 0 30px rgba(0,0,0,0.8)';
    }
  }, 500);
}

function closeTimelineModal() {
  const modal = document.getElementById('history-modal');
  if (modal) {
    modal.style.display = 'none';
    modal.classList.remove('show');
  }
  
  document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
  document.body.classList.remove('modal-open');
  document.body.style.overflow = '';
  
  console.log('🔒 Timeline modale fermée');
}

// Ajouter un bouton de fermeture d'urgence
function addCloseButton() {
  const modal = document.getElementById('history-modal');
  if (modal) {
    const header = modal.querySelector('.modal-header');
    if (header && !header.querySelector('.btn-close-emergency')) {
      const closeBtn = document.createElement('button');
      closeBtn.innerHTML = '❌ FERMER';
      closeBtn.className = 'btn btn-danger btn-sm btn-close-emergency';
      closeBtn.style.marginLeft = 'auto';
      closeBtn.onclick = closeTimelineModal;
      header.appendChild(closeBtn);
    }
  }
}

// Application immédiate
applyImmediateFix();
addCloseButton();

// Export pour utilisation manuelle
window.applyImmediateFix = applyImmediateFix;
window.closeTimelineModal = closeTimelineModal;

console.log('⚡ CORRECTIF IMMÉDIAT ACTIF !');
console.log('   → Capture tous les clics timeline avec priorité maximale');
console.log('   → Triple méthode d\'ouverture (Bootstrap + CSS + Forçage)');
console.log('   → closeTimelineModal() pour fermer manuellement');