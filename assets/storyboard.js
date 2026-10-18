import {stepThumbnail} from './storyboard-thumbnails.js';
const $=id=>document.getElementById(id),root=document.documentElement,body=document.body;
const el=(tag,attrs={},text)=>{const n=document.createElement(tag);for(const [k,v]of Object.entries(attrs)){if(k==='class')n.className=v;else n.setAttribute(k,v);}if(text!==undefined)n.textContent=text;return n;};
let inspectorOpen=false,viewing=false,lastContext='',syncPending=false,thumbFrames=null,studioReady=false;
const pending=new URLSearchParams(location.search).get('view');
function toast(text){const n=$('storyToast');n.textContent=text;n.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>n.hidden=true,4500);}
function button(text,fn,attrs={}){const b=el('button',{type:'button',...attrs},text);b.onclick=fn;return b;}
function zoomIcon(b,direction){if(!b)return;b.classList.add('story-zoom-button');b.setAttribute('aria-label',direction>0?'Zoom in':'Zoom out');b.title=direction>0?'Zoom in':'Zoom out';b.innerHTML=`<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" aria-hidden="true"><circle cx="10" cy="10" r="6.5"/><path d="M15 15l5 5M7 10h6${direction>0?'M10 7v6':''}"/></svg>`;}
function beginNext(){window.StepStudio.startStep();drawer(true);$('stepStudio').scrollTop=0;scheduleSync();}
function closeMenus(){document.querySelectorAll('.story-file-menu[open]').forEach(n=>n.open=false);}
function brandedHeader(){
 const header=document.querySelector('body>header'),brand=el('a',{class:'story-brand',href:'studio-v2.html','aria-label':'Origami Studio — Design'});
 brand.append(el('strong',{},'origami'),el('span',{},'studio'));
 const nav=el('nav',{class:'story-nav','aria-label':'Workspace'}),actions=el('div',{class:'header-actions story-header-actions'});
 const file=el('details',{class:'story-file-menu',id:'storyFile'});file.append(el('summary',{},'File'),el('div',{class:'story-file-items'}));
 const title=el('span',{id:'storyDocument',class:'story-document'},'Untitled pattern');
 header.replaceChildren(brand,nav,title,actions);header.className='story-header';
 $('storyBootHeader')?.remove();
 const notice=el('div',{id:'storyToast',role:'status',hidden:''});body.append(notice);
 document.addEventListener('click',e=>{if(!e.target.closest('.story-file-menu'))closeMenus();});
 return {header,nav,actions,file,fileItems:file.lastChild};
}
function item(menu,text,fn){menu.append(button(text,()=>{closeMenus();if(window.importBusy&&!text.startsWith('Credits')){toast('Please wait for the current paper to finish importing.');return;}fn();}));}
function setNav(mode){document.querySelectorAll('.story-nav [data-mode]').forEach(n=>{if(n.dataset.mode===mode)n.setAttribute('aria-current','page');else n.removeAttribute('aria-current');});}
function drawer(open){inspectorOpen=!!open;body.classList.toggle('story-inspector-open',inspectorOpen);const b=$('storySettings');if(b){b.textContent=inspectorOpen?'Hide settings':'Step settings';b.setAttribute('aria-expanded',String(inspectorOpen));}requestAnimationFrame(()=>window.G?.friendlyView?.resize());}
function mountDesigner(){
 const oldExport=document.querySelector('.header-export'),launch=document.querySelector('.simulation-launch'),h=brandedHeader();
 body.classList.add('storyboard-design','story-ready');
 h.nav.append(el('a',{href:'studio-v2.html','data-mode':'design','aria-current':'page'},'Design'),launch,el('a',{href:'fold-lab-v2.html?view=tutorials','data-mode':'tutorials'},'Tutorials'),el('a',{href:'fold-lab-v2.html?view=create','data-mode':'create'},'Make tutorial'));
 const make=h.nav.querySelector('[data-mode=create]');make.onclick=async event=>{event.preventDefault();if(make.getAttribute('aria-busy')==='true')return;make.setAttribute('aria-busy','true');try{const payload=await window.CPDesignerHandoff.makePayload();sessionStorage.setItem('origami.storyboard.handoff',JSON.stringify(payload));location.href=make.href;}catch(e){toast(e.message);make.removeAttribute('aria-busy');}};
 launch.dataset.mode='fold';launch.textContent='Fold Lab';
 oldExport.classList.add('story-designer-export');h.actions.append(oldExport);
 document.querySelector('.help-btn').textContent='Help';
 const doc=$('storyDocument');doc.textContent='CP Designer';
 const tools=button('Drawing tools',()=>{const on=body.classList.toggle('story-design-tools');tools.setAttribute('aria-expanded',String(on));window.dispatchEvent(new Event('resize'));},{id:'storyDesignTools','aria-expanded':'true'});h.actions.prepend(tools);body.classList.add('story-design-tools');
 const presets=button('Patterns',()=>window.openPresetsGallery());h.nav.after(presets);presets.className='story-patterns-button';
 document.querySelectorAll('.panel .ptitle').forEach(n=>n.textContent=n.textContent.replace('Crease Type','Crease').replace('Grid & Snap','Grid & snap').replace('Quick Presets','Pattern library'));
 const constraint=$('constraintFab');if(constraint){constraint.classList.add('story-constraints');const heading=constraint.querySelector('.cfab-label');if(heading)heading.textContent='Drawing constraints';const trigger=constraint.querySelector('.cfab-header');trigger.setAttribute('role','button');trigger.tabIndex=0;trigger.setAttribute('aria-expanded',String(constraint.classList.contains('expanded')));trigger.addEventListener('click',()=>trigger.setAttribute('aria-expanded',String(constraint.classList.contains('expanded'))));trigger.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();trigger.click();}});}
 const zooms=document.querySelectorAll('.zoom-ctrl .zc-btn');zoomIcon(zooms[0],-1);zoomIcon(zooms[1],1);
 const footer=el('div',{class:'story-designer-footer'});footer.append(document.querySelector('.float-toolbar'),document.querySelector('.zoom-ctrl'));$('canvasWrap').append(footer);
 document.querySelector('.status-bar')?.setAttribute('role','status');
 requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')));
 window.Storyboard={version:2,page:'design'};
}
function backupDraft(){try{const data=localStorage.getItem('foldlab.author-draft.v1');if(data)localStorage.setItem('foldlab.storyboard.previous-draft',data);}catch{}}
function openLibrary(){window.StepStudio.stop();$('tutorialLibrary').show();body.classList.add('story-library');$('storyWorkspace').inert=true;$('viewTools').inert=true;setNav('tutorials');$('storyStart')?.close();}
function closeLibrary(){if($('tutorialLibrary').open)$('tutorialLibrary').close();body.classList.remove('story-library');$('storyWorkspace').inert=false;$('viewTools').inert=false;}
function startDialog(force=false){
 closeLibrary();const p=window.StepStudio.getPresentation();
 if(force!==true&&p.active&&!p.builtIn){viewing=false;drawer(true);scheduleSync();return;}
 if(force!==true&&p.suspended&&!p.suspendedBuiltIn){window.StepStudio.resume();viewing=false;drawer(true);scheduleSync();return;}
 const dialog=$('storyStart'),resume=$('storyResumeDraft');
 try{const draft=JSON.parse(localStorage.getItem('foldlab.author-draft.v1')||'null');resume.hidden=!draft?.lesson;resume.querySelector('span').textContent=draft?.lesson?.title||'Continue where you left off.';}catch{resume.hidden=true;}
 $('storyCopyCurrent').hidden=!(p.active&&p.builtIn||p.suspended&&p.suspendedBuiltIn);dialog.showModal();
}
function buildStart(){
 const dialog=el('dialog',{id:'storyStart',class:'story-dialog'}),head=el('div',{class:'story-dialog-head'});
 head.append(el('div',{},'MAKE A TUTORIAL'),button('Close',()=>dialog.close()));
 dialog.append(head,el('h2',{},'New tutorial'));
 const grid=el('div',{class:'story-start-grid'});
 function card(id,title,description,kind,fn){const b=button('',()=>{if(id!=='storyResumeDraft')backupDraft();dialog.close();closeLibrary();viewing=false;fn();drawer(true);scheduleSync();},{id,class:'story-start-card'}),illustration=el('div',{class:'story-start-illustration '+kind});b.append(illustration,el('strong',{},title),el('span',{},description));grid.append(b);return b;}
 card('storyStartPattern','Use current pattern','Keep the imported paper and its creases.','pattern',()=>{if(window.StepStudio.getState().active)window.StepStudio.exit();$('tutorialToggle').click();});
 card('storyStartSquare','Start with a square','A clean sheet for a new folding story.','square',()=>$('blankSquare').click());
 card('storyStartRectangle','Start with a rectangle','A4 proportions, ready for your first fold.','rectangle',()=>$('blankRectangle').click());
 card('storyResumeDraft','Resume saved draft','Continue where you left off.','draft',()=>$('restoreDraft').click());
 const copy=card('storyCopyCurrent','Continue from this step','Make an editable copy of the lesson so far.','copy',()=>{if(!window.StepStudio.getState().active)window.StepStudio.resume();$('copyLesson').click();});copy.hidden=true;
 dialog.append(grid,el('p',{class:'story-start-footnote'},'Your tutorial is saved locally as you work. Download it with Save tutorial to keep a portable copy.'));body.append(dialog);
}
function layoutFilmstrip(){
 const p=window.StepStudio.getPresentation();
 if(thumbFrames===p.frames&&$('actionList').querySelector('.story-step-preview'))return;
 thumbFrames=p.frames;
 $('actionList').querySelectorAll('.lesson-step-wrap').forEach((wrapper,i)=>{
  const b=wrapper.querySelector('.lesson-step'),faces=p.frames[i+1];if(!b||!faces)return;
  if(!b.querySelector('.story-step-preview')){const image=el('img',{class:'story-step-preview',alt:`Paper after step ${i+1}`,width:'128',height:'78',draggable:'false'});image.src=stepThumbnail(faces);b.prepend(image);}
  if(!p.builtIn&&!wrapper.querySelector('.story-step-more')){
   wrapper.append(button('More',e=>{e.stopPropagation();const r=e.currentTarget.getBoundingClientRect();wrapper.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:r.left,clientY:r.top}));},{class:'story-step-more','aria-label':`Actions for step ${i+1}`}));
  }
 });
}
function sync(){
 syncPending=false;if(!studioReady)return;
 const p=window.StepStudio.getPresentation(),active=p.active,author=active&&!p.builtIn&&!viewing;
 body.classList.toggle('story-author',author);body.classList.toggle('story-viewing',active&&!author);body.classList.toggle('story-define',active&&p.phase==='define');body.classList.toggle('story-preview',active&&p.phase==='preview');
 const context=[active,author,p.phase].join(':');if(context!==lastContext){lastContext=context;drawer(author);$('stepStudio').scrollTop=0;if(author&&p.draft&&p.phase==='preview')$('stepWording').open=true;}
 if(!active)body.classList.remove('story-inspector-open');
 const current=p.draft||p.actions[p.position],name=$('lessonTitle').value||'My folding lesson';
 $('storyDocument').textContent=active?name:$('headerPatternName')?.textContent||'Fold Lab';
 $('storySceneTitle').textContent=active?(p.phase==='define'?'Make your next move.':current?.title||'Your folding story.'):$('modelName').textContent||'Fold Lab';
 $('storySceneLabel').textContent=active?(p.draft?'PREVIEW / NEW STEP':p.position>=0?`STEP ${p.position+1} / ${p.actions.length}`:'MAKE A TUTORIAL'):'FOLD LAB';
 $('storySceneCaption').textContent=active?(p.phase==='define'?'':current?.caption||''):'';
  $('storyReadInstructions').hidden=!active||author||$('storySceneCaption').textContent.length<170;
 $('storySceneLabel').hidden=true;
 $('storySceneTitle').title=$('storySceneTitle').textContent;
 $('storyWatchMode').hidden=!active||p.builtIn;$('storyWatchMode').disabled=p.phase==='define';$('storyWatchMode').textContent=viewing?'Edit tutorial':'Watch mode';
 $('storySettings').hidden=!active;
  $('storyCommit').hidden=!author||p.phase!=='preview';$('storyMotionOptions').hidden=!author||!p.draft||p.phase!=='preview';
 const appendNext=author&&p.phase==='preview'&&!p.draft&&p.position>=0&&p.position===p.actions.length-1;
 $('nextStep').disabled=p.position>=p.actions.length-1;$('nextStep').textContent='Next step';
 if(author&&!p.draft){$('editAction').textContent=p.position===p.actions.length-1?'Add next step':'Add step at end';$('editAction').classList.add('story-next-primary');}else $('editAction').classList.remove('story-next-primary');
 if(author&&p.draft&&p.phase==='preview'&&$('saveAction').textContent==='Add step')$('saveAction').textContent='Save step';
  $('previousStep').hidden=!!p.draft;$('nextStep').hidden=!!p.draft||appendNext;
 $('storyPatterns').hidden=active;$('storyAddStep').hidden=!author||p.phase==='define';$('storyAddStep').disabled=!!p.draft;
 $('storyEditThisStep').hidden=!author||p.phase!=='preview'||!!p.draft;
 $('storyResumeWork').hidden=active||!p.suspended;
 $('storyNewFromHere').hidden=!active||!p.builtIn;
 $('storyWorkflow').hidden=!author;const stage=p.phase==='define'?($('motionChooser').hidden?1:0):2;
 $('storyWorkflow').querySelectorAll('span').forEach((s,i)=>{s.classList.toggle('current',i===stage);s.setAttribute('aria-current',i===stage?'step':'false');});
 $('storyScene').hidden=!active||p.phase==='define';
 if(!$('tutorialLibrary').open)setNav(active?(author?'create':'tutorials'):'fold');
 layoutFilmstrip();
}
function scheduleSync(){if(syncPending)return;syncPending=true;requestAnimationFrame(sync);}
async function mountFold(){
 if(studioReady)return;studioReady=true;const legacy={learn:$('browseTutorials'),toggle:$('tutorialToggle'),save:$('saveLesson'),patternName:$('headerPatternName')};const h=brandedHeader();body.classList.add('storyboard-fold','story-ready');
 const design=el('a',{href:'studio-v2.html','data-mode':'design'},'Design'),fold=button('Fold Lab',()=>{closeLibrary();window.StepStudio.suspend();viewing=false;scheduleSync();},{'data-mode':'fold'}),learn=legacy.learn,make=button('Make tutorial',startDialog,{'data-mode':'create',id:'storyMakeTutorial'});
 learn.textContent='Tutorials';learn.dataset.mode='tutorials';learn.onclick=openLibrary;h.nav.append(design,fold,learn,make);
 const hidden=el('div',{hidden:'',id:'storyLegacyControls'});hidden.append(legacy.toggle);if(legacy.patternName)hidden.append(legacy.patternName);body.append(hidden);
 const save=legacy.save;save.classList.add('story-primary');save.textContent='Save tutorial';
 const watch=button('Watch mode',()=>{viewing=!viewing;scheduleSync();},{id:'storyWatchMode'}),settings=button('Step settings',()=>drawer(!inspectorOpen),{id:'storySettings','aria-expanded':'false'});
 h.actions.append(watch,settings,h.file,save);
 item(h.fileItems,'Import SVG / FOLD',()=>{closeLibrary();$('cpFile').click();});item(h.fileItems,'Open tutorial',()=>$('openLesson').click());
 item(h.fileItems,'Start another tutorial',()=>startDialog(true));
 item(h.fileItems,'Resume local draft',()=>{closeLibrary();$('restoreDraft').click();viewing=false;drawer(true);scheduleSync();});
 item(h.fileItems,'Recover previous draft',()=>{try{const raw=localStorage.getItem('foldlab.storyboard.previous-draft');if(!raw){toast('There is no previous draft to recover yet.');return;}const current=localStorage.getItem('foldlab.author-draft.v1');localStorage.setItem('foldlab.author-draft.v1',raw);if(current)localStorage.setItem('foldlab.storyboard.previous-draft',current);$('restoreDraft').click();viewing=false;scheduleSync();}catch(e){toast(e.message);}});
 item(h.fileItems,'Credits & sources',()=>window.OrigamiCredits.open());
 const workspace=el('main',{id:'storyWorkspace'});body.append(workspace);
 const scene=el('section',{id:'storyScene','aria-label':'Current paper'}),sceneText=el('div',{class:'story-scene-copy'});
 sceneText.append(el('span',{id:'storySceneLabel'},'FOLD LAB'),el('h1',{id:'storySceneTitle'},'Your folding workspace'),el('p',{id:'storySceneCaption'}),button('Read full instructions',()=>{drawer(true);$('previewCaption').scrollIntoView({block:'nearest'});},{id:'storyReadInstructions',hidden:''}));
 scene.append(sceneText);workspace.append($('threeContainer'),$('actionCanvas'),scene);
 const tools=el('div',{id:'storySceneTools'});
 tools.append(button('Patterns',()=>{const open=body.classList.toggle('story-patterns-open');$('storyPatterns').setAttribute('aria-expanded',String(open));},{id:'storyPatterns','aria-expanded':'false'}),button('Resume tutorial',()=>{window.StepStudio.resume();viewing=false;scheduleSync();},{id:'storyResumeWork',hidden:''}),button('Create from here',startDialog,{id:'storyNewFromHere',hidden:''}));workspace.append(tools);
 const inspector=$('stepStudio'),workflow=el('div',{id:'storyWorkflow','aria-label':'Tutorial authoring progress'});
 workflow.append(el('span',{},'1  Choose a move'),el('span',{},'2  Mark the paper'),el('span',{},'3  Preview & add'));inspector.prepend(workflow);
 const close=button('Hide settings',()=>drawer(false),{class:'story-close-inspector'});inspector.prepend(close);workspace.append(inspector,$('lessonPlayer'),$('lessonTimeline'),$('panel'),$('bar'));
  const motionOptions=el('details',{id:'storyMotionOptions'});motionOptions.append(el('summary',{},'Motion, timing & view'));
  for(const node of [$('previewMotionTweaks'),$('motionParameters'),$('stageTeaching'),inspector.querySelector('.step-duration'),$('savePreviewView')])if(node)motionOptions.append(node);
  $('authorReview').after(motionOptions);
  const commit=el('div',{id:'storyCommit',hidden:''});commit.append($('saveAction'),$('editAction'),$('quickUnfoldPreview'));inspector.append(commit);$('quickUnfoldPreview').textContent='Unfold this fold';
  const transport=el('div',{id:'storyTransport','aria-label':'Tutorial playback'});$('previousStep').textContent='Previous';$('nextStep').textContent='Next step';transport.append($('previousStep'),$('replayAction'),$('nextStep'));$('lessonPlayer').prepend(transport);
 const originalEdit=$('editAction').onclick;$('editAction').onclick=()=>{originalEdit();drawer(true);inspector.scrollTop=0;};
 zoomIcon($('zoomOut'),-1);zoomIcon($('zoomIn'),1);
 function viewZoom(direction){const options=window.G.friendlyView.capture();window.G.friendlyView.frame({...options,zoom:Math.max(.35,Math.min(5,options.zoom*(direction>0?1.2:1/1.2)))});}
 for(const host of [$('viewTools'),$('playbackOptions')]){const group=el('div',{class:'story-view-zoom','aria-label':'View zoom'});for(const direction of [-1,1]){const b=button('',()=>viewZoom(direction));zoomIcon(b,direction);group.append(b);}host.append(group);}
 const timelineHead=$('lessonTimeline').querySelector('.timeline-heading');timelineHead.firstElementChild.textContent='Steps';
 const add=button('Add step',beginNext,{id:'storyAddStep'});timelineHead.append(add);
 const edit=button('Edit this step',()=>{drawer(true);$('savedStepActions').scrollIntoView({block:'nearest'});},{id:'storyEditThisStep'});tools.append(edit);
  $('actionList').addEventListener('keydown',event=>{if(!event.target.closest('.lesson-step')||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;const p=window.StepStudio.getPresentation();if(p.draft||!p.actions.length)return;event.preventDefault();const i=event.key==='Home'?0:event.key==='End'?p.actions.length-1:Math.max(0,Math.min(p.actions.length-1,p.position+(event.key==='ArrowRight'?1:-1)));window.StepStudio.selectStep(i);$('actionList').querySelector('.current')?.focus();});
 const panelClose=button('Close patterns',()=>{body.classList.remove('story-patterns-open');$('storyPatterns').setAttribute('aria-expanded','false');},{class:'story-panel-close'});$('panel').prepend(panelClose);
 const backdrop=el('div',{id:'storyPatternBackdrop',hidden:''});backdrop.onclick=panelClose.onclick;workspace.append(backdrop);
 const library=$('tutorialLibrary');library.classList.add('story-library-page');library.addEventListener('close',()=>{body.classList.remove('story-library');$('storyWorkspace').inert=false;$('viewTools').inert=false;scheduleSync();});library.querySelector('.dialog-intro').hidden=true;library.querySelector('.dialog-heading .flow-eyebrow').hidden=true;library.querySelector('.dialog-heading h2').textContent='Tutorials';$('closeTutorialLibrary').textContent='Back to workspace';
  const busyNote=el('p',{id:'storyImportStatus',role:'status',hidden:''},'Preparing the paper. Your lessons will be ready in a moment.');library.querySelector('.dialog-intro').after(busyNote);
  function importState(busy){make.disabled=busy;fold.disabled=busy;library.querySelectorAll('.study-button,.practice-card').forEach(b=>b.disabled=busy);busyNote.hidden=!busy;}
  window.addEventListener('foldlab:import-busy',e=>importState(!!e.detail.busy));importState(!!window.importBusy);
 $('lessonTitle').addEventListener('input',scheduleSync);window.addEventListener('foldlab:studio-change',event=>{if(event.detail?.reason!=='frame')scheduleSync();});window.addEventListener('foldlab:pattern-ready',()=>{body.classList.remove('story-patterns-open');scheduleSync();});
 buildStart();
  $('openLessonFile').addEventListener('change',e=>{if(e.target.files.length)backupDraft();},{capture:true});
 window.Storyboard={version:2,page:'fold',openLibrary,startDialog,openSettings:()=>drawer(true)};
 scheduleSync();
 if(pending==='tutorials')openLibrary();
 async function receiveHandoff(){
  window.G.backgroundColor='FBFBFA';window.G.threeView.setBackgroundColor('FBFBFA');
  let data;try{data=JSON.parse(sessionStorage.getItem('origami.storyboard.handoff')||'null');}catch{}
  if(data&&data.type==='cp-simulator:import'&&typeof data.text==='string'){
   const imported=await window.importModelSource({name:data.name,text:data.text});
   if(imported)sessionStorage.removeItem('origami.storyboard.handoff');
   else toast('The pattern could not be imported. Your drawing is still available in Design.');
  }
  if(pending==='create')startDialog();scheduleSync();
 }
 const waitForImport=()=>{if(window.importBusy||!window.G){setTimeout(waitForImport,70);return;}receiveHandoff();};waitForImport();
}
if(root.dataset.page==='design'){
 if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',mountDesigner,{once:true});else mountDesigner();
}else{
 if(window.StepStudio)mountFold();else window.addEventListener('foldlab:studio-ready',mountFold,{once:true});
}
