// A bounded, sampled penetration check. Coplanar stacks and hinge contact are
// permitted. This is an authoring aid, not continuous collision certification.
import {barycentric} from './teaching-tools.js';
const sub=(a,b)=>a.map((v,i)=>v-b[i]),dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export function strictTriangleCrossing(a,b,tolerance=1e-6){
  function pierce(tri,other){
    const normal=cross(sub(other[1],other[0]),sub(other[2],other[0])),length=Math.hypot(...normal);if(length<1e-10)return null;
    const distances=tri.map(p=>dot(sub(p,other[0]),normal)/length);
    if(!distances.some(d=>d>tolerance)||!distances.some(d=>d<-tolerance))return null;
    for(let i=0;i<3;i++){const j=(i+1)%3;if(distances[i]*distances[j]>=-tolerance*tolerance)continue;
      const t=distances[i]/(distances[i]-distances[j]),point=tri[i].map((x,k)=>x+t*(tri[j][k]-x)),w=barycentric(point,...other);
      if(w&&w.every(x=>x>1e-6&&x<1-1e-6))return point;
    }return null;
  }return pierce(a,b)||pierce(b,a);
}
function triangles(faces){return faces.flatMap((f,fi)=>f.vertices.slice(2).map((_,j)=>{const p=[f.vertices[0].p,f.vertices[j+1].p,f.vertices[j+2].p];return {fi,p,lo:[0,1,2].map(k=>Math.min(...p.map(v=>v[k]))),hi:[0,1,2].map(k=>Math.max(...p.map(v=>v[k])))};}));}
export function inspectMotion(prepared,pose,{times=[0,.15,.3,.45,.6,.75,.9,1],maxTriangles=280,maxPairs=180000,tolerance=1e-5}={}){
  const baseline=new Set();let checked=0,first=null;
  for(const t of times){const tris=triangles(pose(prepared,t));if(tris.length>maxTriangles)return {status:'limited',first,checked,reason:'This paper has too many surfaces for the quick crossing check.'};
    for(let i=0;i<tris.length;i++)for(let j=i+1;j<tris.length;j++){
      if(++checked>maxPairs)return {status:'limited',first,checked,reason:'The quick crossing check reached its time budget.'};
      const a=tris[i],b=tris[j];if(a.fi===b.fi||a.lo.some((x,k)=>x>b.hi[k]+tolerance||b.lo[k]>a.hi[k]+tolerance))continue;
      const point=strictTriangleCrossing(a.p,b.p,tolerance);if(!point)continue;const key=i+':'+j;
      if(t===0)baseline.add(key);else if(!baseline.has(key)&&!first)first={at:t,faces:[a.fi,b.fi],point};
    }
  }return {status:first?'crossing':'clear',first,checked};
}
export function motionRecovery(error){
  const text=String(error?.message||error);
  if(/stretch|separat|layers cannot|selected flap|paper layer/i.test(text))return {title:'These paper layers cannot move separately.',hint:'Include the joined or covering layers, or move the fold line to an open flap.',action:'layers'};
  if(/flat|Non-flat|surface|plane/i.test(text))return {title:'Choose the paper surface for this fold.',hint:'Select a flat local surface, finish the preceding fold, or unfold it before adding this move.',action:'surface'};
  if(/cross the paper|different points|fold line|fold angle/i.test(text))return {title:'Place the fold line across the paper.',hint:'Keep the two endpoints apart and leave paper on both sides. Try a nearby line.',action:'axis'};
  if(/pocket|symmetric|waterbomb|compatible|sector/i.test(text))return {title:'This move needs a different starting shape.',hint:'Use the matching practice lesson, or prepare the pocket before applying this move.',action:'move'};
  return {title:'This move could not be prepared.',hint:text,action:'axis'};
}
