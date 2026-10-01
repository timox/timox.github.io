/* Widget Grist « Qualification VLAN – saisie »
 *
 * À placer sur une page où une liste de la table VLANs pilote la sélection
 * (« Sélectionner par » = la liste). Le widget affiche les critères du VLAN
 * sélectionné, la réponse de l'agent d'extraction et permet de saisir ou corriger.
 *
 * Tables attendues : VLANs, Referentiel, Reponses, Classes_risque (modèle v4).
 * Accès requis : complet (lecture des réponses, écriture de Valeur_humaine / Precision).
 */
(function () {
  "use strict";

  const TABLE = "Reponses";
  const VALEURS = ["Oui", "Non", "N/A"];
  const FILTRES = [
    ["attente", "À renseigner"],
    ["ecarts", "Écarts"],
    ["divergences", "Corrections divergentes"],
    ["tout", "Tout"],
  ];
  const DELAI_SAUVEGARDE = 900;

  const S = {
    vlan: null,          // enregistrement VLAN sélectionné
    criteres: [],        // référentiel trié
    critParId: new Map(),
    classes: new Map(),
    lignes: new Map(),   // id critère -> ligne de réponse
    onglet: "Tout",
    filtre: "attente",
    visibles: null,      // ids critères affichés (figés jusqu'au prochain changement d'onglet / filtre)
    sequence: 0,
  };
  const enAttente = new Map(); // id ligne -> champs à enregistrer
  const enCours = new Map();   // id ligne -> champs en cours d'envoi
  let minuteur = null;

  const app = document.getElementById("app");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const enLignes = (t) => t.id.map((_, i) => Object.fromEntries(Object.keys(t).map((k) => [k, t[k][i]])));
  const dateFr = (s) => {
    if (!s) return "";
    const d = new Date(typeof s === "number" ? s * 1000 : s);
    return d.toLocaleDateString("fr-FR") + " " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  };

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

  async function lireReponses(vlanId) {
    const filtre = encodeURIComponent(JSON.stringify({ VLAN: [vlanId] }));
    const j = await rest("/tables/" + TABLE + "/records?filter=" + filtre);
    return j.records.map((r) => Object.assign({ id: r.id }, r.fields));
  }

  async function chargerReferentiel() {
    if (S.criteres.length) return;
    const ref = enLignes(await grist.docApi.fetchTable("Referentiel"));
    ref.sort((a, b) => (a.Ordre || 0) - (b.Ordre || 0) || String(a.Code).localeCompare(b.Code));
    S.criteres = ref;
    S.critParId = new Map(ref.map((c) => [c.id, c]));
    try {
      enLignes(await grist.docApi.fetchTable("Classes_risque")).forEach((c) => S.classes.set(c.id, c.Classe));
    } catch (e) { /* table facultative */ }
  }

  /* ---------- Logique ---------- */
  const valeurRetenue = (l) => l.Valeur_humaine || l.Valeur_agent || null;

  function statut(l, c) {
    if (c.Type === "Question") return l.Precision ? ["Répondu", "ok"] : ["À renseigner", "attente"];
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

  function fusionner(lignes) {
    S.lignes = new Map();
    lignes.forEach((l) => {
      Object.assign(l, enCours.get(l.id) || {}, enAttente.get(l.id) || {});
      if (l.Critere) S.lignes.set(l.Critere, l);
    });
  }

  async function chargerReponses() {
    const vlanId = S.vlan.id;
    let lignes = await lireReponses(vlanId);
    const presents = new Set(lignes.map((l) => l.Critere));
    const manquants = S.criteres.filter((c) => !presents.has(c.id));
    if (manquants.length) {
      await grist.docApi.applyUserActions([["BulkAddRecord", TABLE, manquants.map(() => null),
        { VLAN: manquants.map(() => vlanId), Critere: manquants.map((c) => c.id) }]]);
      lignes = await lireReponses(vlanId);
    }
    if (S.vlan && S.vlan.id === vlanId) fusionner(lignes);
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
    enAttente.set(l.id, Object.assign(enAttente.get(l.id) || {}, champs));
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
    lot.forEach(([id, f]) => enCours.set(id, Object.assign(enCours.get(id) || {}, f)));
    etat("Enregistrement…");
    try {
      await grist.docApi.applyUserActions(lot.map(([id, f]) => ["UpdateRecord", TABLE, id, f]));
      lot.forEach(([id]) => enCours.delete(id));
      etat("Enregistré à " + new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
    } catch (e) {
      lot.forEach(([id, f]) => { enCours.delete(id); enAttente.set(id, Object.assign(f, enAttente.get(id) || {})); });
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
    const classe = S.classes.get(v.Classe_risque);
    const alertes = [v.Controle_tier, v.Controle_CIDR].filter(Boolean);
    return `
      <div class="entete">
        <h1>${esc(v.Libelle || ("VLAN " + v.VLAN_ID))}</h1>
        ${v.Tiers ? `<span class="puce">Tier ${esc(v.Tiers)}</span>` : `<span class="puce">Tier non renseigné</span>`}
        <span class="puce">${classe ? "Classe " + esc(classe) : "Non classé"}</span>
        <span class="puce ${classeVerdict(v.Verdict)}" id="verdict">${esc(v.Verdict || "")}</span>
        <span class="etat" id="etat"></span>
      </div>
      <p class="motif" id="motif">${esc(v.Motif || "")}</p>
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
          ${FILTRES.map(([k, lib]) => `<label><input type="radio" name="filtre" value="${k}" ${k === S.filtre ? "checked" : ""}> ${lib}</label>`).join("")}
        </div>
      </div>`;
  }

  function htmlAgent(l) {
    if (!l.Valeur_agent && !l.Preuve_agent) return "";
    const preuve = l.Preuve_agent || "";
    const court = preuve.length > 220 ? preuve.slice(0, 220) + "…" : preuve;
    return `<div class="agent">Agent : <span class="val">${esc(l.Valeur_agent || "indéterminé")}</span>
      ${preuve ? ` — <span class="preuve" data-complet="${esc(preuve)}">${esc(court)}</span>${preuve.length > 220 ? `<button type="button" data-action="plus">voir tout</button>` : ""}` : ""}
      ${l.Date_agent ? `<span class="preuve"> (collecte du ${esc(dateFr(l.Date_agent).split(" ")[0])})</span>` : ""}</div>`;
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
      ${c.Aide ? `<p class="aide">${esc(c.Aide)}</p>` : ""}`;
    if (c.Type === "Question") {
      return `<section class="carte question s-${cls}" data-crit="${c.id}">${tete}
        <textarea data-champ="Precision" rows="2" placeholder="Votre réponse">${esc(l.Precision || "")}</textarea>
        <div class="trace" data-trace></div></section>`;
    }
    return `<section class="carte s-${cls}" data-crit="${c.id}">${tete}
      ${htmlAgent(l)}
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
    carte.querySelectorAll(".choix button").forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.v === l.Valeur_humaine));
      b.classList.toggle("agent-val", !l.Valeur_humaine && b.dataset.v === l.Valeur_agent);
      b.title = b.dataset.v === l.Valeur_agent ? "Valeur relevée par l'agent" : "";
    });
    const annuler = carte.querySelector("[data-action=annuler]");
    annuler.hidden = !l.Valeur_humaine;
    annuler.textContent = l.Valeur_agent ? "Revenir à la valeur de l'agent (" + l.Valeur_agent + ")" : "Effacer ma réponse";
    const div = carte.querySelector("[data-divergence]");
    const diverge = l.Valeur_humaine && l.Valeur_agent && l.Valeur_humaine !== l.Valeur_agent;
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
    if (!e) return rendre();
    e.textContent = S.vlan.Verdict || "";
    e.className = "puce " + classeVerdict(S.vlan.Verdict);
    document.getElementById("motif").textContent = S.vlan.Motif || "";
    S.criteres.forEach((c) => majCarte(c.id));
    majCompteurs();
  }

  /* ---------- Événements ---------- */
  app.addEventListener("click", (ev) => {
    const onglet = ev.target.closest("[data-onglet]");
    if (onglet) { S.onglet = onglet.dataset.onglet; S.visibles = null; rendre(); return; }
    const carte = ev.target.closest(".carte");
    if (!carte) return;
    const critId = Number(carte.dataset.crit);
    const bouton = ev.target.closest(".choix button");
    if (bouton) {
      const l = S.lignes.get(critId);
      if (l && l.Valeur_humaine !== bouton.dataset.v) modifier(critId, { Valeur_humaine: bouton.dataset.v }, true);
      return;
    }
    const action = ev.target.closest("[data-action]");
    if (action && action.dataset.action === "annuler") modifier(critId, { Valeur_humaine: null }, true);
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
      if (nouveau) { S.visibles = null; S.lignes = new Map(); app.innerHTML = `<p class="vide">Chargement de ${esc(rec.Libelle || "")}…</p>`; }
      await chargerReponses();
      if (seq !== S.sequence) return;
      nouveau ? rendre() : rafraichir();
    } catch (e) {
      app.innerHTML = `<p class="vide">Erreur : ${esc(e.message || e)}. Vérifiez que le widget a l'accès complet au document et que les tables VLANs, Referentiel et Reponses existent.</p>`;
    }
  }

  grist.ready({ requiredAccess: "full", allowSelectBy: false });
  grist.onRecord((rec) => surVlan(rec));
  grist.onNewRecord(() => surVlan(null));
  rendre();
})();
