// Material checks shared by the editor and regression tests.
import {materialSeams} from './material-topology.js';
import {motionSampleTimes} from './motion-stages.js';
export function checkMotion(prepared,pose,{samples=12,tolerance=1e-5}={}){
  let maxStretch=0,maxSeparation=0;
  const seams=materialSeams(pose(prepared,0));
  for(const t of motionSampleTimes(prepared.action,Array.from({length:samples+1},(_,k)=>k/samples))){
    const faces=pose(prepared,t),shared=new Map();
    for(const f of faces)for(const v of f.vertices){
      if(!v.p.every(Number.isFinite))throw Error('This motion produced an invalid paper position.');
      const key=v.uv.map(x=>x.toFixed(6)).join(',');
      if(shared.has(key))maxSeparation=Math.max(maxSeparation,Math.hypot(...v.p.map((x,i)=>x-shared.get(key)[i])));
      shared.set(key,v.p);
      for(const w of f.vertices)maxStretch=Math.max(maxStretch,Math.abs(Math.hypot(...v.p.map((x,i)=>x-w.p[i]))-Math.hypot(...v.uv.map((x,i)=>x-w.uv[i]))));
    }
    for(const {fi,vi,edge:e,t} of seams){
      const v=faces[fi].vertices[vi].p,a=faces[e.fi].vertices[e.ai].p,b=faces[e.fi].vertices[e.bi].p;
      maxSeparation=Math.max(maxSeparation,Math.hypot(...v.map((x,i)=>x-a[i]-t*(b[i]-a[i]))));
    }
  }
  if(maxStretch>tolerance||maxSeparation>tolerance)throw Error('These layers cannot perform this motion without stretching or separating. Use a compatible pocket.');
  return {maxStretch,maxSeparation};
}
