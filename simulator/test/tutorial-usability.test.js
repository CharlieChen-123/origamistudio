import test from 'node:test';
import assert from 'node:assert/strict';
import {materialAdjacency} from '../src/material-topology.js';
import {checkMotion} from '../src/motion-quality.js';
import {airplaneLesson,rectanglePaper} from '../src/example-lessons.js';
import {makeSheet,compileActions,prepareAction,poseAction,sideOf,flapCandidates} from '../src/action-fold.js';
import {reverseFromIntent,mapSheet,fromPlane} from '../src/authoring-tools.js';
import {craneActions} from '../src/crane-lesson.js';
import {validateLesson} from '../src/lesson-operations.js';
const face=ps=>({vertices:ps.map(uv=>({uv,p:[...uv,0]}))});
test('material neighbours survive an edge split on only one side',()=>{
  const fs=[face([[0,0],[2,0],[2,2],[0,2]]),face([[2,0],[3,0],[3,1],[2,1]]),face([[2,1],[3,1],[3,2],[2,2]])];
  const a=materialAdjacency(fs);assert.deepEqual([...a[0]],[1,2]);
});
test('validator rejects a torn T-junction even if no exact vertex key is shared',()=>{
  const fs=[face([[0,0],[2,0],[2,3],[0,3]]),face([[2,1],[3,1],[3,2],[2,2]])];
  assert.throws(()=>checkMotion({},(_,t)=>fs.map((f,i)=>({...f,vertices:f.vertices.map(v=>({...v,p:[v.p[0],v.p[1],i*t]}))}))),/separating/);
});
test('each Dart wing moves every constituent layer, including both tucked nose panels',()=>{
  const l=airplaneLesson(),seq=validateLesson(makeSheet(l.paper),l.actions);
  for(const i of [7,8]){
    assert.equal(l.actions[i].seeds.length,2);
    const p=seq.prepared[i],local=p.plane?{...p,plane:null}:p;
    for(const f of local.pieces){
      const uvx=f.vertices.reduce((n,v)=>n+v.uv[0],0)/f.vertices.length;
      const cx=f.vertices.reduce((n,v)=>n+v.p[0],0)/f.vertices.length,cy=f.vertices.reduce((n,v)=>n+v.p[1],0)/f.vertices.length;
      const belongs=i===7?uvx<105:uvx>105;
      if(belongs&&sideOf([cx,cy],l.actions[i].axis)<-1e-5)assert.ok(f.moving,'A wing layer was left against the body');
    }
    for(const t of [.25,.5,1]){const posed=poseAction(local,t);for(let j=0;j<local.pieces.length;j++)if(local.pieces[j].moving)assert.ok(posed[j].vertices.some(v=>Math.abs(v.p[2])>1e-4));}
  }
});
test('float32 pointer rounding at the Dart nose does not merge independent wings',()=>{
  const l=airplaneLesson(),seq=compileActions(makeSheet(l.paper),l.actions);
  const a={...l.actions[7],axis:[[103.59000396728516,-27.917999267578125],[121.40999603271484,324.9179992675781]]};
  assert.equal(flapCandidates(seq.frames[7],a).length,4);
  checkMotion(prepareAction(seq.frames[7],a),poseAction,{tolerance:1e-4});
});
test('tip-pivot-direction creates the same reverse fold as an explicit hinge',()=>{
  const actions=craneActions({x:0,y:0,w:400,h:400}),seq=compileActions(makeSheet(rectanglePaper(400,400)),actions);
  for(const i of [27,28]){
    const a=actions[i],u=a.hinge.map((x,k)=>x-a.pivot[k]),v=a.spine.map((x,k)=>x-a.pivot[k]),s=2*(u[0]*v[0]+u[1]*v[1])/(u[0]*u[0]+u[1]*u[1]),dest=a.pivot.map((x,k)=>x+s*u[k]-v[k]);
    const next={...a,...reverseFromIntent(a.spine,a.pivot,dest)},p=validateLesson(seq.frames[i],[next]).prepared[0];
    for(const t of [0,.3,.7,1]){const expected=poseAction(seq.prepared[i],t),actual=poseAction(p,t);assert.equal(actual.length,expected.length);for(let j=0;j<actual.length;j++)for(let k=0;k<actual[j].vertices.length;k++)assert.ok(Math.hypot(...actual[j].vertices[k].p.map((x,n)=>x-expected[j].vertices[k].p[n]))<1e-5);}
  }
});
test('a petal template works in a raised local plane without changing material coordinates',()=>{
  const actions=craneActions({x:0,y:0,w:400,h:400}),seq=compileActions(makeSheet(rectanglePaper(400,400)),actions),plane={origin:[20,30,50],u:[1,0,0],v:[0,0,1],normal:[0,-1,0]};
  const sheet=mapSheet(seq.frames[15],p=>fromPlane(p,plane)),a={...actions[15],plane},p=validateLesson(sheet,[a]).prepared[0];
  for(const t of [0,.5,1]){const actual=poseAction(p,t),expected=mapSheet(poseAction(seq.prepared[15],t),v=>fromPlane(v,plane));assert.equal(actual.length,expected.length);actual.forEach((f,i)=>f.vertices.forEach((v,j)=>assert.ok(Math.hypot(...v.p.map((x,k)=>x-expected[i].vertices[j].p[k]))<1e-5)));}
});
