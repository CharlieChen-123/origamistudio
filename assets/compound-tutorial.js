import {motionStages,stageAt} from '../simulator/src/motion-stages.js';
import {validateLesson} from '../simulator/src/lesson-operations.js';
import {pocketLesson,reversePractice} from '../simulator/src/pocket-lessons.js';
const element=(tag,attrs={},text)=>{const n=document.createElement(tag);Object.assign(n,attrs);if(text!==undefined)n.textContent=text;return n;};
export function mountCompoundTutorial(api){
  const {state,$,sheet,stop,play,updatePose,persist}=api;
  const moves=$('moreMoves').querySelector('.more-move-list');
  for(const [id,label]of [['squash','Squash symmetric pockets'],['openSink','Open-sink a point']]){
    const button=element('button',{id:id+'Motion'},label);moves.append(button);button.onclick=()=>start(id);
  }
  const help=element('button',{id:'practicePocketHelp',hidden:true},'Try the pocket practice lesson');$('actionMessage').after(help);
  help.onclick=()=>api.openExample(pocketLesson);
  function start(template){
    stop();help.hidden=true;
    try{
      const a={kind:'template',template,depth:.25,duration:8,title:template==='squash'?'Squash the two pockets':'Open-sink the closed point',caption:template==='squash'?'Open both pockets and flatten them into a triangular waterbomb base.':'Open the pockets, push the central cap inside and close around the sink.'};
      const p=validateLesson(sheet(),[a]).prepared[0];state.authorTool=template;state.templateType=null;state.draft=a;state.preparedDraft=p;state.phase='preview';state.selectedIndex=-1;state.progress=0;api.showPreview();play();
    }catch(e){api.message(e.message);help.hidden=false;}
  }
  const practice=element('details',{id:'foldPracticeLibrary',className:'fold-practice-library'});practice.innerHTML='<summary>Practice a fold</summary><p>Short lessons for learning the moves and trying the authoring tools.</p><div class="practice-grid"></div>';$('tutorialLibrary').append(practice);
  for(const [id,title,description,factory,asset]of [
    ['reversePractice','Turn a point inward','2 steps · a two-wall point, without a square base',reversePractice,'reverse'],
    ['pocketPractice','Squash & open sink','7 steps · prepare the pockets, squash, then sink',pocketLesson,'pocket']
  ]){
    const b=element('button',{id,className:'practice-card'}),img=element('img',{src:'assets/lesson-previews/'+asset+'-model.svg',alt:title,width:320,height:240});b.append(img,element('strong',{},title),element('span',{},description));practice.querySelector('.practice-grid').append(b);
    b.onclick=()=>{$('tutorialLibrary').close();api.openExample(factory);};
  }
  const parameters=element('section',{id:'pocketMotionSettings',hidden:true});parameters.innerHTML='<label for="sinkDepth">Sink rim below the tip</label><div class="sink-depth-control"><input id="sinkDepth" type="range" min="10" max="45" step="1" value="25"><output id="sinkDepthValue" for="sinkDepth">25%</output></div><p id="pocketMotionHint"></p><p id="compoundMotionError" role="status"></p>';$('authorReview').before(parameters);
  $('sinkDepth').oninput=()=>{$('sinkDepthValue').value=$('sinkDepth').value+'%';};
  parameters.after($('compoundMotionError'));
  $('sinkDepth').onchange=()=>{if(state.draft?.template!=='openSink')return;rebuild({...state.draft,depth:Number($('sinkDepth').value)/100},true);};
  function rebuild(a,replay=false){
    try{
      a.title=$('reviewTitle').value;a.caption=$('reviewCaption').value;
      const p=validateLesson(sheet(),[a]).prepared[0];stop();state.draft=a;shown=a;state.preparedDraft=p;state.progress=0;state.editMetadata={...state.editMetadata,stages:a.stages,duration:a.duration};$('compoundMotionError').textContent='';updatePose();persist();if(replay)play();return true;
    }catch(e){$('compoundMotionError').textContent=e.message;return false;}
  }
  // These two moves have inferred geometry rather than landmarks to reselect.
  $('editAction').addEventListener('click',e=>{if(!['squash','openSink'].includes(state.draft?.template))return;e.stopImmediatePropagation();stop();if(state.draft.template==='openSink')$('sinkDepth').focus();else timing.open=true;},true);
  const stagesBar=element('nav',{id:'motionStages','ariaLabel':'Stages of this fold',hidden:true});$('lessonPlayer').append(stagesBar);
  const timing=element('details',{id:'stageTeaching',hidden:true});timing.innerHTML='<summary>Timing & teaching pauses</summary><p>Each stage can have its own timing, instruction and learner pause.</p><div id="stageTeachingRows"></div>';$('authorReview').append(timing);
  let shown=null,stageButtons=[];
  function refresh(){
    help.hidden=true;const a=state.draft||state.actions[state.selectedIndex],stages=motionStages(a);
    stagesBar.hidden=!stages.length;stagesBar.replaceChildren();stageButtons=[];shown=a;
    for(const [i,s]of stages.entries()){
      const b=element('button',{type:'button',title:'Replay only this stage'},`${i+1} · ${s.title}`);
      b.onclick=()=>{const current=motionStages(state.draft||state.actions[state.selectedIndex])[i];stop();state.progress=current.start;updatePose();play(current.end);};stagesBar.append(b);stageButtons.push(b);
    }
    timing.hidden=!state.draft||!stages.length;const rows=$('stageTeachingRows');rows.replaceChildren();
    if(state.draft)for(const [i,s]of stages.entries()){
      const row=element('section',{className:'stage-teaching-row'}),header=element('div'),name=element('strong',{},`${i+1}. ${s.title}`),duration=element('input',{type:'number',min:.1,max:60,step:.1,value:Number(s.duration.toFixed(2)),ariaLabel:s.title+' duration in seconds'}),durationLabel=element('label',{},'Seconds'),pause=element('input',{type:'checkbox',checked:s.pauseAfter}),pauseLabel=element('label',{className:'stage-pause'},'Pause after this stage'),instruction=element('input',{type:'text',value:s.instruction,ariaLabel:s.title+' instruction',maxLength:400});
      durationLabel.append(duration);pauseLabel.prepend(pause);header.append(name,durationLabel);row.append(header,instruction,pauseLabel);rows.append(row);
      const change=()=>{
        const next=structuredClone(state.draft),all=motionStages(next).map(s=>({duration:s.duration,pauseAfter:s.pauseAfter,instruction:s.instruction}));all[i]={duration:Number(duration.value),pauseAfter:pause.checked,instruction:instruction.value};next.stages=all;next.duration=all.reduce((n,s)=>n+s.duration,0);
        if(rebuild(next)){shown=state.draft;frame();}else duration.value=String(s.duration);
      };duration.onchange=pause.onchange=instruction.onchange=change;
    }
    $('stepDuration').closest('label').hidden=!!stages.length;
    parameters.hidden=!state.draft||!['squash','openSink'].includes(a?.template);
    $('sinkDepth').parentElement.hidden=a?.template!=='openSink';
    // The label is a sibling of the control, not an input decoration.
    parameters.querySelector('label').hidden=a?.template!=='openSink';
    $('sinkDepth').value=String(Math.round((a?.depth??.25)*100));$('sinkDepthValue').value=$('sinkDepth').value+'%';
    $('pocketMotionHint').textContent=a?.template==='openSink'?'Place the rim 10–45% down from the tip of a waterbomb base. All connected pocket walls move together.':'For a square folded in half. Both symmetric pockets open together.';
    $('editAction').textContent=['squash','openSink'].includes(a?.template)?'Adjust below':'Adjust motion';frame();
  }
  function frame(){
    const a=state.draft||state.actions[state.selectedIndex];if(shown!==a)return;
    const current=stageAt(a,state.progress,!state.playing);stageButtons.forEach((b,i)=>{const on=motionStages(a)[i].id===current?.id;b.setAttribute('aria-current',on?'step':'false');});
    if(current&&state.active&&state.phase==='preview'&&!state.separateLayers)$('motionCue').textContent=(state.progress>=1?'Step complete · ':!state.playing&&state.progress>0?'Paused · ':'')+current.instruction;
  }
  window.addEventListener('foldlab:import-busy',()=>{for(const id of ['reversePractice','pocketPractice'])$(id).disabled=!!window.importBusy;});
  return {preview:refresh,frame};
}
