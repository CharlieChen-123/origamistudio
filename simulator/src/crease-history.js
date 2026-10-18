import {edgeOverlap} from './material-topology.js';
import {motionSampleTimes} from './motion-stages.js';
const sub=(a,b)=>a.map((x,i)=>x-b[i]),dot=(a,b)=>a.reduce((n,x,i)=>n+x*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit=v=>{const l=Math.hypot(...v);return l>1e-12?v.map(x=>x/l):[0,0,0];};
function normal(f){const vs=f.vertices,a=vs[0].p;let n=[0,0,0];for(let i=1;i<vs.length-1;i++){n=cross(sub(vs[i].p,a),sub(vs[i+1].p,a));if(Math.hypot(...n)>1e-10)break;}const winding=Math.sign(vs.reduce((s,v,i)=>{const q=vs[(i+1)%vs.length].uv;return s+v.uv[0]*q[1]-v.uv[1]*q[0];},0));return unit(n).map(x=>x*winding);}
// Locate actual shared material edges, including mismatched subdivisions.
export function materialHinges(faces){
  const edges=[],pairs=[];faces.forEach((f,fi)=>f.vertices.forEach((v,ai)=>edges.push({fi,ai,bi:(ai+1)%f.vertices.length,a:v.uv,b:f.vertices[(ai+1)%f.vertices.length].uv})));
  for(let i=0;i<edges.length;i++)for(let j=0;j<i;j++){
    const e=edges[i],o=edges[j];if(e.fi===o.fi||!edgeOverlap(e.a,e.b,o.a,o.b))continue;
    const d=sub(e.b,e.a),l2=dot(d,d),ts=[o.a,o.b].map(p=>dot(sub(p,e.a),d)/l2),lo=Math.max(0,Math.min(...ts)),hi=Math.min(1,Math.max(...ts));
    pairs.push({...e,other:o.fi,a:e.a.map((x,k)=>x+lo*d[k]),b:e.a.map((x,k)=>x+hi*d[k])});
  }return pairs;
}
// M/V is defined relative to the original material front, never the camera or
// angular velocity. Opening a mountain therefore remains a mountain precrease.
export function motionCreases(prepared,pose){
  if(prepared.template==='turn')return [];
  const times=motionSampleTimes(prepared.action,[0,.02,.15,.35,.5,.65,.85,.98,1]),frames=times.map(t=>pose(prepared,t)),normals=frames.map(fs=>fs.map(normal)),events=[];
  for(const h of materialHinges(frames[0])){
    const values=frames.map((fs,i)=>{const f=fs[h.fi],a=f.vertices[h.ai],b=f.vertices[h.bi],uv=f.vertices,winding=Math.sign(uv.reduce((s,v,k)=>{const q=uv[(k+1)%uv.length].uv;return s+v.uv[0]*q[1]-v.uv[1]*q[0];},0));const axis=unit(sub(b.p,a.p)).map(x=>x*winding);return {s:dot(axis,cross(normals[i][h.fi],normals[i][h.other])),c:dot(normals[i][h.fi],normals[i][h.other])};});
    if(values.every(v=>Math.abs(v.s-values[0].s)<1e-6&&Math.abs(v.c-values[0].c)<1e-6))continue;
    let last=null;for(let i=1;i<values.length;i++){if(Math.abs(values[i].s)<1e-6)continue;const type=values[i].s<0?'V':'M';if(type!==last){events.push({a:h.a,b:h.b,type,at:times[i]});last=type;}}
  }return events.sort((a,b)=>a.at-b.at);
}
// Later intentional refolds replace only their overlapping material interval.
// Separate paper layers have distinct UV coordinates even when they coincide in 3D.
export function mergeCreaseHistory(records,tolerance=1e-6){
  let result=[];
  for(const record of records){
    if(Math.hypot(...sub(record.b,record.a))<=tolerance)continue;
    const next=[];
    for(const old of result){
      if(!edgeOverlap(old.a,old.b,record.a,record.b,tolerance)){next.push(old);continue;}
      const d=sub(old.b,old.a),length=Math.hypot(...d),l2=length*length,ts=[record.a,record.b].map(p=>dot(sub(p,old.a),d)/l2),lo=Math.max(0,Math.min(...ts)),hi=Math.min(1,Math.max(...ts)),at=t=>old.a.map((x,k)=>x+t*d[k]);
      if(lo*length>tolerance)next.push({...old,b:at(lo)});
      if((1-hi)*length>tolerance)next.push({...old,a:at(hi)});
    }
    next.push({...record});result=next;
  }return result;
}
