class KanbanComments {
  static addTimestampToDescription(currentDescription, newContent, userName = null) {
    const now = new Date();
    const timestamp = now.toLocaleString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const user = userName ? ` (${userName})` : '';
    const separator = '---';
    
    if (!newContent || newContent.trim() === '') {
      return currentDescription || '';
    }
    
    if (!currentDescription || currentDescription.trim() === '') {
      return `[${timestamp}${user}]\n${newContent.trim()}`;
    }
    
    const lines = currentDescription.split('\n');
    const lastContentIndex = lines.findIndex(line => line.startsWith('[') && line.includes(']'));
    
    if (lastContentIndex >= 0) {
      const lastContent = lines.slice(lastContentIndex + 1)
        .join('\n')
        .replace(/^---\s*$/gm, '')
        .trim();
      
      if (lastContent === newContent.trim()) {
        return currentDescription;
      }
    }
    
    return `[${timestamp}${user}]\n${newContent.trim()}\n\n${separator}\n\n${currentDescription}`;
  }

  static getLatestDescription(description) {
    if (!description) return '';
    
    const lines = description.split('\n');
    const firstTimestampIndex = lines.findIndex(line => line.match(/^\[.*\]$/));
    
    if (firstTimestampIndex >= 0) {
      const separatorIndex = lines.findIndex((line, index) => 
        index > firstTimestampIndex && line.trim() === '---'
      );
      
      const endIndex = separatorIndex >= 0 ? separatorIndex : lines.length;
      return lines.slice(firstTimestampIndex + 1, endIndex).join('\n').trim();
    }
    
    return description;
  }

  static getCommentsPerStatus(task) {
    if (!task.description || !task.historique_statuts) return {};
    
    try {
      const historyData = JSON.parse(task.historique_statuts);
      const statusHistory = historyData.historique || [];
      
      const sections = task.description.split(/\n\s*---\s*\n/);
      const comments = {};
      
      sections.forEach(section => {
        const lines = section.trim().split('\n');
        const timestampLine = lines.find(line => line.match(/^\[.*\]$/));
        
        if (timestampLine) {
          const content = lines.slice(1).join('\n').trim();
          const dateMatch = timestampLine.match(/\[(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2})/);
          
          if (dateMatch && content) {
            const [datePart, timePart] = dateMatch[1].split(' ');
            const [day, month, year] = datePart.split('/');
            const commentDate = new Date(`${year}-${month}-${day}T${timePart}:00`);
            
            if (isNaN(commentDate.getTime())) return;
            
            let correspondingStatus = statusHistory.find(status => {
              const entryDate = new Date(status.date_entree);
              const exitDate = status.date_sortie ? new Date(status.date_sortie) : new Date();
              const marginBefore = new Date(entryDate.getTime() - 5 * 60000);
              const marginAfter = new Date(exitDate.getTime() + 5 * 60000);
              
              return commentDate >= marginBefore && commentDate <= marginAfter;
            });
            
            if (!correspondingStatus && statusHistory.length > 0) {
              correspondingStatus = statusHistory.reduce((closest, status) => {
                const statusDate = new Date(status.date_entree);
                const closestDate = new Date(closest.date_entree);
                
                return Math.abs(commentDate - statusDate) < Math.abs(commentDate - closestDate) 
                  ? status : closest;
              });
            }
            
            const statusName = correspondingStatus?.statut || 'Non classé';
            
            if (!comments[statusName]) {
              comments[statusName] = [];
            }
            
            comments[statusName].push({
              date: commentDate,
              content: content,
              timestamp: timestampLine
            });
          }
        }
      });
      
      Object.keys(comments).forEach(status => {
        comments[status].sort((a, b) => b.date - a.date);
      });
      
      return comments;
      
    } catch (e) {
      console.error('Erreur extraction commentaires:', e);
      return {};
    }
  }
}
