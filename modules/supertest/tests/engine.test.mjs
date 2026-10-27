import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildProfile, validateItemMap, axisSummary, dilemmaSummary, facetTiers, contradictions, unexplored } from '../src/engine.mjs';

const load = p => JSON.parse(readFileSync(new URL(p, import.meta.url)));
const bank = load('../data/questions.json');
const modules = load('../data/modules.json');
const map = load('../data/item_map.json');
const st = (answers = {}, importance = {}, maxdiff = {}) => ({ answers: Object.fromEntries(Object.entries(answers).map(([k, c]) => [k, { choice: c, at: 'x' }])), importance, maxdiff });
const axis = id => map.axes.find(a => a.id === id);

test('item map covers all 135 questions exactly and validates', () => {
  assert.deepEqual(validateItemMap(map, bank, modules), []);
  assert.equal(Object.keys(map.items).length, 135);
  assert.equal(map.items['G-VIS'].kind, 'photo');
  for (const q of bank.questions.filter(q => q.domain === 'TRADEOFF')) assert.equal(map.items[q.id].kind, 'dilemma');
  for (const a of map.axes) assert.ok(Object.values(map.items).some(i => i.kind !== 'dilemma' && i.maps.some(m => m.axis === a.id)), 'axis without items ' + a.id);
});

test('validateItemMap reports broken maps', () => {
  const broken = structuredClone(map);
  delete broken.items['D-EMO-01'];
  broken.items['D-EMO-02'].maps[0].A = 2;
  broken.items['T-01'].trade.A = 'nope';
  const p = validateItemMap(broken, bank, modules);
  assert.ok(p.some(x => x.includes('unmapped question D-EMO-01')));
  assert.ok(p.some(x => x.includes('D-EMO-02')));
  assert.ok(p.some(x => x.includes('unknown trade facet nope')));
});

test('no answers → empty profile, everything unknown, no contradictions', () => {
  const p = buildProfile(st(), map, bank, modules);
  assert.equal(p.empty, true);
  assert.equal(p.answered, 0);
  assert.ok(p.facets.every(f => f.tier === 'unknown' && f.evidenceIds.length === 0));
  assert.ok(p.axes.every(a => a.status === 'none' && a.lean === null && a.direction === null));
  assert.deepEqual(p.contradictions, []);
  const types = p.unexplored.map(u => u.type);
  for (const t of ['importance-missing', 'domain-thin', 'axes-thin', 'maxdiff-thin', 'dilemmas-open', 'ism-unmeasured']) assert.ok(types.includes(t), t);
  assert.equal(p.features.length, 0);
});

test('tolerates missing/odd state containers', () => {
  const p = buildProfile({}, map, bank, modules);
  assert.equal(p.empty, true);
  assert.doesNotThrow(() => buildProfile({ answers: { 'D-EMO-01': {} } }, map, bank, modules));
});

test('consistent axis: three agreeing answers with evidence ids', () => {
  const a = axisSummary(axis('emo_expressive'), st({ 'G-EMO': 'A', 'D-EMO-02': 'A', 'D-EMO-06': 'A' }), map, bank);
  assert.equal(a.status, 'consistent');
  assert.equal(a.direction, 'high');
  assert.equal(a.clear, 3);
  assert.equal(a.agreeing, 3);
  assert.deepEqual(a.evidenceIds.sort(), ['D-EMO-02', 'D-EMO-06', 'G-EMO']);
});

test('B flips sign; negative-signed item maps to low pole', () => {
  const a = axisSummary(axis('extraversion'), st({ 'G-PER': 'A', 'D-PER-05': 'A' }), map, bank);
  assert.equal(a.direction, 'low');
  assert.equal(a.status, 'tentative');
  const b = axisSummary(axis('extraversion'), st({ 'G-PER': 'B', 'D-SOC-05': 'A' }), map, bank);
  assert.equal(b.direction, 'high');
});

test('BOTH pulls toward balanced, NEITHER/UNSURE/SKIP stay distinct and excluded', () => {
  const only = axisSummary(axis('closeness'), st({ 'D-EMO-04': 'BOTH', 'D-EMO-07': 'BOTH' }), map, bank);
  assert.equal(only.status, 'flexible');
  assert.equal(only.lean, 0);
  assert.equal(only.direction, 'balanced');
  const mix = axisSummary(axis('closeness'), st({ 'D-EMO-04': 'A', 'D-EMO-07': 'BOTH', 'D-COM-06': 'BOTH' }), map, bank);
  assert.equal(mix.status, 'single');
  assert.equal(mix.lean, 0.33);
  assert.equal(mix.direction, 'high'); // lean = 1/3 exactly: boundary is inclusive; status 'single' keeps it weak
  const rej = axisSummary(axis('closeness'), st({ 'D-EMO-04': 'NEITHER', 'D-EMO-07': 'UNSURE', 'D-COM-06': 'SKIP' }), map, bank);
  assert.equal(rej.status, 'none');
  assert.equal(rej.lean, null);
  assert.deepEqual([rej.counts.NEITHER, rej.counts.UNSURE, rej.counts.SKIP], [1, 1, 1]);
  assert.deepEqual(rej.evidenceIds.sort(), ['D-COM-06', 'D-EMO-04', 'D-EMO-07']);
});

