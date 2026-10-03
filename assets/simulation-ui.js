/* Import and UI orchestration for the vendored GPU solver. */
'use strict';
var importBusy = false;
var pendingImport = null;
var importBlobURL = null;
var importResolve = null;

function setImportBusy(busy) {
  importBusy = busy;
  document.querySelectorAll('#bar button,#foldRange,#cpFile,#mergeTolerance,.model-btn').forEach(el => el.disabled = busy);
  document.querySelector('.import-button').style.opacity = busy ? '.5' : '1';
}
function finishImport(error) {
  if (waitTimer) { clearInterval(waitTimer); waitTimer = null; }
  if (importBlobURL) { URL.revokeObjectURL(importBlobURL); importBlobURL = null; }
  if (error) {
    showError(error.message || String(error));
    document.getElementById('modelName').textContent = 'Import failed · correct the pattern and try again';
    document.getElementById('threeContainer').style.visibility = 'hidden';
    document.getElementById('svgViewer').replaceChildren();
  } else if (pendingImport) {
    document.getElementById('modelName').textContent = pendingImport.name;
    document.getElementById('headerPatternName').textContent = pendingImport.name;
    document.getElementById('threeContainer').style.visibility = 'visible';
    currentId = pendingImport.id || null;
    markActive(currentId);
    const credit = document.getElementById('modelCredit');
    credit.replaceChildren();
    const preset = (window.ORIGAMI_PRESETS || []).find(p => p.id === currentId);
    if (preset) {
      credit.append(document.createTextNode(preset.credit + ' '));
      const link = document.createElement('a');
      link.href = 'credits.html#' + preset.id;
      link.target = '_blank'; link.rel = 'noopener'; link.textContent = 'Source & credits';
      credit.append(link);
    }
    window.dispatchEvent(new CustomEvent('foldlab:pattern-ready', { detail: { name: pendingImport.name } }));
  }
  pendingImport = null; loadState = null; setImportBusy(false);
  if (importResolve) { const resolve = importResolve; importResolve = null; resolve(!error); }
}
async function importModelSource(source) {
  if (!G || importBusy) return false;
  const complete = new Promise(resolve => importResolve = resolve);
  setImportBusy(true); pendingImport = source;
  document.getElementById('modelCredit').replaceChildren();
  playing = false; updatePlayButton(); setFoldPercent(0);
  document.getElementById('err').style.display = 'none';
  document.getElementById('notice').textContent = '';
  document.getElementById('modelName').textContent = 'Importing ' + source.name + ' …';
  setStatus('Processing crease pattern…');
  try {
    const ext = source.name.split('.').pop().toLowerCase();
    if (!['svg', 'fold'].includes(ext)) throw Error('Only SVG and FOLD files are supported. Trace PNG or JPG images into a vector crease pattern first.');
    const tolerance = Number(document.getElementById('mergeTolerance').value);
    if (!Number.isFinite(tolerance) || tolerance < 0.001 || tolerance > 1) throw Error('Merge tolerance must be between 0.001% and 1% of the paper width.');
    let text = source.text;
    if (source.url) {
      if (location.protocol === 'file:') throw Error('Examples require a local server. Double-click start-origami.cmd, then open the simulator from CP Designer.');
      const response = await fetch(source.url, { signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw Error('Could not read the example (' + response.status + ').');
      text = await response.text();
    }
    if (typeof text !== 'string' || text.length > 10 * 1024 * 1024) throw Error('Choose a crease pattern smaller than 10 MB.');
    const prepared = ext === 'fold' ? CPImport.prepareFOLD(text) : await CPImport.prepareSVG(text);
    if (prepared.ignored) document.getElementById('notice').textContent = prepared.ignored + ' guide or invisible object(s) were ignored.';
    G.vertTol = prepared.exact ? 0.000001 : 400 * tolerance / 100;
    G.filename = source.name; G.extension = ext;
    loadState = { arrived: false };
    if (prepared.fold) { G.pattern.setFoldData(prepared.fold, false); waitForModel(); }
    else {
      importBlobURL = URL.createObjectURL(new Blob([prepared.svg], { type: 'image/svg+xml' }));
      G.pattern.loadSVG(importBlobURL, !!source.id, { complete: waitForModel, error: finishImport });
    }
  } catch (error) { finishImport(error); }
  return complete;
}
async function importFile(file) {
  if (!file || importBusy) return false;
  if (file.size > 10 * 1024 * 1024) { showError('Choose a crease pattern smaller than 10 MB.'); return false; }
  try { return await importModelSource({ name: file.name, text: await file.text() }); }
  catch (error) { showError(error.message); return false; }
}
function initImportUI() {
  document.getElementById('err').onclick = function () { this.style.display = 'none'; };
  document.getElementById('cpFile').onchange = async function () { const file = this.files[0]; this.value = ''; await importFile(file); };
  window.addEventListener('dragover', e => { e.preventDefault(); document.body.classList.add('dragover'); });
  window.addEventListener('dragleave', e => { if (!e.relatedTarget) document.body.classList.remove('dragover'); });
  window.addEventListener('drop', e => { e.preventDefault(); document.body.classList.remove('dragover'); importFile(e.dataTransfer.files[0]); });
  const embedded = new URLSearchParams(location.search).get('embedded') === '1' && window.parent !== window;
  if (embedded) {
    document.body.classList.add('embedded');
    const designTab = document.querySelector('.workspace-tab');
    designTab?.addEventListener('click', event => {
      event.preventDefault();
      window.parent.postMessage({ type: 'cp-simulator:close' }, location.origin === 'null' ? '*' : location.origin);
    });
    window.addEventListener('message', e => {
      if (e.source !== window.parent || e.origin !== location.origin || e.data?.type !== 'cp-simulator:import') return;
      importModelSource({ name: e.data.name, text: e.data.text });
    });
    window.parent.postMessage({ type: 'cp-simulator:ready' }, location.origin === 'null' ? '*' : location.origin);
  } else loadModel(MIT_MODELS[0]);
}
