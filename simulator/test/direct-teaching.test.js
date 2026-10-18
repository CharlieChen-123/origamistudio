import test from 'node:test';
import assert from 'node:assert/strict';
import {makeSheet,compileActions,poseAction} from '../src/action-fold.js';
import {rectanglePaper} from '../src/example-lessons.js';
import {validateLesson,makeRecipe,applyRecipe} from '../src/lesson-operations.js';
import {mirrorAction,fromPlane} from '../src/authoring-tools.js';
import {barycentric,resolveAnchor,validateTeaching,nextTeachingStop,teachingCueAt,foldAngleAtPoint} from '../src/teaching-tools.js';
import {strictTriangleCrossing,inspectMotion,motionRecovery} from '../src/motion-inspection.js';

const paper=rectanglePaper(400,400),sheet=makeSheet(paper),fold={kind:'fold',axis:[[200,0],[200,400]],side:1,angle:180};
const anchor={uv:[50,100]},mark={kind:'label',from:anchor,text:'Only this layer',start:.1,end:.9};
const notes={marks:[mark,{kind:'arrow',from:anchor,to:{uv:[300,100]},text:'Align these edges',start:0,end:1}],cues:[{at:.5,text:'Check the edge',pause:true,focus:{anchor,zoom:1.6}}]};
const close=(a,b)=>a.forEach((n,i)=>assert.ok(Math.abs(n-b[i])<1e-6,`${a} != ${b}`));