test('mixed axis is reported as contradiction, not averaged away', () => {
  const s = st({ 'D-EMO-04': 'A', 'D-EMO-07': 'B' });
  const a = axisSummary(axis('closeness'), s, map, bank);
  assert.equal(a.status, 'mixed');
  const c = contradictions(s, map, bank, modules);
  assert.ok(c.some(x => x.type === 'mixed-axis' && x.axis === 'closeness' && x.evidence.includes('D-EMO-07')));
});

test('half-weight ambiguous items are marked and weigh less', () => {
  const a = axisSummary(axis('emo_expressive'), st({ 'D-EMO-02': 'A', 'D-EMO-05': 'B' }), map, bank);
  assert.equal(a.direction, 'high'); // 1 vs 0.5
  assert.ok(a.evidence.find(e => e.id === 'D-EMO-05').ambiguous);
});

test('G-VIS (photo) never contributes', () => {
  const p = buildProfile(st({ 'G-VIS': 'A' }), map, bank, modules);
  assert.ok(p.axes.every(a => !a.evidenceIds.includes('G-VIS')));
  assert.ok(p.facets.every(f => !f.evidenceIds.includes('G-VIS')));
  assert.ok(p.features.every(f => f.id !== 'G-VIS'));
});

test('dilemma win rates; ambiguous trades excluded; BOTH/NEITHER tracked', () => {
  const d = dilemmaSummary(st({ 'T-01': 'B', 'T-03': 'A', 'T-02': 'BOTH', 'T-11': 'A', 'T-16': 'NEITHER' }), map);
  assert.equal(d.facets.intel.wins, 2);
  assert.equal(d.facets.intel.winRate, 1);
  assert.equal(d.facets.vis.losses, 1);
  assert.equal(d.facets.vis.both, 1);
  assert.equal(d.facets.chem.neither, 1);
  assert.equal(d.facets.trust, undefined); // T-11 is ambiguous
  assert.equal(d.rows.find(r => r.id === 'T-11').favoured, 'trust');
});

test('facet tiers combine importance, MaxDiff and dilemmas with evidence', () => {
  const md = {}; for (const c of modules.maxdiff.filter(c => c.facets.includes('intel')).slice(0, 3)) md[c.id] = { best: 'intel', worst: c.facets.find(f => f !== 'intel') };
  const s = st({ 'T-01': 'B', 'T-03': 'A' }, { INT: 5, VIS: 2 }, md);
  const tiers = Object.fromEntries(facetTiers(s, map, bank, modules).map(f => [f.id, f]));
  assert.equal(tiers.intel.tier, 'essential');
  assert.equal(tiers.intel.strength, 'convergent');
  assert.ok(tiers.intel.evidenceIds.includes('IMP:INT') && tiers.intel.evidenceIds.includes('T-01') && tiers.intel.evidenceIds.includes(Object.keys(md)[0]));
  assert.equal(tiers.vis.tier, 'secondary');
  assert.equal(tiers.faith.tier, 'unknown');
  const n = Object.fromEntries(facetTiers(st({}, { FAI: 3 }), map, bank, modules).map(f => [f.id, f]));
  assert.equal(n.faith.tier, 'neutral');
});

test('stated importance vs sacrifice → contradiction with evidence', () => {
  const s = st({ 'T-01': 'B', 'T-02': 'B' }, { VIS: 5 });
  const tiers = facetTiers(s, map, bank, modules);
  assert.equal(tiers.find(f => f.id === 'vis').tier, 'conflicting');
  const c = contradictions(s, map, bank, modules);
  const hit = c.find(x => x.type === 'importance-vs-sacrifice' && x.facet === 'vis');
  assert.ok(hit);
  assert.deepEqual(hit.evidence.sort(), ['IMP:VIS', 'T-01', 'T-02']);
  const low = contradictions(st({ 'T-04': 'A' }, { FAI: 1 }), map, bank, modules);
  assert.ok(low.some(x => x.type === 'low-importance-but-chosen' && x.facet === 'faith'));
});

