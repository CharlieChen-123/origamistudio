// Geometry shared by the editor and authored lessons. Material coordinates never
// change; work planes only change how a user specifies an axis on the sheet.
import {transformTeaching} from './teaching-tools.js';
export const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
export const sub=(a,b)=>a.map((x,i)=>x-b[i]);
export const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit=v=>{const n=Math.hypot(...v);if(n<1e-10)throw Error('Choose a paper surface with area.');return v.map(x=>x/n);};
export function planeForFace(face){
  const vs=face.vertices.map(v=>v.p),origin=vs[0],u=unit(sub(vs[1],origin));
  let normal;for(const p of vs.slice(2)){const n=cross(u,sub(p,origin));if(Math.hypot(...n)>1e-8){normal=unit(n);break;}}
  if(!normal)throw Error('This paper surface is too narrow to edit.');
  return {origin:[...origin],u,v:cross(normal,u),normal};
}
export function checkPlane(f){
  if(!f||['origin','u','v','normal'].some(k=>!Array.isArray(f[k])||f[k].length!==3||!f[k].every(Number.isFinite))||['u','v','normal'].some(k=>Math.abs(dot(f[k],f[k])-1)>1e-6)||Math.abs(dot(f.u,f.v))>1e-6||dot(cross(f.u,f.v),f.normal)<1-1e-6)throw Error('Invalid editing plane. Choose the paper surface again.');
}
export function toPlane(p,f){if(!f)return [...p];const d=sub(p,f.origin);return [dot(d,f.u),dot(d,f.v),dot(d,f.normal)];}
export function fromPlane(p,f){if(!f)return [...p];return f.origin.map((x,i)=>x+p[0]*f.u[i]+p[1]*f.v[i]+p[2]*f.normal[i]);}
export const mapSheet=(sheet,fn)=>sheet.map(f=>({...f,vertices:f.vertices.map(v=>({...v,p:fn(v.p)}))}));
export function axisForEdges(source,target,alternate=false){
  let u=unit([...sub(source[1],source[0]),0]).slice(0,2),v=unit([...sub(target[1],target[0]),0]).slice(0,2);
  if(dot(u,v)<0)v=v.map(x=>-x);
  const det=u[0]*v[1]-u[1]*v[0];let axis;
  if(Math.abs(det)<1e-8){const mid=source[0].map((x,i)=>(x+target[0][i])/2);axis=[mid,mid.map((x,i)=>x+u[i])];}
  else {const d=sub(target[0],source[0]),t=(d[0]*v[1]-d[1]*v[0])/det,p=source[0].map((x,i)=>x+t*u[i]);const w=u.map((x,i)=>x+(alternate?-1:1)*v[i]);axis=[p,p.map((x,i)=>x+w[i])];}
  const middle=source[0].map((x,i)=>(x+source[1][i])/2),d=sub(axis[1],axis[0]);const side=Math.sign(d[0]*(middle[1]-axis[0][1])-d[1]*(middle[0]-axis[0][0]));
  if(!side)throw Error('These edges already lie on the same line. Choose a different target.');
  return {axis,side};
}
export function mirrorAction(action,x){
  if(action.kind!=='fold'||action.plane||action.flapSectors||action.scopeSectors)throw Error('Mirror a plain fold on the original work plane. Select new layers for a folded packet.');
  const a=structuredClone(action);a.axis=a.axis.map(p=>[2*x-p[0],p[1]]);a.side=-a.side;a.angle=-a.angle;if(a.teaching){a.teaching=transformTeaching(a.teaching,p=>[2*x-p[0],p[1]]);for(const m of a.teaching.marks||[]){delete m.from.faceId;if(m.to)delete m.to.faceId;}for(const c of a.teaching.cues||[])if(c.focus)delete c.focus.anchor.faceId;}delete a.seed;delete a.seeds;a.title='Mirror: '+(a.title||'Fold');return a;
}

export function reverseFromIntent(tip,pivot,destination){
  const a=sub(tip,pivot),b=sub(destination,pivot),la=Math.hypot(...a),lb=Math.hypot(...b);
  if(la<1e-7||lb<1e-7)throw Error('Keep the tip and its destination away from the pivot.');
  const u=a.map(x=>x/la),v=b.map(x=>x/lb),cos=dot(u,v);
  if(Math.abs(cos)>1-1e-7)throw Error('Choose a new direction to one side of the point.');
  const bisector=unit([...u.map((x,i)=>x+v[i]),0]);
  return {spine:[...tip],pivot:[...pivot],hinge:pivot.map((x,i)=>x+bisector[i]*la*.5),destination:pivot.map((x,i)=>x+v[i]*la)};
}

export class LessonHistory {
  constructor(limit=50){this.limit=limit;this.past=[];this.future=[];this.current=null;}
  record(value){const next=JSON.stringify(value);if(next===this.current)return false;if(this.current!==null)this.past.push(this.current);if(this.past.length>this.limit)this.past.shift();this.current=next;this.future=[];return true;}
  undo(){if(!this.past.length)return null;this.future.push(this.current);this.current=this.past.pop();return JSON.parse(this.current);}
  redo(){if(!this.future.length)return null;this.past.push(this.current);this.current=this.future.pop();return JSON.parse(this.current);}
  reset(value){this.past=[];this.future=[];this.current=JSON.stringify(value);}
}
