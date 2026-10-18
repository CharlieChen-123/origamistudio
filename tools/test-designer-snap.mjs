import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';

// Execute the actual maintained Designer functions, not a second implementation.
const html=fs.readFileSync(new URL('./designer.template.html',import.meta.url),'utf8');
const source=html.slice(html.indexOf('function lineIntersect('),html.indexOf('function drawGrid('));
const cp={SIZE:400,gridN:16,lines:[],snap:true,zoom:1,paperShape:'square'};
const dimensions=()=>cp.paperShape==='rect'?{w:400,h:200}:cp.paperShape==='hex'?{w:400,h:400*.8660254}:{w:400,h:400};
const env=vm.createContext({cp,paperDimensions:dimensions});vm.runInContext(source,env);
const stats=()=>vm.runInContext('({builds:snapIndexBuilds,points:snapIndex?.points.length||0})',env);
let seed=125789;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/2**32);

function originalCandidates(){const out=[],{w,h}=dimensions();for(let i=0;i<=cp.gridN;i++)for(let j=0;j<=cp.gridN;j++)out.push({x:-w/2+i*w/cp.gridN,y:-h/2+j*h/cp.gridN});for(let i=0;i<cp.lines.length;i++){const a=cp.lines[i];for(let j=i+1;j<cp.lines.length;j++){const b=cp.lines[j],p=env.lineIntersect(a.p1.x,a.p1.y,a.p2.x,a.p2.y,b.p1.x,b.p1.y,b.p2.x,b.p2.y);if(p&&Math.abs(p.x)<=w/2+1&&Math.abs(p.y)<=h/2+1)out.push(p);}}for(const l of cp.lines)out.push(l.p1,l.p2);return out;}
function originalSnap(x,y){if(!cp.snap)return {x,y};const {w,h}=dimensions(),cx=w/cp.gridN,cy=h/cp.gridN;let best={x:Math.max(-w/2,Math.min(w/2,Math.round(x/cx)*cx)),y:Math.max(-h/2,Math.min(h/2,Math.round(y/cy)*cy))},distance=Math.hypot(x-best.x,y-best.y),radius=10/cp.zoom;const candidates=originalCandidates();for(const p of candidates){const d=Math.hypot(x-p.x,y-p.y);if(d<distance&&d<radius){distance=d;best=p;}}for(const l of cp.lines){const dx=l.p2.x-l.p1.x,dy=l.p2.y-l.p1.y,len=dx*dx+dy*dy;if(!len)continue;const t=Math.max(0,Math.min(1,((x-l.p1.x)*dx+(y-l.p1.y)*dy)/len)),px=l.p1.x+t*dx,py=l.p1.y+t*dy;if(Math.hypot(x-px,y-py)<radius){let resolved={x:px,y:py},rd=Infinity;for(const p of candidates){const d=Math.hypot(px-p.x,py-p.y);if(d<radius&&d<rd){rd=d;resolved=p;}}const d=Math.hypot(x-resolved.x,y-resolved.y);if(d<distance&&d<radius){distance=d;best=resolved;}}}return best;}

let comparisons=0;
for(const shape of ['square','rect','hex'])for(const grid of [15,32])for(const zoom of [.5,1,3]){
 cp.paperShape=shape;cp.gridN=grid;cp.zoom=zoom;cp.lines=Array.from({length:32},()=>({p1:{x:random()*400-200,y:random()*400-200},p2:{x:random()*400-200,y:random()*400-200}}));
 cp.lines.push({p1:{x:0,y:0},p2:{x:0,y:0}});
 for(let i=0;i<35;i++){const x=random()*420-210,y=random()*420-210,a=env.snapPoint(x,y),b=originalSnap(x,y);assert(Math.hypot(a.x-b.x,a.y-b.y)<1e-6,JSON.stringify({shape,grid,zoom,x,y,a,b}));comparisons++;}
}
console.log('PASS '+comparisons+' original-vs-indexed snaps, across paper shapes, odd/even grids and zoom levels');
env.getSnapCandidates();let builds=stats().builds;cp.zoom=2;cp.px=40;cp.py=30;for(let i=0;i<50;i++)env.snapPoint(random()*400-200,random()*400-200);assert.equal(stats().builds,builds);console.log('PASS pointer movement, zoom and pan reuse the intersection index');
cp.lines[0].p1.x+=7;env.snapPoint(0,0);assert.equal(stats().builds,++builds);cp.gridN++;env.snapPoint(0,0);assert.equal(stats().builds,++builds);cp.paperShape='rect';env.snapPoint(0,0);assert.equal(stats().builds,++builds);cp.lines.pop();env.snapPoint(0,0);assert.equal(stats().builds,++builds);console.log('PASS in-place edits, grid changes, paper changes and deletion invalidate the cache');
cp.snap=false;assert.equal(env.snapPoint(13.1,22.7).x,13.1);cp.snap=true;
cp.lines=Array.from({length:240},()=>({p1:{x:random()*400-200,y:random()*200-100},p2:{x:random()*400-200,y:random()*200-100}}));cp.gridN=32;cp.paperShape='rect';cp.zoom=1;
const queries=Array.from({length:20},()=>[random()*400-200,random()*200-100]);env.snapPoint(0,0);const before=stats().builds,t0=performance.now();for(const p of queries)env.snapPoint(...p);const indexed=performance.now()-t0,t1=performance.now();for(const p of queries)originalSnap(...p);const baseline=performance.now()-t1;assert.equal(stats().builds,before);
console.log(JSON.stringify({benchmark:'240 creases, 20 warmed pointer positions',indexedMs:+indexed.toFixed(2),originalMs:+baseline.toFixed(2),speedup:+(baseline/indexed).toFixed(1),intersectionRebuilds:stats().builds-before}));
