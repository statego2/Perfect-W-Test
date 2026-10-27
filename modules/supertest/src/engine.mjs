/**
 * Profile engine (Phase 1) — ιδανική σύντροφος ως διαφανής σύνθεση απαντήσεων.
 *
 * Pure functions only: no DOM, no storage, no randomness, no clock.
 * Κάθε συμπέρασμα κουβαλά τα IDs των τεκμηρίων του (ερωτήσεις, IMP:<DOMAIN>, κάρτες MaxDiff).
 *
 * Τι ΔΕΝ κάνει (AGENTS.md):
 *  - δεν προβλέπει επιτυχία σχέσης ούτε «συμβατότητα» με πραγματικά πρόσωπα·
 *  - δεν χρησιμοποιεί φωτογραφίες (G-VIS εξαιρείται, Beauty μένει ξεχωριστό)·
 *  - δεν δίνει ψυχομετρικά ποσοστά ή «βεβαιότητα %»· μόνο μετρήσεις και ετικέτες·
 *  - κρατά διακριτά τα UNSURE / SKIP / NEITHER / BOTH.
 *
 * Choice semantics per mapped axis item:
 *  A, B     → clear vote (sign × weight) toward one pole
 *  BOTH     → counted as flexible (0 toward the lean, weight in the denominator)
 *  NEITHER  → rejection of both framings; counted, excluded from the lean
 *  UNSURE   → counted as uncertainty; excluded
 *  SKIP     → counted as skipped; excluded
 */

export const ENGINE_VERSION = 'profile-engine/1.0.0';
export const LEAN_THRESHOLD = 1 / 3;        // |lean| below this → «ισορροπημένο»
export const CONSISTENT_SHARE = 0.75;       // majority weight share for «συνεπές»
export const STRONG_IMPORTANCE = 4;         // stated importance ≥4 → signal +1
export const WEAK_IMPORTANCE = 2;           // stated importance ≤2 → signal −1
export const MAXDIFF_MIN_CARDS = 2;
export const MAXDIFF_RATE = 0.4;

const CLEAR = new Set(['A', 'B']);
const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);
const choiceOf = (st, id) => (own(st?.answers, id) ? st.answers[id]?.choice ?? null : null);
const impId = domain => 'IMP:' + domain;
const round = (x, n = 2) => (x === null || x === undefined ? null : Math.round(x * 10 ** n) / 10 ** n);

/** Structural check of item_map against the bank/modules. Returns a list of problems (empty = ok). */
export function validateItemMap(map, bank, modules) {
  const problems = [];
  if (!map || map.schema !== 'mpw-item-map/v1') problems.push('schema must be mpw-item-map/v1');
  const items = map?.items || {};
  const axes = new Map((map?.axes || []).map(a => [a.id, a]));
  const facets = new Set((modules?.facets || []).map(f => f.id));
  const ids = (bank?.questions || []).map(q => q.id);
  for (const id of ids) if (!own(items, id)) problems.push('unmapped question ' + id);
  for (const id of Object.keys(items)) if (!ids.includes(id)) problems.push('unknown question ' + id);
  for (const a of axes.values()) {
    if (!facets.has(a.facet)) problems.push(`axis ${a.id}: unknown facet ${a.facet}`);
    if (!a.low || !a.high || !a.label) problems.push(`axis ${a.id}: missing labels`);
  }
  for (const [id, it] of Object.entries(items)) {
    const q = bank.questions.find(x => x.id === id);
    for (const m of it.maps || []) {
      if (!axes.has(m.axis)) problems.push(`${id}: unknown axis ${m.axis}`);
      if (m.A !== 1 && m.A !== -1) problems.push(`${id}: sign must be ±1`);
      if (!(m.w > 0 && m.w <= 1)) problems.push(`${id}: weight must be in (0,1]`);
    }
    if (it.trade) for (const side of ['A', 'B']) if (!facets.has(it.trade[side])) problems.push(`${id}: unknown trade facet ${it.trade[side]}`);
    if (q && q.domain === 'TRADEOFF' && it.kind !== 'dilemma') problems.push(`${id}: T- item must be kind=dilemma`);
    if (q && q.domain !== 'TRADEOFF' && it.kind === 'dilemma') problems.push(`${id}: only T- items can be dilemmas`);
    if (it.kind !== 'feature' && it.kind !== 'photo' && !(it.maps?.length) && !it.trade) problems.push(`${id}: scored item without mapping`);
  }
  for (const g of map?.ism_groups || []) for (const f of g.facets) if (!facets.has(f)) problems.push(`ism ${g.id}: unknown facet ${f}`);
  return problems;
}

