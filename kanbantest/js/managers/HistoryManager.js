// === managers/HistoryManager.js ===
// Gestionnaire pour l'historique des taches et les commentaires (Orchestrateur Phase 3)

import { displayError, displaySuccess } from '../utils/dom.js';
import { TABLE_ID } from '../config/constants.js';
import { createModuleLogger } from '../utils/LoggerManager.js';

import { parseTaskHistory, extractFieldChangeInfo, normalizeTimestamp, mergeHistoryAndComments, calculateHistoryStats } from './history/HistoryParser.js';
import { HistoryRenderer } from './history/HistoryRenderer.js';
import { HistoryExporter } from './history/HistoryExporter.js';
import { CommentEditWidget } from './history/CommentEditWidget.js';
import { CommentGristSync } from './history/CommentGristSync.js';
import { HistoryValidator } from './history/HistoryValidator.js';
import { HistoryModalManager } from './history/HistoryModalManager.js';

/**
 * Gestionnaire pour l'historique des taches et commentaires (orchestrateur)
 *
 * Delegue a 7 sous-modules :
 * - HistoryParser (fonctions pures)
 * - HistoryRenderer (rendu DOM)
 * - HistoryExporter (export CSV, affichage commentaires)
 * - CommentEditWidget (widget d'edition)
 * - CommentGristSync (sauvegarde Grist)
 * - HistoryValidator (validation/mise a jour structure)
 * - HistoryModalManager (modale separee)
 */
export class HistoryManager {
  constructor(kanbanManager) {
    this.kanban = kanbanManager;
    this.currentTaskHistory = null;
    this.logger = createModuleLogger('HistoryManager');

    // Widget d'edition de commentaire (accordeon modale)
    this.currentEditingComment = null;
    this.activeModalFocusTrap = null;

    // Instancier les sous-modules
    this.renderer = new HistoryRenderer(this);
    this.exporter = new HistoryExporter(this);
    this.commentEditWidget = new CommentEditWidget(this);
    this.commentGristSync = new CommentGristSync(this);
    this.validator = new HistoryValidator(this);
    this.modalManager = new HistoryModalManager(this);

    // Reference du setInterval pour cleanup dans destroy()
    // (defini par HistoryModalManager.setupModalCleanupListeners)
    this._cleanupInterval = null;

    this.init();
  }

  /**
   * Initialise le gestionnaire d'historique
   */
  init() {
    // Evenements maintenant geres par EventCentralizer (jQuery)
    this.commentEditWidget.setup();
    this.modalManager.setupModalCleanupListeners();
    this.logger.info('History manager initialized (evenements centralises via EventCentralizer)');
  }

  // === Delegate: HistoryParser (fonctions pures) ===

  parseTaskHistory(task) {
    return parseTaskHistory(task, this.logger);
  }

  // === Delegate: HistoryRenderer ===

  renderTaskHistory(task) {
    this.renderer.renderTaskHistory(task);
  }

  renderHistoryStats(historyData) {
    this.renderer.renderHistoryStats(historyData);
  }

  renderHistoryTimeline(historyData) {
    this.renderer.renderHistoryTimeline(historyData);
  }

  async renderTaskHistoryInElement(taskId, targetElement) {
    await this.renderer.renderTaskHistoryInElement(taskId, targetElement);
  }

  // === Delegate: HistoryExporter ===

  showAllComments() {
    this.exporter.showAllComments();
  }

  exportTaskHistory() {
    this.exporter.exportTaskHistory();
  }

  exportFullHistory() {
    this.exporter.exportFullHistory();
  }

  downloadCSV(csvData, filename) {
    this.exporter.downloadCSV(csvData, filename);
  }

  // === Delegate: CommentEditWidget ===

  setupCommentEditWidget() {
    this.commentEditWidget.setup();
  }

  openCommentEditWidget(commentElement) {
    this.commentEditWidget.open(commentElement);
  }

  closeCommentEditWidget() {
    this.commentEditWidget.close();
  }

  isCommentEditOpen() {
    return this.commentEditWidget.isOpen();
  }

  // === Delegate: CommentGristSync ===

  restoreEditingCommentFromWidget() {
    return this.commentGristSync.restoreEditingCommentFromWidget();
  }

  getBootstrapModalCandidates() {
    return this.commentGristSync.getBootstrapModalCandidates();
  }

  getActiveBootstrapModalInstance() {
    return this.commentGristSync.getActiveBootstrapModalInstance();
  }

  disableTaskModalFocusTrap() {
    this.commentGristSync.disableTaskModalFocusTrap();
  }

  restoreTaskModalFocusTrap() {
    this.commentGristSync.restoreTaskModalFocusTrap();
  }

  getCurrentEditingTaskId() {
    return this.commentGristSync.getCurrentEditingTaskId();
  }

  async saveCommentEdit() {
    await this.commentGristSync.saveCommentEdit();
  }

  async updateCommentInGrist(taskId, commentId, newContent) {
    await this.commentGristSync.updateCommentInGrist(taskId, commentId, newContent);
  }

  getGristApi() {
    return this.commentGristSync.getGristApi();
  }

  async getCurrentUser() {
    return await this.commentGristSync.getCurrentUser();
  }

  // === Delegate: HistoryValidator ===

  updateTaskHistory(task, newStatus, note = null) {
    return this.validator.updateTaskHistory(task, newStatus, note);
  }

  validateHistoryStructure(historyJSON) {
    return this.validator.validateHistoryStructure(historyJSON);
  }

  generateHistoryBadge(task) {
    return this.validator.generateHistoryBadge(task);
  }

  getTaskHistorySummary(task) {
    return this.validator.getTaskHistorySummary(task);
  }

  // === Delegate: HistoryModalManager ===

  setupModalCleanupListeners() {
    this.modalManager.setupModalCleanupListeners();
  }

  openTaskHistory(taskId) {
    this.modalManager.openTaskHistory(taskId);
  }

  openHistoryModalSeparately(task, taskId) {
    this.modalManager.openHistoryModalSeparately(task, taskId);
  }

  closeHistoryModal() {
    this.modalManager.closeHistoryModal();
  }

  forceShowModal(modalEl) {
    this.modalManager.forceShowModal(modalEl);
  }

  cleanupOrphanBackdrops() {
    this.modalManager.cleanupOrphanBackdrops();
  }

  /**
   * Nettoie les ressources
   */
  destroy() {
    this.currentTaskHistory = null;
    this.currentEditingComment = null;
    this.activeModalFocusTrap = null;

    // Nettoyer le setInterval de cleanup des backdrops
    if (this._cleanupInterval) {
      clearInterval(this._cleanupInterval);
      this._cleanupInterval = null;
    }

    // Delegate destroy to sub-modules that have it
    if (this.modalManager.destroy) {
      this.modalManager.destroy();
    }

    this.logger.info('Ressources nettoyees');
  }
}
