// Verification script for modal buttons functionality
(function() {
  console.log('🔍 Démarrage vérification modal buttons...');
  
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runVerification);
  } else {
    runVerification();
  }
  
  function runVerification() {
    console.log('📋 État du DOM:');
    console.log('- popup-tache modal:', !!document.getElementById('popup-tache'));
    console.log('- btn-save-task:', !!document.getElementById('btn-save-task'));
    console.log('- btn-delete-task:', !!document.getElementById('btn-delete-task'));
    console.log('- jQuery disponible:', typeof $ !== 'undefined');
    console.log('- Bootstrap disponible:', typeof bootstrap !== 'undefined');
    
    // Test event listeners
    setTimeout(() => {
      console.log('🧪 Test des event listeners...');
      
      // Check if event listeners are attached by triggering click programmatically
      const saveBtn = document.getElementById('btn-save-task');
      const deleteBtn = document.getElementById('btn-delete-task');
      
      if (saveBtn && deleteBtn) {
        // Add temporary test listeners to check if our modal listeners work
        let saveClicked = false;
        let deleteClicked = false;
        
        const originalSave = window.kanbanManager?.modalManager?.saveTask;
        const originalDelete = window.kanbanManager?.modalManager?.deleteTask;
        
        if (window.kanbanManager?.modalManager) {
          // Temporarily override the methods to test
          window.kanbanManager.modalManager.saveTask = function() {
            saveClicked = true;
            console.log('✅ saveTask method called successfully!');
          };
          
          window.kanbanManager.modalManager.deleteTask = function() {
            deleteClicked = true;
            console.log('✅ deleteTask method called successfully!');
          };
          
          // Trigger clicks
          saveBtn.click();
          deleteBtn.click();
          
          // Check results
          setTimeout(() => {
            console.log('📊 Résultats du test:');
            console.log('- Save button working:', saveClicked);
            console.log('- Delete button working:', deleteClicked);
            
            if (saveClicked && deleteClicked) {
              console.log('✅ SUCCÈS: Les boutons de modal fonctionnent correctement!');
            } else {
              console.log('❌ ÉCHEC: Certains boutons ne fonctionnent pas');
              if (!saveClicked) console.log('  - Save button non fonctionnel');
              if (!deleteClicked) console.log('  - Delete button non fonctionnel');
            }
            
            // Restore original methods
            if (originalSave) window.kanbanManager.modalManager.saveTask = originalSave;
            if (originalDelete) window.kanbanManager.modalManager.deleteTask = originalDelete;
          }, 100);
        } else {
          console.log('❌ KanbanManager ou ModalManager non disponible');
        }
      } else {
        console.log('❌ Boutons de modal non trouvés dans le DOM');
      }
    }, 2000); // Wait for app to initialize
  }
})();