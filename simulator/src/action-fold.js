// Sequential rigid half-plane folds. CP markings are reference geometry;
// a temporary action axis can extend across the whole sheet. No vertex averaging.
import {poseSquareBase,squareSector} from './square-base.js';
import {prepareTemplate,poseTemplate,templateCreases} from './motion-templates.js';
import {checkPlane,toPlane,fromPlane,mapSheet} from './authoring-tools.js';
import {prepareBox,poseBox} from './box-motion.js';
import {materialAdjacency} from './material-topology.js';
import {motionCreases} from './crease-history.js';
import {annotateLayerAccess,layerClosure} from './layer-access.js';
import {preparePocketMotion,posePocketMotion} from './pocket-motion.js';
import {motionProgress,motionStages} from './motion-stages.js';
const EPS = 1e-7;
const clone = v => ({ p: [...v.p], uv: [...v.uv] });
export const sideOf = (p, axis) => (axis[1][0]-axis[0][0])*(p[1]-axis[0][1])-(axis[1][1]-axis[0][1])*(p[0]-axis[0][0]);
const area2 = pts => pts.reduce((sum,p,i) => { const q=pts[(i+1)%pts.length]; return sum+p[0]*q[1]-q[0]*p[1]; },0);
export function triangulate(points) {
  let ids=points.map((_,i)=>i); if(area2(points)<0) ids.reverse();
  const triangles=[];
  while(ids.length>3) {
    let found=false;
    for(let i=0;i<ids.length;i++) {
      const a=ids[(i+ids.length-1)%ids.length],b=ids[i],c=ids[(i+1)%ids.length];
      if(sideOf(points[c],[points[a],points[b]])<=EPS) continue;
      if(ids.some(j=>j!==a&&j!==b&&j!==c && sideOf(points[j],[points[a],points[b]])>EPS && sideOf(points[j],[points[b],points[c]])>EPS && sideOf(points[j],[points[c],points[a]])>EPS)) continue;
      triangles.push([a,b,c]); ids.splice(i,1); found=true; break;
    }
    if(!found) throw Error('The paper outline could not be triangulated. Check overlapping edges.');
  }
  if(ids.length===3 && Math.abs(area2(ids.map(i=>points[i])))>EPS) triangles.push(ids);
  return triangles;
}
export function makeSheet(fold) {
  const points=fold.vertices_coords.map(v=>v.length===2?[...v]:[v[0],v[2]]);
  const faces=[];
  fold.faces_vertices.forEach((f,id)=>triangulate(f.map(i=>points[i])).forEach(tri=>faces.push({id, vertices:tri.map(j=>({p:[...points[f[j]],0],uv:[...points[f[j]]]}))})));
  return faces;
}
function interpolate(a,b,t) { return {p:a.p.map((v,i)=>v+(b.p[i]-v)*t),uv:a.uv.map((v,i)=>v+(b.uv[i]-v)*t)}; }
function clip(vertices,axis,sign) {
  const out=[];
  vertices.forEach((a,i)=>{const b=vertices[(i+1)%vertices.length],da=sideOf(a.p,axis)*sign,db=sideOf(b.p,axis)*sign;
    if(da>=-EPS) out.push(clone(a));
    if((da>EPS&&db<-EPS)||(da<-EPS&&db>EPS)) out.push(interpolate(a,b,da/(da-db)));
  });
  const unique=out.filter((v,i)=>!i||Math.hypot(...v.p.map((x,k)=>x-out[i-1].p[k]))>EPS);
  if(unique.length>2 && Math.hypot(...unique[0].p.map((x,k)=>x-unique.at(-1).p[k]))<EPS)unique.pop();
  return unique;
}
export function axisForMatch(from,to) {
  if(Math.hypot(from[0]-to[0],from[1]-to[1])<EPS)throw Error('Choose two different points.');
  const mid=from.map((v,i)=>(v+to[i])/2), dx=to[0]-from[0],dy=to[1]-from[1];
  const axis=[[mid[0]-dy,mid[1]+dx],[mid[0]+dy,mid[1]-dx]];
  return {axis,side:Math.sign(sideOf(from,axis))};
}
export function flapCandidates(sheet,action,point=null){
  const base=prepareAction(sheet,{...action,seed:null,seeds:null,enforceLayerAccess:false}),moving=base.pieces.filter(f=>f.moving),found=[],seen=new Set();
  // Build the material graph once for the whole stack. Rebuilding it for every
  // visible polygon makes selection needlessly slow on dense imported CPs.
  const adjacency=materialAdjacency(moving,(v,w)=>Math.abs(sideOf(v.p,base.axis))<EPS*10&&Math.abs(sideOf(w.p,base.axis))<EPS*10);
  for(const {face,index} of moving.map((face,index)=>({face,index})).sort((a,b)=>(b.face.renderLayer||0)-(a.face.renderLayer||0))){
    if(seen.has(index))continue;
    if(point&&!pointInPolygon(point,face.vertices.map(v=>v.p)))continue;
    const seed=[0,1].map(k=>face.vertices.reduce((n,v)=>n+v.uv[k],0)/face.vertices.length);
    const component=new Set([index]),stack=[index];while(stack.length)for(const j of adjacency[stack.pop()])if(!component.has(j)){component.add(j);stack.push(j);}
    component.forEach(i=>seen.add(i));found.push({seed,faces:moving.filter((_,i)=>component.has(i)),rank:face.renderLayer||0});
  }
  return annotateLayerAccess(found,Math.sign(action.angle*action.side)||1);
}
export function accessibleSeeds(sheet,action){
 const seeds=action.seeds?.length?action.seeds:action.seed?[action.seed]:null;if(!seeds)return null;
 const candidates=flapCandidates(sheet,action),selected=new Set();
 for(const s of seeds){const index=candidates.findIndex(c=>c.faces.some(f=>pointInPolygon(s,f.vertices.map(v=>v.uv))));if(index<0)throw Error('A selected flap no longer exists here. Select its paper layer again.');selected.add(index);}
 return [...layerClosure(candidates,selected)].map(i=>candidates[i].seed);
}
export function prepareAction(sheet,action) {
  if(action.enforceLayerAccess&&(action.seed||action.seeds?.length))action={...action,seed:null,seeds:accessibleSeeds(sheet,action),enforceLayerAccess:false};
  if(action.plane){checkPlane(action.plane);const local=mapSheet(sheet,p=>toPlane(p,action.plane));const prepared=prepareAction(local,{...action,plane:null,localSurface:true});return {...prepared,plane:action.plane};}
  let {axis,side=1}=action;
  if(!Array.isArray(axis)||axis.length!==2||axis.some(p=>p.length!==2||!p.every(Number.isFinite))||Math.hypot(axis[1][0]-axis[0][0],axis[1][1]-axis[0][1])<EPS)throw Error('Choose two different points for the fold line.');
  if(![1,-1].includes(side)||!Number.isFinite(action.angle)||Math.abs(action.angle)>180)throw Error('The fold angle or moving side is invalid.');
  const eligible=f=>(!action.scopeSectors||action.scopeSectors.includes(f.sector))&&(!action.localSurface||f.vertices.every(v=>Math.abs(v.p[2])<1e-5));
  const allPoints=sheet.filter(eligible).flatMap(f=>f.vertices.map(v=>v.p));
  const span=Math.max(...allPoints.map(p=>p[0]))-Math.min(...allPoints.map(p=>p[0]));
  // SVG pointer coordinates round to float32. Remove sub-pixel slivers at a
  // hinge endpoint instead of treating them as a bridge between paper layers.
  const tolerance=Math.max(1,span)*1e-6,length=Math.hypot(axis[1][0]-axis[0][0],axis[1][1]-axis[0][1]);
  const near=allPoints.filter(p=>Math.abs(sideOf(p,axis))/length<tolerance);
  if(near.length){
    const anchor=near.reduce((best,p)=>Math.abs(sideOf(p,axis))<Math.abs(sideOf(best,axis))?p:best,near[0]);
    const other=near.reduce((best,p)=>Math.hypot(p[0]-anchor[0],p[1]-anchor[1])>Math.hypot(best[0]-anchor[0],best[1]-anchor[1])?p:best,anchor);
    if(Math.hypot(other[0]-anchor[0],other[1]-anchor[1])>tolerance*10){axis=[anchor.slice(0,2),other.slice(0,2)];if((axis[1][0]-axis[0][0])*(action.axis[1][0]-action.axis[0][0])+(axis[1][1]-axis[0][1])*(action.axis[1][1]-action.axis[0][1])<0)axis.reverse();}
    else {const d=sideOf(anchor,axis)/(length*length),dx=axis[1][0]-axis[0][0],dy=axis[1][1]-axis[0][1];axis=axis.map(p=>[p[0]-dy*d,p[1]+dx*d]);}
  }
  if(allPoints.some(p=>Math.abs(p[2])>Math.max(1,span)*1e-5))throw Error('Finish this fold flat (180°), or unfold it, before defining the next fold. Non-flat multi-axis actions are not supported yet.');
  const pieces=[];
  sheet.forEach(f=>{if(!eligible(f)){pieces.push({...f,moving:false});return;}[-1,1].forEach(sign=>{const vertices=clip(f.vertices,axis,sign);if(vertices.length>=3&&Math.abs(area2(vertices.map(v=>v.p)))>EPS)pieces.push({...f,vertices,moving:sign===side});});});
  if(!pieces.some(f=>f.moving)||!pieces.some(f=>!f.moving))throw Error('The fold line must cross the paper, with paper on both sides.');
  if(action.seed||action.seeds?.length) {
    // A clicked flap is a material-connected component, not all coincident layers.
    const moving=pieces.filter(f=>f.moving), adjacency=materialAdjacency(moving,(v,w)=>Math.abs(sideOf(v.p,axis))<EPS*10&&Math.abs(sideOf(w.p,axis))<EPS*10);
    const starts=(action.seeds||[action.seed]).map(seed=>moving.findIndex(f=>pointInPolygon(seed,f.vertices.map(v=>v.uv))));
    if(starts.some(i=>i<0))throw Error('A selected flap no longer exists here. Select its paper layer again.');
    const component=new Set(starts),stack=[...starts];while(stack.length)for(const k of adjacency[stack.pop()])if(!component.has(k)){component.add(k);stack.push(k);}
    moving.forEach((f,i)=>f.moving=component.has(i));
  }
  if(action.flapSectors)pieces.forEach(f=>{f.moving=f.moving&&action.flapSectors.includes(f.sector);});
  const creases=[];
  for(const f of pieces.filter(p=>p.moving)){
    const sameSide=area2(f.vertices.map(v=>v.p))*area2(f.vertices.map(v=>v.uv))>0;
    // The sign of angle * side is the movement toward (+) or away from (-)
    // the viewer on the original front. A flipped material face reverses it.
    const assignment=action.assignment||(action.angle*side>0?'V':'M');
    const type=sameSide?assignment:(assignment==='V'?'M':'V');
    f.vertices.forEach((v,i)=>{const w=f.vertices[(i+1)%f.vertices.length];
      if(Math.abs(sideOf(v.p,axis))<EPS*10&&Math.abs(sideOf(w.p,axis))<EPS*10)creases.push({a:[...v.uv],b:[...w.uv],type});
    });
  }
  return {pieces,axis,angle:action.angle,side,creases};
}
export function poseAction(prepared,t) {
  if(prepared.plane)return mapSheet(poseAction({...prepared,plane:null},t),p=>fromPlane(p,prepared.plane));
  if(prepared.action?.stages)t=motionProgress(prepared.action,t);
  if(prepared.kind==='pocket')return posePocketMotion(prepared,t);
  if(prepared.kind==='box')return poseBox(prepared,t);
  if(prepared.kind==='template')return poseTemplate(prepared,t);
  if(prepared.kind==='squareBase')return poseSquareBase(prepared,t);
  if(t<=0)return prepared.pieces.map(f=>({...f,vertices:f.vertices.map(clone)}));
  const {axis,angle,pieces}=prepared;const dx=axis[1][0]-axis[0][0],dy=axis[1][1]-axis[0][1],length=Math.hypot(dx,dy),ux=dx/length,uy=dy/length;
  const theta=angle*Math.PI/180*Math.max(0,Math.min(1,t)),c=Math.cos(theta),s=Math.sin(theta);
  // Display order only: reverse the moving stack above/below the stationary stack.
  // This never changes the material geometry or asserts collision-free layering.
  const ranks=[...new Set(pieces.map(f=>f.renderLayer||0))].sort((a,b)=>a-b),max=ranks.length-1;
  return pieces.map(f=>({...f,renderLayer:f.moving?(angle*prepared.side>0?2*max+1:-1)-ranks.indexOf(f.renderLayer||0):ranks.indexOf(f.renderLayer||0),vertices:f.vertices.map(v=>{
    if(!f.moving)return clone(v);
    const x=v.p[0]-axis[0][0],y=v.p[1]-axis[0][1],z=v.p[2],d=ux*x+uy*y;
    return {uv:[...v.uv],p:[axis[0][0]+x*c+uy*z*s+ux*d*(1-c),axis[0][1]+y*c-ux*z*s+uy*d*(1-c),z*c+(ux*y-uy*x)*s]};
  })}));
}
export function pointInPolygon(p,points) {
  let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++) {const a=points[i],b=points[j];const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);if(length>EPS&&Math.abs(sideOf(p,[a,b]))<=EPS*length&&(p[0]-a[0])*(p[0]-b[0])+(p[1]-a[1])*(p[1]-b[1])<=EPS*EPS)return true;if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}
  return inside;
}
export function compileActions(sheet,actions) {
  const frames=[sheet],prepared=[];
  actions.forEach(a=>{
    if(a.kind==='box') {
      const p=prepareBox(frames.at(-1),a,splitFaces);p.creases=templateCreases(p,poseBox);prepared.push(p);frames.push(poseBox(p,1));
    }else if(a.kind==='template'&&['squash','openSink'].includes(a.template)) {
      motionStages(a);const p=preparePocketMotion(frames.at(-1),a,splitFaces);prepared.push(p);frames.push(posePocketMotion(p,1));
    }else if(a.kind==='template') {
      motionStages(a);
      const p=prepareTemplate(frames.at(-1),a,{splitFaces,creaseMarks});p.creases=templateCreases(p);prepared.push(p);frames.push(poseTemplate(p,1));
    }else if(a.kind==='squareBase') {
      const p=prepareSquareBase(frames.at(-1));prepared.push(p);frames.push(poseSquareBase(p,1));
    }else if(a.kind==='demo') { prepared.push({kind:'demo',action:a});frames.push(frames.at(-1));
    }else if(a.kind==='unfold') { const ref=prepared[a.foldIndex];if(!ref||ref.kind==='unfold'||ref.kind==='demo')throw Error('This unfold needs an earlier fold.');
      if(a.foldIndex!==prepared.length-1)throw Error('Unfold currently reverses the immediately preceding fold.');
      prepared.push({kind:'unfold',ref});frames.push(poseAction(ref,0));
    }else {const p=prepareAction(frames.at(-1),a);prepared.push(p);frames.push(poseAction(p,1));}
  });
  prepared.forEach((p,i)=>{if(!['unfold','demo'].includes(p.kind)&&!actions[i].assignment)p.creases=motionCreases(p,poseAction);});
  return {frames,prepared};
}

