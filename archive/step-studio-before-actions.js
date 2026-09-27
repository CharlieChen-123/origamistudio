import { buildFoldable, buildSteps, foldSteps } from '../simulator/src/index.js';

/* Fold Lab's authoring layer. It deliberately uses the local, deterministic
   face-propagation engine for lessons: each saved step has named source creases,
   an angle, duration, and learner-facing explanation. The GPU solver remains the
   simultaneous-fold view and is restored when the author exits this mode. */
const $ = id => document.getElementById(id);
const state = {
  active: false, name: '', title: 'Untitled folding tutorial', segments: [], steps: [],
  selected: new Set(), creaseGroups: [], position: 0, progress: 0, group: null, playing: false,
  raf: 0, startedAt: 0, originalVisibility: null, authorStage: 'select', draft: null, hoveredGroup: null
};
const TYPE = { M: '#b84a45', V: '#2866bf', B: '#31312e', U: '#aaa8a2' };

function safeType(type) { return ['M', 'V', 'B', 'U'].includes(type) ? type : 'U'; }
function getPoint(v) { return v.length > 2 ? [Number(v[0]), Number(v[2])] : [Number(v[0]), Number(v[1])]; }
function cloneSegment(s) { return { id: s.id, p1: [...s.p1], p2: [...s.p2], type: safeType(s.type) }; }
function currentFoldSegments() {
  const fold = window.G?.pattern?.getFoldData?.(true);
  if (!fold?.vertices_coords?.length || !fold?.edges_vertices?.length) throw Error('Load a crease pattern before creating a tutorial.');
  return fold.edges_vertices.map((edge, id) => ({
    id, p1: getPoint(fold.vertices_coords[edge[0]]), p2: getPoint(fold.vertices_coords[edge[1]]),
    type: safeType(fold.edges_assignment?.[id])
  })).filter(s => s.p1.every(Number.isFinite) && s.p2.every(Number.isFinite)).map((s, id) => ({ ...s, id }));
}
function refreshGroups() {
  const pts = state.segments.flatMap(s => [s.p1, s.p2]); if (!pts.length) { state.creaseGroups = []; return; }
  const span = Math.max(...pts.map(p => p[0])) - Math.min(...pts.map(p => p[0]));
  const spanY = Math.max(...pts.map(p => p[1])) - Math.min(...pts.map(p => p[1]));
  const tolerance = Math.max(span, spanY, 1) * 1e-5; const buckets = new Map();
  state.segments.filter(s => s.type === 'M' || s.type === 'V').forEach(s => {
    let dx = s.p2[0] - s.p1[0], dy = s.p2[1] - s.p1[1]; const len = Math.hypot(dx, dy); if (len < tolerance) return;
    dx /= len; dy /= len; let nx = -dy, ny = dx; if (nx < -1e-8 || (Math.abs(nx) < 1e-8 && ny < 0)) { nx = -nx; ny = -ny; dx = -dx; dy = -dy; }
    const offset = nx * s.p1[0] + ny * s.p1[1]; const key = `${s.type}:${Math.round(nx / tolerance)}:${Math.round(ny / tolerance)}:${Math.round(offset / tolerance)}`;
    const t1 = dx * s.p1[0] + dy * s.p1[1], t2 = dx * s.p2[0] + dy * s.p2[1];
    (buckets.get(key) || (buckets.set(key, []), buckets.get(key))).push({ s, dx, dy, nx, ny, offset, from: Math.min(t1, t2), to: Math.max(t1, t2) });
  });
  const groups = [];
  buckets.forEach(items => { items.sort((a, b) => a.from - b.from); let run = null; items.forEach(item => {
    if (!run || item.from > run.to + tolerance * 2) { if (run) groups.push(run); run = { ...item, ids: [item.s.id] }; }
    else { run.to = Math.max(run.to, item.to); run.ids.push(item.s.id); }
  }); if (run) groups.push(run); });
  state.creaseGroups = groups.map((g, id) => ({ id, ids: [...new Set(g.ids)], type: g.s.type, p1: [g.dx * g.from + g.nx * g.offset, g.dy * g.from + g.ny * g.offset], p2: [g.dx * g.to + g.nx * g.offset, g.dy * g.to + g.ny * g.offset] }));
}
function sourceForEngine() { return state.segments.map(s => ({ p1: s.p1, p2: s.p2, type: state.draft?.direction !== 'pattern' && state.draft?.creases.includes(s.id) ? state.draft.direction : s.type })); }
function workingSteps() { return state.draft ? [...state.steps, state.draft] : state.steps; }
function canBuild() { return state.segments.length; }
function compiled() {
  if (!canBuild()) return null;
  const foldable = buildFoldable(sourceForEngine());
  if (!foldable.faces.length) throw Error('This pattern has no closed paper faces, so it cannot be used for a step tutorial.');
  return { foldable, steps: buildSteps(foldable, workingSteps().map(s => ({ ...s, angle: s.angle * Math.PI / 180 }))) };
}
function dispose(object) {
  object?.traverse?.(node => { node.geometry?.dispose?.(); if (node.material) (Array.isArray(node.material) ? node.material : [node.material]).forEach(m => m.dispose?.()); });
}
function ensureGroup() {
  if (state.group || !window.G?.threeView?.scene || !window.THREE) return;
  state.group = new THREE.Group(); state.group.name = 'FoldLabTutorialPreview';
  G.threeView.scene.add(state.group);
}
function geometryAttribute(geometry, name, attribute) {
  if (geometry.setAttribute) geometry.setAttribute(name, attribute);
  else geometry.addAttribute(name, attribute); // OrigamiSimulator bundles an older Three.js release.
}
function tutorialFrame(result) {
  // OrigamiSimulator recentres and scales its GPU mesh before drawing it. The
  // tutorial preview has its own mesh, so apply the same paper-space frame or
  // imported patterns appear offset from the main model.
  const flat = result.vertices?.length ? result.vertices : result.verts3D.map(v => [v[0], v[1]]);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  flat.forEach(([x, y]) => { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); });
  const centerX = (minX + maxX) / 2, centerY = (minY + maxY) / 2;
  let radius = 0;
  flat.forEach(([x, y]) => { radius = Math.max(radius, Math.hypot(x - centerX, y - centerY)); });
  radius ||= 1;
  return v => [(v[0] - centerX) / radius, (v[2] || 0) / radius, (v[1] - centerY) / radius];
}
function render(result, model) {
  ensureGroup(); if (!state.group) return;
  while (state.group.children.length) { const child = state.group.children.pop(); dispose(child); }
  const toScene = tutorialFrame(result);
  const positions = [];
  result.verts3D.forEach(v => positions.push(...toScene(v)));
  const indices = [];
  result.faces.forEach(face => { for (let i = 1; i + 1 < face.length; i++) indices.push(face[0], face[i], face[i + 1]); });
  const meshGeo = new THREE.BufferGeometry();
  geometryAttribute(meshGeo, 'position', new THREE.Float32BufferAttribute(positions, 3)); meshGeo.setIndex(indices); meshGeo.computeVertexNormals();
  const mesh = new THREE.Mesh(meshGeo, new THREE.MeshStandardMaterial({ color: 0xf8f5ed, side: THREE.DoubleSide, roughness: .86, metalness: 0 }));
  state.group.add(mesh);
  const active = new Set(state.position < workingSteps().length ? workingSteps()[state.position].creases : []);
  const linePositions = [], lineColors = [];
  result.edges.forEach(([a, b], edgeId) => {
    const pa = result.verts3D[a], pb = result.verts3D[b]; if (!pa || !pb) return;
    linePositions.push(...toScene(pa), ...toScene(pb));
    const source = model.foldable.edgeSources?.[edgeId]; const raw = result.edgeTypes[edgeId] || 'U';
    const hex = (active.has(source) ? TYPE[raw] : raw === 'M' || raw === 'V' ? TYPE[raw] : TYPE.U);
    const color = new THREE.Color(hex); lineColors.push(color.r, color.g, color.b, color.r, color.g, color.b);
  });
  const linesGeo = new THREE.BufferGeometry(); geometryAttribute(linesGeo, 'position', new THREE.Float32BufferAttribute(linePositions, 3)); geometryAttribute(linesGeo, 'color', new THREE.Float32BufferAttribute(lineColors, 3));
  state.group.add(new THREE.LineSegments(linesGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .92 })));
}
function updatePreview() {
  if (!state.active) return;
  try {
    const data = compiled();
    if (!data) { if (state.group) state.group.visible = false; updatePlayback(); return; }
    state.group && (state.group.visible = true);
    render(foldSteps(data.foldable, data.steps, state.position, state.progress), data);
    updatePlayback();
  } catch (error) { stop(); $('tutorialCaption').textContent = error.message; }
}
function setUpstreamVisible(visible) {
  if (!window.G?.model) return;
  if (!visible) {
    state.originalVisibility = { mesh: G.meshVisible, edges: G.edgesVisible };
    G.meshVisible = false; G.edgesVisible = false;
  } else if (state.originalVisibility) {
    G.meshVisible = state.originalVisibility.mesh; G.edgesVisible = state.originalVisibility.edges;
  }
  G.model.updateMeshVisibility?.(); G.model.updateEdgeVisibility?.();
}
function activate() {
  if (!state.segments.length) { try { setPatternFromSimulator(); } catch (e) { $('stepSelected').textContent = e.message; return; } }
  state.active = true; document.body.classList.add('tutorial-mode'); $('stepStudio').classList.add('active'); $('tutorialToggle').classList.add('on'); $('tutorialToggle').textContent = 'EDIT TUTORIAL';
  setUpstreamVisible(false); ensureGroup(); renderPicker(); updateCanvasGuide(); updatePreview();
}
function exit() {
  stop(); state.active = false; document.body.classList.remove('tutorial-mode'); $('stepStudio').classList.remove('active'); $('tutorialToggle').classList.remove('on'); $('tutorialToggle').textContent = 'CREATE TUTORIAL';
  if (state.group) state.group.visible = false; updateCanvasGuide(); setUpstreamVisible(true);
}
function toggle() { state.active ? exit() : activate(); }
function setAuthorStage(stage) {
  state.authorStage = stage;
  ['select', 'describe', 'preview'].forEach(name => $('authorStage' + name[0].toUpperCase() + name.slice(1)).classList.toggle('active', name === stage));
  ['authorProgress1', 'authorProgress2', 'authorProgress3'].forEach((id, index) => { const el = $(id); el.classList.toggle('active', index === ['select', 'describe', 'preview'].indexOf(stage)); el.classList.toggle('done', index < ['select', 'describe', 'preview'].indexOf(stage)); });
  $('nextStepNumber').textContent = String(state.steps.length + 1); $('addStepNumber').textContent = String(state.steps.length + 1);
  updateCanvasGuide();
}
function updateCanvasGuide() {
  const guide = $('tutorialCanvasGuide'); if (!guide) return;
  const firstStep = state.active && state.authorStage === 'select' && !state.steps.length && !state.draft;
  guide.classList.toggle('visible', firstStep);
  if (firstStep) guide.innerHTML = '<strong>Start with one fold</strong><span>Select a red or blue crease in the tutorial panel to define Step 1.</span>';
}
function bounds() {
  const pts = state.segments.flatMap(s => [s.p1, s.p2]); const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys); const pad = Math.max(maxX - minX, maxY - minY) * .06 || 1;
  return [minX-pad, minY-pad, maxX-minX+2*pad, maxY-minY+2*pad];
}
function pickerMatches(group) {
  const type = $('creaseFilter')?.value || 'all';
  const query = ($('creaseSearch')?.value || '').trim().toLowerCase();
  if (type !== 'all' && group.type !== type) return false;
  if (!query) return true;
  const name = group.type === 'M' ? 'mountain' : 'valley';
  return `${group.id + 1} ${name} ${group.type}`.includes(query);
}
function applyPickerHighlight() {
  const focused = state.hoveredGroup;
  document.querySelectorAll('.step-picker-line').forEach(line => {
    const id = Number(line.dataset.groupId);
    line.classList.toggle('focused', id === focused || state.creaseGroups[id]?.ids.some(crease => state.selected.has(crease)));
  });
  document.querySelectorAll('.crease-list-item').forEach(row => row.classList.toggle('focused', Number(row.dataset.groupId) === focused));
}
function setHoveredGroup(id) { state.hoveredGroup = id; applyPickerHighlight(); }
function renderCreaseList(groups) {
  const list = $('creaseList'); if (!list) return;
  list.replaceChildren(); $('creaseListCount').textContent = `${groups.length} shown`;
  if (!groups.length) { const empty = document.createElement('div'); empty.className = 'step-empty'; empty.textContent = 'No creases match this search.'; list.appendChild(empty); return; }
  groups.forEach(group => {
    const row = document.createElement('button'); row.type = 'button'; row.className = 'crease-list-item'; row.dataset.groupId = group.id; row.setAttribute('aria-pressed', String(group.ids.some(id => state.selected.has(id))));
    const code = document.createElement('span'); code.className = `crease-list-code ${group.type === 'M' ? 'mountain' : 'valley'}`; code.textContent = `${group.type} ${String(group.id + 1).padStart(2, '0')}`;
    const meta = document.createElement('span'); meta.className = 'crease-list-meta'; meta.textContent = `${group.ids.length} connected segment${group.ids.length === 1 ? '' : 's'}`;
    row.append(code, meta); row.addEventListener('click', () => choose(group.ids)); row.addEventListener('mouseenter', () => setHoveredGroup(group.id)); row.addEventListener('mouseleave', () => setHoveredGroup(null));
    list.appendChild(row);
  });
}
function renderPicker() {
  const holder = $('stepPicker'); if (!state.segments.length) { holder.replaceChildren(); return; }
  refreshGroups(); const [x, y, w, h] = bounds(); const ns = 'http://www.w3.org/2000/svg'; const svg = document.createElementNS(ns, 'svg'); svg.setAttribute('viewBox', `${x} ${y} ${w} ${h}`); svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  state.segments.filter(s => s.type === 'B' || s.type === 'U').forEach(s => { const line = document.createElementNS(ns, 'line'); line.setAttribute('x1', s.p1[0]); line.setAttribute('y1', s.p1[1]); line.setAttribute('x2', s.p2[0]); line.setAttribute('y2', s.p2[1]); line.setAttribute('stroke', TYPE[s.type]); line.setAttribute('stroke-width', Math.max(w, h) * .011); line.style.pointerEvents = 'none'; svg.appendChild(line); });
  const shown = state.creaseGroups.filter(pickerMatches);
  state.creaseGroups.forEach(group => {
    const selected = group.ids.some(id => state.selected.has(id)); const visible = document.createElementNS(ns, 'line');
    visible.dataset.groupId = group.id; visible.setAttribute('x1', group.p1[0]); visible.setAttribute('y1', group.p1[1]); visible.setAttribute('x2', group.p2[0]); visible.setAttribute('y2', group.p2[1]); visible.setAttribute('stroke', TYPE[group.type]); visible.setAttribute('stroke-width', Math.max(w, h) * .009); visible.classList.add('step-picker-line'); if (!shown.includes(group)) visible.classList.add('dimmed'); if (selected) visible.classList.add('selected'); svg.appendChild(visible);
    if (!shown.includes(group)) return;
    const hit = document.createElementNS(ns, 'line'); hit.setAttribute('x1', group.p1[0]); hit.setAttribute('y1', group.p1[1]); hit.setAttribute('x2', group.p2[0]); hit.setAttribute('y2', group.p2[1]); hit.setAttribute('stroke-width', Math.max(w, h) * .045); hit.classList.add('step-picker-hit'); hit.setAttribute('tabindex', '0'); hit.setAttribute('role', 'button'); hit.setAttribute('aria-label', `${group.type === 'M' ? 'Mountain' : 'Valley'} crease ${group.id + 1}, ${group.ids.length} connected segment${group.ids.length === 1 ? '' : 's'}`); hit.addEventListener('click', () => choose(group.ids)); hit.addEventListener('mouseenter', () => setHoveredGroup(group.id)); hit.addEventListener('mouseleave', () => setHoveredGroup(null)); hit.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(group.ids); } }); svg.appendChild(hit);
    if (group.id === state.hoveredGroup || selected || shown.length <= 8) { const label = document.createElementNS(ns, 'text'); label.classList.add('step-picker-label'); label.setAttribute('x', (group.p1[0] + group.p2[0]) / 2); label.setAttribute('y', (group.p1[1] + group.p2[1]) / 2); label.setAttribute('text-anchor', 'middle'); label.setAttribute('dominant-baseline', 'central'); label.textContent = String(group.id + 1); svg.appendChild(label); }
  });
  holder.replaceChildren(svg); renderCreaseList(shown); updateSelectionText(); applyPickerHighlight();
}
function choose(ids) { state.draft = null; const allSelected = ids.every(id => state.selected.has(id)); ids.forEach(id => allSelected ? state.selected.delete(id) : state.selected.add(id)); renderPicker(); }
function clearSelection() { state.selected.clear(); state.hoveredGroup = null; renderPicker(); }
function updateSelectionText() { const n = state.selected.size; const copy = $('stepSelected').querySelector('.selection-copy'); if (copy) copy.innerHTML = n ? `<strong>${n} crease${n === 1 ? '' : 's'} selected</strong>They will move together in Step ${state.steps.length + 1}.` : '<strong>No crease selected</strong>Choose a line on the diagram or from the crease list.'; $('continueToDescription').disabled = !n; $('clearCreaseSelection').disabled = !n; }
function makeDraft() {
  if (!state.selected.size) return null;
  return { id: 'draft', title: $('stepTitle').value.trim() || `Step ${state.steps.length + 1}`, caption: $('stepCaption').value.trim(), creases: [...state.selected], angle: Math.min(180, Math.max(1, Number($('stepAngle').value) || 180)), duration: Math.min(12, Math.max(.3, Number($('stepDuration').value) || 1.8)), direction: $('stepDirection').value };
}
function previewDraft() {
  const draft = makeDraft(); if (!draft) return;
  stop(); state.draft = draft; state.position = state.steps.length; state.progress = 0;
  $('stepReviewSummary').textContent = `Step ${state.steps.length + 1}: ${draft.title}\n${draft.creases.length} selected crease${draft.creases.length === 1 ? '' : 's'} · ${draft.angle}° · ${draft.duration}s\n${draft.caption || 'No learner instruction entered yet.'}`;
  setAuthorStage('preview'); updatePreview(); play();
}
function beginDescription() { state.draft = null; setAuthorStage('describe'); }
function editDraft() { state.draft = null; setAuthorStage('describe'); }
function addStep() {
  const step = state.draft || makeDraft(); if (!step) return;
  if (step.direction !== 'pattern') state.segments.forEach(s => { if (step.creases.includes(s.id)) s.type = step.direction; });
  state.steps.push({ ...step, id: crypto.randomUUID?.() || String(Date.now()) }); state.draft = null;
  state.selected.clear(); state.position = Math.max(0, state.steps.length - 1); state.progress = 0; $('stepTitle').value = ''; $('stepCaption').value = ''; renderPicker(); renderSteps(); setAuthorStage('select'); updatePreview();
}
function removeStep(index) { stop(); state.steps.splice(index, 1); state.position = Math.min(state.position, state.steps.length); state.progress = 0; renderSteps(); updatePreview(); }
function renderSteps() {
  const list = $('stepList'); list.replaceChildren();
  if (!state.steps.length) { const empty = document.createElement('div'); empty.className = 'step-empty'; empty.textContent = 'No steps yet. Select a crease and add the first fold.'; list.appendChild(empty); return; }
  state.steps.forEach((step, index) => { const row = document.createElement('div'); row.className = 'step-row' + (index === state.position ? ' active' : ''); const name = document.createElement('button'); name.className = 'step-row-name'; name.textContent = `${index + 1}. ${step.title}`; name.title = step.caption || step.title; name.onclick = () => { stop(); state.position = index; state.progress = 0; renderSteps(); updatePreview(); }; const del = document.createElement('button'); del.textContent = 'REMOVE'; del.onclick = () => removeStep(index); row.append(name, del); list.appendChild(row); });
}
function updatePlayback() {
  const allSteps = workingSteps(), total = allSteps.length, step = allSteps[state.position], isDraft = !!state.draft && state.position === state.steps.length; $('tutorialProgress').textContent = total ? `${Math.min(state.position + 1, total)} / ${total}${isDraft ? ' DRAFT' : ''}` : '0 / 0'; $('tutorialStepLabel').textContent = step ? `${isDraft ? 'Preview' : state.position + 1}. ${step.title}` : 'No steps yet'; $('tutorialCaption').textContent = step?.caption || (step ? 'Use the controls to preview this fold.' : 'Create the first step in the editor.');
  $('tutorialPrevious').disabled = !total || state.position === 0 && state.progress === 0; $('tutorialNext').disabled = !total || state.position >= total; $('tutorialPlay').disabled = !total || state.position >= total; $('tutorialPlay').textContent = state.playing ? 'PAUSE' : 'PLAY STEP';
}
function stop() { state.playing = false; if (state.raf) cancelAnimationFrame(state.raf); state.raf = 0; updatePlayback(); }
function play() { const step = workingSteps()[state.position]; if (!step) return; if (state.playing) { stop(); return; } state.playing = true; state.startedAt = performance.now() - state.progress * step.duration * 1000; const frame = now => { if (!state.playing) return; const d = step.duration * 1000; state.progress = Math.min(1, (now - state.startedAt) / d); updatePreview(); if (state.progress >= 1) { state.playing = false; updatePlayback(); return; } state.raf = requestAnimationFrame(frame); }; state.raf = requestAnimationFrame(frame); updatePlayback(); }
function previous() { stop(); if (state.progress > 0) state.progress = 0; else { state.position = Math.max(0, state.position - 1); state.progress = 0; } renderSteps(); updatePreview(); }
function next() { stop(); const total = workingSteps().length; if (!total) return; if (state.position < total) { state.position++; state.progress = 0; } renderSteps(); updatePreview(); }
function tutorialData() { return { format: 'fold-lab-tutorial', version: 1, title: state.title, sourceName: state.name, createdAt: new Date().toISOString(), segments: state.segments.map(cloneSegment), steps: state.steps.map(s => ({ ...s, creases: [...s.creases] })) }; }
function save() { if (!state.segments.length) return; const blob = new Blob([JSON.stringify(tutorialData(), null, 2)], { type: 'application/json' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `${(state.title || 'origami-tutorial').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'origami-tutorial'}.origami-tutorial.json`; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000); }
function load(data) {
  if (!data || data.format !== 'fold-lab-tutorial' || data.version !== 1 || !Array.isArray(data.segments) || !Array.isArray(data.steps)) throw Error('This is not a Fold Lab tutorial file.');
  state.name = data.sourceName || 'Shared tutorial'; state.title = String(data.title || 'Untitled folding tutorial'); state.segments = data.segments.map((s, i) => ({ id: i, p1: [...s.p1], p2: [...s.p2], type: safeType(s.type) })); state.steps = data.steps.map((s, i) => ({ id: s.id || String(i), title: String(s.title || `Step ${i + 1}`), caption: String(s.caption || ''), creases: [...new Set((s.creases || []).filter(n => Number.isInteger(n) && n >= 0 && n < data.segments.length))], angle: Math.min(180, Math.max(1, Number(s.angle) || 180)), duration: Math.min(12, Math.max(.3, Number(s.duration) || 1.8)) })); state.selected.clear(); state.draft = null; state.position = 0; state.progress = 0; $('tutorialTitle').value = state.title; renderPicker(); renderSteps(); setAuthorStage('select'); if (!state.active) activate(); else updatePreview();
}
function setPatternFromSimulator(detail = {}) {
  if (state.active) exit(); stop(); state.name = detail.name || $('modelName')?.textContent || 'Untitled pattern'; state.title = 'Untitled folding tutorial'; state.segments = currentFoldSegments(); state.steps = []; state.selected.clear(); state.draft = null; state.position = 0; state.progress = 0; $('tutorialTitle').value = state.title; renderPicker(); renderSteps(); setAuthorStage('select');
}
function initialize() {
  $('tutorialToggle').onclick = toggle; $('tutorialExit').onclick = exit; $('continueToDescription').onclick = beginDescription; $('backToSelection').onclick = () => { state.draft = null; setAuthorStage('select'); updatePreview(); }; $('continueToPreview').onclick = previewDraft; $('backToDescription').onclick = editDraft; $('addTutorialStep').onclick = addStep; $('tutorialPrevious').onclick = previous; $('tutorialNext').onclick = next; $('tutorialPlay').onclick = play; $('saveTutorial').onclick = save; $('clearCreaseSelection').onclick = clearSelection; $('creaseSearch').addEventListener('input', renderPicker); $('creaseFilter').addEventListener('change', renderPicker);
  $('tutorialTitle').addEventListener('input', e => { state.title = e.target.value.trim() || 'Untitled folding tutorial'; });
  $('openTutorial').addEventListener('change', async e => { const file = e.target.files?.[0]; e.target.value = ''; if (!file) return; try { load(JSON.parse(await file.text())); } catch (error) { $('stepSelected').textContent = error.message; } });
  window.addEventListener('foldlab:pattern-ready', e => { try { setPatternFromSimulator(e.detail); } catch (_) {} });
  window.StepStudio = { activate, exit, setPatternFromSimulator, getState: () => ({ active: state.active, steps: state.steps.length, segments: state.segments.length, position: state.position, progress: state.progress }), addStep, tutorialData, load };
  if (window.G?.model?.getNodes?.().length) { try { setPatternFromSimulator(); } catch (_) {} }
}
initialize();