test('importance vs MaxDiff contradiction', () => {
  const md = {}; for (const c of modules.maxdiff.filter(c => c.facets.includes('humor')).slice(0, 2)) md[c.id] = { worst: 'humor', best: c.facets.find(f => f !== 'humor') };
  const c = contradictions(st({}, { CHEM: 5 }, md), map, bank, modules);
  assert.ok(c.some(x => x.type === 'importance-vs-maxdiff' && x.facet === 'humor'));
});

test('G- vs D- contradiction', () => {
  const s = st({ 'G-AUT': 'A', 'D-LIF-07': 'A', 'D-AUT-05': 'B', 'D-AUT-08': 'B' });
  const c = contradictions(s, map, bank, modules);
  const hit = c.find(x => x.type === 'global-vs-detail' && x.axis === 'togetherness');
  assert.ok(hit);
  assert.equal(hit.detail.global, 'low');
  assert.ok(hit.evidence.includes('G-AUT') && hit.evidence.includes('D-AUT-05'));
  // agreement → no contradiction
  assert.ok(!contradictions(st({ 'G-AUT': 'B', 'D-LIF-07': 'A', 'D-AUT-05': 'B' }), map, bank, modules).some(x => x.type === 'global-vs-detail'));
});

test('dilemma choice against a stated style is surfaced', () => {
  const s = st({ 'G-SOC': 'A', 'D-SOC-04': 'B', 'D-SOC-06': 'B', 'T-14': 'A' });
  const c = contradictions(s, map, bank, modules);
  assert.ok(c.some(x => x.type === 'dilemma-vs-style' && x.dilemma === 'T-14' && x.axis === 'social_scope'));
});

test('partial answers: unexplored lists exact gaps', () => {
  const s = st({ 'D-EMO-01': 'UNSURE', 'D-EMO-02': 'UNSURE', 'D-COM-01': 'NEITHER', 'T-01': 'SKIP' }, { EMO: 4 });
  const u = unexplored(s, map, bank, modules);
  const imp = u.find(x => x.type === 'importance-missing');
  assert.ok(!imp.domains.includes('EMO') && imp.domains.includes('VIS'));
  assert.deepEqual(u.find(x => x.type === 'uncertain' && x.domain === 'EMO').evidence, ['D-EMO-01', 'D-EMO-02']);
  assert.deepEqual(u.find(x => x.type === 'rejected-both').evidence, ['D-COM-01']);
  assert.ok(u.find(x => x.type === 'dilemmas-open').evidence.includes('T-01'));
  assert.ok(u.find(x => x.type === 'no-dilemma-content').facets.includes('intimacy'));
  const p = buildProfile(s, map, bank, modules);
  assert.equal(p.empty, false);
  assert.deepEqual([p.counts.UNSURE, p.counts.NEITHER, p.counts.SKIP], [2, 1, 1]);
});

test('every contradiction and facet conclusion carries evidence', () => {
  const answers = {}; bank.questions.forEach((q, i) => { answers[q.id] = ['A', 'B', 'BOTH', 'A', 'NEITHER', 'UNSURE', 'SKIP', 'B'][i % 8]; });
  const imp = Object.fromEntries(bank.domains.map((d, i) => [d.code, i % 6]));
  const md = Object.fromEntries(modules.maxdiff.map(c => [c.id, { best: c.facets[0], worst: c.facets[3] }]));
  const p = buildProfile(st(answers, imp, md), map, bank, modules);
  for (const c of p.contradictions) assert.ok(c.evidence.length > 0, c.type);
  for (const f of p.facets.filter(f => f.tier !== 'unknown')) assert.ok(f.evidenceIds.length > 0, f.id);
  for (const a of p.axes.filter(a => a.status !== 'none')) assert.ok(a.evidenceIds.length > 0, a.id);
  assert.deepEqual(buildProfile(st(answers, imp, md), map, bank, modules), p, 'deterministic');
  assert.ok(p.features.length > 0 && p.features.every(f => typeof f.text === 'string'));
});

test('neutral strength counts neutral sources; shared-domain importance is visible in evidence', () => {
  const md = {}; for (const c of modules.maxdiff.filter(c => c.facets.includes('aut')).slice(0, 2)) md[c.id] = { best: c.facets.find(f => f !== 'aut'), worst: c.facets.find(f => f !== 'aut' && f !== c.facets.find(g => g !== 'aut')) };
  const t = Object.fromEntries(facetTiers(st({}, { AUT: 3 }, md), map, bank, modules).map(f => [f.id, f]));
  assert.equal(t.aut.tier, 'neutral');
  assert.equal(t.aut.strength, 'convergent');
  assert.ok(t.growth.evidenceIds.includes('IMP:AUT')); // growth shares the AUT domain rating
});
