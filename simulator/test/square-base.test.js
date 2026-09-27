import test from 'node:test';
import assert from 'node:assert/strict';
import {makeSheet,compileActions,poseSequence} from '../src/action-fold.js';
import {craneActions} from '../src/crane-lesson.js';
const fold={vertices_coords:[[-1,-1],[1,-1],[1,1],[-1,1]],faces_vertices:[[0,1,2,3]]};
const sheet=makeSheet(fold),actions=craneActions({x:-1,y:-1,w:2,h:2}).slice(0,15);
const seq=compileActions(sheet,actions);
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
function invariant(faces){
  const shared=new Map();let area=0;
  for(const f of faces){
    for(const v of f.vertices){
      assert.ok(v.p.every(Number.isFinite));
      const key=v.uv.map(v=>v.toFixed(7)).join(',');
      if(shared.has(key))assert.ok(distance(v.p,shared.get(key))<1e-6,'material seam separates at '+key);
      shared.set(key,v.p);
      for(const w of f.vertices)assert.ok(Math.abs(distance(v.p,w.p)-distance(v.uv,w.uv))<1e-6,'paper stretches');
    }
    for(let j=1;j<f.vertices.length-1;j++){
      const [a,b,c]=[f.vertices[0],f.vertices[j],f.vertices[j+1]].map(v=>v.p);
      const u=b.map((v,k)=>v-a[k]),v=c.map((v,k)=>v-a[k]);
      area+=Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])/2;
    }
  }assert.ok(Math.abs(area-4)<1e-6,'material area is not four');
}
test('square-base collapse preserves every face length, shared point and total area through 101 frames',()=>{
  for(let i=0;i<=100;i++)invariant(poseSequence(seq,8,i/100));
});
test('square-base endpoint is a four-layer square with all four original corners at the open tip',()=>{
  const faces=seq.frames[9],q=1/Math.SQRT2;
  for(const v of faces.flatMap(f=>f.vertices)){
    assert.ok(Math.abs(v.p[2])<1e-9);
    assert.ok(Math.abs(v.p[0])+Math.abs(v.p[1])<=q+1e-8);
    if(Math.abs(v.uv[0])===1&&Math.abs(v.uv[1])===1)assert.ok(distance(v.p,[0,q,0])<1e-8);
    if(Math.hypot(...v.uv)<1e-8)assert.ok(distance(v.p,[0,-q,0])<1e-8);
  }
  assert.equal(new Set(faces.map(f=>f.renderLayer)).size,4);
});
test('six continuation steps keep paper connected, preserve dimensions and restore the square base',()=>{
  for(let i=9;i<actions.length;i++)for(const t of [0,.15,.5,.85,1])invariant(poseSequence(seq,i,t));
  const q=1/Math.SQRT2;
  for(const v of seq.frames.at(-1).flatMap(f=>f.vertices))assert.ok(Math.abs(v.p[0])+Math.abs(v.p[1])<=q+1e-8&&Math.abs(v.p[2])<1e-8);
  assert.ok(seq.prepared[9].creases.length>0);
  assert.ok(seq.prepared[9].creases.some(c=>c.type==='V'));
  assert.ok(seq.prepared[9].creases.some(c=>c.type==='M'));
});
test('saved lesson actions compile to the same endpoint after JSON round trip',()=>{
  const restored=compileActions(makeSheet(JSON.parse(JSON.stringify(fold))),JSON.parse(JSON.stringify(actions)));
  assert.deepEqual(restored.frames.at(-1),seq.frames.at(-1));
});

test('sampled moving triangles do not cross other triangle interiors',()=>{
  const sub=(a,b)=>a.map((v,i)=>v-b[i]);
  const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  function hit(a,b,[p,q,r]){
    const d=sub(b,a),e=sub(q,p),f=sub(r,p),h=cross(d,f),det=dot(e,h);
    if(Math.abs(det)<1e-8)return false; // Contact and coincident flat layers are allowed.
    const s=sub(a,p),u=dot(s,h)/det,v=dot(d,cross(s,e))/det,t=dot(f,cross(s,e))/det;
    return t>1e-6&&t<1-1e-6&&u>1e-6&&v>1e-6&&u+v<1-1e-6;
  }
  for(const step of [8,9,11,13])for(let k=1;k<100;k++){
    const triangles=poseSequence(seq,step,k/100).flatMap(f=>f.vertices.slice(1,-1).map((_,i)=>[f.vertices[0].p,f.vertices[i+1].p,f.vertices[i+2].p]));
    for(let i=0;i<triangles.length;i++)for(let j=i+1;j<triangles.length;j++)for(let e=0;e<3;e++){
      assert.ok(!hit(triangles[i][e],triangles[i][(e+1)%3],triangles[j])&&!hit(triangles[j][e],triangles[j][(e+1)%3],triangles[i]),`interior crossing at step ${step}, frame ${k}`);
    }
  }
});