export function splitFaces(sheet,axes){
  let pieces=sheet;
  for(const axis of axes){const next=[];
    for(const f of pieces)for(const sign of [-1,1]){const vertices=clip(f.vertices,axis,sign);if(vertices.length>=3&&Math.abs(area2(vertices.map(v=>v.p)))>EPS)next.push({...f,vertices});}
    pieces=next;
  }return pieces;
}
export function creaseMarks(pieces,axes,assignment){
  const marks=[];
  for(const f of pieces){const same=area2(f.vertices.map(v=>v.p))*area2(f.vertices.map(v=>v.uv))>0,type=same?assignment:assignment==='V'?'M':'V';
    for(const axis of axes)f.vertices.forEach((v,i)=>{const w=f.vertices[(i+1)%f.vertices.length];if(Math.abs(sideOf(v.p,axis))<EPS*10&&Math.abs(sideOf(w.p,axis))<EPS*10)marks.push({a:[...v.uv],b:[...w.uv],type});});
  }return marks;
}
export function poseSequence(sequence,index,t) {
  const a=sequence.prepared[index];if(!a)return sequence.frames.at(-1);
  if(a.kind==='demo')return sequence.frames[index];
  if(a.kind==='squareBase')return poseSquareBase(a,t);
  return a.kind==='unfold'?poseAction(a.ref,1-t):poseAction(a,t);
}