test('material marks follow the same paper point through a fold and unfold',()=>{
  const seq=validateLesson(sheet,[{...fold,teaching:notes},{kind:'unfold',foldIndex:0,teaching:notes}]);
  close(resolveAnchor(anchor,poseAction(seq.prepared[0],0)),[50,100,0]);
  close(resolveAnchor(anchor,poseAction(seq.prepared[0],.5)),[200,100,150]);
  close(resolveAnchor(anchor,seq.frames[1]),[350,100,0]);
  close(resolveAnchor(anchor,seq.frames[2]),[50,100,0]);
});
test('anchors survive paper subdivisions and raised local work planes',()=>{
  const plane={origin:[0,0,20],u:[1,0,0],v:[0,0,1],normal:[0,-1,0]},raised=sheet.map(f=>({...f,vertices:f.vertices.map(v=>({...v,p:fromPlane(v.p,plane)}))}));
  const p=compileActions(raised,[{...fold,plane}]).prepared[0];close(resolveAnchor(anchor,poseAction(p,.5)),fromPlane([200,100,150],plane));
});
test('labels cannot silently attach to another overlapping layer',()=>{
  const a={id:1,vertices:[{uv:[0,0],p:[0,0,0]},{uv:[1,0],p:[1,0,0]},{uv:[0,1],p:[0,1,0]}]},b={id:2,vertices:a.vertices.map(v=>({uv:v.uv.map(x=>x+10),p:v.p.map((x,i)=>i===2?2:x)}))};
  close(resolveAnchor({uv:[10.2,10.2],faceId:2},[a,b]),[.2,.2,2]);assert.equal(resolveAnchor({uv:[.2,.2],faceId:2},[a,b]),null);
});
test('checkpoints stop once, resume past the current checkpoint, and retain their instruction',()=>{
  const a={teaching:{cues:[{at:.75,text:'Second',pause:true},{at:.25,text:'First',pause:true},{at:.5,text:'Look',pause:false}]}};
  assert.equal(nextTeachingStop(a,0,.9),.25);assert.equal(nextTeachingStop(a,.25,.6),undefined);assert.equal(nextTeachingStop(a,.25,1),.75);assert.equal(nextTeachingStop(a,.75,1),undefined);assert.equal(teachingCueAt(a,.6).text,'Look');assert.equal(teachingCueAt(a,.1),null);
});
test('invalid imported teaching data is rejected before it changes a lesson',()=>{
  for(const teaching of [{marks:[{...mark,from:{uv:[-5,-5]}}]}, {marks:[{...mark,end:-1}]},{marks:[{...mark,text:{html:'bad'}}]}, {marks:[{...mark,kind:'html'}]},{cues:[{at:Infinity,text:''}]},{cues:[{at:.2,text:''},{at:.201,text:''}]},{cues:[{at:.5,text:'',focus:{anchor,zoom:8}}]},{marks:Array(25).fill(mark)}])assert.throws(()=>validateLesson(sheet,[{...fold,teaching}]),/Step 1/);
  assert.doesNotThrow(()=>validateTeaching({...fold,teaching:notes},sheet));
});
test('teaching content round trips through the existing portable tutorial format',()=>{
  const data={format:'fold-lab-tutorial',version:2,fold:paper,actions:[{...fold,teaching:notes}]},restored=JSON.parse(JSON.stringify(data));
  validateLesson(makeSheet(restored.fold),restored.actions);assert.deepEqual(restored.actions[0].teaching,notes);assert.deepEqual(notes.marks[0],mark);
});
test('mirror and scaled recipe keep labels on their corresponding material points',()=>{
  const tagged=structuredClone(notes);tagged.marks[0].from.faceId=sheet[0].id;const a={...fold,teaching:tagged},mirror=mirrorAction(a,200);close(mirror.teaching.marks[0].from.uv,[350,100]);assert.doesNotThrow(()=>validateLesson(sheet,[mirror]));
  const recipe=makeRecipe('Fold',sheet,[a],0,0,{x:0,y:0,w:400,h:400}),small=makeSheet(rectanglePaper(200,200)),applied=applyRecipe(recipe,small,{x:0,y:0,w:200,h:200},0);close(applied[0].teaching.cues[0].focus.anchor.uv,[25,50]);assert.equal(applied[0].teaching.marks[0].from.faceId,undefined);validateLesson(small.map((f,i)=>({...f,id:100+i})),applied);
});
test('dragged tip is constrained to a rigid fold angle in either direction',()=>{
  const axis=[[0,0],[0,2]],start=[-1,0,0];for(const degrees of [-170,-90,-30,30,90,170]){const t=degrees*Math.PI/180;assert.ok(Math.abs(foldAngleAtPoint(axis,start,[-Math.cos(t),0,Math.sin(t)],degrees)-degrees)<1e-6);}
  assert.throws(()=>foldAngleAtPoint(axis,[0,0,0],[0,0,1]),/away/);assert.equal(barycentric([1,1],[0,0],[0,0],[0,0]),null);
});
test('crossing detection excludes coplanar stacks, shared hinges and edge contact',()=>{
  const a=[[-1,-1,0],[1,-1,0],[0,1,0]],b=[[0,-.5,-1],[0,-.5,1],[0,.5,0]];
  assert.ok(strictTriangleCrossing(a,b));assert.equal(strictTriangleCrossing(a,a),null);
  assert.equal(strictTriangleCrossing([[0,0,0],[1,0,0],[0,1,0]],[[0,0,0],[1,0,0],[0,0,1]]),null);
  assert.equal(strictTriangleCrossing(a,b.map(p=>p.map((x,i)=>i===0?x+5:x))),null);
});
test('motion inspection reports new crossings, keeps sample time, and bounds expensive checks',()=>{
  const f=(ps,id)=>({id,vertices:ps.map(p=>({p,uv:p.slice(0,2)}))}),a=f([[-1,-1,0],[1,-1,0],[0,1,0]],0),b=f([[0,-.5,-1],[0,-.5,1],[0,.5,0]],1);
  const pose=(_,t)=>[a,{...b,vertices:b.vertices.map(v=>({...v,p:v.p.map((x,i)=>i===0?x+(1-t)*4:x)}))}];
  const result=inspectMotion({},pose,{times:[0,.5,1]});assert.equal(result.status,'crossing');assert.equal(result.first.at,1);
  assert.equal(inspectMotion({},()=>[a,b]).status,'clear');assert.equal(inspectMotion({},pose,{maxTriangles:1}).status,'limited');
  const p=compileActions(sheet,[fold]).prepared[0];assert.equal(inspectMotion(p,poseAction).status,'clear');
});
test('failure advice names a next action for layers, local surfaces and invalid axes',()=>{
  assert.equal(motionRecovery('These layers cannot move without stretching or separating').action,'layers');assert.equal(motionRecovery('Finish this fold flat before the next fold').action,'surface');assert.equal(motionRecovery('The fold line must cross the paper').action,'axis');assert.equal(motionRecovery('This move needs a symmetric pocket').action,'move');
});
