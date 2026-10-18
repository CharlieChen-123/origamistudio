// Real saved-step geometry, rendered locally. No illustrative placeholder models.
const cache=new WeakMap();
export function stepThumbnail(faces){
 if(cache.has(faces))return cache.get(faces);
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=156;
 const ctx=canvas.getContext('2d'),yaw=.65,pitch=.62;
 const project=p=>[Math.cos(yaw)*p[0]-Math.sin(yaw)*p[1],Math.sin(pitch)*(Math.sin(yaw)*p[0]+Math.cos(yaw)*p[1])-Math.cos(pitch)*p[2],Math.cos(pitch)*(Math.sin(yaw)*p[0]+Math.cos(yaw)*p[1])+Math.sin(pitch)*p[2]];
 const polygons=faces.map(f=>f.vertices.map(v=>project(v.p))),points=polygons.flat();
 if(!points.length)return '';
 const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),lo=[Math.min(...xs),Math.min(...ys)],hi=[Math.max(...xs),Math.max(...ys)],scale=Math.min(218/Math.max(hi[0]-lo[0],1e-8),124/Math.max(hi[1]-lo[1],1e-8));
 const at=p=>[128+(p[0]-(hi[0]+lo[0])/2)*scale,78+(p[1]-(hi[1]+lo[1])/2)*scale];
 polygons.sort((a,b)=>a.reduce((n,p)=>n+p[2]/a.length,0)-b.reduce((n,p)=>n+p[2]/b.length,0));
 for(const polygon of polygons){
  ctx.beginPath();polygon.forEach((p,i)=>{const q=at(p);if(i)ctx.lineTo(...q);else ctx.moveTo(...q);});ctx.closePath();
  ctx.fillStyle='#fafafa';ctx.fill();ctx.lineWidth=.6;ctx.strokeStyle='#a4a7ab';ctx.stroke();
 }
 const result=canvas.toDataURL('image/png');cache.set(faces,result);return result;
}
