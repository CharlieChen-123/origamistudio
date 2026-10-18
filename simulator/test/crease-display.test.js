import test from 'node:test';
import assert from 'node:assert/strict';
import {posedCreaseSegments} from '../src/crease-display.js';
const vertex=(uv,p)=>({uv,p});
test('crease follows the rendered triangles of a non-planar display polygon',()=>{
  const face={vertices:[vertex([0,0],[0,0,0]),vertex([2,0],[2,0,0]),vertex([2,2],[2,2,1]),vertex([0,2],[0,2,0])]};
  const marks=[{a:[0,1],b:[2,1],type:'M'}],copy=structuredClone(face);
  const lines=posedCreaseSegments([face],marks);
  assert.equal(lines.length,2);
  for(const line of lines)for(const p of [line.a,line.b])assert.ok(Math.abs(p[2]-Math.min(p[0],p[1])/2)<1e-9);
  assert.deepEqual(face,copy);
  assert.ok(lines.some(l=>l.a[0]===0&&l.a[2]===0));
});
test('inserted collinear seam vertices do not extrapolate creases off the paper',()=>{
  const face={vertices:[vertex([0,0],[0,0,0]),vertex([1,0],[1,0,.01]),vertex([2,0],[2,0,0]),vertex([2,2],[2,2,.02]),vertex([0,2],[0,2,0])]};
  for(const line of posedCreaseSegments([face],[{a:[-10,1],b:[10,1],type:'V'}]))for(const p of [line.a,line.b]){
    assert.ok(p.every(Number.isFinite));assert.ok(p[0]>=-1e-9&&p[0]<=2+1e-9);assert.ok(Math.abs(p[2])<=.02);
  }
});
test('deduplication is display-only and preserves separate material layers for authoring',()=>{
  const face={vertices:[vertex([0,0],[0,0,0]),vertex([2,0],[2,0,0]),vertex([0,2],[0,2,0])]};
  const lines=[{a:[0,1],b:[1,0],type:'M'}];
  assert.equal(posedCreaseSegments([face,structuredClone(face)],lines).length,2);
  assert.equal(posedCreaseSegments([face,structuredClone(face)],lines,{deduplicate:true}).length,1);
  const above={vertices:face.vertices.map(v=>({...v,p:[v.p[0],v.p[1],.01]}))};
  assert.equal(posedCreaseSegments([face,above],lines,{deduplicate:true}).length,2);
});
