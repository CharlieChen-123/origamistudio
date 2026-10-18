// Map marks onto the SAME triangle fan used by the paper renderer. Layer clarity
// can make a display polygon non-planar, so one affine map for a whole face is
// incorrect (and unstable when inserted seam vertices are almost collinear).
export function posedCreaseSegments(faces, records, {deduplicate=false}={}) {
  const result=[], seen=new Set();
  for (const face of faces) {
    const vs=face.vertices;
    for(let i=1;i<vs.length-1;i++) {
      const tri=[vs[0],vs[i],vs[i+1]], [a,b,c]=tri;
      const cross=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);
      const det=cross(a.uv,b.uv,c.uv);
      if(Math.abs(det)<1e-9)continue;
      const sign=Math.sign(det),map=p=>{
        const s=cross(a.uv,p,c.uv)/det,t=cross(a.uv,b.uv,p)/det;
        return a.p.map((x,k)=>x+s*(b.p[k]-x)+t*(c.p[k]-x));
      };
      for(const record of records) {
        let lo=0,hi=1;
        for(let j=0;j<3;j++) {
          const u=tri[j].uv,v=tri[(j+1)%3].uv;
          const d=cross(u,v,record.a)*sign,e=cross(u,v,record.b)*sign,delta=e-d;
          if(Math.abs(delta)<1e-12){if(d<-1e-8){hi=-1;break;}}
          else if(delta>0)lo=Math.max(lo,-d/delta);else hi=Math.min(hi,-d/delta);
        }
        if(hi-lo<=1e-8)continue;
        const point=t=>map(record.a.map((x,k)=>x+t*(record.b[k]-x)));
        const p=point(lo),q=point(hi);
        if(Math.hypot(...p.map((x,k)=>x-q[k]))<1e-8)continue;
        const key=record.type+':'+[p,q].map(p=>p.map(x=>x.toFixed(6)).join(',')).sort().join('|');
        if(deduplicate&&seen.has(key))continue;seen.add(key);
        result.push({a:p,b:q,type:record.type,face,renderLayer:face.renderLayer||0});
      }
    }
  }
  return result;
}
