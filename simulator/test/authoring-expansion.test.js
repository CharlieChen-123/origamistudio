import test from 'node:test';
import assert from 'node:assert/strict';
import {makeSheet,compileActions,poseAction,prepareAction} from '../src/action-fold.js';
import {checkMotion} from '../src/motion-quality.js';
import {airplaneLesson,boxLesson,rectanglePaper} from '../src/example-lessons.js';
import {axisForEdges,LessonHistory,planeForFace} from '../src/authoring-tools.js';
import {validateLesson,makeRecipe,applyRecipe} from '../src/lesson-operations.js';
import {craneActions} from '../src/crane-lesson.js';
for(const [name,build] of [['airplane',airplaneLesson],['box',boxLesson]])test(name+' preserves the same paper through every step and JSON round trip',()=>{
  const data=build(),seq=compileActions(makeSheet(data.paper),data.actions);
  for(let i=0;i<seq.prepared.length;i++){const p=seq.prepared[i];if(p.kind==='unfold')continue;checkMotion(p,poseAction,{samples:25,tolerance:1e-5});}
  const restored=JSON.parse(JSON.stringify(data));assert.deepEqual(compileActions(makeSheet(restored.paper),restored.actions).frames.at(-1),seq.frames.at(-1));
  const last=seq.frames.at(-1);assert.ok(last.some(f=>f.vertices.some(v=>Math.abs(v.p[2])>20)));
});
test('edge alignment mirrors a complete edge onto its target line',()=>{
  const a=axisForEdges([[0,0],[0,100]],[[50,0],[50,100]]),p=prepareAction(makeSheet(rectanglePaper(100,100)),{...a,angle:a.side*180});
  const result=poseAction(p,1);const vs=result.flatMap(f=>f.vertices).filter(v=>v.uv[0]===0);assert.ok(vs.every(v=>Math.abs(v.p[0]-50)<1e-7));
});
test('history branches correctly after undo, without sharing mutable snapshots',()=>{const h=new LessonHistory();h.record({a:[]});h.record({a:[1]});h.record({a:[1,2]});assert.deepEqual(h.undo(),{a:[1]});assert.deepEqual(h.redo(),{a:[1,2]});h.undo();h.record({a:[3]});assert.equal(h.redo(),null);assert.deepEqual(h.undo(),{a:[1]});});

test('petal and reverse pockets use explicit material regions without any sector IDs',()=>{
  const paper=rectanglePaper(400,400),actions=craneActions({x:0,y:0,w:400,h:400}),seq=compileActions(makeSheet(paper),actions);
  for(const i of [15,21,27,28]){
    const a=structuredClone(actions[i]),roles=a.template==='petal'?['front','left','right']:['front','back'];
    for(const role of roles){a[role+'Regions']=seq.frames[i].filter(f=>a[role+'Sectors'].includes(f.sector)).map(f=>f.vertices.map(v=>v.uv));delete a[role+'Sectors'];}
    const sheet=seq.frames[i].map(({sector,...f})=>f),prepared=validateLesson(sheet,[a]).prepared[0];
    for(const t of [0,.25,.5,.75,1])assert.deepEqual(poseAction(prepared,t).map(f=>f.vertices),poseAction(seq.prepared[i],t).map(f=>f.vertices));
  }
});
test('recipes remap unfold references and material geometry onto scaled paper',()=>{
  const a=airplaneLesson(),frame={x:0,y:0,w:210,h:297},initial=makeSheet(a.paper),recipe=makeRecipe('Airplane',initial,a.actions,0,8,frame);
  const large=makeSheet(rectanglePaper(420,594)),actions=applyRecipe(recipe,large,{x:0,y:0,w:420,h:594},0),seq=validateLesson(large,actions),base=compileActions(initial,a.actions).frames.at(-1);
  const result=seq.frames.at(-1);assert.equal(result.length,base.length);
  result.forEach((f,i)=>f.vertices.forEach((v,j)=>assert.ok(Math.hypot(...v.p.map((x,k)=>x/2-base[i].vertices[j].p[k]))<1e-6)));
  assert.throws(()=>applyRecipe(recipe,large,{x:0,y:0,w:420,h:400},0),/proportions/);
  assert.throws(()=>applyRecipe(recipe,seq.frames[1],{x:0,y:0,w:420,h:594},0),/same paper pose/);
  assert.throws(()=>makeRecipe('Bad unfold',initial,a.actions,1,2,frame),/Include the fold/);
});
test('invalid downstream motion names the failing step and leaves original actions intact',()=>{
  const lesson=airplaneLesson(),before=JSON.stringify(lesson.actions),edited=structuredClone(lesson.actions);edited[2].angle=-90;
  assert.throws(()=>validateLesson(makeSheet(lesson.paper),edited),/Step 4/);assert.equal(JSON.stringify(lesson.actions),before);
});
test('local work planes preserve connectivity while another surface is already raised',()=>{
  const lesson=airplaneLesson(),seq=compileActions(makeSheet(lesson.paper),lesson.actions),p=seq.prepared[8];
  assert.ok(p.plane);checkMotion(p,poseAction,{samples:50});
  const firstWing=seq.frames[8].filter(f=>f.vertices.some(v=>Math.abs(v.p[2])>1));
  for(const f of firstWing)for(const v of f.vertices){const matches=seq.frames[9].flatMap(f=>f.vertices).filter(w=>Math.hypot(...w.uv.map((x,k)=>x-v.uv[k]))<1e-6);assert.ok(matches.every(w=>Math.hypot(...w.p.map((x,k)=>x-v.p[k]))<1e-6));}
});
test('raised box has both mountain and valley corner marks',()=>{
  const b=boxLesson(),p=compileActions(makeSheet(b.paper),b.actions).prepared.at(-1);assert.ok(p.creases.some(c=>c.type==='M'));assert.ok(p.creases.some(c=>c.type==='V'));
});
