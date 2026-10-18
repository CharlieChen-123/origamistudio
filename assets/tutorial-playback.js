// Viewer preferences are independent of authored step duration and paper geometry.
export function mountTutorialPlayback(api){
  const {state,$,stop,play,updatePose}=api;
  const controls=document.createElement('div');controls.id='playbackOptions';controls.innerHTML=`<label>Speed<select id="playbackSpeed" aria-label="Animation speed"><option value="0.25">0.25×</option><option value="0.5">0.5×</option><option value="0.75">0.75×</option><option value="1" selected>1×</option><option value="1.5">1.5×</option><option value="2">2×</option></select></label><label><input id="continuousPlayback" type="checkbox"> Auto next</label><button id="separatePaper" aria-pressed="false">Separate layers</button><label class="clarity-control"><input id="clearPaperLayers" type="checkbox" checked> Clear layers</label>`;
  const creaseControl=document.createElement('label');creaseControl.innerHTML='<span>Creases</span><select id="creaseView" aria-label="Crease display"><option value="current">Current fold</option><option value="all">All M/V</option><option value="none">Paper only</option></select>';controls.append(creaseControl);
  $('lessonPlayer').append(controls);
  $('creaseView').onchange=()=>{state.creaseView=$('creaseView').value;updatePose();};
  const pan=document.createElement('button');pan.id='panTutorialView';pan.textContent='Pan';pan.title='Pan the view. Also available with Shift-drag, right-drag or middle-drag.';pan.setAttribute('aria-pressed','false');controls.append(pan);pan.onclick=()=>{const on=G.friendlyView.panMode(!G.friendlyView.panMode());pan.setAttribute('aria-pressed',String(on));pan.textContent=on?'Pan: on':'Pan';};
  function layout(){const canvas=$('threeContainer'),player=$('lessonPlayer');if(!state.active||state.phase!=='preview'||player.hidden){canvas.style.removeProperty('bottom');return;}const bottom=Math.max(0,innerHeight-player.getBoundingClientRect().top+8)+'px';if(canvas.style.bottom!==bottom)canvas.style.bottom=bottom;}
  new ResizeObserver(layout).observe($('lessonPlayer'));window.addEventListener('resize',layout);
  $('playbackSpeed').onchange=()=>{state.speed=Number($('playbackSpeed').value);};
  $('continuousPlayback').onchange=()=>{state.continuous=$('continuousPlayback').checked;};
  $('clearPaperLayers').onchange=()=>{state.clearLayers=$('clearPaperLayers').checked;updatePose();};
  $('separatePaper').onclick=()=>{stop();state.separateLayers=!state.separateLayers;updatePose();};
  const cue=document.createElement('div');cue.id='motionCue';cue.setAttribute('role','status');$('threeContainer').append(cue);
  const pause=document.createElement('label');pause.className='pause-after-setting';pause.innerHTML='<input id="pauseAfterStep" type="checkbox"> Pause here for the learner';$('authorReview').append(pause);
  $('pauseAfterStep').onchange=()=>{if(state.draft)state.draft.pauseAfter=$('pauseAfterStep').checked;api.persist();};
  const savedPause=document.createElement('button');savedPause.id='togglePauseAfter';$('savedStepActions').append(savedPause);savedPause.onclick=()=>{const a=state.actions[state.selectedIndex];if(!a)return;a.pauseAfter=!a.pauseAfter;api.changed();frame();};
  const save=$('saveLesson');document.querySelector('.header-actions').append(save);save.title='Download your tutorial, including the current preview';
  const saveStatus=document.createElement('span');saveStatus.id='tutorialSaveStatus';saveStatus.setAttribute('role','status');document.querySelector('header').after(saveStatus);
  const quick=document.createElement('div');quick.id='previewMotionTweaks';quick.innerHTML='<span class="flow-eyebrow">ADJUST & REPLAY</span><div><label>Angle<input id="previewFoldAngle" type="number" min="1" max="180" step="1"></label><label>Direction<select id="previewFoldDirection"><option value="toward">Towards you</option><option value="away">Away from you</option></select></label></div><button id="previewChooseLayers">Choose layers</button><p id="previewMotionError" role="status"></p>';$('authorReview').before(quick);
  const wording=document.createElement('details');wording.id='stepWording';wording.innerHTML='<summary>Step title & instructions</summary>';$('authorReview').prepend(wording);wording.append($('reviewTitle').closest('label'),$('reviewCaption').closest('label'));
  function change(){if(!state.draft||state.draft.kind!=='fold')return;const a=structuredClone(state.draft),angle=Math.max(1,Math.min(180,Number($('previewFoldAngle').value)||180));a.angle=angle*a.side*($('previewFoldDirection').value==='toward'?1:-1);api.replacePreview(a);}
  $('previewFoldAngle').onchange=change;$('previewFoldDirection').onchange=change;$('previewChooseLayers').onclick=api.choosePreviewLayers;
  function frame(){
    if(!state.active||state.phase!=='preview')layout();
    const a=state.draft||state.actions[state.selectedIndex];
    $('separatePaper').setAttribute('aria-pressed',String(state.separateLayers));$('separatePaper').textContent=state.separateLayers?'Close layers':'Separate layers';
    cue.hidden=!state.active||state.phase!=='preview';const text=state.separateLayers?'Layers separated for inspection · Close layers to resume':state.progress>=1?(a?.pauseAfter?'Checkpoint · inspect the fold, then choose Next step':'Step complete · check the alignment'):state.progress<.04?'Watch the highlighted paper move':a?.kind==='unfold'?'Open the paper · keep the precrease':a?.template==='turn'?'Turn the whole paper': 'Highlighted paper is moving';if(cue.textContent!==text)cue.textContent=text;
    savedPause.textContent=a?.pauseAfter?'Learner pause: on':'Pause after this step';
  }
  function preview(){
    quick.hidden=state.draft?.kind!=='fold';$('pauseAfterStep').checked=!!state.draft?.pauseAfter;
    if(state.draft?.kind==='fold'){$('previewFoldAngle').value=Math.abs(state.draft.angle);$('previewFoldDirection').value=state.draft.angle*state.draft.side>0?'toward':'away';}
    $('previewMotionError').textContent='';if(state.draft)$('saveLesson').disabled=false;frame();layout();
  }
  return {frame,preview};
}
