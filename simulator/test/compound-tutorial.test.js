import test from 'node:test';
import assert from 'node:assert/strict';
import {makeSheet,compileActions,poseAction,poseSequence} from '../src/action-fold.js';
import {checkMotion} from '../src/motion-quality.js';
import {validateLesson,makeRecipe,applyRecipe} from '../src/lesson-operations.js';
import {pocketLesson,reversePractice} from '../src/pocket-lessons.js';
import {motionStages,motionProgress,motionDuration,nextStageStop} from '../src/motion-stages.js';
import {solveDistanceVertex} from '../src/local-constraints.js';
import {craneActions} from '../src/crane-lesson.js';
const distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
const uvPoint=(faces,uv)=>faces.flatMap(f=>f.vertices).find(v=>distance(v.uv,uv)<1e-6)?.p;
test('symmetric squash and open sink preserve the complete sheet at different sizes and depths',()=>{
  for(const [size,depth]of [[2,.1],[210,.25],[400,.45]]){
    const lesson=pocketLesson(size,depth),seq=validateLesson(makeSheet(lesson.paper),lesson.actions);
    for(const i of [5,6]){
      checkMotion(seq.prepared[i],poseAction,{samples:65,tolerance:size*1e-7});
      for(const f of seq.frames[i])for(const v of f.vertices){const p=uvPoint(poseSequence(seq,i,0),v.uv);assert.ok(p&&distance(p,v.p)<size*1e-6,'continuous initial state');}
    }
    const tip=uvPoint(seq.frames[6],[size/2,size/2]),inside=uvPoint(seq.frames[7],[size/2,size/2]);
    assert.ok(Math.abs(distance(tip,inside)-size*depth)<1e-6,'sink depth changes actual material geometry');
    assert.deepEqual(compileActions(makeSheet(lesson.paper),JSON.parse(JSON.stringify(lesson.actions))).frames.at(-1),seq.frames.at(-1));
  }
});
test('pocket motions follow a raised and rotated packet without moving to the original plane',()=>{
  const lesson=pocketLesson(200),seq=compileActions(makeSheet(lesson.paper),lesson.actions.slice(0,5));
  const turn={kind:'template',template:'turn',axis:[[30,40,0],[30,40,1]],angle:31};
  const lift={kind:'template',template:'turn',axis:[[0,0,0],[1,0,0]],angle:55};
  const actions=[turn,lift,...lesson.actions.slice(5)],result=compileActions(seq.frames.at(-1),actions);
  for(const p of result.prepared)checkMotion(p,poseAction,{samples:25,tolerance:1e-4});
  const before=uvPoint(result.frames[2],[100,100]),start=uvPoint(poseSequence(result,2,0),[100,100]);assert.ok(distance(before,start)<1e-6);
});
test('an incompatible input is rejected with a preparation instruction',()=>{
  const lesson=pocketLesson(100),paper=makeSheet(lesson.paper);
  assert.throws(()=>compileActions(paper,[lesson.actions[5]]),/folded once|fold.*half/i);
  assert.throws(()=>compileActions(paper,[lesson.actions[6]]),/waterbomb/);
  const base=compileActions(paper,lesson.actions.slice(0,6)).frames.at(-1);
  assert.throws(()=>compileActions(base,[{...lesson.actions[6],depth:.6}]),/10% and 45%/);
});
test('inside reverse applies to different triangular points without square-base sectors',()=>{
  for(const width of [.3,.6,.85]){
    const lesson=reversePractice(200,width),seq=validateLesson(makeSheet(lesson.paper),lesson.actions);
    checkMotion(seq.prepared[1],poseAction,{samples:50,tolerance:1e-5});
    assert.ok(distance(uvPoint(seq.frames[1],[0,0]),uvPoint(seq.frames[2],[0,0]))>10);
    assert.ok(seq.prepared[1].pieces.every(f=>f.sector===undefined));
  }
});
test('crane head uses a real coordinated inside reverse',()=>{
  const a=craneActions({x:0,y:0,w:400,h:400})[29];assert.equal(a.template,'reverse');assert.equal(motionStages(a).length,3);
});
test('stage timing changes time allocation without changing endpoints or the fold path',()=>{
  const lesson=pocketLesson(200),a=lesson.actions[6],stages=motionStages(a).map((s,i)=>({...s,duration:i+1,pauseAfter:i===0}));
  const changed={...a,stages};assert.equal(motionDuration(changed),6);assert.equal(motionProgress(changed,1/6),.45);
  assert.equal(nextStageStop(changed,0,.5),1/6);assert.equal(nextStageStop(changed,1/6,.5),undefined);
  const seq=compileActions(makeSheet(lesson.paper),lesson.actions.slice(0,6)),before=seq.frames.at(-1),p=compileActions(before,[a]).prepared[0],q=compileActions(before,[changed]).prepared[0];
  for(const t of [0,.12,1/6,.3,.65,1]){const expected=poseAction(p,motionProgress(changed,t)),actual=poseAction(q,t);for(let i=0;i<actual.length;i++)for(let j=0;j<actual[i].vertices.length;j++)assert.ok(distance(expected[i].vertices[j].p,actual[i].vertices[j].p)<1e-7);}
  assert.throws(()=>validateLesson(before,[{...changed,stages:[{duration:1}]}]),/three teaching stages/);
  assert.throws(()=>motionStages({...a,stages:stages.map(s=>({...s,duration:NaN}))}),/duration/);
});
test('local distance solver preserves all three constraints and selected branch',()=>{
  const centers=[[0,0,0],[2,0,0],[0,2,0]],r=[Math.sqrt(3),Math.sqrt(3),Math.sqrt(3)];
  for(const z of [-1,1]){const p=solveDistanceVertex(centers,r,[1,1,z]);assert.ok(distance(p,[1,1,z])<1e-7);}
  assert.throws(()=>solveDistanceVertex(centers,[.1,.1,.1],[0,0,1]),/stretch/);
});
test('pocket recipe reuses its stages and dimensionless rim depth on resized paper',()=>{
  const a=pocketLesson(200,.3);a.actions[6].stages=motionStages(a.actions[6]).map(s=>({duration:1,pauseAfter:true,instruction:s.instruction}));
  const sheet=makeSheet(a.paper),recipe=makeRecipe('Pocket sequence',sheet,a.actions,4,6,{x:0,y:0,w:200,h:200});
  const b=pocketLesson(400),seq=compileActions(makeSheet(b.paper),b.actions.slice(0,4)),actions=applyRecipe(recipe,seq.frames.at(-1),{x:0,y:0,w:400,h:400},4);
  assert.equal(actions[2].depth,.3);assert.equal(actions[2].stages[0].pauseAfter,true);validateLesson(seq.frames.at(-1),actions);
});
test('squash and sink have no sampled strict triangle-interior crossings',()=>{
  const sub=(a,b)=>a.map((v,i)=>v-b[i]),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  function hit(a,b,[p,q,r]){const d=sub(b,a),e=sub(q,p),f=sub(r,p),h=cross(d,f),det=dot(e,h);if(Math.abs(det)<1e-10)return false;const s=sub(a,p),u=dot(s,h)/det,v=dot(d,cross(s,e))/det,t=dot(f,cross(s,e))/det;return t>1e-6&&t<1-1e-6&&u>1e-6&&v>1e-6&&u+v<1-1e-6;}
  for(const depth of [.1,.25,.45]){const l=pocketLesson(2,depth),s=compileActions(makeSheet(l.paper),l.actions);
    for(const step of [5,6])for(let k=1;k<60;k++){
      const ts=poseSequence(s,step,k/60).flatMap(f=>f.vertices.slice(1,-1).map((_,j)=>[f.vertices[0].p,f.vertices[j+1].p,f.vertices[j+2].p]));
      for(let i=0;i<ts.length;i++)for(let j=0;j<i;j++)for(let e=0;e<3;e++)assert.ok(!hit(ts[i][e],ts[i][(e+1)%3],ts[j])&&!hit(ts[j][e],ts[j][(e+1)%3],ts[i]),`crossing at depth ${depth}, step ${step}, frame ${k}`);
    }
  }
});