/** Direction + confidence for one axis from G-/D- items (dilemmas are reported separately). */
export function axisSummary(axis, st, map, bank) {
  const qById = new Map(bank.questions.map(q => [q.id, q]));
  const evidence = [];
  const counts = { A: 0, B: 0, BOTH: 0, NEITHER: 0, UNSURE: 0, SKIP: 0, unanswered: 0 };
  let pos = 0, neg = 0, flex = 0, clear = 0;
  for (const [id, it] of Object.entries(map.items)) {
    if (it.kind === 'dilemma' || it.kind === 'photo') continue;
    for (const m of it.maps || []) {
      if (m.axis !== axis.id) continue;
      const choice = choiceOf(st, id);
      if (!choice) { counts.unanswered++; evidence.push({ id, choice: null, toward: null, w: m.w, ambiguous: !!it.ambiguous }); continue; }
      counts[choice]++;
      let toward = null;
      if (CLEAR.has(choice)) {
        const s = choice === 'A' ? m.A : -m.A;
        if (s > 0) pos += m.w; else neg += m.w;
        toward = s > 0 ? 'high' : 'low';
        clear++;
      } else if (choice === 'BOTH') { flex += m.w; toward = 'both'; }
      const q = qById.get(id);
      evidence.push({ id, choice, toward, w: m.w, ambiguous: !!it.ambiguous, global: q?.kind === 'global' || id.startsWith('G-') });
    }
  }
  const denom = pos + neg + flex;
  const lean = denom ? (pos - neg) / denom : null;
  const share = pos + neg ? Math.max(pos, neg) / (pos + neg) : null;
  const majority = pos === neg ? 0 : pos > neg ? 1 : -1;
  const agreeing = evidence.filter(e => (majority > 0 && e.toward === 'high') || (majority < 0 && e.toward === 'low')).length;
  let status;
  if (clear === 0) status = counts.BOTH ? 'flexible' : 'none';
  else if (clear === 1) status = 'single';
  else if (share < CONSISTENT_SHARE) status = 'mixed';
  else status = clear >= 3 ? 'consistent' : 'tentative';
  const direction = lean === null ? null : lean >= LEAN_THRESHOLD ? 'high' : lean <= -LEAN_THRESHOLD ? 'low' : 'balanced';
  return {
    id: axis.id, label: axis.label, low: axis.low, high: axis.high, facet: axis.facet,
    lean: round(lean), direction, status, clear, agreeing, flexible: counts.BOTH, counts,
    evidence, evidenceIds: evidence.filter(e => e.choice).map(e => e.id),
  };
}

/** Win rates for each facet across answered importance trade-off dilemmas (unambiguous only count). */
export function dilemmaSummary(st, map) {
  const rows = [], facets = {};
  const bump = (f, k, id) => { (facets[f] ||= { wins: 0, losses: 0, both: 0, neither: 0, evidence: [] })[k]++; facets[f].evidence.push(id); };
  for (const [id, it] of Object.entries(map.items)) {
    if (it.kind !== 'dilemma') continue;
    const choice = choiceOf(st, id);
    const row = { id, choice, trade: it.trade || null, style: it.maps || [], ambiguous: !!it.ambiguous, favoured: null, sacrificed: null };
    if (it.trade && choice) {
      if (CLEAR.has(choice)) { row.favoured = it.trade[choice]; row.sacrificed = it.trade[choice === 'A' ? 'B' : 'A']; }
      if (!it.ambiguous) {
        if (CLEAR.has(choice)) { bump(row.favoured, 'wins', id); bump(row.sacrificed, 'losses', id); }
        else if (choice === 'BOTH') { bump(it.trade.A, 'both', id); bump(it.trade.B, 'both', id); }
        else if (choice === 'NEITHER') { bump(it.trade.A, 'neither', id); bump(it.trade.B, 'neither', id); }
      }
    }
    rows.push(row);
  }
  for (const f of Object.values(facets)) { const n = f.wins + f.losses; f.decided = n; f.winRate = n ? round(f.wins / n) : null; }
  return { rows, facets };
}

