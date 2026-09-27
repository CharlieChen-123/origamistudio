/* Shared entry point for both CP Designer HTML variants. */
(function () {
  'use strict';
  let overlay = null, frame = null, payload = null;
  const button = document.createElement('button');
  button.className = 'exp-btn simulation-launch';
  button.textContent = 'Fold Lab';
  button.title = 'Open this crease pattern in OrigamiSimulator';
  (document.querySelector('.workflow-switch') || document.querySelector('.header-export')).append(button);
  function close() { if (overlay) overlay.remove(); overlay = frame = payload = null; button.focus(); }
  async function makePayload() {
    await restorePresetMetadata();
    const source = window.CPDesignerPreset?.matchingSourcePreset?.();
    if (source?.url) {
      try {
        const response = await fetch(source.url);
        if (response.ok) return { type: 'cp-simulator:import', name: source.name + '.svg', text: await response.text() };
        throw Error('Could not read the original preset. Please try again.');
      } catch (error) { throw Error('Could not read the original preset: ' + error.message); }
    }
    return { type: 'cp-simulator:import', name: 'CP Designer pattern.svg', text: CPImport.designerSVG(cp) };
  }
  // Older saved drawings contain coordinates only. Recover metadata only on an
  // exact geometry/type match, never by guessing from the current model name.
  async function restorePresetMetadata() {
    const library=window.ORIGAMI_PRESETS || [];
    const known=library.find(p=>p.url===cp.sourcePreset?.url);
    if(known && cp.sourcePreset.support) return;
    const candidates=known?[known]:library;
    for(const preset of candidates){
      const response=await fetch(preset.url);
      if(!response.ok) throw Error('Could not read preset '+preset.name);
      const lines=orientPresetLines(sourcePresetLines(await response.text()),preset);
      const same=(a,b)=>Math.abs(a-b)<1e-7;
      const matches=cp.lines.length===lines.length && cp.lines.every((a,i)=>{
        const b=lines[i];return a.lt===b.lt && same(a.p1.x,b.p1.x)&&same(a.p1.y,b.p1.y)&&same(a.p2.x,b.p2.x)&&same(a.p2.y,b.p2.y) && (a.opacity===undefined||same(a.opacity,b.opacity));
      });
      if(matches){
        cp.lines.forEach((l,i)=>l.opacity=lines[i].opacity);
        cp.sourcePreset={name:preset.name,url:preset.url,paper:cp.paperShape,aspect:cp.paperAspect||1,lines:cloneSourceLines(lines),support:lines.support};
        saveToLocal();return;
      }
      if(known){cp.sourcePreset.support=lines.support;saveToLocal();return;}
    }
  }
  window.CPDesignerHandoff={makePayload};
  button.onclick = async () => {
    button.disabled = true;
    try { payload = await makePayload(); }
    catch (error) { toastMsg(error.message); button.disabled = false; return; }
    overlay = document.createElement('section');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', '3D fold simulation');
    overlay.setAttribute('aria-modal', 'true');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;background:#f3f0ea;display:flex;flex-direction:column';
    frame = document.createElement('iframe'); frame.title = '3D origami simulator'; frame.src = 'origami-3d.html?embedded=1'; frame.style.cssText = 'border:0;width:100%;flex:1;min-height:0';
    overlay.append(frame); document.body.append(overlay); frame.focus();
    button.disabled = false;
  };
  window.addEventListener('message', event => {
    if (frame && event.source === frame.contentWindow && event.origin === location.origin && event.data?.type === 'cp-simulator:close') { close(); return; }
    if (!frame || event.source !== frame.contentWindow || event.origin !== location.origin || event.data?.type !== 'cp-simulator:ready') return;
    frame.contentWindow.postMessage(payload, location.origin === 'null' ? '*' : location.origin);
  });
})();
