// Experimental position-based relaxation: original edge lengths, crease angles,
// and paired opposite-edge points. No collision, thickness or convergence guarantee.
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const len=a=>Math.hypot(...a);
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
function dihedral(p,[a,b,c,d]){const e=sub(p[b],p[a]),n1=cross(e,sub(p[c],p[a])),n2=cross(sub(p[d],p[a]),e),s=len(e);if(s<1e-10||len(n1)*len(n2)<1e-12)return 0;return Math.atan2(dot(cross(n1,n2),e)/s,dot(n1,n2));}
export function makeSeamModel(fold,axis='x'){
  const uv=fold.vertices_coords.map(p=>p.length===2?[...p]:[p[0],p[2]]),d=axis==='x'?0:1,other=1-d;
  const lo=[0,1].map(k=>Math.min(...uv.map(p=>p[k]))),hi=[0,1].map(k=>Math.max(...uv.map(p=>p[k]))),width=hi[d]-lo[d],height=hi[other]-lo[other],scale=1/Math.max(width,height);
  const original=uv.map(p=>[(p[d]-lo[d])*scale,(p[other]-(lo[other]+hi[other])/2)*scale,0]);
  const assignments=new Map(fold.edges_vertices.map((e,i)=>[[...e].sort((a,b)=>a-b).join(','),fold.edges_assignment[i]]));
  const edges=new Map();fold.faces_vertices.forEach(f=>{if(f.length!==3)throw Error('The seam experiment requires triangulated faces.');for(let j=0;j<3;j++){const a=f[j],b=f[(j+1)%3],c=f[(j+2)%3],key=[a,b].sort((a,b)=>a-b).join(',');if(edges.has(key))edges.get(key).hinge.push(c);else edges.set(key,{a,b,length:len(sub(original[a],original[b])),type:assignments.get(key)||'F',hinge:[a,b,c]});}});
  const left=uv.map((p,i)=>({p,i})).filter(v=>Math.abs(v.p[d]-lo[d])<width*1e-4),right=uv.map((p,i)=>({p,i})).filter(v=>Math.abs(v.p[d]-hi[d])<width*1e-4);
  const pairs=[];for(const a of left){const b=right.find(b=>Math.abs(a.p[other]-b.p[other])<Math.max(width,height)*1e-4);if(b)pairs.push([a.i,b.i]);}
  if(pairs.length<2)throw Error('These edges have no matching seam endpoints. Choose a different wrap direction.');
  const matched=new Set(pairs.flat()),seams=[];
  // Different boundary subdivisions must join point-to-edge, not only at corners.
  for(const [from,to] of [[left,right],[right,left]]){const sorted=[...to].sort((a,b)=>a.p[other]-b.p[other]);for(const v of from){if(matched.has(v.i))continue;for(let j=1;j<sorted.length;j++){const a=sorted[j-1],b=sorted[j],t=(v.p[other]-a.p[other])/(b.p[other]-a.p[other]);if(t>=0&&t<=1){seams.push({i:v.i,a:a.i,b:b.i,t});matched.add(v.i);break;}}}}
  const model={original,positions:original.map(p=>[...p]),edges:[...edges.values()],pairs,seams,border:left.map(v=>v.i),unpaired:left.length+right.length-matched.size,faces:fold.faces_vertices,leftCount:left.length,rightCount:right.length,width:width*scale,height:height*scale};
  rollSeam(model,1);return model;
}
export function rollSeam(model,t){const w=model.width;model.positions=model.original.map(([x,y])=>{if(t<1e-5)return[x-w/2,y,0];const r=w/(Math.PI*2*t),theta=(x/w-.5)*Math.PI*2*t;return[r*Math.sin(theta),y,r*(Math.cos(theta)-1)];});const center=[0,1,2].map(k=>model.positions.reduce((s,p)=>s+p[k],0)/model.positions.length);model.positions.forEach(p=>p.forEach((_,k)=>p[k]-=center[k]));}
function projectSeam(model){const p=model.positions;for(let pass=0;pass<5;pass++){for(const [a,b] of model.pairs)for(let k=0;k<3;k++){const mid=(p[a][k]+p[b][k])/2;p[a][k]=mid;p[b][k]=mid;}for(const {i,a,b,t} of model.seams){const u=1-t,norm=1+u*u+t*t;for(let k=0;k<3;k++){const delta=(p[i][k]-u*p[a][k]-t*p[b][k])/norm;p[i][k]-=delta;p[a][k]+=u*delta;p[b][k]+=t*delta;}}}}
export function relaxSeam(model,amount,iterations=3){const p=model.positions;
 for(let iteration=0;iteration<iterations;iteration++){
  for(const edge of model.edges){if(edge.hinge.length!==4)continue;const target=edge.type==='M'?-Math.PI*amount:edge.type==='V'?Math.PI*amount:0;const current=dihedral(p,edge.hinge),error=wrap(current-target),strength=edge.type==='M'||edge.type==='V'?.09:.008;
    if(Math.abs(error)<1e-5)continue;const gradients=[],h=1e-5;let norm=0;
    for(const id of edge.hinge){const g=[];for(let k=0;k<3;k++){p[id][k]+=h;const a=dihedral(p,edge.hinge);p[id][k]-=2*h;const b=dihedral(p,edge.hinge);p[id][k]+=h;g[k]=wrap(a-b)/(2*h);norm+=g[k]*g[k];}gradients.push(g);}
    if(norm<1e-12)continue;const lambda=-strength*error/(norm+1e-8);edge.hinge.forEach((id,i)=>{for(let k=0;k<3;k++)p[id][k]+=lambda*gradients[i][k];});
  }
  // Several metric projections prevent the angular targets from stretching paper freely.
  for(let pass=0;pass<5;pass++){for(const e of model.edges){const delta=sub(p[e.b],p[e.a]),distance=len(delta);if(distance<1e-10)continue;const correction=(distance-e.length)/distance*.45;for(let k=0;k<3;k++){p[e.a][k]+=delta[k]*correction;p[e.b][k]-=delta[k]*correction;}}projectSeam(model);}
  const center=[0,1,2].map(k=>p.reduce((s,v)=>s+v[k],0)/p.length);p.forEach(v=>v.forEach((_,k)=>v[k]-=center[k]));
 }
 return seamMetrics(model);
}
export function seamMetrics(model){const p=model.positions,strain=model.edges.map(e=>Math.abs(len(sub(p[e.a],p[e.b]))/e.length-1));return {maxStrain:Math.max(...strain),rmsStrain:Math.sqrt(strain.reduce((s,v)=>s+v*v,0)/strain.length),seamGap:Math.max(...model.pairs.map(([a,b])=>len(sub(p[a],p[b]))),...model.seams.map(({i,a,b,t})=>len(p[i].map((v,k)=>v-(1-t)*p[a][k]-t*p[b][k])))),pairedPoints:model.pairs.length+model.seams.length,unpairedPoints:model.unpaired,finite:p.every(p=>p.every(Number.isFinite))};}