function maxdiffStats(st, modules) {
  const out = {};
  for (const f of modules.facets) {
    const cards = modules.maxdiff.filter(c => c.facets.includes(f.id) && own(st?.maxdiff, c.id));
    const best = cards.filter(c => st.maxdiff[c.id].best === f.id).map(c => c.id);
    const worst = cards.filter(c => st.maxdiff[c.id].worst === f.id).map(c => c.id);
    out[f.id] = { seen: cards.length, best: best.length, worst: worst.length, net: best.length - worst.length,
      rate: cards.length ? round((best.length - worst.length) / cards.length) : null, evidence: cards.map(c => c.id) };
  }
  return out;
}

/** Essential / secondary / neutral per facet, combining stated importance, MaxDiff and dilemmas. */
export function facetTiers(st, map, bank, modules, dilemmas = dilemmaSummary(st, map)) {
  const md = maxdiffStats(st, modules);
  const ismOf = new Map((map.ism_groups || []).flatMap(g => g.facets.map(f => [f, g.id])));
  return modules.facets.map(f => {
    const imp = own(st?.importance, f.domain) ? st.importance[f.domain] : null;
    const m = md[f.id], d = dilemmas.facets[f.id] || null;
    const signals = [];
    if (imp !== null) signals.push({ source: 'importance', value: imp, signal: imp >= STRONG_IMPORTANCE ? 1 : imp <= WEAK_IMPORTANCE ? -1 : 0, evidence: [impId(f.domain)] });
    if (m.seen >= MAXDIFF_MIN_CARDS) signals.push({ source: 'maxdiff', value: m.rate, best: m.best, worst: m.worst, seen: m.seen, signal: m.rate >= MAXDIFF_RATE ? 1 : m.rate <= -MAXDIFF_RATE ? -1 : 0, evidence: m.evidence });
    if (d && d.decided) signals.push({ source: 'dilemmas', value: d.winRate, wins: d.wins, losses: d.losses, signal: d.winRate >= 2 / 3 ? 1 : d.winRate <= 1 / 3 ? -1 : 0, evidence: d.evidence });
    const plus = signals.filter(s => s.signal > 0).length, minus = signals.filter(s => s.signal < 0).length;
    let tier;
    if (!signals.length) tier = 'unknown';
    else if (plus && minus) tier = 'conflicting';
    else if (plus) tier = 'essential';
    else if (minus) tier = 'secondary';
    else tier = 'neutral';
    // strength = how many sources back the tier (for neutral: how many sources are neutral)
    const backing = tier === 'neutral' ? signals.length : Math.max(plus, minus);
    const strength = !signals.length ? null : plus && minus ? 'conflicting' : backing >= 2 ? 'convergent' : 'single-source';
    return { id: f.id, label: f.label, domain: f.domain, ism: ismOf.get(f.id) || null, tier, strength, score: plus - minus,
      signals, evidenceIds: [...new Set(signals.flatMap(s => s.evidence))], maxdiffSeen: m.seen, dilemmaDecided: d?.decided || 0 };
  });
}

