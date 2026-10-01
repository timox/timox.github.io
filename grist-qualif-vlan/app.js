/* Widget Grist « Qualification VLAN – saisie »
 *
 * À placer sur une page où une liste de la table VLANs pilote la sélection
 * (« Sélectionner par » = la liste). Deux modes :
 *  - Site   : critères du VLAN sélectionné (table Reponses), avec la mesure de l'agent
 *             et la réponse héritée du profil ; la saisie prime sur les deux.
 *  - Profil : réponses communes à tous les sites du même numéro de VLAN (table Reponses_profil).
 *
 * Tables attendues (modèle v4) : VLANs, Referentiel, Reponses ; facultatives : Profils,
 * Reponses_profil, Classes_risque. Accès requis : complet.
 */
(function () {
  "use strict";

  const VALEURS = ["Oui", "Non", "N/A"];
  const MODES = {
    site: { table: "Reponses", cle: "VLAN", champ: "Valeur_humaine" },
    profil: { table: "Reponses_profil", cle: "Profil", champ: "Valeur" },
  };
  const FILTRES = {
    site: [["attente", "À renseigner"], ["ecarts", "Écarts"], ["divergences", "Corrections divergentes"], ["tout", "Tout"]],
    profil: [["attente", "À renseigner"], ["ecarts", "Écarts"], ["tout", "Tout"]],
  };
  const DELAI_SAUVEGARDE = 900;

  const S = {
    mode: "site",
    vlan: null,          // enregistrement VLAN sélectionné
    profil: null,        // profil du VLAN sélectionné (Profils)
    criteres: [],
    critParId: new Map(),
    classes: new Map(),
    profils: new Map(),
    avecProfils: false,
    lignes: new Map(),   // id critère -> ligne (Reponses ou Reponses_profil selon le mode)
    onglet: "Tout",
    filtre: "attente",
    visibles: null,
    sequence: 0,
  };
  const enAttente = new Map(); // "table:id" -> champs à enregistrer
  const enCours = new Map();
  let minuteur = null;

  const app = document.getElementById("app");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const enLignes = (t) => t.id.map((_, i) => Object.fromEntries(Object.keys(t).map((k) => [k, t[k][i]])));
  const dateFr = (s) => {
    if (!s) return "";
    const d = new Date(typeof s === "number" ? s * 1000 : s);
    return d.toLocaleDateString("fr-FR") + " " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  };
  const cfg = () => MODES[S.mode];
  const cibleId = () => (S.mode === "profil" ? (S.profil && S.profil.id) : (S.vlan && S.vlan.id));

  /* ---------- Accès aux données ---------- */
  let jeton = null;
  async function rest(chemin) {
    if (!jeton || Date.now() > jeton.fin) {
      const t = await grist.docApi.getAccessToken({ readOnly: true });
      jeton = Object.assign({}, t, { fin: Date.now() + (t.ttlMsecs || 300000) - 15000 });
    }
    const sep = chemin.includes("?") ? "&" : "?";
    const r = await fetch(jeton.baseUrl + chemin + sep + "auth=" + encodeURIComponent(jeton.token));
    if (!r.ok) throw new Error("lecture impossible (HTTP " + r.status + ")");
    return r.json();
  }

  async function lire(table, cle, id) {
    const filtre = encodeURIComponent(JSON.stringify({ [cle]: [id] }));
    const j = await rest("/tables/" + table + "/records?filter=" + filtre);
    return j.records.map((r) => Object.assign({ id: r.id }, r.fields));
  }

  async function chargerReferentiel() {
    if (S.criteres.length) return;
    const tables = await grist.docApi.listTables();
    const manquantes = ["VLANs", "Referentiel", "Reponses"].filter((t) => !tables.includes(t));
    if (manquantes.length) {
      throw new Error("ce document n'a pas le modèle v4 (table" + (manquantes.length > 1 ? "s " : " ") + manquantes.join(", ") +
        " absente" + (manquantes.length > 1 ? "s" : "") + "). Le widget s'utilise sur un document construit ou migré en v4");
    }
    S.avecProfils = tables.includes("Profils") && tables.includes("Reponses_profil");
    const ref = enLignes(await grist.docApi.fetchTable("Referentiel"));
    ref.sort((a, b) => (a.Ordre || 0) - (b.Ordre || 0) || String(a.Code).localeCompare(b.Code));
    S.criteres = ref;
    S.critParId = new Map(ref.map((c) => [c.id, c]));
    if (tables.includes("Classes_risque")) enLignes(await grist.docApi.fetchTable("Classes_risque")).forEach((c) => S.classes.set(c.id, c.Classe));
    if (S.avecProfils) await chargerProfils();
  }

  async function chargerProfils() {
    S.profils = new Map(enLignes(await grist.docApi.fetchTable("Profils")).map((p) => [p.id, p]));
  }

  /* ---------- Logique ---------- */
  const saisie = (l) => l[cfg().champ] || null;
  const valeurRetenue = (l) => (S.mode === "profil" ? l.Valeur : (l.Valeur_humaine || l.Valeur_agent || l.Valeur_profil)) || null;
  const valeurHeritee = (l) => (S.mode === "profil" ? null : (l.Valeur_agent ? ["agent", l.Valeur_agent] : (l.Valeur_profil ? ["profil", l.Valeur_profil] : null)));

  function statut(l, c) {
    if (c.Type === "Question") return (l.Precision || (S.mode === "site" && l.Precision_profil)) ? ["Répondu", "ok"] : ["À renseigner", "attente"];
    const v = valeurRetenue(l);
    if (!v) return ["À renseigner", "attente"];
    if (v === "Non") return [c.Bloquant ? "Écart bloquant" : "Écart", "ecart"];
    return v === "Oui" ? ["Conforme", "ok"] : ["N/A", "na"];
  }

  function correspond(c, filtre) {
    const l = S.lignes.get(c.id) || {};
    const [, cls] = statut(l, c);
    if (filtre === "attente") return cls === "attente";
    if (filtre === "ecarts") return cls === "ecart";
    if (filtre === "divergences") return !!(l.Valeur_humaine && l.Valeur_agent && l.Valeur_humaine !== l.Valeur_agent);
    return true;
  }

  function themes() {
    const t = [];
    S.criteres.forEach((c) => { if (!t.includes(c.Theme)) t.push(c.Theme); });
    return t;
  }

  async function chargerLignes() {
    const { table, cle } = cfg();
    const id = cibleId();
    if (!id) { S.lignes = new Map(); return; }
    let lignes = await lire(table, cle, id);
    const presents = new Set(lignes.map((l) => l.Critere));
    const manquants = S.criteres.filter((c) => !presents.has(c.id));
    if (manquants.length) {
      await grist.docApi.applyUserActions([["BulkAddRecord", table, manquants.map(() => null),
        { [cle]: manquants.map(() => id), Critere: manquants.map((c) => c.id) }]]);
      lignes = await lire(table, cle, id);
    }
    if (cibleId() !== id || cfg().table !== table) return;
    S.lignes = new Map();
    lignes.forEach((l) => {
      Object.assign(l, enCours.get(table + ":" + l.id) || {}, enAttente.get(table + ":" + l.id) || {});
      if (l.Critere) S.lignes.set(l.Critere, l);
    });
  }

  /* ---------- Enregistrement ---------- */
  function etat(texte, erreur) {
    const el = document.getElementById("etat");
    if (el) { el.textContent = texte; el.classList.toggle("erreur", !!erreur); }
  }

  function modifier(critId, champs, immediat) {
    const l = S.lignes.get(critId);
    if (!l) return;
    Object.assign(l, champs);
    const k = cfg().table + ":" + l.id;
    enAttente.set(k, Object.assign(enAttente.get(k) || {}, champs));
    majCarte(critId);
    majCompteurs();
    etat("Modifications non enregistrées…");
    clearTimeout(minuteur);
    minuteur = setTimeout(enregistrer, immediat ? 0 : DELAI_SAUVEGARDE);
  }

  async function enregistrer() {
    if (!enAttente.size) return;
    const lot = [...enAttente.entries()];
    enAttente.clear();
    lot.forEach(([k, f]) => enCours.set(k, Object.assign(enCours.get(k) || {}, f)));
    etat("Enregistrement…");
    try {
      await grist.docApi.applyUserActions(lot.map(([k, f]) => {
        const [table, id] = k.split(":");
        return ["UpdateRecord", table, Number(id), f];
      }));
      lot.forEach(([k]) => enCours.delete(k));
      etat("Enregistré à " + new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
    } catch (e) {
      lot.forEach(([k, f]) => { enCours.delete(k); enAttente.set(k, Object.assign(f, enAttente.get(k) || {})); });
      etat("Échec de l'enregistrement : " + (e.message || e) + " — nouvel essai dans 5 s", true);
      clearTimeout(minuteur);
      minuteur = setTimeout(enregistrer, 5000);
    }
  }
  window.addEventListener("beforeunload", () => { if (enAttente.size) enregistrer(); });

  /* ---------- Affichage ---------- */
  function classeVerdict(v) {
    return { "Qualifié": "v-qualifie", "Qualifié sous réserve": "v-reserve", "Non qualifié": "v-non" }[v] || "";
  }

  function htmlEntete() {
    const v = S.vlan;
    const p = S.profil;
    if (S.mode === "profil") {
      return `
        <div class="entete">
          <h1>Profil ${esc(p.Libelle || p.VLAN_ID)}</h1>
          <span class="puce">${esc(p.Nb_sites || 0)} site${p.Nb_sites > 1 ? "s" : ""}</span>
          ${p.Tiers ? `<span class="puce">Tier ${esc(p.Tiers)}</span>` : ""}
          <span class="etat" id="etat"></span>
        </div>
        <p class="bandeau-profil">Réponses communes à tous les sites du VLAN ${esc(p.VLAN_ID)}. Sur un site, une réponse saisie localement ou mesurée par l'agent prime sur le profil.
          <button type="button" class="lien" data-action="site">← Revenir au site ${esc(v.Sites || "")}</button></p>`;
    }
    const classe = S.classes.get(v.Classe_risque);
    const alertes = [v.Controle_tier, v.Controle_CIDR, v.Heterogeneite].filter(Boolean);
    return `
      <div class="entete">
        <h1>${esc(v.Libelle || ("VLAN " + v.VLAN_ID))}</h1>
        ${v.Tiers ? `<span class="puce">Tier ${esc(v.Tiers)}</span>` : `<span class="puce">Tier non renseigné</span>`}
        <span class="puce">${classe ? "Classe " + esc(classe) : "Non classé"}</span>
        <span class="puce ${classeVerdict(v.Verdict)}" id="verdict">${esc(v.Verdict || "")}</span>
        <span class="etat" id="etat"></span>
      </div>
      <p class="motif" id="motif">${esc(v.Motif || "")}</p>
      ${p ? `<p class="bandeau-profil">Profil ${esc(p.Libelle)} · ${esc(p.Nb_sites || 0)} site${p.Nb_sites > 1 ? "s" : ""}
        <button type="button" class="lien" data-action="profil">Modifier les réponses communes du profil →</button></p>` : ""}
      ${alertes.map((a) => `<p class="alerte">⚠ ${esc(a)}</p>`).join("")}`;
  }

  function htmlBarre() {
    const onglets = ["Tout"].concat(themes());
    return `
      <div class="barre">
        <div class="onglets" role="tablist">
          ${onglets.map((t) => `<button class="onglet" role="tab" data-onglet="${esc(t)}" aria-selected="${t === S.onglet}">${esc(t)}<span class="n" data-n="${esc(t)}"></span></button>`).join("")}
        </div>
        <div class="filtres" role="radiogroup" aria-label="Afficher">
          ${FILTRES[S.mode].map(([k, lib]) => `<label><input type="radio" name="filtre" value="${k}" ${k === S.filtre ? "checked" : ""}> ${lib}</label>`).join("")}
        </div>
      </div>`;
  }

  function htmlSources(l) {
    if (S.mode === "profil") return "";
    let h = "";
    if (l.Valeur_agent || l.Preuve_agent) {
      const preuve = l.Preuve_agent || "";
      const court = preuve.length > 220 ? preuve.slice(0, 220) + "…" : preuve;
      h += `<div class="agent">Agent : <span class="val">${esc(l.Valeur_agent || "indéterminé")}</span>
        ${preuve ? ` — <span class="preuve" data-complet="${esc(preuve)}">${esc(court)}</span>${preuve.length > 220 ? `<button type="button" data-action="plus">voir tout</button>` : ""}` : ""}
        ${l.Date_agent ? `<span class="preuve"> (collecte du ${esc(dateFr(l.Date_agent).split(" ")[0])})</span>` : ""}</div>`;
    }
    if (l.Valeur_profil || l.Precision_profil) {
      h += `<div class="agent profil">Profil : <span class="val">${esc(l.Valeur_profil || "—")}</span>
        ${l.Precision_profil ? ` — <span class="preuve">${esc(l.Precision_profil)}</span>` : ""}</div>`;
    }
    return h;
  }

  function htmlCarte(c) {
    const l = S.lignes.get(c.id) || {};
    const [lib, cls] = statut(l, c);
    const tete = `
      <div class="titre">
        <span class="code">${esc(c.Code)}</span>
        ${c.Bloquant ? `<span class="b" title="Critère bloquant">B</span>` : ""}
        <span class="libelle">${esc(c.Libelle)}</span>
        <span class="statut s-${cls}" data-statut>${esc(lib)}</span>
      </div>
      ${c.Aide ? `<p class="aide">${esc(c.Aide)}</p>` : ""}
      ${S.mode === "profil" && c.Agent ? `<p class="aide">ⓘ Mesuré par l'agent sur chaque site : la réponse du profil ne s'applique que là où l'agent n'a rien relevé.</p>` : ""}`;
    if (c.Type === "Question") {
      return `<section class="carte question s-${cls}" data-crit="${c.id}">${tete}
        ${S.mode === "site" && l.Precision_profil ? `<div class="agent profil">Profil : <span class="preuve">${esc(l.Precision_profil)}</span></div>` : ""}
        <textarea data-champ="Precision" rows="2" placeholder="${S.mode === "site" && l.Precision_profil ? "Réponse propre à ce site (sinon celle du profil s'applique)" : "Votre réponse"}">${esc(l.Precision || "")}</textarea>
        <div class="trace" data-trace></div></section>`;
    }
    return `<section class="carte s-${cls}" data-crit="${c.id}">${tete}
      ${htmlSources(l)}
      <div class="saisie">
        <div>
          <div class="choix" role="group" aria-label="Réponse pour ${esc(c.Code)}">
            ${VALEURS.map((v) => `<button type="button" data-v="${v}">${v}</button>`).join("")}
          </div>
          <button type="button" class="annuler" data-action="annuler" hidden></button>
        </div>
        <textarea data-champ="Precision" rows="1" placeholder="${c.Bloquant ? "Justification (recommandée pour un critère bloquant)" : "Précision, preuve ou référence"}">${esc(l.Precision || "")}</textarea>
        <div class="divergence" data-divergence hidden></div>
        <div class="trace" data-trace></div>
      </div></section>`;
  }

  function majCarte(critId) {
    const carte = app.querySelector(`.carte[data-crit="${critId}"]`);
    const c = S.critParId.get(critId);
    const l = S.lignes.get(critId);
    if (!carte || !c || !l) return;
    const [lib, cls] = statut(l, c);
    carte.className = carte.className.replace(/\bs-\w+/g, "").trim() + " s-" + cls;
    const st = carte.querySelector("[data-statut]");
    st.textContent = lib;
    st.className = "statut s-" + cls;
    const zone = carte.querySelector("textarea");
    if (zone && document.activeElement !== zone && zone.value !== (l.Precision || "")) zone.value = l.Precision || "";
    const trace = carte.querySelector("[data-trace]");
    if (trace) trace.textContent = l.Auteur ? `Saisi par ${l.Auteur}${l.Date_saisie ? " le " + dateFr(l.Date_saisie) : ""}` : "";
    if (c.Type === "Question") return;
    const propre = saisie(l);
    const herite = valeurHeritee(l);
    carte.querySelectorAll(".choix button").forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.v === propre));
      b.classList.toggle("agent-val", !propre && !!herite && b.dataset.v === herite[1]);
      b.title = herite && b.dataset.v === herite[1] ? (herite[0] === "agent" ? "Valeur relevée par l'agent" : "Valeur du profil") : "";
    });
    const annuler = carte.querySelector("[data-action=annuler]");
    annuler.hidden = !propre;
    annuler.textContent = S.mode === "site" && herite
      ? (herite[0] === "agent" ? "Revenir à la valeur de l'agent (" : "Revenir à la valeur du profil (") + herite[1] + ")"
      : "Effacer ma réponse";
    const div = carte.querySelector("[data-divergence]");
    const diverge = S.mode === "site" && l.Valeur_humaine && l.Valeur_agent && l.Valeur_humaine !== l.Valeur_agent;
    div.hidden = !diverge;
    div.textContent = diverge ? `⚠ L'agent relève « ${l.Valeur_agent} » : justifiez la correction.` : "";
  }

  function majCompteurs() {
    const parTheme = {};
    let total = 0;
    S.criteres.forEach((c) => {
      if (c.Type !== "Question" && statut(S.lignes.get(c.id) || {}, c)[1] === "attente") { parTheme[c.Theme] = (parTheme[c.Theme] || 0) + 1; total++; }
    });
    app.querySelectorAll("[data-n]").forEach((el) => {
      const n = el.dataset.n === "Tout" ? total : (parTheme[el.dataset.n] || 0);
      el.textContent = n || "";
      el.hidden = !n;
    });
  }

  function rendre() {
    if (!S.vlan) { app.innerHTML = `<p class="vide">Sélectionnez un VLAN dans la liste.</p>`; return; }
    const dansOnglet = S.criteres.filter((c) => S.onglet === "Tout" || c.Theme === S.onglet);
    if (!S.visibles) S.visibles = new Set(dansOnglet.filter((c) => correspond(c, S.filtre)).map((c) => c.id));
    const affiches = dansOnglet.filter((c) => S.visibles.has(c.id));
    let corps = "";
    let themeCourant = null;
    affiches.forEach((c) => {
      if (S.onglet === "Tout" && c.Theme !== themeCourant) { themeCourant = c.Theme; corps += `<h2 class="theme">${esc(c.Theme)}</h2>`; }
      corps += htmlCarte(c);
    });
    if (!affiches.length) {
      corps = `<p class="vide">${S.filtre === "attente" ? "Rien à renseigner ici." : "Aucun critère ne correspond à ce filtre."}</p>`;
    }
    app.innerHTML = htmlEntete() + htmlBarre() + corps;
    affiches.forEach((c) => majCarte(c.id));
    majCompteurs();
  }

  function rafraichir() {
    const e = document.getElementById("verdict");
    if (e) {
      e.textContent = S.vlan.Verdict || "";
      e.className = "puce " + classeVerdict(S.vlan.Verdict);
      document.getElementById("motif").textContent = S.vlan.Motif || "";
    }
    S.criteres.forEach((c) => majCarte(c.id));
    majCompteurs();
  }

  async function changerMode(mode) {
    if (mode === S.mode) return;
    if (enAttente.size) { clearTimeout(minuteur); await enregistrer(); }
    S.mode = mode;
    S.visibles = null;
    if (!FILTRES[mode].some(([k]) => k === S.filtre)) S.filtre = "attente";
    app.innerHTML = `<p class="vide">Chargement…</p>`;
    if (mode === "profil") await chargerProfils();
    S.profil = S.vlan && S.profils.get(S.vlan.Profil) || null;
    await chargerLignes();
    rendre();
  }

  /* ---------- Événements ---------- */
  app.addEventListener("click", (ev) => {
    const onglet = ev.target.closest("[data-onglet]");
    if (onglet) { S.onglet = onglet.dataset.onglet; S.visibles = null; rendre(); return; }
    const action = ev.target.closest("[data-action]");
    if (action && (action.dataset.action === "profil" || action.dataset.action === "site")) { changerMode(action.dataset.action); return; }
    const carte = ev.target.closest(".carte");
    if (!carte) return;
    const critId = Number(carte.dataset.crit);
    const bouton = ev.target.closest(".choix button");
    if (bouton) {
      const l = S.lignes.get(critId);
      if (l && saisie(l) !== bouton.dataset.v) modifier(critId, { [cfg().champ]: bouton.dataset.v }, true);
      return;
    }
    if (action && action.dataset.action === "annuler") modifier(critId, { [cfg().champ]: null }, true);
    if (action && action.dataset.action === "plus") {
      const p = action.previousElementSibling;
      p.textContent = p.dataset.complet;
      action.remove();
    }
  });
  app.addEventListener("change", (ev) => {
    if (ev.target.name === "filtre") { S.filtre = ev.target.value; S.visibles = null; rendre(); }
  });
  app.addEventListener("input", (ev) => {
    const zone = ev.target.closest("textarea[data-champ]");
    if (!zone) return;
    modifier(Number(zone.closest(".carte").dataset.crit), { Precision: zone.value }, false);
  });
  app.addEventListener("focusout", (ev) => {
    if (ev.target.matches("textarea[data-champ]") && enAttente.size) { clearTimeout(minuteur); enregistrer(); }
  });

  /* ---------- Grist ---------- */
  async function surVlan(rec) {
    const seq = ++S.sequence;
    try {
      await chargerReferentiel();
      const nouveau = !S.vlan || !rec || S.vlan.id !== rec.id;
      if (nouveau && enAttente.size) { clearTimeout(minuteur); await enregistrer(); }
      S.vlan = rec || null;
      if (!rec) return rendre();
      if (nouveau) {
        S.mode = "site";
        S.visibles = null;
        S.lignes = new Map();
        app.innerHTML = `<p class="vide">Chargement de ${esc(rec.Libelle || "")}…</p>`;
      }
      S.profil = S.avecProfils ? (S.profils.get(rec.Profil) || null) : null;
      await chargerLignes();
      if (seq !== S.sequence) return;
      nouveau ? rendre() : rafraichir();
    } catch (e) {
      app.innerHTML = `<p class="vide">Le widget ne peut pas s'afficher : ${esc(e.message || e)}.</p>`;
    }
  }

  grist.ready({ requiredAccess: "full", allowSelectBy: false });
  grist.onRecord((rec) => surVlan(rec));
  grist.onNewRecord(() => surVlan(null));
  rendre();
})();
