/**
 * «Προφίλ ιδανικής συντρόφου» — presentation only (no inference here).
 * Input: the object returned by ProfileEngine.buildProfile + the question bank.
 * Every line prints its evidence IDs; hovering an ID shows the question and the chosen option.
 * Ethics (AGENTS.md): no success prediction, no photo inference, no percentages.
 */

const pvEsc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const CHOICE_LABEL = { A: 'A', B: 'B', BOTH: 'και τα δύο', NEITHER: 'κανένα', UNSURE: 'δεν ξέρω', SKIP: 'παράλειψη' };
const TIER = {
  essential: ['Ουσιώδη', 'Όλα τα διαθέσιμα σήματα δείχνουν ότι μετράει πολύ.'],
  conflicting: ['Αντικρουόμενα σήματα', 'Κάποιες πηγές λένε «πολύ σημαντικό», άλλες όχι.'],
  neutral: ['Ουδέτερα', 'Ούτε ψηλά ούτε χαμηλά.'],
  secondary: ['Δευτερεύοντα', 'Τα σήματα δείχνουν ότι υποχωρεί όταν χρειάζεται.'],
};
const STRENGTH = { 'single-source': 'μία πηγή', convergent: 'συγκλίνουσες πηγές', conflicting: 'αντικρουόμενες πηγές' };
const STATUS = { consistent: 'συνεπές', tentative: 'πρώιμη ένδειξη', single: 'μία μόνο απάντηση', mixed: 'μικτό', flexible: 'ευέλικτο', none: 'χωρίς απαντήσεις' };
const ISM_ORDER = ['WT', 'VA', 'FIT', 'SR'];

function evidenceChips(ids, ctx, extra = {}) {
  if (!ids || !ids.length) return '';
  return '<span class="pf-ev">' + ids.map(id => {
    const q = ctx.q.get(id), a = ctx.answers?.[id];
    let title = id;
    if (q) title = `${q.prompt} — ${a ? (a === 'A' ? q.A : a === 'B' ? q.B : CHOICE_LABEL[a]) : 'χωρίς απάντηση'}`;
    else if (id.startsWith('IMP:')) title = 'Δηλωμένη σημαντικότητα (0–5)';
    else if (id.startsWith('MW-')) title = 'Κάρτα Best–Worst (MaxDiff)';
    const mark = (a ? '·' + (CHOICE_LABEL[a] || a) : '') + (extra.ambiguous?.has(id) ? ' ≈' : '');
    return `<code class="pf-id" title="${pvEsc(title)}">${pvEsc(id)}${pvEsc(mark)}</code>`;
  }).join(' ') + '</span>';
}

function facetLine(f, ctx) {
  const parts = [];
  for (const s of f.signals) {
    if (s.source === 'importance') parts.push(`Δήλωσες σημαντικότητα <strong>${s.value}/5</strong> ${evidenceChips(s.evidence, ctx)}`);
    if (s.source === 'maxdiff') parts.push(`Best–Worst: πιο σημαντικό ${s.best}, λιγότερο ${s.worst} σε ${s.seen} κάρτες ${evidenceChips(s.evidence, ctx)}`);
    if (s.source === 'dilemmas') parts.push(`Διλήμματα: κράτησες ${s.wins} από ${s.wins + s.losses} ${evidenceChips(s.evidence, ctx)}`);
  }
  return `<div class="pf-row"><div><strong>${pvEsc(f.label)}</strong> ${f.ism ? `<span class="tag">${pvEsc(f.ism)}</span>` : ''} <small class="muted">${pvEsc(STRENGTH[f.strength] || '')}</small></div><div class="pf-why">${parts.join('<br>')}</div></div>`;
}

