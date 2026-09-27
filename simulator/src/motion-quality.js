// Material checks shared by the editor and regression tests.
export function checkMotion(prepared,pose,{samples=12,tolerance=1e-5}={}){
  let maxStretch=0,maxSeparation=0;
  for(let k=0;k<=samples;k++){
    const faces=pose(prepared,k/samples),shared=new Map();
    for(const f of faces)for(const v of f.vertices){
      if(!v.p.every(Number.isFinite))throw Error('This motion produced an invalid paper position.');
      const key=v.uv.map(x=>x.toFixed(6)).join(',');
      if(shared.has(key))maxSeparation=Math.max(maxSeparation,Math.hypot(...v.p.map((x,i)=>x-shared.get(key)[i])));
      shared.set(key,v.p);
      for(const w of f.vertices)maxStretch=Math.max(maxStretch,Math.abs(Math.hypot(...v.p.map((x,i)=>x-w.p[i]))-Math.hypot(...v.uv.map((x,i)=>x-w.uv[i]))));
    }
  }
  if(maxStretch>tolerance||maxSeparation>tolerance)throw Error('These layers cannot perform this motion without stretching or separating. Use a compatible pocket.');
  return {maxStretch,maxSeparation};
}
