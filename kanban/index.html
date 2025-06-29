<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Tableau Kanban SSIR</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">
  <style>
    /* === Variables CSS === */
    :root {
      --kanban-bg: #f8f9fa;
      --kanban-card-bg: #ffffff;
      --kanban-border: #dee2e6;
      --kanban-text: #212529;
      --kanban-text-muted: #6c757d;
      --kanban-shadow: 0 2px 4px rgba(0,0,0,0.1);
      --kanban-shadow-hover: 0 4px 8px rgba(0,0,0,0.15);
      --kanban-border-radius: 8px;
      --kanban-transition: all 0.2s ease;
    }

    /* === Base === */
    body {
      background-color: var(--kanban-bg);
      color: var(--kanban-text);
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      transition: var(--kanban-transition);
    }

    /* === Header === */
    .kanban-header {
      background: var(--kanban-card-bg);
      border-bottom: 1px solid var(--kanban-border);
      padding: 1rem 0;
      margin-bottom: 1rem;
      box-shadow: var(--kanban-shadow);
    }

    /* === Controls === */
    .kanban-controls {
      background: var(--kanban-card-bg);
      border-radius: var(--kanban-border-radius);
      padding: 1rem;
      margin-bottom: 1rem;
      box-shadow: var(--kanban-shadow);
      border: 1px solid var(--kanban-border);
    }

    /* === Boutons de mode de vue === */
    .btn-group .btn {
      font-size: 0.875rem;
      padding: 0.375rem 0.75rem;
    }

    .btn-group .btn.active {
      background-color: #007bff;
      border-color: #007bff;
      color: white;
    }

    /* === Container principal === */
    .kanban-container {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1rem;
      padding: 0 1rem;
    }

    /* === Mode Compact === */
    .kanban-container.kanban-compact {
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); /* Colonnes plus étroites */
      gap: 0.75rem; /* Espacement réduit */
      height: calc(100vh - 200px);
      font-size: 0.85rem; /* Police réduite globalement */
    }

    .kanban-compact .kanban-board {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .kanban-compact .kanban-board-header {
      padding: 0.75rem; /* Padding réduit */
      font-size: 0.9rem; /* Titre plus petit */
    }

    .kanban-compact .kanban-board-body {
      flex: 1;
      overflow-y: auto;
      scrollbar-width: thin;
      padding: 0.75rem; /* Padding réduit */
    }

    .kanban-compact .kanban-board-body::-webkit-scrollbar {
      width: 6px;
    }

    .kanban-compact .kanban-board-body::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 6px;
    }

    .kanban-compact .kanban-board-body::-webkit-scrollbar-thumb {
      background: #c1c1c1;
      border-radius: 6px;
    }

    /* Cartes plus compactes en mode compact */
    .kanban-compact .kanban-item-compact {
      padding: 0.5rem; /* Padding encore plus réduit */
      margin-bottom: 0.4rem;
      font-size: 0.8rem; /* Police plus petite */
    }

    .kanban-compact .compact-header {
      margin-bottom: 0.3rem;
    }

    .kanban-compact .compact-title {
      font-size: 0.8rem; /* Titre plus petit */
      line-height: 1.2;
    }

    .kanban-compact .priority-badge {
      font-size: 0.7rem; /* Badges plus petits */
      padding: 0.2em 0.6em;
    }

    .kanban-compact .date-echeance-compact {
      font-size: 0.65rem; /* Dates plus petites */
      padding: 0.15rem 0.3rem;
    }

    /* === Mode Détaillé === */
    .kanban-container.kanban-detailed {
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 0.75rem;
    }

    .kanban-detailed .kanban-board-header {
      padding: 0.75rem 1rem;
      font-size: 0.95rem;
    }

    .kanban-detailed .kanban-board-body {
      padding: 0.75rem;
      max-height: calc(100vh - 200px);
      overflow-y: auto;
    }

    /* === Boards === */
    .kanban-board {
      background: var(--kanban-card-bg);
      border-radius: var(--kanban-border-radius);
      border: 1px solid var(--kanban-border);
      box-shadow: var(--kanban-shadow);
      transition: var(--kanban-transition);
      min-height: 200px;
    }

    .kanban-board-header {
      padding: 1rem;
      border-bottom: 1px solid var(--kanban-border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 600;
    }

    .board-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .board-count {
      background: var(--kanban-text-muted);
      color: var(--kanban-card-bg);
      border-radius: 50%;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .kanban-board-body {
      padding: 1rem;
      min-height: 150px;
    }

    /* === Cartes === */
    .kanban-item {
      background: #f7fafd;
      border: 1px solid #e0e6ef;
      border-radius: 10px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      margin-bottom: 1.2em;
      padding: 1.1em 1em 0.8em 1em;
      min-height: 120px;
      position: relative;
      transition: box-shadow 0.15s;
      cursor: default;
    }

    .kanban-item:hover {
      box-shadow: 0 4px 16px rgba(0,0,0,0.07);
    }

    .kanban-item-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.7em;
    }

    .item-badges {
      display: flex;
      gap: 0.25rem;
      flex-wrap: wrap;
    }
    
    /* Style personnalisé pour le badge projet */
    .item-badges .badge.bg-info {
      background-color: #e3f2fd !important; /* Bleu très clair */
      color: #1565c0 !important; /* Bleu foncé pour le texte */
      font-weight: 500;
      border: 1px solid #90caf9;
      box-shadow: 0 1px 3px rgba(21, 101, 192, 0.1);
    }
    
    .item-badges .badge.bg-info:hover {
      background-color: #bbdefb !important;
      border-color: #64b5f6;
      transform: translateY(-1px);
      box-shadow: 0 2px 5px rgba(21, 101, 192, 0.2);
    }

    .item-title {
      font-weight: 600;
      margin-bottom: 0.5rem;
      color: var(--kanban-text);
    }

    /* === Cartes Compactes === */
    .kanban-item-compact {
      padding: 0.75rem;
      margin-bottom: 0.5rem;
      min-height: auto;
      background: #ffffff;
      border: 1px solid #e0e6ef;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      transition: all 0.2s ease;
    }

    .kanban-item-compact:hover {
      box-shadow: 0 3px 12px rgba(0,0,0,0.1);
      transform: translateY(-1px);
    }

    .compact-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .compact-priority {
      flex-shrink: 0;
    }

    .compact-echeance {
      flex-grow: 1;
      text-align: center;
    }

    .compact-title {
      font-weight: 600;
      font-size: 0.9rem;
      line-height: 1.3;
      cursor: pointer;
      padding: 2px 4px;
      border-radius: 4px;
      transition: background-color 0.2s ease;
    }

    .compact-title:hover {
      background-color: rgba(0,123,255,0.05);
    }

    /* === Boutons Expand/Collapse === */
    .btn-expand, .btn-collapse {
      background: none;
      border: none;
      color: #6c757d;
      padding: 0.2rem;
      border-radius: 3px;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 0.8rem;
    }

    .btn-expand:hover, .btn-collapse:hover {
      color: #007bff;
      background: rgba(0,123,255,0.1);
    }

    /* === Drag & Drop === */
    .drag-handle {
      position: absolute;
      left: 8px;
      top: 8px;
      cursor: grab;
      color: #888;
      z-index: 10;
      font-size: 1.2em;
      opacity: 0.7;
      transition: all 0.2s ease;
      padding: 4px;
      border-radius: 4px;
    }

    .drag-handle:hover {
      color: #333;
      opacity: 1;
      background-color: rgba(0,0,0,0.05);
    }

    .drag-handle:active {
      cursor: grabbing;
    }

    .editable-zone {
      margin-left: 32px;
      cursor: pointer;
      padding: 2px 4px;
      border-radius: 4px;
      transition: background-color 0.2s ease;
    }

    .editable-zone:hover {
      background-color: rgba(0,123,255,0.05);
    }

    /* === États Sortable === */
    .kanban-item.sortable-ghost {
      opacity: 0.3;
      background-color: #e9ecef;
      transform: rotate(0deg);
    }

    .kanban-item.sortable-chosen {
      transform: rotate(2deg);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 1000;
    }

    .kanban-item.sortable-drag {
      transform: rotate(5deg);
      box-shadow: 0 8px 20px rgba(0,0,0,0.25);
      opacity: 0.9;
    }

    /* === Priorités === */
    .priority-badge {
      font-size: 1em;
      padding: 0.32em 1.1em;
      border-radius: 1.2em;
      font-weight: bold;
      margin-right: 0.5em;
      display: inline-block;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04);
    }

    .priority-badge.priority-1 { background: #dc3545; color: #fff; }
    .priority-badge.priority-2 { background: #fd7e14; color: #fff; }
    .priority-badge.priority-3 { background: #ffe066; color: #333; }
    .priority-badge.priority-4 { background: #f8f9fa; color: #333; border: 1px solid #e0e0e0; }

    /* === Descriptions === */
    .desc-resume {
      color: #a5a5a5;
      font-size: 0.97em;
      font-style: italic;
      font-weight: 400;
      opacity: 0.8;
      margin-bottom: 0.3em;
      margin-top: 0.2em;
    }

    /* === Personnes === */
    .personnes-list {
      margin-top: 0.5em;
    }

    .personne-badge {
      display: inline-block;
      background: #d1e7dd;
      color: #17644e;
      border-radius: 1em;
      padding: 0.2em 0.7em;
      font-size: 0.92em;
      margin-right: 0.3em;
      margin-bottom: 0.2em;
    }

    /* === Dates === */
    .dates-container {
      margin-top: 0.5em;
      margin-bottom: 0.3em;
      display: flex;
      flex-direction: column;
      gap: 0.2em;
    }

    .date-debut, .date-echeance {
      display: inline-flex;
      align-items: center;
      gap: 0.3em;
      padding: 0.2em 0.5em;
      border-radius: 0.8em;
      font-size: 0.85em;
      font-weight: 500;
      white-space: nowrap;
    }

    .date-debut {
      background: #e3f2fd;
      color: #1565c0;
      border: 1px solid #bbdefb;
    }

    .date-echeance {
      color: #dc3545;
    }

    .date-echeance.echeance-ok {
      background: #e8f5e8;
      border: 1px solid #c8e6c9;
    }

    .date-echeance.echeance-bientot {
      background: #fff3e0;
      border: 1px solid #ffcc02;
    }

    .date-echeance.echeance-urgent {
      background: #fff3e0;
      border: 1px solid #ffb74d;
      animation: pulse-orange 2s infinite;
    }

    .date-echeance.echeance-aujourd-hui {
      background: #fff8e1;
      border: 1px solid #ffcc02;
      font-weight: bold;
      animation: pulse-yellow 2s infinite;
    }

    .date-echeance.echeance-depassee {
      background: #ffebee;
      border: 1px solid #ef9a9a;
      font-weight: bold;
      animation: pulse-red 2s infinite;
    }

    /* === Dates Compactes === */
    .date-echeance-compact {
      font-size: 0.75rem;
      padding: 0.2rem 0.4rem;
      border-radius: 0.5rem;
      display: inline-flex;
      align-items: center;
      gap: 0.2rem;
      color: #dc3545;
    }

    .date-echeance-compact.echeance-ok {
      background: #e8f5e8;
      border: 1px solid #c8e6c9;
    }

    .date-echeance-compact.echeance-bientot {
      background: #fff3e0;
      border: 1px solid #ffcc02;
    }

    .date-echeance-compact.echeance-urgent {
      background: #fff3e0;
      border: 1px solid #ffb74d;
      animation: pulse-orange 2s infinite;
    }

    .date-echeance-compact.echeance-aujourd-hui {
      background: #fff8e1;
      border: 1px solid #ffcc02;
      font-weight: bold;
      animation: pulse-yellow 2s infinite;
    }

    .date-echeance-compact.echeance-depassee {
      background: #ffebee;
      border: 1px solid #ef9a9a;
      font-weight: bold;
      animation: pulse-red 2s infinite;
    }

    /* === Animations === */
    @keyframes pulse-red {
      0%, 100% { background: #ffebee; }
      50% { background: #ffcdd2; }
    }

    @keyframes pulse-yellow {
      0%, 100% { background: #fff8e1; }
      50% { background: #fff3c4; }
    }

    @keyframes pulse-orange {
      0%, 100% { background: #fff3e0; }
      50% { background: #ffe0b2; }
    }

    /* === Classes spéciales === */
    .kanban-item.has-echeance {
      border-left: 3px solid #2e7d32;
    }

    .kanban-item.has-echeance:has(.echeance-urgent) {
      border-left: 3px solid #e65100;
    }

    .kanban-item.has-echeance:has(.echeance-aujourd-hui) {
      border-left: 3px solid #ff8f00;
    }

    .kanban-item.has-echeance:has(.echeance-depassee) {
      border-left: 3px solid #c62828;
    }

    .kanban-item.has-debut.has-echeance::before {
      content: '';
      position: absolute;
      top: 8px;
      right: 8px;
      width: 8px;
      height: 8px;
      background: #1565c0;
      border-radius: 50%;
      opacity: 0.7;
    }

    /* === Bordures par statut === */
    .board-backlog { border-top: 4px solid #6c757d; }
    .board-a-faire { border-top: 4px solid #0dcaf0; }
    .board-en-cours { border-top: 4px solid #fd7e14; }
    .board-en-attente { border-top: 4px solid #ffc107; }
    .board-bloque { border-top: 4px solid #dc3545; }
    .board-validation { border-top: 4px solid #6f42c1; }
    .board-termine { border-top: 4px solid #198754; }
    .board-hidden { display: none; }

    /* === Mode Focus === */
    .focus-navigation {
      display: flex;
      flex-direction: column; /* Navigation verticale pour prendre moins d'espace */
      gap: 0.3rem;
      margin-bottom: 1rem;
      padding: 0.75rem;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      width: 200px; /* Largeur fixe étroite */
      flex-shrink: 0; /* Ne pas rétrécir */
    }

    .focus-navigation .btn {
      border-radius: 6px;
      padding: 0.4rem 0.75rem;
      font-size: 0.8rem; /* Police plus petite */
      text-align: left;
      justify-content: space-between;
      display: flex;
      align-items: center;
      white-space: nowrap;
    }

    .focus-navigation .btn.active {
      background-color: #007bff;
      border-color: #007bff;
      color: white;
    }

    .focus-navigation .badge {
      font-size: 0.65rem;
      padding: 0.2em 0.4em;
    }

    /* Container pour le mode focus */
    .focus-container {
      display: flex;
      gap: 1rem;
      height: calc(100vh - 200px);
    }

    .focus-column {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      flex: 1; /* Prend le reste de l'espace */
      display: flex;
      flex-direction: column;
    }

    .focus-column .kanban-board-header {
      padding: 1.2rem;
      border-bottom: 2px solid #e9ecef;
      font-size: 1.1rem;
      font-weight: 600;
      flex-shrink: 0;
    }

    .focus-column .kanban-board-body {
      padding: 1rem;
      flex: 1;
      overflow-y: auto;
    }

    /* === Modal === */
    .modal-content {
      background-color: var(--kanban-card-bg);
      border: 1px solid var(--kanban-border);
      color: var(--kanban-text);
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.18);
      min-height: 80vh; /* Hauteur minimale */
    }

    .modal-header {
      background: linear-gradient(135deg, #6f42c1, #007bff);
      color: white;
      border-radius: 16px 16px 0 0;
      padding: 1.5rem;
    }

    .modal-body {
      padding: 2rem; /* Plus d'espace */
      max-height: calc(90vh - 200px); /* Hauteur maximale */
      overflow-y: auto;
    }

    .modal-footer {
      background: #f8f9fa;
      border-radius: 0 0 16px 16px;
      padding: 1.25rem 2rem; /* Plus d'espace */
    }

    .modal-xl {
      max-width: 1300px; /* Plus large qu'avant (1100px) */
    }
    
    /* Amélioration de l'espacement des champs */
    .modal-body .form-label {
      font-weight: 600;
      margin-bottom: 0.75rem;
      color: #495057;
    }
    
    .modal-body .form-control,
    .modal-body .form-select {
      padding: 0.75rem; /* Plus grand */
      font-size: 1rem;
    }
    
    .modal-body textarea.form-control {
      min-height: 120px; /* Plus haut pour la description */
    }
    
    .modal-body .row.g-3 > * {
      margin-bottom: 1.25rem; /* Plus d'espace entre les lignes */
    }

    /* === Stratégie === */
    #strategie-objectif, #strategie-sous-objectif, #strategie-action {
      min-width: 200px; /* Plus large qu'avant (170px) */
      max-width: 280px; /* Plus large qu'avant (220px) */
      font-size: 1rem;
      padding: 0.5rem;
    }

    .input-group.mb-2.flex-nowrap {
      gap: 0.75em; /* Plus d'espace entre les listes */
    }

    /* === Masquer délai-type === */
    #delai-type {
      display: none !important;
    }

    #popup-delai {
      border-radius: 6px;
      border: 1px solid #ced4da;
      padding: 0.5rem;
    }

    #popup-delai:focus {
      border-color: #80bdff;
      box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
    }

    /* === Responsive === */
    @media (max-width: 768px) {
      .drag-handle {
        display: none;
      }
      
      .editable-zone {
        margin-left: 0;
      }
      
      .kanban-item {
        cursor: grab;
      }
      
      .kanban-item:active {
        cursor: grabbing;
      }

      .kanban-container.kanban-compact,
      .kanban-container.kanban-detailed {
        grid-template-columns: 1fr;
        height: calc(100vh - 300px);
      }

      /* Mode compact sur mobile : colonnes encore plus étroites */
      .kanban-container.kanban-compact {
        font-size: 0.8rem;
      }
      
      .compact-header {
        flex-direction: column;
        gap: 0.3rem;
        align-items: flex-start;
      }
      
      .compact-echeance {
        text-align: left;
      }

      /* Mode focus sur mobile : navigation horizontale */
      .focus-container {
        flex-direction: column;
        height: calc(100vh - 300px);
      }

      .focus-navigation {
        flex-direction: row;
        width: 100%;
        padding: 0.5rem;
        overflow-x: auto;
        gap: 0.25rem;
      }
      
      .focus-navigation .btn {
        font-size: 0.7rem;
        padding: 0.3rem 0.6rem;
        flex-shrink: 0;
        min-width: auto;
      }

      .focus-column {
        flex: 1;
      }
    }

    /* === Raccourcis clavier === */
    .keyboard-shortcuts {
      position: fixed;
      bottom: 1rem;
      right: 1rem;
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 0.5rem;
      border-radius: 6px;
      font-size: 0.75rem;
      opacity: 0.7;
      pointer-events: none;
    }

    .keyboard-shortcuts div {
      margin: 0.2rem 0;
    }

    .keyboard-shortcuts kbd {
      background: #333;
      padding: 0.1rem 0.3rem;
      border-radius: 3px;
      margin-right: 0.3rem;
    }
  </style>
</head>
<body>
  <div class="container-fluid">
    <!-- Header -->
    <div class="kanban-header">
      <div class="container-fluid">
        <div class="row align-items-center">
          <div class="col">
            <h1 class="h3 mb-0">
              <i class="bi bi-kanban me-2"></i>
              Tableau Kanban SSIR
            </h1>
          </div>
          <div class="col-auto">
            <button type="button" class="btn btn-primary" id="btn-nouvelle-tache" aria-label="Créer une nouvelle tâche">
              <i class="bi bi-plus-lg me-2"></i>Nouvelle Tâche
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Controls -->
    <div class="container-fluid">
      <div class="kanban-controls">
        <div class="row g-3 align-items-center">
          <!-- SPACE RÉSERVÉ POUR LES BOUTONS DE MODE - Sera injecté par JS -->
          <div class="col-md-3">
            <input type="text" class="form-control" id="search-input" placeholder="Rechercher..." aria-label="Rechercher des tâches">
          </div>
          <div class="col-md-2">
            <select class="form-select" id="filter-bureau" aria-label="Filtrer par bureau"></select>
          </div>
          <div class="col-md-2">
            <select class="form-select" id="filter-qui" aria-label="Filtrer par responsable"></select>
          </div>
          <div class="col-md-2">
            <select class="form-select" id="filter-projet" aria-label="Filtrer par projet"></select>
          </div>
          <div class="col-md-2">
            <select class="form-select" id="filter-statut" aria-label="Filtrer par statut"></select>
          </div>
          <div class="col-md-1">
            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="show-termine" checked>
              <label class="form-check-label" for="show-termine">Terminés</label>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Error Container -->
    <div id="error-container" role="alert" aria-live="polite"></div>

    <!-- Loading Spinner -->
    <div class="loading-spinner" id="loading-spinner" style="display:none;">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Chargement...</span>
      </div>
      <p class="mt-2">Chargement du Kanban...</p>
    </div>

    <!-- Kanban Container -->
    <div class="container-fluid">
      <div id="kanban-container" class="kanban-container" role="main" aria-label="Tableau Kanban"></div>
    </div>

    <!-- Keyboard Shortcuts -->
    <div class="keyboard-shortcuts">
      <div><kbd>N</kbd> Nouvelle tâche</div>
      <div><kbd>F</kbd> Focus recherche</div>
      <div><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> Modes de vue</div>
    </div>
  </div>

  <!-- Modal -->
  <div class="modal fade" id="popup-tache" tabindex="-1" aria-labelledby="popup-tache-label" aria-hidden="true">
    <div class="modal-dialog modal-xl modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="popup-tache-label">
            <i class="bi bi-card-checklist me-2"></i>Détails Tâche
          </h5>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Fermer"></button>
        </div>
        <div class="modal-body">
          <form id="task-form" novalidate>
            <div class="row g-3">
              <div class="col-12">
                <label for="popup-titre" class="form-label">Titre *</label>
                <input type="text" class="form-control" id="popup-titre" required>
              </div>
              <div class="col-12">
                <label for="popup-description" class="form-label">Description</label>
                <textarea class="form-control" id="popup-description" rows="3"></textarea>
              </div>
              <div class="col-md-4">
                <label for="popup-statut-text" class="form-label">Statut *</label>
                <input type="text" class="form-control" id="popup-statut-text" readonly required>
              </div>
              <div class="col-md-4">
                <label for="popup-projet" class="form-label">Projet</label>
                <div class="input-group">
                  <select class="form-select" id="popup-projet"></select>
                  <input type="text" class="form-control" id="projet-ajout" placeholder="Ajouter projet">
                  <button class="btn btn-outline-secondary" type="button" id="btn-ajout-projet"><i class="bi bi-plus"></i></button>
                </div>
              </div>
              <div class="col-12">
                <label class="form-label">Stratégie</label>
                <div class="input-group flex-nowrap" style="gap:0.5em;">
                  <select class="form-select" id="strategie-objectif" size="5" style="min-width:260px;"></select>
                  <select class="form-select" id="strategie-sous-objectif" size="5" style="min-width:260px;"></select>
                  <select class="form-select" id="strategie-action" size="5" style="min-width:260px;"></select>
                </div>
              </div>
              <div class="col-md-6">
                <label class="form-label">Urgence & Impact</label>
                <div class="input-group">
                  <select class="form-select" id="popup-urgence">
                    <option value="">-- Urgence --</option>
                  </select>
                  <select class="form-select" id="popup-impact">
                    <option value="">-- Impact --</option>
                  </select>
                </div>
              </div>
              <div class="col-md-6">
                <label class="form-label"><i class="bi bi-calendar-event me-2"></i>Délai / Date butoir</label>
                <div class="input-group">
                  <select class="form-select" id="delai-type" style="max-width: 120px;">
                    <option value="date">Date fixe</option>
                    <option value="semaines">Semaines</option>
                    <option value="mois">Mois</option>
                  </select>
                  <input type="text" class="form-control" id="popup-delai" placeholder="Sélectionner..." aria-label="Délai">
                </div>
              </div>
              <div class="col-md-6">
                <label for="popup-bureau" class="form-label">Bureaux</label>
                <select class="form-select" id="popup-bureau" multiple size="4"></select>
                <div class="form-text">Maintenez Ctrl pour sélectionner plusieurs bureaux</div>
              </div>
              <div class="col-md-6">
                <label for="popup-qui" class="form-label">Responsables</label>
                <select class="form-select" id="popup-qui" multiple size="4"></select>
                <div class="form-text">Maintenez Ctrl pour sélectionner plusieurs responsables</div>
              </div>
              <div class="row mt-3">
                <div class="col-12">
                  <label class="form-label">Affectation</label>
                  <div id="affectation-equipes"></div>
                  <div id="affectation-personnes" class="mt-1"></div>
                </div>
              </div>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <!-- Bouton supprimer à gauche -->
          <button type="button" class="btn btn-danger me-auto" id="btn-delete-task" style="display: none;">
            <i class="bi bi-trash me-2"></i>Supprimer
          </button>
          
          <!-- Boutons de contrôle à droite -->
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
            <i class="bi bi-x-circle me-2"></i>Annuler
          </button>
          <button type="button" class="btn btn-primary" id="btn-save-task">
            <i class="bi bi-check2-circle me-2"></i>Sauvegarder
          </button>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Scripts -->
  <script src="https://docs.getgrist.com/grist-plugin-api.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
  <script src="https://cdn.jsdelivr.net/npm/flatpickr/dist/l10n/fr.js"></script>
  <script src="js.js"></script>
</body>
</html>
