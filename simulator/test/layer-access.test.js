import test from 'node:test';
import assert from 'node:assert/strict';
import {annotateLayerAccess,layerClosure,toggleAccessibleLayer} from '../src/layer-access.js';
import {makeSheet,compileActions,flapCandidates,prepareAction,poseAction,accessibleSeeds} from '../src/action-fold.js';
import {rectanglePaper,airplaneLesson} from '../src/example-lessons.js';
import {checkMotion} from '../src/motion-quality.js';
const group=(rank,x=0)=>({seed:[x+.3,.3],faces:[{renderLayer:rank,vertices:[[x,0],[x+1,0],[x+1,1],[x,1]].map(p=>({p:[...p,0],uv:p}))}]});
test('buried paper requires every overlapping covering group in the movement direction',()=>{
 const c=annotateLayerAccess([group(2),group(1),group(0),group(3,2)],1);
 assert.deepEqual([...layerClosure(c,[2])].sort(),[0,1,2]);assert.deepEqual([...layerClosure(c,[0])],[0]);assert.deepEqual([...toggleAccessibleLayer(c,new Set([0,1,2]),0)],[]);
 const down=annotateLayerAccess([group(2),group(1),group(0)],-1);assert.deepEqual([...layerClosure(down,[0])].sort(),[0,1,2]);assert.deepEqual([...layerClosure(down,[2])],[2]);
});
test('touching edges do not lock independent paper groups',()=>{const c=annotateLayerAccess([group(0),group(1,1)],1);assert.deepEqual(c.map(c=>c.requires),[[],[]]);});
test('a closed folded edge keeps both layers in one selectable material group',()=>{
 const initial=makeSheet(rectanglePaper(2,2)),s=compileActions(initial,[{kind:'fold',axis:[[1,0],[1,2]],side:-1,angle:-180}]).frames.at(-1),a={axis:[[0,1],[2,1]],side:1,angle:180};
 const c=flapCandidates(s,a);assert.equal(c.length,1);assert.equal(c[0].layerCount,2);checkMotion(prepareAction(s,{...a,seeds:[c[0].seed],enforceLayerAccess:true}),poseAction);
});
test('Dart wing and tucked nose move together without dragging the opposite wing',()=>{
 const l=airplaneLesson(),s=compileActions(makeSheet(l.paper),l.actions),a=l.actions[7],c=flapCandidates(s.frames[7],a);
 assert.equal(c.length,4);assert.ok(c[1].requires.includes(0));assert.deepEqual([...layerClosure(c,[0])].sort(),[0,1]);
 const seeds=accessibleSeeds(s.frames[7],{...a,seeds:[c[1].seed]});assert.equal(seeds.length,2);
 const p=prepareAction(s.frames[7],{...a,seeds:[c[1].seed],enforceLayerAccess:true});checkMotion(p,poseAction);assert.ok(p.pieces.filter(f=>f.moving).length>c[1].faces.length);
});
