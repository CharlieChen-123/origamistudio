import test from 'node:test';
import assert from 'node:assert/strict';
import {makeSeamModel,rollSeam,relaxSeam,seamMetrics} from '../src/seam-engine.js';
// Left boundary has a midpoint; the right boundary has only two endpoints.
const fold={vertices_coords:[[0,0],[1,0],[1,1],[0,1],[0,.5],[.5,.5]],edges_vertices:[[0,1],[1,2],[2,3],[3,4],[4,0]],edges_assignment:['B','B','B','B','B'],faces_vertices:[[0,1,5],[1,2,5],[2,3,5],[3,4,5],[4,0,5]]};
test('seam covers mismatched boundary subdivisions using point-to-edge constraints',()=>{
 const m=makeSeamModel(fold);assert.equal(m.pairs.length,2);assert.equal(m.seams.length,1);assert.equal(m.unpaired,0);
 m.positions[4][0]+=.03;const before=seamMetrics(m).seamGap;const after=relaxSeam(m,.1,10);
 assert.ok(after.finite);assert.ok(after.seamGap<before/10);assert.ok(after.seamGap<1e-3);
});
test('roll-up stays centered and continuous as the seam closes',()=>{
 const m=makeSeamModel(fold);let previous;
 for(const t of [0,.00001,.5,.99999,1]){rollSeam(m,t);assert.ok(seamMetrics(m).finite);for(let k=0;k<3;k++)assert.ok(Math.abs(m.positions.reduce((s,p)=>s+p[k],0))<1e-8);if(t===1)assert.ok(Math.max(...m.positions.map((p,i)=>Math.hypot(...p.map((v,k)=>v-previous[i][k]))))<1e-4);previous=m.positions.map(p=>[...p]);}
});