/** Stated-vs-revealed tensions. Framed as «αξίζει διερεύνηση», never as errors. */
export function contradictions(st, map, bank, modules, ctx = {}) {
  const dil = ctx.dilemmas || dilemmaSummary(st, map);
  const tiers = ctx.facets || facetTiers(st, map, bank, modules, dil);
  const axes = ctx.axes || map.axes.map(a => axisSummary(a, st, map, bank));
  const axisById = new Map(axes.map(a => [a.id, a]));
  const out = [];
  for (const f of tiers) {
    const imp = f.signals.find(s => s.source === 'importance');
    const d = f.signals.find(s => s.source === 'dilemmas');
    const m = f.signals.find(s => s.source === 'maxdiff');
    if (imp && d) {
      if (imp.value >= STRONG_IMPORTANCE && d.losses > d.wins) out.push({ type: 'importance-vs-sacrifice', facet: f.id, label: f.label,
        detail: { importance: imp.value, wins: d.wins, losses: d.losses }, evidence: [...imp.evidence, ...d.evidence] });
      if (imp.value <= WEAK_IMPORTANCE && d.wins > d.losses) out.push({ type: 'low-importance-but-chosen', facet: f.id, label: f.label,
        detail: { importance: imp.value, wins: d.wins, losses: d.losses }, evidence: [...imp.evidence, ...d.evidence] });
    }
    if (imp && m && imp.signal && m.signal && imp.signal !== m.signal) out.push({ type: 'importance-vs-maxdiff', facet: f.id, label: f.label,
      detail: { importance: imp.value, best: m.best, worst: m.worst, seen: m.seen }, evidence: [...imp.evidence, ...m.evidence] });
  }
  for (const a of axes) {
    const g = a.evidence.find(e => e.global && (e.toward === 'high' || e.toward === 'low'));
    const ds = a.evidence.filter(e => !e.global && (e.toward === 'high' || e.toward === 'low'));
    if (g && ds.length >= 2) {
      let p = 0, n = 0; for (const e of ds) e.toward === 'high' ? (p += e.w) : (n += e.w);
      const dl = (p - n) / (p + n);
      const gs = g.toward === 'high' ? 1 : -1;
      if (Math.abs(dl) >= LEAN_THRESHOLD && Math.sign(dl) !== gs) out.push({ type: 'global-vs-detail', axis: a.id, label: a.label,
        detail: { global: g.toward, details: dl > 0 ? 'high' : 'low', low: a.low, high: a.high }, evidence: [g.id, ...ds.map(e => e.id)] });
    }
    if (a.status === 'mixed') out.push({ type: 'mixed-axis', axis: a.id, label: a.label, detail: { low: a.low, high: a.high, counts: a.counts },
      evidence: a.evidence.filter(e => e.toward === 'high' || e.toward === 'low').map(e => e.id) });
  }
  for (const r of dil.rows) {
    if (!CLEAR.has(r.choice)) continue;
    for (const m of r.style) {
      const a = axisById.get(m.axis);
      if (!a || !['consistent', 'tentative'].includes(a.status) || a.direction === 'balanced' || a.direction === null) continue;
      const chosen = (r.choice === 'A' ? m.A : -m.A) > 0 ? 'high' : 'low';
      if (chosen !== a.direction) out.push({ type: 'dilemma-vs-style', axis: a.id, label: a.label, dilemma: r.id,
        detail: { chosen, stated: a.direction, low: a.low, high: a.high }, evidence: [r.id, ...a.evidenceIds] });
    }
  }
  return out;
}

