// === utils/LoggerManager.js ===
// Gestionnaire intelligent de logs avec niveaux pour réduire le bruit de debug

/**
 * Niveaux de logging par priorité
 */
export const LOG_LEVELS = {
  CRITICAL: 0,  // Erreurs critiques qui cassent l'application
  ERROR: 1,     // Erreurs qui nécessitent attention
  WARN: 2,      // Avertissements importants
  INFO: 3,      // Informations utiles pour comprendre le flux
  DEBUG: 4      // Détails techniques pour debug
};

/**
 * Configuration des couleurs console
 */
const LOG_COLORS = {
  [LOG_LEVELS.CRITICAL]: 'background: #ff0000; color: white; font-weight: bold',
  [LOG_LEVELS.ERROR]: 'color: #ff4444; font-weight: bold',
  [LOG_LEVELS.WARN]: 'color: #ff8800',
  [LOG_LEVELS.INFO]: 'color: #0066cc',
  [LOG_LEVELS.DEBUG]: 'color: #666666'
};

/**
 * Gestionnaire intelligent de logs
 */
export class LoggerManager {
  constructor() {
    // Niveau de log par défaut (INFO)
    this.logLevel = this.getLogLevelFromStorage();
    this.moduleFilters = new Set(); // Filtres par module
    
    // Compteurs pour éviter le spam
    this.logCounts = new Map();
    this.maxLogCount = 5; // Max 5 logs identiques
    
    console.log(`%c[LOGGER] Initialized with level: ${this.getLevelName(this.logLevel)}`, 
                LOG_COLORS[LOG_LEVELS.INFO]);
  }
  
  /**
   * Récupère le niveau de log depuis localStorage
   */
  getLogLevelFromStorage() {
    try {
      const stored = localStorage.getItem('kanban-log-level');
      if (stored && LOG_LEVELS.hasOwnProperty(stored)) {
        return LOG_LEVELS[stored];
      }
    } catch (e) {
      // Ignore localStorage errors
    }
    return LOG_LEVELS.INFO; // Temporaire pour debug commentaires
  }
  
  /**
   * Change le niveau de log et le sauvegarde
   */
  setLogLevel(level) {
    if (typeof level === 'string' && LOG_LEVELS.hasOwnProperty(level)) {
      this.logLevel = LOG_LEVELS[level];
    } else if (typeof level === 'number' && level >= 0 && level <= 4) {
      this.logLevel = level;
    } else {
      console.error('Invalid log level:', level);
      return;
    }
    
    try {
      localStorage.setItem('kanban-log-level', this.getLevelName(this.logLevel));
    } catch (e) {
      // Ignore localStorage errors
    }
    
    console.log(`%c[LOGGER] Level changed to: ${this.getLevelName(this.logLevel)}`, 
                LOG_COLORS[LOG_LEVELS.INFO]);
  }
  
