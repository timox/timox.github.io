class KanbanUtils {
  static displayError(message) {
    console.error("ERREUR:", message);
    const el = document.getElementById('error-container');
    if (el) {
      const p = document.createElement('div');
      p.className = 'alert alert-danger m-3';
      p.textContent = `Erreur Kanban: ${message}`;
      el.innerHTML = '';
      el.appendChild(p);
    }
  }

  static normalizeDate(dateValue) {
    if (!dateValue) return null;
    
    if (typeof dateValue === 'string' && dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateValue;
    }
    
    if (typeof dateValue === 'number' || (typeof dateValue === 'string' && !isNaN(dateValue))) {
      const timestamp = typeof dateValue === 'string' ? parseFloat(dateValue) : dateValue;
      
      let date;
      if (timestamp > 1000000000000) {
        date = new Date(timestamp);
      } else if (timestamp > 1000000000) {
        date = new Date(timestamp * 1000);
      } else {
        date = new Date((timestamp - 25569) * 86400 * 1000);
      }
      
      if (!isNaN(date.getTime())) {
        return date.toISOString().slice(0, 10);
      }
    }
    
    if (typeof dateValue === 'string') {
      try {
        const date = new Date(dateValue);
        if (!isNaN(date.getTime())) {
          return date.toISOString().slice(0, 10);
        }
      } catch (e) {
        console.warn('Format de date non reconnu:', dateValue);
      }
    }
    
    return null;
  }

  static formatDate(dateValue) {
    const normalizedDate = this.normalizeDate(dateValue);
    if (!normalizedDate) return '';
    
    try {
      const options = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
      return new Date(normalizedDate).toLocaleDateString('fr-FR', options);
    } catch (e) {
      return normalizedDate;
    }
  }

  static calculerPriorite(urgence, impact) {
    const imp = String(impact || '').trim().toLowerCase();
    const urg = String(urgence || '').trim().toLowerCase();
    if (imp === 'critique') return 1;
    if (imp === 'important') return (urg === 'immédiate' || urg === 'courte') ? 1 : 2;
    if (imp === 'modéré') return (urg === 'immédiate') ? 2 : 3;
    if (imp === 'mineur') return 4;
    return 3;
  }
}
