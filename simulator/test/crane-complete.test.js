import test from 'node:test';
import assert from 'node:assert/strict';
import {makeSheet,compileActions,poseSequence,poseAction} from '../src/action-fold.js';
import {craneActions} from '../src/crane-lesson.js';
import {checkMotion} from '../src/motion-quality.js';
const input={vertices_coords:[[-1,-1],[1,-1],[1,1],[-1,1]],faces_vertices:[[0,1,2,3]]};
const actions=craneActions({x:-1,y:-1,w:2,h:2}),seq=compileActions(makeSheet(input),actions);
const sub=(a,b)=>a.map((v,i)=>v-b[i]),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dist=(a,b)=>Math.hypot(...sub(a,b));
function materialPoint(faces,uv){return faces.flatMap(f=>f.vertices).find(v=>dist(v.uv,uv)<1e-7)?.p;}
test('complete crane has 33 continuous material actions, with no illustrative replacements',()=>{
  assert.equal(actions.length,33);assert.ok(actions.every(a=>a.kind!=='demo'));
  for(let i=0;i<actions.length;i++){
    const p=seq.prepared[i],motion=p.kind==='unfold'?p.ref:p;
    checkMotion(motion,poseAction,{samples:40,tolerance:1e-7});
    for(const t of [0,.2,.5,.8,1]){
      const faces=poseSequence(seq,i,t);
      const area=faces.reduce((s,f)=>s+f.vertices.slice(1,-1).reduce((s,_,j)=>s+Math.hypot(...cross(sub(f.vertices[j+1].p,f.vertices[0].p),sub(f.vertices[j+2].p,f.vertices[0].p)))/2,0),0);
      assert.ok(Math.abs(area-4)<1e-7,`material area at step ${i+1}`);
    }
    for(const uv of [[-1,-1],[1,-1],[1,1],[-1,1],[0,0]]){
      const before=materialPoint(seq.frames[i],uv),start=materialPoint(poseSequence(seq,i,0),uv);
      if(before&&start)assert.ok(dist(before,start)<1e-7,`step ${i+1} jumps`);
    }
  }
});
test('final crane has spread wings, elevated neck and tail, and a folded head',()=>{
  const previousWingY=-1/Math.SQRT2;
  assert.ok(actions[30].axis[0][1]>previousWingY&&actions[31].axis[0][1]===actions[30].axis[0][1]);
  assert.equal(actions[32].axis[0][1],actions[30].axis[0][1]);
  const f=seq.frames.at(-1),head=materialPoint(f,[-1,1]),tail=materialPoint(f,[1,-1]);
  const wing1=materialPoint(f,[1,1]),wing2=materialPoint(f,[-1,-1]);
  assert.ok(wing1&&wing2&&head&&tail);
  assert.ok(Math.abs(wing1[2]-wing2[2])<1e-7,'wings share height');
  assert.ok(Math.abs(wing1[1]-wing2[1])>.8,'wings spread apart');
  assert.ok(head[2]>wing1[2]&&tail[2]>wing1[2],'neck and tail rise above wing roots');
  assert.ok(dist(materialPoint(seq.frames[29],[-1,1]),materialPoint(seq.frames[30],[-1,1]))>.1,'head actually folds');
});
test('templates retain geometry at application scale and survive save/load',()=>{
  const a=craneActions({x:0,y:0,w:400,h:400}),paper={vertices_coords:[[0,0],[400,0],[400,400],[0,400]],faces_vertices:[[0,1,2,3]]};
  const s=compileActions(makeSheet(paper),a);
  for(const i of [15,21,27,28,29,30,31,32])checkMotion(s.prepared[i],poseAction,{tolerance:1e-4});
  assert.deepEqual(compileActions(makeSheet(paper),JSON.parse(JSON.stringify(a))).frames.at(-1),s.frames.at(-1));
});
test('invalid pocket selection is rejected by the material validator',()=>{
  const a={...actions[15],leftSectors:[],rightSectors:[]};
  assert.throws(()=>compileActions(seq.frames[15],[a]),/pocket/);
  const torn={...seq.prepared[15],pieces:seq.prepared[15].pieces.map(f=>f.panel==='innerLeft'?{...f,panel:null}:f)};
  assert.throws(()=>checkMotion(torn,poseAction),/separating/);
});
test('compound crease types follow the actual hinges and contain both mountains and valleys',()=>{
  for(const i of [15,21,27,28]){
    const marks=seq.prepared[i].creases;
    assert.ok(marks.some(m=>m.type==='M'));assert.ok(marks.some(m=>m.type==='V'));
  }
});
test('new compound actions have no sampled strict triangle-interior crossings',()=>{
  function hit(a,b,[p,q,r]){
    const d=sub(b,a),e=sub(q,p),f=sub(r,p),h=cross(d,f),det=dot(e,h);
    if(Math.abs(det)<1e-8)return false;
    const s=sub(a,p),u=dot(s,h)/det,v=dot(d,cross(s,e))/det,t=dot(f,cross(s,e))/det;
    return t>1e-6&&t<1-1e-6&&u>1e-6&&v>1e-6&&u+v<1-1e-6;
  }
  for(let step=15;step<33;step++)for(let k=1;k<20;k++){
    const ts=poseSequence(seq,step,k/20).flatMap(f=>f.vertices.slice(1,-1).map((_,j)=>[f.vertices[0].p,f.vertices[j+1].p,f.vertices[j+2].p]));
    for(let i=0;i<ts.length;i++)for(let j=i+1;j<ts.length;j++)for(let e=0;e<3;e++)assert.ok(!hit(ts[i][e],ts[i][(e+1)%3],ts[j])&&!hit(ts[j][e],ts[j][(e+1)%3],ts[i]),`crossing at step ${step+1}, frame ${k}`);
  }
});