  /**
   * Obtient le nom du niveau de log
   */
  getLevelName(level) {
    return Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === level) || 'UNKNOWN';
  }
  
  /**
   * Vérifie si un log doit être affiché
   */
  shouldLog(level, module, message) {
    // Vérifier le niveau
    if (level > this.logLevel) {
      return false;
    }
    
    // Vérifier les filtres de module
    if (this.moduleFilters.size > 0 && !this.moduleFilters.has(module)) {
      return false;
    }
    
    // Prévenir le spam de logs identiques
    const logKey = `${module}:${message}`;
    const count = this.logCounts.get(logKey) || 0;
    
    if (count >= this.maxLogCount) {
      return false;
    }
    
    this.logCounts.set(logKey, count + 1);
    return true;
  }
  
  /**
   * Log critique - toujours affiché
   */
  critical(module, message, ...args) {
    if (this.shouldLog(LOG_LEVELS.CRITICAL, module, message)) {
      console.error(`%c[CRITICAL:${module}] ${message}`, LOG_COLORS[LOG_LEVELS.CRITICAL], ...args);
    }
  }
  
  /**
   * Log d'erreur
   */
  error(module, message, ...args) {
    if (this.shouldLog(LOG_LEVELS.ERROR, module, message)) {
      console.error(`%c[ERROR:${module}] ${message}`, LOG_COLORS[LOG_LEVELS.ERROR], ...args);
    }
  }
  
  /**
   * Log d'avertissement
   */
  warn(module, message, ...args) {
    if (this.shouldLog(LOG_LEVELS.WARN, module, message)) {
      console.warn(`%c[WARN:${module}] ${message}`, LOG_COLORS[LOG_LEVELS.WARN], ...args);
    }
  }
  
  /**
   * Log informatif
   */
  info(module, message, ...args) {
    if (this.shouldLog(LOG_LEVELS.INFO, module, message)) {
      console.log(`%c[INFO:${module}] ${message}`, LOG_COLORS[LOG_LEVELS.INFO], ...args);
    }
  }
  
  /**
   * Log de debug - filtré par défaut
   */
  debug(module, message, ...args) {
    if (this.shouldLog(LOG_LEVELS.DEBUG, module, message)) {
      console.log(`%c[DEBUG:${module}] ${message}`, LOG_COLORS[LOG_LEVELS.DEBUG], ...args);
    }
  }
  
  /**
   * Active le debug pour un module spécifique
   */
  enableModule(module) {
    this.moduleFilters.add(module);
    console.log(`%c[LOGGER] Debug enabled for module: ${module}`, LOG_COLORS[LOG_LEVELS.INFO]);
  }
  
  /**
   * Désactive le debug pour un module
   */
  disableModule(module) {
    this.moduleFilters.delete(module);
    console.log(`%c[LOGGER] Debug disabled for module: ${module}`, LOG_COLORS[LOG_LEVELS.INFO]);
  }
  
  /**
   * Remet à zéro les filtres de modules
   */
  clearModuleFilters() {
    this.moduleFilters.clear();
    console.log(`%c[LOGGER] All module filters cleared`, LOG_COLORS[LOG_LEVELS.INFO]);
  }
  
  /**
   * Remet à zéro les compteurs de spam
   */
  resetLogCounts() {
    this.logCounts.clear();
    console.log(`%c[LOGGER] Log counts reset`, LOG_COLORS[LOG_LEVELS.INFO]);
  }
  
  /**
   * Affiche l'aide sur les commandes de logging
   */
  showHelp() {
    console.log(`%c[LOGGER HELP]
Commands disponibles:
• logger.setLogLevel('DEBUG'|'INFO'|'WARN'|'ERROR'|'CRITICAL')
• logger.enableModule('ModuleName') - Active debug pour un module
• logger.disableModule('ModuleName') - Désactive debug pour un module
• logger.clearModuleFilters() - Supprime tous les filtres
• logger.resetLogCounts() - Remet à zéro les compteurs
• logger.showStats() - Affiche les statistiques

Niveaux:
• CRITICAL: Erreurs critiques uniquement
• ERROR: Erreurs + critiques
• WARN: Avertissements + erreurs + critiques
• INFO: Infos + tout ce qui précède (défaut)
• DEBUG: Tout y compris debug détaillé

Actuel: ${this.getLevelName(this.logLevel)}`, LOG_COLORS[LOG_LEVELS.INFO]);
  }
  
  /**
   * Affiche les statistiques de logging
   */
  showStats() {
    console.log(`%c[LOGGER STATS]
Niveau actuel: ${this.getLevelName(this.logLevel)}
Modules filtrés: ${Array.from(this.moduleFilters).join(', ') || 'Aucun'}
Logs comptés: ${this.logCounts.size}
Max par log: ${this.maxLogCount}`, LOG_COLORS[LOG_LEVELS.INFO]);
  }
}

// Instance singleton
let loggerInstance = null;

/**
 * Initialise et retourne l'instance du logger
 */
export function initLogger() {
  if (!loggerInstance) {
    loggerInstance = new LoggerManager();
  }
  
  // Toujours exposer dans window pour usage console
  if (typeof window !== 'undefined') {
    window.logger = loggerInstance;
    console.log('%c[LOGGER] Logger exposé globalement - Tapez logger.showHelp() pour commencer', 
                'color: #0066cc; font-weight: bold');
  }
  
  return loggerInstance;
}

/**
 * Récupère l'instance du logger
 */
export function getLogger() {
  if (!loggerInstance) {
    return initLogger();
  }
  return loggerInstance;
}

/**
 * Fonction de convenance pour créer un logger pour un module
 */
export function createModuleLogger(moduleName) {
  const logger = getLogger();
  
  return {
    critical: (message, ...args) => logger.critical(moduleName, message, ...args),
    error: (message, ...args) => logger.error(moduleName, message, ...args),
    warn: (message, ...args) => logger.warn(moduleName, message, ...args),
    info: (message, ...args) => logger.info(moduleName, message, ...args),
    debug: (message, ...args) => logger.debug(moduleName, message, ...args)
  };
}