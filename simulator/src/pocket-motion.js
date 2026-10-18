// A symmetric eight-panel pocket, with a free outer rim. All eight sector
// triangles retain their metric. A square sink rim is an actual material hinge.
// Supported starting shapes: a square folded in half, and its waterbomb base.
import {solveRimAngle,solveDistanceVertex,rigidTriangleMap} from './local-constraints.js';
import {squareRing,squareSector} from './square-base.js';
const sub=(a,b)=>a.map((x,i)=>x-b[i]),dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const length=p=>Math.hypot(...p);
function fan(height){
  const h=Math.max(0,Math.min(1,height)),d=solveRimAngle(1,Math.SQRT2,1,h),angles=[0,d,2*d,3*d,4*d,3*d,2*d,d];
  const ring=angles.map((a,i)=>{const r=Math.sqrt(Math.max(0,(i%2?2:1)-h*h));return [r*Math.cos(a),r*Math.sin(a),-h];});
  // Solve each gusset corner from its three incident edge lengths. The analytic
  // rim hint selects the desired branch instead of a nearest arbitrary pose.
  if(h>1e-6&&h<1-1e-6)for(const i of [1,3,5,7])ring[i]=solveDistanceVertex([[0,0,0],ring[i-1],ring[(i+1)%8]],[Math.SQRT2,1,1],ring[i]);
  return ring;
}
function localPoint(uv,sector,p,h,inverted){
  const a=squareRing[sector],b=squareRing[(sector+1)%8],x=(uv[0]-p.cx)/p.r,y=(uv[1]-p.cy)/p.r,det=a[0]*b[1]-a[1]*b[0];
  const u=(x*b[1]-y*b[0])/det,v=(a[0]*y-a[1]*x)/det,ring=p.ring;
  const q=[0,1,2].map(k=>u*ring[sector][k]+v*ring[(sector+1)%8][k]);
  if(inverted)q[2]=-2*p.depth*h-q[2];
  // Keep both flat endpoints in the author's paper plane; this is a rigid
  // reorientation of the whole mechanism, not interpolation of vertices.
  const angle=h*Math.PI/2,c=Math.cos(angle),s=Math.sin(angle);
  return [q[0]*c+q[2]*s,q[1],-q[0]*s+q[2]*c].map(x=>x*p.r);
}
export function preparePocketMotion(sheet,action,splitFaces){
  const all=sheet.flatMap(f=>f.vertices),xs=all.map(v=>v.uv[0]),ys=all.map(v=>v.uv[1]),x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;
  if(!(w>1e-6)||Math.abs(w-h)>w*1e-6)throw Error('This symmetric pocket needs square paper. Try the Pocket folds practice lesson.');
  const r=w/2,cx=x+r,cy=y+r,depth=action.depth??.25;
  if(!Number.isFinite(depth)||depth<.1||depth>.45)throw Error('Choose a sink depth between 10% and 45% of the point.');
  const axes=[[[cx,y],[cx,y+w]],[[x,cy],[x+w,cy]],[[x,y],[x+w,y+w]],[[x+w,y],[x,y+w]]];
  if(action.template==='openSink')for(const d of [-depth*r,depth*r])axes.push([[cx+d,y],[cx+d,y+w]],[[x,cy+d],[x+w,cy+d]]);
  let pieces=[];
  for(const f of sheet){
    const source=f.vertices.map(v=>[...v.uv,0]),target=f.vertices.map(v=>v.p);
    // Find a non-collinear triangle, since a clipped polygon may start with
    // three points along one edge.
    let tri=null;for(let i=1;i<source.length-1&&!tri;i++)if(length(cross(sub(source[i],source[0]),sub(source[i+1],source[0])))>r*r*1e-10)tri=[0,i,i+1];
    if(!tri)throw Error('The paper contains a face with no area.');
    const material={...f,vertices:f.vertices.map(v=>({...v,p:[...v.uv,0]}))};
    pieces.push(...splitFaces([material],axes).map(g=>({...g,vertices:g.vertices.map(v=>({...v,p:rigidTriangleMap(v.p,tri.map(i=>source[i]),tri.map(i=>target[i]))}))})));
  }
  const at=uv=>{const v=pieces.flatMap(f=>f.vertices).find(v=>length(sub(v.uv,uv))<r*1e-6);if(!v)throw Error('This pocket needs one complete, uncut square.');return v.p;};
  const origin=at([cx,cy]);let u,v;
  if(action.template==='squash'){
    u=sub(at([cx+r,cy]),origin).map(x=>x/r);
    v=sub(at([cx+r,cy+r]),at([cx+r,cy])).map(x=>x/r);
  }else{
    const b=at([cx+r,cy+r]),c=at([cx-r,cy+r]);
    u=origin.map((x,i)=>(x-(b[i]+c[i])/2)/r);v=sub(b,c).map(x=>x/(2*r));
  }
  const normal=cross(u,v);
  if(Math.abs(length(u)-1)>1e-5||Math.abs(length(v)-1)>1e-5||Math.abs(dot(u,v))>1e-5)throw Error(action.template==='squash'?'First fold the square in half across its horizontal center. Both pockets must be free to open.':'First prepare a triangular waterbomb base. The sink needs its free, symmetric pockets.');
  pieces=pieces.map(f=>{const center=[0,1].map(k=>f.vertices.reduce((s,v)=>s+v.uv[k],0)/f.vertices.length);return {...f,pocketSector:squareSector(center[0]-cx,center[1]-cy),sinkCap:Math.max(Math.abs(center[0]-cx),Math.abs(center[1]-cy))<depth*r+1e-7};});
  const prepared={kind:'pocket',template:action.template,action,pieces,cx,cy,r,depth,origin,u,v,normal,creases:[]};
  const start=posePocketMotion(prepared,0);
  if(pieces.some((f,i)=>f.vertices.some((v,j)=>length(sub(v.p,start[i].vertices[j].p))>r*1e-5)))throw Error(action.template==='squash'?'Use a square folded once across its horizontal center. Remove extra folds before squashing these pockets.':'This sink needs an unchanged waterbomb base. Open any extra folds first.');
  let area=0;for(const f of pieces)for(let i=1;i<f.vertices.length-1;i++){const a=sub(f.vertices[i].uv,f.vertices[0].uv),b=sub(f.vertices[i+1].uv,f.vertices[0].uv);area+=Math.abs(a[0]*b[1]-a[1]*b[0])/2;}
  if(Math.abs(area-w*w)>w*w*1e-6)throw Error('Use one complete sheet for this pocket. Cuts and overlapping material are not supported.');
  return prepared;
}
export function posePocketMotion(p,t){
  t=Math.max(0,Math.min(1,t));const sink=p.template==='openSink',closing=sink&&t>.45;
  const h=sink?Math.sin(Math.PI/2*(closing?(t-.45)/.55:1-t/.45)):Math.sin(t*Math.PI/2),ring=fan(h),local={...p,ring};
  return p.pieces.map(f=>({...f,renderLayer:f.pocketSector,vertices:f.vertices.map(v=>{
    const q=localPoint(v.uv,f.pocketSector,local,h,closing&&f.sinkCap);
    return {...v,p:p.origin.map((x,k)=>x+q[0]*p.u[k]+q[1]*p.v[k]+q[2]*p.normal[k])};
  })}));
}
