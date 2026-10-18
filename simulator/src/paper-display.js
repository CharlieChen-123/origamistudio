import {materialSeams} from './material-topology.js';
const key=p=>p.map(x=>x.toFixed(6)).join(',');
const normal=f=>{const a=f.vertices[0].p;for(let i=1;i<f.vertices.length-1;i++){const b=f.vertices[i].p.map((x,k)=>x-a[k]),c=f.vertices[i+1].p.map((x,k)=>x-a[k]),n=[b[1]*c[2]-b[2]*c[1],b[2]*c[0]-b[0]*c[2],b[0]*c[1]-b[1]*c[0]],l=Math.hypot(...n);if(l>1e-10)return n.map(x=>x/l);}return [0,0,1];};
// Rendering only: split T junctions and weld shared material points so that
// modest layer separation cannot open cracks along a connected paper hinge.
export function createPaperDisplay(){
  let cachedKey='',topology;
  return (faces,scale,{separate=false,clear=true}={})=>{
    const signature=faces.map(f=>f.vertices.map(v=>key(v.uv)).join(';')).join('|');
    if(signature!==cachedKey){
      const insertions=new Map();for(const {fi,vi,edge:e,t} of materialSeams(faces))if(t>1e-6&&t<1-1e-6){const k=e.fi+':'+e.ai;if(!insertions.has(k))insertions.set(k,[]);insertions.get(k).push({ai:e.ai,bi:e.bi,t,uv:faces[fi].vertices[vi].uv});}
      topology=faces.map((f,fi)=>f.vertices.flatMap((v,ai)=>[{ai,bi:ai,t:0,uv:v.uv},...(insertions.get(fi+':'+ai)||[]).sort((a,b)=>a.t-b.t).filter((p,i,all)=>!i||Math.abs(p.t-all[i-1].t)>1e-7)]));cachedKey=signature;
    }
    const ranks=[...new Set(faces.map(f=>f.renderLayer||0))].sort((a,b)=>a-b),gap=scale*(separate?.07:clear?.009:.00006)/Math.max(1,Math.sqrt(ranks.length)),shifts=faces.map(f=>{const n=normal(f),major=n.reduce((best,x,i)=>Math.abs(x)>Math.abs(n[best])?i:best,0),r=ranks.indexOf(f.renderLayer||0)-(ranks.length-1)/2;return n.map(x=>x*Math.sign(n[major])*r*gap);});
    const shared=new Map();topology.forEach((vs,fi)=>vs.forEach(v=>{const k=key(v.uv);if(!shared.has(k))shared.set(k,new Map());shared.get(k).set(fi,shifts[fi]);}));
    return faces.map((f,fi)=>({...f,vertices:topology[fi].map(v=>{const a=f.vertices[v.ai].p,b=f.vertices[v.bi].p,neighbors=[...shared.get(key(v.uv)).values()],shift=separate?shifts[fi]:[0,1,2].map(k=>neighbors.reduce((s,n)=>s+n[k],0)/neighbors.length);return {uv:[...v.uv],p:a.map((x,k)=>x+v.t*(b[k]-x)+shift[k])};})}));
  };
}
