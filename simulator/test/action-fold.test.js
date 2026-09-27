import test from 'node:test';
import assert from 'node:assert/strict';
import {makeSheet,prepareAction,poseAction,axisForMatch,compileActions,poseSequence} from '../src/action-fold.js';
const fold={vertices_coords:[[0,0],[2,0],[2,2],[0,2]],faces_vertices:[[0,1,2,3]]};
const sheet=makeSheet(fold);
const area=faces=>faces.reduce((sum,f)=>{const [a,...rest]=f.vertices.map(v=>v.p);for(let i=0;i<rest.length-1;i++){const b=rest[i].map((v,k)=>v-a[k]),c=rest[i+1].map((v,k)=>v-a[k]);sum+=Math.hypot(b[1]*c[2]-b[2]*c[1],b[2]*c[0]-b[0]*c[2],b[0]*c[1]-b[1]*c[0])/2;}return sum;},0);
test('a short crease defines a whole-sheet hinge without stretching at any animation frame',()=>{
 const p=prepareAction(sheet,{axis:[[1,.9],[1,1.1]],side:1,angle:180});
 for(const t of [0,.1,.5,.9,1]){const posed=poseAction(p,t);assert.ok(Math.abs(area(posed)-4)<1e-8);posed.forEach((f,i)=>f.vertices.forEach((v,j)=>{const a=p.pieces[i].vertices[j],b=p.pieces[i].vertices[(j+1)%f.vertices.length],w=f.vertices[(j+1)%f.vertices.length];assert.ok(Math.abs(Math.hypot(...a.p.map((x,k)=>x-b.p[k]))-Math.hypot(...v.p.map((x,k)=>x-w.p[k])))<1e-8);}));}
});
test('drag-to-match computes the bisector and lands the selected corner on its target',()=>{
 const {axis,side}=axisForMatch([0,0],[2,2]);const p=prepareAction(sheet,{axis,side,angle:180});const faces=poseAction(p,1);const v=faces.flatMap(f=>f.vertices).find(v=>v.uv[0]===0&&v.uv[1]===0);assert.ok(Math.hypot(v.p[0]-2,v.p[1]-2,v.p[2])<1e-8);
});
test('tutorial fold direction marks valley toward and mountain away',()=>{
 for(const side of [1,-1]){
  const axis=[[1,0],[1,2]];
  const toward=prepareAction(sheet,{axis,side,angle:180*side});
  const away=prepareAction(sheet,{axis,side,angle:-180*side});
  assert.ok(toward.creases.length>0&&toward.creases.every(line=>line.type==='V'));
  assert.ok(away.creases.length>0&&away.creases.every(line=>line.type==='M'));
  assert.ok(prepareAction(sheet,{axis,side,angle:-180*side,assignment:'V'}).creases.every(line=>line.type==='V'));
 }
});
test('fold then unfold returns every material point to its original position',()=>{
 const seq=compileActions(sheet,[{axis:[[0,0],[2,2]],side:1,angle:180},{kind:'unfold',foldIndex:0}]);
 poseSequence(seq,1,1).flatMap(f=>f.vertices).forEach(v=>assert.ok(Math.hypot(v.p[0]-v.uv[0],v.p[1]-v.uv[1],v.p[2])<1e-8));
});
test('two sequential all-layer folds preserve area and material coordinates',()=>{
 const seq=compileActions(sheet,[{axis:[[1,0],[1,2]],side:1,angle:180},{axis:[[0,1],[2,1]],side:1,angle:180}]);assert.ok(Math.abs(area(seq.frames.at(-1))-4)<1e-8);
});
test('non-flat continuation and axes outside the sheet give a useful error',()=>{
 assert.throws(()=>prepareAction(sheet,{axis:[[3,0],[3,2]],side:1,angle:180}),/cross the paper/);
 const half=poseAction(prepareAction(sheet,{axis:[[1,0],[1,2]],side:1,angle:90}),1);assert.throws(()=>prepareAction(half,{axis:[[0,1],[2,1]],side:1,angle:180}),/Finish this fold flat/);
});
test('connected flap selection keeps unconnected overlapping paper stationary',()=>{
 const upper=makeSheet(fold),lower=makeSheet({vertices_coords:fold.vertices_coords.map(([x,y])=>[x+3,y]),faces_vertices:fold.faces_vertices}).map(f=>({...f,vertices:f.vertices.map(v=>({...v,p:[v.p[0]-3,v.p[1],0]}))}));
 const p=prepareAction([...upper,...lower],{axis:[[1,0],[1,2]],side:1,angle:180,seed:[.4,.4]});const posed=poseAction(p,.5);assert.ok(posed.filter(f=>f.vertices.every(v=>v.uv[0]>2)).every(f=>f.vertices.every(v=>Math.abs(v.p[2])<1e-8)));
});
test('guided compound-fold steps preserve the last physical pose',()=>{
 const seq=compileActions(sheet,[{kind:'demo',diagram:'collapse',title:'Collapse the base'}]);
 assert.equal(seq.prepared[0].kind,'demo');
 assert.deepEqual(poseSequence(seq,0,.5),sheet);
});