/** What the answers do not yet cover. Each entry lists the IDs that would fill the gap. */
export function unexplored(st, map, bank, modules, ctx = {}) {
  const axes = ctx.axes || map.axes.map(a => axisSummary(a, st, map, bank));
  const facets = ctx.facets || facetTiers(st, map, bank, modules);
  const dil = ctx.dilemmas || dilemmaSummary(st, map);
  const out = [];
  const missingImp = bank.domains.filter(d => !own(st?.importance, d.code));
  if (missingImp.length) out.push({ type: 'importance-missing', domains: missingImp.map(d => d.code), labels: missingImp.map(d => d.name), evidence: missingImp.map(d => impId(d.code)) });
  for (const d of bank.domains) {
    const qs = bank.questions.filter(q => q.domain === d.code && map.items[q.id]?.kind !== 'photo');
    const clear = qs.filter(q => CLEAR.has(choiceOf(st, q.id)));
    if (clear.length < 3) out.push({ type: 'domain-thin', domain: d.code, label: d.name, clear: clear.length, total: qs.length, evidence: qs.filter(q => !CLEAR.has(choiceOf(st, q.id))).map(q => q.id) });
    const unsure = qs.filter(q => choiceOf(st, q.id) === 'UNSURE').map(q => q.id);
    if (unsure.length >= 2) out.push({ type: 'uncertain', domain: d.code, label: d.name, evidence: unsure });
  }
  const neither = bank.questions.filter(q => choiceOf(st, q.id) === 'NEITHER').map(q => q.id);
  if (neither.length) out.push({ type: 'rejected-both', evidence: neither });
  const thinAxes = axes.filter(a => a.status === 'none' || a.status === 'single');
  if (thinAxes.length) out.push({ type: 'axes-thin', axes: thinAxes.map(a => ({ id: a.id, label: a.label, clear: a.clear })),
    evidence: [...new Set(thinAxes.flatMap(a => a.evidence.filter(e => !CLEAR.has(e.choice)).map(e => e.id)))] });
  const noMd = facets.filter(f => f.maxdiffSeen < MAXDIFF_MIN_CARDS);
  if (noMd.length) out.push({ type: 'maxdiff-thin', facets: noMd.map(f => f.id), labels: noMd.map(f => f.label),
    evidence: modules.maxdiff.filter(c => !own(st?.maxdiff, c.id) && c.facets.some(x => noMd.some(f => f.id === x))).map(c => c.id) });
  const openDil = dil.rows.filter(r => !r.choice || r.choice === 'SKIP' || r.choice === 'UNSURE').map(r => r.id);
  if (openDil.length) out.push({ type: 'dilemmas-open', evidence: openDil });
  const traded = new Set(Object.values(map.items).filter(i => i.trade && !i.ambiguous).flatMap(i => [i.trade.A, i.trade.B]));
  const untraded = modules.facets.filter(f => !traded.has(f.id));
  if (untraded.length) out.push({ type: 'no-dilemma-content', facets: untraded.map(f => f.id), labels: untraded.map(f => f.label), evidence: [] });
  for (const g of map.ism_groups || []) if (!g.facets.length) out.push({ type: 'ism-unmeasured', group: g.id, label: g.label, evidence: [] });
  return out;
}

/** Descriptive picks on feature items (no aggregation, no axis). */
export function featurePicks(st, map, bank) {
  return bank.questions.filter(q => map.items[q.id]?.kind === 'feature' && CLEAR.has(choiceOf(st, q.id)))
    .map(q => ({ id: q.id, domain: q.domain, choice: choiceOf(st, q.id), text: q[choiceOf(st, q.id)] }));
}

/** Full profile. Pure: same inputs → same output. */
export function buildProfile(st, map, bank, modules) {
  const dilemmas = dilemmaSummary(st, map);
  const axes = map.axes.map(a => axisSummary(a, st, map, bank));
  const facets = facetTiers(st, map, bank, modules, dilemmas);
  const ctx = { axes, facets, dilemmas };
  const counts = { A: 0, B: 0, BOTH: 0, NEITHER: 0, UNSURE: 0, SKIP: 0 };
  for (const q of bank.questions) { const c = choiceOf(st, q.id); if (c && own(counts, c)) counts[c]++; }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return {
    version: ENGINE_VERSION, mapStatus: map.status || null,
    empty: total === 0 && !Object.keys(st?.importance || {}).length && !Object.keys(st?.maxdiff || {}).length,
    counts, answered: total, totalQuestions: bank.questions.length,
    answersById: Object.fromEntries(bank.questions.filter(q => choiceOf(st, q.id)).map(q => [q.id, choiceOf(st, q.id)])),
    facets, axes, dilemmas: dilemmas.rows, features: featurePicks(st, map, bank),
    contradictions: contradictions(st, map, bank, modules, ctx),
    unexplored: unexplored(st, map, bank, modules, ctx),
    ismGroups: map.ism_groups || [],
  };
}