function axisLine(a, ctx) {
  const pole = a.direction === 'high' ? a.high : a.direction === 'low' ? a.low : null;
  const head = a.status === 'mixed'
    ? `μικτό: ${a.evidence.filter(e => e.toward === 'low').length} προς «${pvEsc(a.low)}», ${a.evidence.filter(e => e.toward === 'high').length} προς «${pvEsc(a.high)}»`
    : pole ? `προς <strong>«${pvEsc(pole)}»</strong>` : `ισορροπημένο ανάμεσα σε «${pvEsc(a.low)}» και «${pvEsc(a.high)}»`;
  const counted = a.status === 'mixed' || a.status === 'flexible' ? '' : ` · ${a.agreeing} από ${a.clear} καθαρές απαντήσεις${a.flexible ? `, ${a.flexible} «και τα δύο»` : ''}`;
  const amb = new Set(a.evidence.filter(e => e.ambiguous).map(e => e.id));
  return `<div class="pf-row"><div><strong>${pvEsc(a.label)}</strong>: ${head}</div><div class="pf-why"><small class="muted">${pvEsc(STATUS[a.status])}${counted}</small> ${evidenceChips(a.evidenceIds, ctx, { ambiguous: amb })}</div></div>`;
}

function contradictionText(c, ctx) {
  const d = c.detail || {};
  switch (c.type) {
    case 'importance-vs-sacrifice': return `<strong>${pvEsc(c.label)}</strong>: δήλωσες ${d.importance}/5, αλλά στα διλήμματα το θυσίασες ${d.losses} από ${d.wins + d.losses} φορές.`;
    case 'low-importance-but-chosen': return `<strong>${pvEsc(c.label)}</strong>: δήλωσες μόνο ${d.importance}/5, αλλά στα διλήμματα το κράτησες ${d.wins} από ${d.wins + d.losses} φορές.`;
    case 'importance-vs-maxdiff': return `<strong>${pvEsc(c.label)}</strong>: δήλωσες ${d.importance}/5, ενώ στο Best–Worst ήταν πιο σημαντικό ${d.best} και λιγότερο ${d.worst} φορές σε ${d.seen} κάρτες.`;
    case 'global-vs-detail': return `<strong>${pvEsc(c.label)}</strong>: η γενική απάντηση δείχνει «${pvEsc(d.global === 'high' ? d.high : d.low)}», οι αναλυτικές προς «${pvEsc(d.details === 'high' ? d.high : d.low)}».`;
    case 'dilemma-vs-style': return `<strong>${pvEsc(c.label)}</strong>: στις απαντήσεις σου γέρνεις προς «${pvEsc(d.stated === 'high' ? d.high : d.low)}», αλλά στο ${pvEsc(c.dilemma)} διάλεξες «${pvEsc(d.chosen === 'high' ? d.high : d.low)}» όταν έπρεπε να θυσιάσεις κάτι.`;
    case 'mixed-axis': return `<strong>${pvEsc(c.label)}</strong>: απάντησες και προς «${pvEsc(d.low)}» και προς «${pvEsc(d.high)}». Ίσως εξαρτάται από το πλαίσιο.`;
    default: return pvEsc(c.type);
  }
}

function unexploredText(u) {
  const list = xs => xs.map(pvEsc).join(', ');
  switch (u.type) {
    case 'importance-missing': return `Δεν έχεις δηλώσει σημαντικότητα για: ${list(u.labels)}.`;
    case 'domain-thin': return `<strong>${pvEsc(u.label)}</strong>: ${u.clear} καθαρές απαντήσεις από ${u.total}.`;
    case 'uncertain': return `<strong>${pvEsc(u.label)}</strong>: αρκετά «δεν ξέρω». Ίσως θέλει σκέψη ή βίωμα.`;
    case 'rejected-both': return 'Απέρριψες και τις δύο εκδοχές. Ίσως λείπει μια τρίτη επιλογή που σε εκφράζει:';
    case 'axes-thin': return `Άξονες με καμία ή μία απάντηση: ${list(u.axes.map(a => a.label))}.`;
    case 'maxdiff-thin': return `Χαρακτηριστικά με λιγότερες από 2 κάρτες Best–Worst: ${list(u.labels)}.`;
    case 'dilemmas-open': return 'Διλήμματα που δεν έχουν απαντηθεί (ή έμειναν «δεν ξέρω» / παράλειψη):';
    case 'no-dilemma-content': return `Δεν υπάρχει ακόμη δίλημμα που να βάζει σε δοκιμασία: ${list(u.labels)}.`;
    case 'ism-unmeasured': return `Η διάσταση «${pvEsc(u.label)}» του Ideal Standards Model δεν μετριέται ακόμη.`;
    default: return pvEsc(u.type);
  }
}

