// Neighbours are defined on the original sheet, not by coincident 3D layers.
// A fold may subdivide only one side of a seam, so equal endpoint keys are insufficient.
export function edgeOverlap(a,b,c,d,tolerance=1e-6){
  const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
  if(length<tolerance)return false;
  if(Math.abs(dx*(c[1]-a[1])-dy*(c[0]-a[0]))>tolerance*length||Math.abs(dx*(d[1]-a[1])-dy*(d[0]-a[0]))>tolerance*length)return false;
  const project=p=>((p[0]-a[0])*dx+(p[1]-a[1])*dy)/length;
  const x=project(c),y=project(d);
  return Math.min(length,Math.max(x,y))-Math.max(0,Math.min(x,y))>tolerance;
}
export function materialAdjacency(faces,exclude=()=>false){
  const adjacency=faces.map(()=>new Set()),edges=[];
  faces.forEach((f,i)=>f.vertices.forEach((a,j)=>{const b=f.vertices[(j+1)%f.vertices.length];if(!exclude(a,b))edges.push({i,a:a.uv,b:b.uv});}));
  for(let i=0;i<edges.length;i++)for(let j=0;j<i;j++){
    const a=edges[i],b=edges[j];if(a.i===b.i||adjacency[a.i].has(b.i))continue;
    if(edgeOverlap(a.a,a.b,b.a,b.b)){adjacency[a.i].add(b.i);adjacency[b.i].add(a.i);}
  }
  return adjacency;
}
// Record every vertex lying on another face's material edge, including T junctions.
// These barycentric constraints can be reused at each animation sample.
export function materialSeams(faces,tolerance=1e-6){
  const seams=[],edges=[];
  faces.forEach((f,fi)=>f.vertices.forEach((a,ai)=>{const bi=(ai+1)%f.vertices.length,b=f.vertices[bi];edges.push({fi,ai,bi,a:a.uv,b:b.uv});}));
  faces.forEach((f,fi)=>f.vertices.forEach((v,vi)=>{for(const e of edges){
    if(e.fi===fi)continue;
    const dx=e.b[0]-e.a[0],dy=e.b[1]-e.a[1],l2=dx*dx+dy*dy;
    if(l2<tolerance*tolerance)continue;
    const t=((v.uv[0]-e.a[0])*dx+(v.uv[1]-e.a[1])*dy)/l2;
    if(t<-tolerance/Math.sqrt(l2)||t>1+tolerance/Math.sqrt(l2))continue;
    if(Math.hypot(v.uv[0]-e.a[0]-t*dx,v.uv[1]-e.a[1]-t*dy)>tolerance)continue;
    seams.push({fi,vi,edge:e,t:Math.max(0,Math.min(1,t))});
  }}));return seams;
}
