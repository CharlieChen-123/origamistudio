import test from 'node:test';
import assert from 'node:assert/strict';
import {makeSheet,compileActions,poseAction} from '../src/action-fold.js';
import {motionCreases,mergeCreaseHistory} from '../src/crease-history.js';
import {createPaperDisplay} from '../src/paper-display.js';
import {materialSeams} from '../src/material-topology.js';
import {airplaneLesson} from '../src/example-lessons.js';
const paper={vertices_coords:[[0,0],[2,0],[2,2],[0,2]],faces_vertices:[[0,1,2,3]]};
test('opening mountains and valleys preserves their material assignment from either side',()=>{
 for(const side of [-1,1])for(const direction of [-1,1]){
  const p=compileActions(makeSheet(paper),[{kind:'fold',axis:[[1,0],[1,2]],side,angle:180*side*direction}]).prepared[0],type=direction===1?'V':'M';
  for(const marks of [p.creases,motionCreases(p,(p,t)=>poseAction(p,1-t))])assert.ok(marks.length&&marks.every(m=>m.type===type));
 }
});
test('crease signs are invariant under a rigid 3D change of orientation',()=>{
 const p=compileActions(makeSheet(paper),[{kind:'fold',axis:[[1,0],[1,2]],side:1,angle:-180}]).prepared[0];
 const rotate=fs=>fs.map(f=>({...f,vertices:f.vertices.map(v=>({...v,p:[v.p[2]+7,-v.p[1]+3,v.p[0]-2]}))}));
 assert.deepEqual(motionCreases(p,(p,t)=>rotate(poseAction(p,t))),p.creases);
 assert.deepEqual(motionCreases(p,()=>rotate(poseAction(p,.5))),[]);
});
test('a crease changes colour only after crossing flat, including when playing backwards',()=>{
 const p=compileActions(makeSheet(paper),[{kind:'fold',axis:[[1,0],[1,2]],side:1,angle:180}]).prepared[0];
 const events=motionCreases(p,(p,t)=>poseAction({...p,angle:(t-.5)*180},1));
 assert.ok(events.some(m=>m.type==='M')&&events.some(m=>m.type==='V'));
 assert.ok(mergeCreaseHistory(events.filter(m=>m.at<.5)).every(m=>m.type==='M'));
 assert.ok(mergeCreaseHistory(events).every(m=>m.type==='V'));
 assert.ok(mergeCreaseHistory(events.filter(m=>m.at<.5)).every(m=>m.type==='M'));
});
test('partial refolds replace only the overlapping crease interval',()=>{
 const first={a:[0,0],b:[10,0],type:'M'},later={a:[7,0],b:[3,0],type:'V'},otherLayer={a:[0,1],b:[10,1],type:'V'};
 const result=mergeCreaseHistory([first,otherLayer,later]);
 assert.deepEqual(result.filter(x=>x.type==='M').map(x=>[x.a,x.b]),[[[0,0],[3,0]],[[7,0],[10,0]]]);
 assert.ok(result.some(x=>x.a[1]===1));assert.deepEqual(first,{a:[0,0],b:[10,0],type:'M'});
});
test('clear paper layers weld T junctions and leave physical geometry untouched',()=>{
 const a=airplaneLesson(),seq=compileActions(makeSheet(a.paper),a.actions),display=createPaperDisplay();
 for(const i of [4,6,7,8])for(const t of [0,.4,1]){
  const faces=poseAction(seq.prepared[i],t),copy=structuredClone(faces),shown=display(faces,180);
  for(const s of materialSeams(shown)){const v=shown[s.fi].vertices[s.vi].p,e=shown[s.edge.fi].vertices,a=e[s.edge.ai].p,b=e[s.edge.bi].p;assert.ok(Math.hypot(...v.map((x,k)=>x-a[k]-s.t*(b[k]-a[k])))<1e-5);}
  assert.deepEqual(faces,copy);
 }
 const flat=seq.frames[7],normal=display(flat,180),exploded=display(flat,180,{separate:true});assert.notDeepEqual(normal,exploded);
});