export function prepareSquareBase(sheet){
  const all=sheet.flatMap(f=>f.vertices),xs=all.map(v=>v.uv[0]),ys=all.map(v=>v.uv[1]);
  const x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;
  if(w<=EPS||Math.abs(w-h)>w*1e-5)throw Error('The square-base action needs a square sheet.');
  if(all.some(v=>Math.hypot(v.p[0]-v.uv[0],v.p[1]-v.uv[1],v.p[2])>w*1e-5))throw Error('Unfold to the original flat sheet before the square-base collapse.');
  const cx=x+w/2,cy=y+h/2;let pieces=sheet;
  for(const d of [[1,0],[0,1],[1,1],[1,-1]]){
    const axis=[[cx,cy],[cx+d[0],cy+d[1]]],next=[];
    for(const f of pieces)for(const sign of [-1,1]){
      const vertices=clip(f.vertices,axis,sign);
      if(vertices.length>=3&&Math.abs(area2(vertices.map(v=>v.p)))>EPS)next.push({...f,vertices});
    }pieces=next;
  }
  pieces=pieces.map(f=>({...f,sector:squareSector(f.vertices.reduce((s,v)=>s+v.uv[0]-cx,0),f.vertices.reduce((s,v)=>s+v.uv[1]-cy,0))}));
  const materialArea=pieces.reduce((s,f)=>s+Math.abs(area2(f.vertices.map(v=>v.uv)))/2,0);
  if(Math.abs(materialArea-w*h)>w*h*1e-5)throw Error('The square-base action needs one complete square without cuts or overlapping faces.');
  return {kind:'squareBase',pieces,bounds:{cx,cy,size:w/2},creases:[]};
}
