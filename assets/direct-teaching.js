import {prepareAction,flapCandidates,accessibleSeeds,pointInPolygon} from '../simulator/src/action-fold.js';
import {fromPlane,toPlane} from '../simulator/src/authoring-tools.js';
import {validateLesson} from '../simulator/src/lesson-operations.js';
import {inspectMotion,motionRecovery} from '../simulator/src/motion-inspection.js';
import {barycentric,resolveAnchor,validateTeaching,teachingCueAt,foldAngleAtPoint} from '../simulator/src/teaching-tools.js';

const NS='http://www.w3.org/2000/svg',clone=x=>structuredClone(x);
const html=(tag,attrs={},text)=>{const n=document.createElement(tag);Object.assign(n,attrs);if(text!==undefined)n.textContent=text;return n;};
const svg=(tag,attrs={},text)=>{const n=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);if(text!==undefined)n.textContent=text;return n;};
const button=(id,text,fn)=>{const b=html('button',{id,type:'button'},text);b.onclick=fn;return b;};

export function mountDirectTeaching(api){
  const {state,$,stop,play,updatePose,persist,changed,frame,toScene,currentFaces,sheet}=api;
  const host=$('threeContainer'),canvas=()=>G?.threeView?.renderer.domElement;
  let edit=false,drag=null,placement=null,pendingFrame=0,previewOrigin=null,inspection=null,observed=null,viewBeforeDetail=null,lastCue=null,lastProgress=-1,annotationsOn=true,followDetail=true;
  const action=()=>state.draft||state.actions[state.selectedIndex];
  const canAuthor=()=>state.active&&!state.builtIn&&!document.body.classList.contains('story-viewing')&&state.phase==='preview';
  const prepared=()=>state.draft?state.preparedDraft:state.sequence?.prepared[state.selectedIndex];

  const review=html('section',{id:'directMotionReview',hidden:true,className:'direct-review'});
  review.innerHTML='<div class="direct-review-heading"><strong>Moving paper</strong><button id="inspectMovingPaper" type="button" aria-pressed="false">Inspect</button></div><p id="movingPaperSummary"></p><div class="direct-actions"><button id="editOnPaper" type="button">Adjust on paper</button><button id="directChooseLayers" type="button">Change layers</button></div><div id="directEditControls" hidden><p>Drag the two fold-line handles, or drag the tip to change the angle.</p><label>Fold angle <output id="directAngleValue"></output><input id="directAngle" aria-label="Direct fold angle" type="range" min="1" max="180" step="1"></label><div class="direct-actions"><button id="compareMotion" aria-pressed="false">Original</button><button id="resetMotionAdjustments">Reset adjustments</button><button id="finishDirectEdit">Done</button></div></div><p id="motionInspection" role="status"></p><button id="inspectCrossing" hidden>Inspect crossing</button>';
  $('previewControls').prepend(review);
  const failure=html('section',{id:'motionRecovery',hidden:true,className:'motion-recovery'});
  failure.innerHTML='<strong id="motionRecoveryTitle"></strong><p id="motionRecoveryHint"></p><button id="motionRecoveryAction"></button><button id="dismissMotionRecovery">Dismiss</button>';
  $('defineControls').before(failure);
  $('dismissMotionRecovery').onclick=()=>failure.hidden=true;
  function motionError(error){
    const recovery=motionRecovery(error);failure.hidden=false;$('actionMessage').hidden=true;$('motionRecoveryTitle').textContent=recovery.title;$('motionRecoveryHint').textContent=recovery.hint;
    const target=recovery.action==='layers'?(state.phase==='preview'?'previewChooseLayers':'openLayerPicker'):recovery.action==='surface'?'workSurface':recovery.action==='move'?'changeAction':state.phase==='preview'?'editAction':'clearAxis';
    $('motionRecoveryAction').textContent=recovery.action==='layers'?'Review moving layers':recovery.action==='surface'?'Choose a work surface':recovery.action==='move'?'Choose another move':'Adjust the fold line';
    $('motionRecoveryAction').onclick=()=>{failure.hidden=true;if(recovery.action==='surface'&&state.phase==='preview')$('editAction').click();const control=$(target);if(control?.tagName==='SELECT'){api.setComposerPane('choose');control.focus();}else if(control&&!control.disabled)control.click();};
  }

  const overlay=svg('svg',{id:'paperTeachingOverlay','aria-label':'Paper annotations and motion handles'});host.append(overlay);
  const hint=html('div',{id:'paperPlacementHint',hidden:true,role:'status'}),hintText=html('span');hint.append(hintText,button('cancelPaperPlacement','Cancel',cancelPlacement));host.append(hint);
  const teach=html('details',{id:'teachingEditor',className:'teaching-editor',hidden:true});
  teach.innerHTML='<summary>Teaching notes</summary><div class="teaching-tools"><button id="addPaperLabel">Add label</button><button id="addPaperArrow">Add arrow</button><button id="addTeachingCheckpoint">Add checkpoint</button></div><div id="teachingItems"></div><p id="teachingEmpty">Place a mark on the paper, or pause at an important moment.</p>';
  review.after(teach);
  const noteDialog=html('dialog',{id:'teachingNoteDialog',className:'teaching-dialog'});
  noteDialog.innerHTML='<form method="dialog"><h2 id="teachingNoteTitle">Paper label</h2><label>Text<input id="teachingNoteText" maxlength="240" placeholder="For example: Fold only the top layer"></label><div class="teaching-time"><label>Show from (%)<input id="teachingNoteStart" type="number" min="0" max="100" step="1" value="0"></label><label>Until (%)<input id="teachingNoteEnd" type="number" min="0" max="100" step="1" value="100"></label></div><p id="teachingNoteError" role="alert"></p><div class="teaching-dialog-actions"><button type="button" id="repositionTeachingMark">Reposition</button><button value="cancel">Cancel</button><button type="button" id="saveTeachingMark" class="primary">Save mark</button></div></form>';
  const cueDialog=html('dialog',{id:'teachingCueDialog',className:'teaching-dialog'});
  cueDialog.innerHTML='<form method="dialog"><h2>Teaching checkpoint</h2><label>At (%)<input id="teachingCueAt" type="number" min="1" max="100" step="1"></label><label>Instruction<input id="teachingCueText" maxlength="240" placeholder="For example: Check that these edges line up"></label><label class="teaching-checkbox"><input id="teachingCuePause" type="checkbox" checked> Pause for the learner</label><div class="teaching-focus-controls"><button id="chooseTeachingFocus" type="button">Choose a detail on the paper</button><button id="removeTeachingFocus" type="button" hidden>Remove detail view</button><label id="teachingFocusZoomLabel" hidden>Detail zoom <select id="teachingFocusZoom"><option value="1.3">1.3×</option><option value="1.6" selected>1.6×</option><option value="2">2×</option><option value="2.5">2.5×</option><option value="3">3×</option></select></label></div><p id="teachingCueError" role="alert"></p><div class="teaching-dialog-actions"><button value="cancel">Cancel</button><button id="saveTeachingCue" type="button" class="primary">Save checkpoint</button></div></form>';
  document.body.append(noteDialog,cueDialog);
  const checkpoints=html('nav',{id:'teachingCheckpoints',ariaLabel:'Teaching checkpoints',hidden:true});$('lessonPlayer').append(checkpoints);
  const cueCard=html('div',{id:'teachingCueCard',hidden:true,role:'status'}),cueText=html('span',{id:'teachingCueInstruction'}),cueContinue=button('continueTeachingCheckpoint','Continue',()=>{play();});
  const fullView=button('returnTeachingFullView','Full view',restoreDetail);cueCard.append(cueText,cueContinue,fullView);host.append(cueCard);
  const preferences=html('div',{id:'teachingViewerOptions',hidden:true});preferences.innerHTML='<label><input id="showTeachingMarks" type="checkbox" checked> Teaching marks</label><label><input id="followTeachingDetails" type="checkbox" checked> Detail views</label>';$('playbackOptions').append(preferences);
  $('showTeachingMarks').onchange=()=>{annotationsOn=$('showTeachingMarks').checked;draw();};$('followTeachingDetails').onchange=()=>{followDetail=$('followTeachingDetails').checked;if(!followDetail)restoreDetail();else {lastCue=null;playbackFrame();}};

  let note=null,cue=null,noteIndex=-1,cueIndex=-1,noteOwner=null,cueOwner=null;
  function setTeaching(value){
    const a=action();if(!canAuthor()||!a)throw Error('Make an editable copy to add teaching notes.');
    validateTeaching({...a,teaching:value},state.initial);a.teaching=clone(value);
    if(state.draft){state.editMetadata={...state.editMetadata,teaching:a.teaching};persist();}else changed();
    refreshTeaching();lastCue=null;playbackFrame();draw();
  }
  function data(){return clone(action()?.teaching||{marks:[],cues:[]});}
  function beginPlacement(kind,index=-1,source=null){
    if(!canAuthor())return;stop();finishEdit();state.separateLayers=false;placement={kind,index,points:[],owner:action(),source};
    hint.hidden=false;hintText.textContent=kind==='arrow'?'Click the arrow’s starting point on the paper.':kind==='focus'?'Click the detail the learner should see.':'Click the paper where the label should point.';
    overlay.classList.add('placing');G.friendlyView.enable(false);updatePose();
  }
  function cancelPlacement(){placement=null;hint.hidden=true;overlay.classList.remove('placing');G.friendlyView.enable(state.active&&state.phase==='preview');draw();}
  $('addPaperLabel').onclick=()=>beginPlacement('label');$('addPaperArrow').onclick=()=>beginPlacement('arrow');
  $('addTeachingCheckpoint').onclick=()=>openCue(-1,{at:Math.max(.01,Math.round((state.progress||.5)*100)/100),text:'',pause:true});
  function openNote(index,value){noteIndex=index;note=clone(value);noteOwner=action();$('teachingNoteTitle').textContent=note.kind==='arrow'?'Paper arrow':'Paper label';$('teachingNoteText').value=note.text||'';$('teachingNoteStart').value=String(Math.round(note.start*100));$('teachingNoteEnd').value=String(Math.round(note.end*100));$('teachingNoteError').textContent='';noteDialog.showModal();$('teachingNoteText').focus();}
  function readNote(){return {...note,text:$('teachingNoteText').value.trim(),start:Number($('teachingNoteStart').value)/100,end:Number($('teachingNoteEnd').value)/100};}
  $('saveTeachingMark').onclick=()=>{try{if(action()!==noteOwner)throw Error('The current step changed. Open the mark again.');const next=readNote();if(next.kind==='label'&&!next.text)throw Error('Add a short label for this paper point.');const t=data();t.marks??=[];if(noteIndex<0)t.marks.push(next);else t.marks[noteIndex]=next;setTeaching(t);noteDialog.close();}catch(e){$('teachingNoteError').textContent=e.message;}};
  $('repositionTeachingMark').onclick=()=>{const next=readNote();noteDialog.close();beginPlacement(next.kind,noteIndex,next);};
  function openCue(index,value){stop();cueIndex=index;cue=clone(value);cueOwner=action();$('teachingCueAt').value=String(Math.round(cue.at*100));$('teachingCueText').value=cue.text||'';$('teachingCuePause').checked=cue.pause!==false;$('teachingFocusZoom').value=String(cue.focus?.zoom||1.6);$('removeTeachingFocus').hidden=$('teachingFocusZoomLabel').hidden=!cue.focus;$('chooseTeachingFocus').textContent=cue.focus?'Change detail point':'Choose a detail on the paper';$('teachingCueError').textContent='';cueDialog.showModal();}
  function readCue(){return {...cue,at:Number($('teachingCueAt').value)/100,text:$('teachingCueText').value.trim(),pause:$('teachingCuePause').checked,...(cue.focus?{focus:{...cue.focus,zoom:Number($('teachingFocusZoom').value)}}:{})};}
  $('chooseTeachingFocus').onclick=()=>{cue=readCue();if(!Number.isFinite(cue.at)||cue.at<=0||cue.at>1){$('teachingCueError').textContent='Choose a time between 1% and 100%.';return;}cueDialog.close();state.progress=cue.at;updatePose();beginPlacement('focus',cueIndex,cue);};
  $('removeTeachingFocus').onclick=()=>{const next=readCue();delete next.focus;cueDialog.close();openCue(cueIndex,next);};
  $('saveTeachingCue').onclick=()=>{try{if(action()!==cueOwner)throw Error('The current step changed. Open the checkpoint again.');const next=readCue();if(!next.text&&!next.focus)throw Error('Add an instruction or choose a detail to show.');const t=data();t.cues??=[];if(cueIndex<0)t.cues.push(next);else t.cues[cueIndex]=next;t.cues.sort((a,b)=>a.at-b.at);setTeaching(t);cueDialog.close();}catch(e){$('teachingCueError').textContent=e.message;}};

  function refreshTeaching(){
    const a=action(),t=a?.teaching||{},items=$('teachingItems');items.replaceChildren();checkpoints.replaceChildren();
    teach.hidden=!canAuthor()||a?.kind==='demo';$('teachingEmpty').hidden=!!(t.marks?.length||t.cues?.length);
    (t.marks||[]).forEach((m,i)=>{const row=html('div',{className:'teaching-item'});row.append(button('',m.text||'Paper arrow',()=>openNote(i,m)),button('','Remove',()=>{const next=data();next.marks.splice(i,1);setTeaching(next);}));row.lastChild.setAttribute('aria-label',`Remove mark ${i+1}`);items.append(row);});
    (t.cues||[]).forEach((c,i)=>{const title=Math.round(c.at*100)+'% · '+(c.text||'Detail view'),row=html('div',{className:'teaching-item'});row.append(button('',title,()=>openCue(i,c)),button('','Remove',()=>{const next=data();next.cues.splice(i,1);setTeaching(next);}));row.lastChild.setAttribute('aria-label',`Remove checkpoint ${i+1}`);items.append(row);const jump=button('',Math.round(c.at*100)+'%',()=>{stop();state.progress=c.at;lastCue=null;updatePose();});jump.title=c.text||'Show detail';jump.setAttribute('aria-label',title);checkpoints.append(jump);});
    checkpoints.hidden=!(t.cues?.length&&state.active&&state.phase==='preview');preferences.hidden=!(t.marks?.length||t.cues?.some(c=>c.focus));
  }
  function rayAt(event){const r=canvas().getBoundingClientRect(),ray=new THREE.Raycaster();G.threeView.camera.updateMatrixWorld();ray.setFromCamera(new THREE.Vector2((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1),G.threeView.camera);return ray.ray;}
  function pickPaper(event){
    const ray=rayAt(event);let closest=null,distance=Infinity;
    for(const f of currentFaces(state.progress))for(let i=1;i<f.vertices.length-1;i++){
      const tri=[f.vertices[0],f.vertices[i],f.vertices[i+1]],points=tri.map(v=>new THREE.Vector3(...toScene(v.p))),hit=ray.intersectTriangle(...points,false,new THREE.Vector3());
      if(!hit)continue;const d=hit.distanceTo(ray.origin);if(d>=distance)continue;const weights=barycentric([hit.x,hit.y,hit.z],...points.map(p=>[p.x,p.y,p.z]));if(!weights)continue;
      closest={uv:[0,1].map(k=>tri.reduce((n,v,j)=>n+v.uv[k]*weights[j],0)),faceId:f.id};distance=d;
    }return closest;
  }
  function placed(event){const active=placement;if(!active||active.owner!==action()){cancelPlacement();return;}const anchor=pickPaper(event);if(!anchor){hintText.textContent='Click on the paper itself. You can cancel to change the view.';return;}active.points.push(anchor);
    if(active.kind==='arrow'&&active.points.length===1){hintText.textContent='Now click the arrow’s destination on the paper.';draw();return;}
    cancelPlacement();if(active.kind==='focus'){const next={...active.source,focus:{anchor,zoom:active.source?.focus?.zoom||1.6}};openCue(active.index,next);}else openNote(active.index,{kind:active.kind,text:'',start:0,end:1,...active.source,from:active.points[0],...(active.kind==='arrow'?{to:active.points[1]}:{})});
  }

  function project(p){const r=canvas().getBoundingClientRect(),v=new THREE.Vector3(...toScene(p)).project(G.threeView.camera);return {x:(v.x+1)*r.width/2,y:(1-v.y)*r.height/2,visible:v.z>=-1&&v.z<=1};}
  function draw(){
    pendingFrame=0;const active=state.active&&state.phase==='preview'&&!compared;overlay.hidden=!active;if(!active)return;
    const r=canvas().getBoundingClientRect();if(r.width<1||r.height<1)return;overlay.setAttribute('viewBox',`0 0 ${r.width} ${r.height}`);const focused=document.activeElement?.getAttribute('data-handle');overlay.replaceChildren();
    const defs=svg('defs'),marker=svg('marker',{id:'teachingArrowHead',viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:7,markerHeight:7,orient:'auto-start-reverse'});marker.append(svg('path',{d:'M 0 0 L 10 5 L 0 10 z',fill:'#383630'}));defs.append(marker);overlay.append(defs);
    const faces=currentFaces(state.progress),t=state.progress;
    if(annotationsOn)for(const [i,m]of (action()?.teaching?.marks||[]).entries()){
      if(t<m.start-1e-8||t>m.end+1e-8)continue;const p=resolveAnchor(m.from,faces);if(!p)continue;const a=project(p);if(!a.visible)continue;
      const g=svg('g',{'data-teaching-mark':i,'aria-label':m.text||'Paper arrow',role:'img'});let label=a;
      if(m.kind==='arrow'){const target=resolveAnchor(m.to,faces);if(!target)continue;const b=project(target);if(!b.visible)continue;g.append(svg('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:'#fff','stroke-width':5}),svg('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:'#383630','stroke-width':2,'marker-end':'url(#teachingArrowHead)'}));label={x:(a.x+b.x)/2,y:(a.y+b.y)/2};}
      else g.append(svg('circle',{cx:a.x,cy:a.y,r:4,fill:'#383630',stroke:'#fff','stroke-width':2}));
      if(m.text){const text=svg('text',{x:0,y:0,'font-size':13,fill:'#302e2a','paint-order':'stroke',stroke:'#fff','stroke-width':5,'stroke-linejoin':'round'}),lines=m.text.match(/.{1,30}(?:\s|$)|.{1,30}/g)||[m.text],x=Math.max(10,Math.min(r.width-210,label.x+(m.offset?.[0]||18))),y=Math.max(22,Math.min(r.height-18-lines.length*17,label.y+(m.offset?.[1]||-22)));text.setAttribute('x',x);text.setAttribute('y',y);lines.forEach((line,j)=>text.append(svg('tspan',{x,dy:j?17:0},line.trim())));g.append(text);if(m.kind==='label')g.insertBefore(svg('path',{d:`M${a.x} ${a.y} L${x-5} ${y+4}`,stroke:'#514e47','stroke-width':1.2,fill:'none'}),text);}
      overlay.append(g);
    }
    if(placement?.points.length){const p=resolveAnchor(placement.points[0],faces);if(p){const a=project(p);overlay.append(svg('circle',{cx:a.x,cy:a.y,r:7,fill:'white',stroke:'#383630','stroke-width':2}));}}
    if(edit&&state.draft?.kind==='fold')drawHandles();
    if(focused)overlay.querySelector(`[data-handle="${focused}"]`)?.focus({preventScroll:true});
  }
  function scheduleDraw(){if(!pendingFrame)pendingFrame=requestAnimationFrame(draw);}
  window.addEventListener('foldlab:camera-change',scheduleDraw);new ResizeObserver(scheduleDraw).observe(host);

  function localToPaper(p,a=state.draft){return a?.plane?fromPlane(p,a.plane):p;}
  function rayToLocal(event,origin,normal,a=state.draft){
    const o=new THREE.Vector3(...toScene(localToPaper(origin,a))),q=new THREE.Vector3(...toScene(localToPaper(origin.map((x,k)=>x+normal[k]),a))).sub(o).normalize(),plane=new THREE.Plane().setFromNormalAndCoplanarPoint(q,o),hit=rayAt(event).intersectPlane(plane,new THREE.Vector3());if(!hit)return null;
    const f=frame(),paper=[hit.x*f.r+f.cx,hit.z*f.r+f.cy,hit.y*f.r];return a.plane?toPlane(paper,a.plane):paper;
  }
  function movingTip(){const p=state.preparedDraft;if(!p?.pieces||!p.axis)return null;let best=null,radius=-1;const [a,b]=p.axis,dx=b[0]-a[0],dy=b[1]-a[1];for(const f of p.pieces.filter(f=>f.moving))for(const v of f.vertices){const r=Math.abs(dx*(v.p[1]-a[1])-dy*(v.p[0]-a[0]));if(r>radius){radius=r;best=v;}}return best;}
  function drawHandles(){
    const a=state.draft,p=state.preparedDraft;if(!p?.axis)return;const ends=p.axis.map(v=>project(localToPaper([...v,0],a)));
    overlay.append(svg('line',{x1:ends[0].x,y1:ends[0].y,x2:ends[1].x,y2:ends[1].y,stroke:'#302e2a','stroke-width':2,'stroke-dasharray':'7 4'}));
    function handle(name,point,label){const g=svg('g',{'data-handle':name,tabindex:0,role:'slider','aria-label':label,'aria-valuetext':name==='angle'?Math.round(Math.abs(a.angle))+' degrees':'Use arrow keys to move','class':'motion-handle',transform:`translate(${point.x} ${point.y})`});g.append(svg('circle',{r:18,fill:'transparent'}),svg('circle',{r:7,fill:'#fff',stroke:'#302e2a','stroke-width':2}),svg('text',{x:12,y:-12,fill:'#302e2a','font-size':12,'paint-order':'stroke',stroke:'#fff','stroke-width':4},name==='angle'?Math.round(Math.abs(a.angle))+'°':label));g.addEventListener('keydown',e=>handleKey(e,name));overlay.append(g);}
    handle('axis0',ends[0],'A');handle('axis1',ends[1],'B');const tip=movingTip();if(tip){const at=resolveAnchor({uv:tip.uv},currentFaces(1));if(at)handle('angle',project(at),'Fold angle');}
  }
  function syncForm(a){state.points=clone(a.axis);state.side=a.side;state.seed=a.seed||null;state.seeds=a.seeds||null;state.workPlane=a.plane||null;state.editMetadata={...state.editMetadata,teaching:a.teaching};const angle=Math.abs(a.angle);if(!$('actionAngle').querySelector(`option[value="${angle}"]`))$('actionAngle').add(new Option(`${angle}°`,String(angle)));$('actionAngle').value=String(angle);$('actionDirection').value=a.angle*a.side>0?'toward':'away';$('previewFoldAngle').value=String(angle);$('previewFoldDirection').value=$('actionDirection').value;$('directAngle').value=String(angle);$('directAngleValue').value=Math.round(angle)+'°';}
  function validateAdjustment(candidate,before){
    compared=false;$('compareMotion').setAttribute('aria-pressed','false');$('compareMotion').textContent='Original';
    try{
      candidate.enforceLayerAccess=true;candidate.seeds=accessibleSeeds(sheet(),candidate);candidate.seed=null;const p=validateLesson(sheet(),[candidate]).prepared[0];state.draft=candidate;state.preparedDraft=p;syncForm(candidate);failure.hidden=true;state.progress=1;updatePose();persist();refreshReview();return true;
    }catch(e){state.draft=before.action;state.preparedDraft=before.prepared;syncForm(before.action);updatePose();motionError(e);return false;}
  }
  function baseline(){return {action:clone(state.draft),prepared:state.preparedDraft};}
  function editStart(){if(state.draft?.kind!=='fold')return;stop();cancelPlacement();if(!previewOrigin)previewOrigin=baseline();edit=true;state.reviewMoving=true;state.separateLayers=false;state.progress=1;$('directEditControls').hidden=false;$('editOnPaper').textContent='Editing on paper';$('inspectMovingPaper').setAttribute('aria-pressed','true');syncForm(state.draft);updatePose();}
  function finishEdit(){edit=false;drag=null;if(compared){compared=false;$('compareMotion').setAttribute('aria-pressed','false');$('compareMotion').textContent='Original';updatePose();}$('directEditControls').hidden=true;$('editOnPaper').textContent='Adjust on paper';G.friendlyView.enable(state.active&&state.phase==='preview');draw();}
  $('editOnPaper').onclick=()=>edit?finishEdit():editStart();$('finishDirectEdit').onclick=()=>{finishEdit();state.reviewMoving=false;$('inspectMovingPaper').setAttribute('aria-pressed','false');updatePose();};
  $('inspectMovingPaper').onclick=()=>{stop();state.reviewMoving=!state.reviewMoving;$('inspectMovingPaper').setAttribute('aria-pressed',String(state.reviewMoving));updatePose();};
  $('directChooseLayers').onclick=()=>{finishEdit();$('previewChooseLayers').click();};
  $('directAngle').oninput=()=>{if(!state.draft)return;stop();const value=Number($('directAngle').value);$('directAngleValue').value=value+'°';};
  $('directAngle').onchange=()=>{if(!state.draft)return;const before=baseline(),a=clone(state.draft);a.angle=Number($('directAngle').value)*Math.sign(a.angle||1);delete a.assignment;validateAdjustment(a,before);};
  let compared=false;
  $('compareMotion').onclick=()=>{if(!previewOrigin)return;compared=!compared;$('compareMotion').setAttribute('aria-pressed',String(compared));$('compareMotion').textContent=compared?'Back to edits':'Original';if(compared){stop();api.render3D(api.poseAction(previewOrigin.prepared,1));overlay.hidden=true;}else updatePose();};
  $('resetMotionAdjustments').onclick=()=>{if(!previewOrigin)return;const a={...clone(previewOrigin.action),title:state.draft.title,caption:state.draft.caption,teaching:clone(state.draft.teaching)};compared=false;$('compareMotion').setAttribute('aria-pressed','false');$('compareMotion').textContent='Original';validateAdjustment(a,baseline());};
  function handleKey(e,name){if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();stop();const before=baseline(),a=clone(state.draft),direction=['ArrowRight','ArrowUp'].includes(e.key)?1:-1;if(name==='angle'){a.angle=Math.sign(a.angle||1)*Math.max(1,Math.min(180,Math.abs(a.angle)+direction*(e.shiftKey?1:5)));delete a.assignment;}else{const index=Number(name.slice(-1)),k=['ArrowLeft','ArrowRight'].includes(e.key)?0:1;a.axis[index][k]+=(['ArrowRight','ArrowDown'].includes(e.key)?1:-1)*frame().r*(e.shiftKey?.002:.01);}validateAdjustment(a,before);}
  overlay.addEventListener('pointerdown',event=>{
    if(placement){event.preventDefault();event.stopPropagation();placed(event);return;}
    const target=event.target.closest('[data-handle]');if(!target||!edit||event.button!==0)return;event.preventDefault();event.stopPropagation();stop();if(compared){compared=false;$('compareMotion').textContent='Original';$('compareMotion').setAttribute('aria-pressed','false');}
    drag={name:target.dataset.handle,before:baseline(),tip:movingTip(),pointerId:event.pointerId,pending:null};state.progress=1;G.friendlyView.enable(false);try{overlay.setPointerCapture(event.pointerId);}catch{ /* Synthetic regression events have no active OS pointer. */ }
  });
  function move(event){if(!drag)return;event.preventDefault();const a=clone(drag.before.action);
    if(drag.name.startsWith('axis')){const point=rayToLocal(event,[0,0,0],[0,0,1],a);if(!point)return;const i=Number(drag.name.slice(-1));a.axis[i]=point.slice(0,2);}
    else {const tip=drag.tip;if(!tip)return;const dx=a.axis[1][0]-a.axis[0][0],dy=a.axis[1][1]-a.axis[0][1],p=rayToLocal(event,tip.p,[dx,dy,0],a);if(!p)return;let angle=foldAngleAtPoint(a.axis,tip.p,p,a.angle);a.angle=Math.sign(a.angle||1)*Math.max(1,Math.min(180,Math.abs(angle)));delete a.assignment;}
    drag.pending=a;try{const p=prepareAction(sheet(),{...a,enforceLayerAccess:false});state.draft=a;state.preparedDraft=p;syncForm(a);updatePose();}catch{ /* Keep the last drawable position until release; validation explains it. */ }
  }
  let pointerFrame=0;overlay.addEventListener('pointermove',e=>{if(!drag)return;drag.event={clientX:e.clientX,clientY:e.clientY,preventDefault:()=>{}};if(!pointerFrame)pointerFrame=requestAnimationFrame(()=>{pointerFrame=0;if(drag)move(drag.event);});});
  function endDrag(cancel=false){if(!drag)return;cancelAnimationFrame(pointerFrame);pointerFrame=0;if(!cancel&&drag.event)move(drag.event);const d=drag;drag=null;if(overlay.hasPointerCapture(d.pointerId))overlay.releasePointerCapture(d.pointerId);G.friendlyView.enable(true);if(cancel){state.draft=d.before.action;state.preparedDraft=d.before.prepared;syncForm(state.draft);updatePose();}else if(d.pending)validateAdjustment(d.pending,d.before);}
  overlay.addEventListener('pointerup',()=>endDrag());overlay.addEventListener('pointercancel',()=>endDrag(true));
  document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;if(placement){cancelPlacement();e.preventDefault();}if(drag){endDrag(true);e.preventDefault();}else if(edit)finishEdit();});

  function refreshReview(){
    const a=state.draft;review.hidden=!canAuthor()||!a||a.kind==='demo';if(review.hidden)return;
    const fold=a.kind==='fold';$('editOnPaper').hidden=$('directChooseLayers').hidden=!fold;
    $('movingPaperSummary').textContent=fold?'Inspect the shaded paper before saving this fold.':'Inspect the moving paper before saving this move.';
    if(fold){try{const groups=flapCandidates(sheet(),a),seeds=a.seeds||(a.seed?[a.seed]:null),selected=groups.filter(c=>!seeds||seeds.some(s=>c.faces.some(f=>pointInPolygon(s,f.vertices.map(v=>v.uv)))));$('movingPaperSummary').textContent=`${selected.length} connected paper ${selected.length===1?'group moves':'groups move'}. Joined and covering layers stay together.`;}catch{}}
    $('inspectMovingPaper').setAttribute('aria-pressed',String(!!state.reviewMoving));
    if(observed===a)return;observed=a;inspection=null;$('motionInspection').textContent='Checking the motion…';$('inspectCrossing').hidden=true;
    // Run once per accepted edit; never run pairwise checks on playback frames.
    requestAnimationFrame(()=>{if(observed!==a||state.draft!==a)return;const p=state.preparedDraft;if(a.kind==='unfold'){$('motionInspection').textContent='Reverses the previous fold.';return;}try{inspection=inspectMotion(p,api.poseAction);$('motionInspection').textContent=inspection.first?'Possible paper crossing. Inspect this moment before saving.':inspection.status==='limited'?'Paper connections checked. Crossing check is limited for this model.':'Paper connections checked. No crossing found in sampled positions.';$('inspectCrossing').hidden=!inspection.first;}catch(e){$('motionInspection').textContent='The quick crossing check could not finish. Inspect the motion manually.';}});
  }
  $('inspectCrossing').onclick=()=>{if(!inspection?.first)return;stop();finishEdit();state.progress=inspection.first.at;state.reviewMoving=true;updatePose();};
  function restoreDetail(){if(viewBeforeDetail){const view=viewBeforeDetail;viewBeforeDetail=null;G.friendlyView.frame(view);}fullView.hidden=true;}
  function playbackFrame(){
    const active=state.active&&state.phase==='preview';if(!active){overlay.hidden=cueCard.hidden=checkpoints.hidden=preferences.hidden=true;teach.hidden=true;review.hidden=true;state.reviewMoving=false;cancelPlacement();finishEdit();restoreDetail();lastCue=null;lastProgress=-1;return;}
    teach.hidden=!canAuthor()||action()?.kind==='demo';
    if(!drag&&observed!==state.draft)refreshReview();
    const a=action(),cueNow=teachingCueAt(a,state.progress);
    if(state.progress<lastProgress-1e-5){restoreDetail();lastCue=null;}lastProgress=state.progress;
    if(cueNow!==lastCue){lastCue=cueNow;if(cueNow?.focus&&followDetail&&!placement&&!edit){const point=resolveAnchor(cueNow.focus.anchor,currentFaces(state.progress));if(point){viewBeforeDetail??=G.friendlyView.capture();G.friendlyView.frame({...viewBeforeDetail,target:toScene(point),zoom:Math.min(5,viewBeforeDetail.zoom*cueNow.focus.zoom)});}}}
    cueCard.hidden=!cueNow||!!placement||edit;cueText.textContent=cueNow?.text||'Look closely at this part of the paper.';cueContinue.hidden=!cueNow||state.playing||Math.abs(state.progress-cueNow.at)>1e-6||state.progress>=1||cueNow.pause===false;fullView.hidden=!viewBeforeDetail;
    if(state.playing&&edit)finishEdit();scheduleDraw();
  }
  function preview(){
    finishEdit();cancelPlacement();restoreDetail();previewOrigin=null;compared=false;state.reviewMoving=false;lastCue=null;lastProgress=-1;failure.hidden=true;observed=null;$('compareMotion').textContent='Original';$('compareMotion').setAttribute('aria-pressed','false');refreshReview();refreshTeaching();playbackFrame();
  }
  function reset(){finishEdit();cancelPlacement();restoreDetail();previewOrigin=null;inspection=null;observed=null;state.reviewMoving=false;failure.hidden=true;noteDialog.close();cueDialog.close();review.hidden=teach.hidden=true;}
  new MutationObserver(()=>{if(state.active&&state.phase==='preview'){refreshTeaching();refreshReview();}}).observe(document.body,{attributes:true,attributeFilter:['class']});
  return {preview,frame:playbackFrame,reset,motionError,clearMotionError:()=>failure.hidden=true};
}
