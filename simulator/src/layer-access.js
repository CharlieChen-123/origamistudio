// Flat-packet accessibility, in the active work plane. Material-connected faces
// are already one candidate. Overlying paper must move with a buried candidate.
function overlapArea(a,b){
 const area=p=>p.reduce((s,v,i)=>{const w=p[(i+1)%p.length];return s+v[0]*w[1]-v[1]*w[0];},0)/2;
 let out=a.map(p=>p.slice(0,2));const sign=Math.sign(area(b));
 for(let i=0;i<b.length&&out.length;i++){const x=b[i],y=b[(i+1)%b.length],side=p=>sign*((y[0]-x[0])*(p[1]-x[1])-(y[1]-x[1])*(p[0]-x[0])),input=out;out=[];
  input.forEach((p,j)=>{const q=input[(j+1)%input.length],u=side(p),v=side(q);if(u>=0)out.push(p);if((u>0&&v<0)||(u<0&&v>0)){const t=u/(u-v);out.push(p.map((x,k)=>x+t*(q[k]-x)));}});
 }return Math.abs(area(out));
}
export function annotateLayerAccess(candidates,direction){
 const points=candidates.flatMap(c=>c.faces.flatMap(f=>f.vertices.map(v=>v.p))),span=points.length?Math.max(...points.map(p=>p[0]))-Math.min(...points.map(p=>p[0])):1,tolerance=Math.max(1,span*span)*1e-9;
 return candidates.map((c,i)=>({...c,requires:candidates.flatMap((other,j)=>{
  if(i===j)return [];
  const blocked=c.faces.some(f=>other.faces.some(g=>direction*((g.renderLayer||0)-(f.renderLayer||0))>0&&overlapArea(f.vertices.map(v=>v.p),g.vertices.map(v=>v.p))>tolerance));
  return blocked?[j]:[];
 }),layerCount:new Set(c.faces.map(f=>f.renderLayer||0)).size}));
}
export function layerClosure(candidates,selected){
 const result=new Set(selected),todo=[...result];while(todo.length)for(const j of candidates[todo.pop()]?.requires||[])if(!result.has(j)){result.add(j);todo.push(j);}return result;
}
export function toggleAccessibleLayer(candidates,selected,index){
 if(!selected.has(index))return layerClosure(candidates,[...selected,index]);
 // Removing a required outer flap also removes any selection that depends on it.
 return new Set([...selected].filter(i=>!layerClosure(candidates,[i]).has(index)));
}