export function renderProfileSection(profile, bank) {
  const ctx = { q: new Map(bank.questions.map(q => [q.id, q])), answers: profile.answersById || {} };
  const head = `<h3>Προφίλ ιδανικής συντρόφου</h3><p class="note">Περιγράφει τι λένε οι <em>δικές σου</em> απαντήσεις μέχρι τώρα. Δεν προβλέπει αν μια σχέση θα πετύχει και δεν συμπεραίνει τίποτα από φωτογραφίες. Κάθε γραμμή δείχνει τα τεκμήριά της. Πέρνα το ποντίκι πάνω από ένα ID για να δεις την ερώτηση.</p>`;
  if (profile.empty) return `<section class="result-card pf" id="ideal-profile">${head}<div class="empty">Δεν υπάρχουν ακόμη απαντήσεις. Το προφίλ θα χτιστεί σταδιακά από τις ερωτήσεις, τη σημαντικότητα, τα Best–Worst και τα διλήμματα.</div></section>`;
  const c = profile.counts;
  const countLine = `<p class="note pf-counts">Απαντήσεις ${profile.answered}/${profile.totalQuestions} · A/B ${c.A + c.B} · «και τα δύο» ${c.BOTH} · «κανένα» ${c.NEITHER} · «δεν ξέρω» ${c.UNSURE} · παραλείψεις ${c.SKIP}</p>`;

  const tiers = Object.entries(TIER).map(([k, [title, hint]]) => {
    const fs = profile.facets.filter(f => f.tier === k).sort((a, b) => b.score - a.score);
    if (!fs.length) return '';
    if (k === 'neutral' || k === 'secondary') return `<details class="pf-block"><summary><strong>${title}</strong> (${fs.length}) <small class="muted">${hint}</small></summary>${fs.map(f => facetLine(f, ctx)).join('')}</details>`;
    return `<div class="pf-block"><h4>${title} <small class="muted">${hint}</small></h4>${fs.map(f => facetLine(f, ctx)).join('')}</div>`;
  }).join('');
  const unknown = profile.facets.filter(f => f.tier === 'unknown');
  const tierBlock = `<div class="pf-section"><h4 class="pf-h">Τι μετράει περισσότερο</h4>${tiers || '<p class="note">Δεν υπάρχουν ακόμη σήματα σημαντικότητας.</p>'}${unknown.length ? `<p class="note">Χωρίς στοιχεία ακόμη: ${unknown.map(f => pvEsc(f.label)).join(', ')}.</p>` : ''}</div>`;

  const groups = new Map(profile.ismGroups.map(g => [g.id, g]));
  const facetIsm = new Map(profile.facets.map(f => [f.id, f.ism]));
  const shown = profile.axes.filter(a => ['consistent', 'tentative', 'mixed', 'flexible'].includes(a.status));
  const single = profile.axes.filter(a => a.status === 'single');
  const styleGroups = ISM_ORDER.map(gid => {
    const axes = shown.filter(a => facetIsm.get(a.facet) === gid);
    return axes.length ? `<div class="pf-block"><h4>${pvEsc(groups.get(gid)?.label || gid)} <span class="tag">${gid}</span></h4>${axes.map(a => axisLine(a, ctx)).join('')}</div>` : '';
  }).join('');
  const styleBlock = `<div class="pf-section"><h4 class="pf-h">Τι είδους σύντροφο περιγράφεις</h4>${styleGroups || '<p class="note">Χρειάζονται τουλάχιστον δύο απαντήσεις σε έναν άξονα.</p>'}${single.length ? `<details><summary>Μία μόνο ένδειξη (${single.length})</summary>${single.map(a => axisLine(a, ctx)).join('')}</details>` : ''}</div>`;

  const facetLabel = new Map(profile.facets.map(f => [f.id, f.label]));
  const axisById = new Map(profile.axes.map(a => [a.id, a]));
  const dil = profile.dilemmas.filter(r => r.choice && r.choice !== 'SKIP');
  const dilBlock = dil.length ? `<div class="pf-section"><h4 class="pf-h">Διλήμματα: τι κράτησες, τι θυσίασες</h4>${dil.map(r => {
    let txt;
    if (r.choice === 'A' || r.choice === 'B') {
      const parts = [];
      if (r.trade) parts.push(`κράτησες <strong>${pvEsc(facetLabel.get(r.favoured))}</strong> έναντι ${pvEsc(facetLabel.get(r.sacrificed))}`);
      for (const m of r.style) { const a = axisById.get(m.axis); if (a) parts.push(`${pvEsc(a.label)}: «${pvEsc((r.choice === 'A' ? m.A : -m.A) > 0 ? a.high : a.low)}»`); }
      txt = parts.join(' · ');
    } else txt = r.choice === 'BOTH' ? 'δεν θέλησες να θυσιάσεις κανένα από τα δύο' : r.choice === 'NEITHER' ? 'καμία εκδοχή δεν σε κάλυψε' : 'δεν ήσουν σίγουρος';
    return `<div class="pf-row"><div>${txt}${r.ambiguous ? ' <small class="muted">(≈ ασαφής αντιστοίχιση· δεν μετρά στην κατάταξη)</small>' : ''}</div><div class="pf-why">${evidenceChips([r.id], ctx)}</div></div>`;
  }).join('')}</div>` : '';

  const contraBlock = `<div class="pf-section"><h4 class="pf-h">Αξίζει να το διερευνήσεις</h4>${profile.contradictions.length ? `<p class="note">Δεν είναι λάθη. Δείχνουν σημεία όπου η δήλωση και η επιλογή υπό πίεση διαφέρουν, ή όπου εξαρτάται από το πλαίσιο.</p>${profile.contradictions.map(x => `<div class="pf-row"><div>${contradictionText(x, ctx)}</div><div class="pf-why">${evidenceChips(x.evidence, ctx)}</div></div>`).join('')}` : '<p class="note">Δεν εντοπίστηκαν εντάσεις με τα σημερινά στοιχεία.</p>'}</div>`;

  const unexBlock = profile.unexplored.length ? `<div class="pf-section"><h4 class="pf-h">Τι μένει ανεξερεύνητο</h4><details><summary>${profile.unexplored.length} σημεία</summary>${profile.unexplored.map(u => `<div class="pf-row"><div>${unexploredText(u)}</div>${u.evidence?.length && u.type !== 'axes-thin' && u.type !== 'maxdiff-thin' && u.type !== 'domain-thin' ? `<div class="pf-why">${evidenceChips(u.evidence, ctx)}</div>` : ''}</div>`).join('')}</details></div>` : '';

  const featBlock = profile.features.length ? `<div class="pf-section"><details><summary>Επιμέρους χαρακτηριστικά που διάλεξες (${profile.features.length}, περιγραφικά)</summary>${profile.features.map(f => `<div class="pf-row"><div>${pvEsc(f.text)}</div><div class="pf-why">${evidenceChips([f.id], ctx)}</div></div>`).join('')}</details></div>` : '';

  return `<section class="result-card pf" id="ideal-profile">${head}${countLine}${tierBlock}${styleBlock}${dilBlock}${contraBlock}${unexBlock}${featBlock}<p class="note pf-foot">${pvEsc(profile.version)} · αντιστοίχιση ερωτήσεων: ${pvEsc(profile.mapStatus || '')}. Τα όρια (π.χ. «συνεπές» από 3 σύμφωνες απαντήσεις) είναι επιλογές σχεδιασμού και όχι επιστημονική μέτρηση. ≈ = ασαφής αντιστοίχιση με μισό βάρος.</p></section>`;
}
