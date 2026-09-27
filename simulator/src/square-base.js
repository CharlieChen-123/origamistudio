// Exact, zero-thickness preliminary-base mechanism. Original implementation.
// Two opposite quadrants stay rigid squares. Each remaining corner is the
// intersection of a sphere and two planes (fixed sector lengths / dot products).
// No interpolation of paper vertices, springs, or target-shape morphing.
const ROOT2=Math.SQRT2;
export const squareRing=[[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]];
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function corner(a,b,branch){
  const d=dot(a,b),n=cross(a,b),length=Math.hypot(...n);
  const height=Math.sqrt(Math.max(0,2-2/(1+d)));
  return a.map((v,i)=>(v+b[i])/(1+d)+branch*height*n[i]/length);
}
export function squareBaseVertices(progress){
  const t=Math.max(0,Math.min(1,progress));
  if(t===0)return [[0,0,0],...squareRing.map(p=>[...p,0])];
  let ring;
  if(t===1)ring=[[1,0,0],[1,1,0],[0,1,0],[1,1,0],[0,1,0],[1,1,0],[1,0,0],[1,1,0]];
  else{
    const theta=Math.PI*t,c=Math.cos(theta),s=Math.sin(theta);
    const e=[1,0,0],n=[0,1,0],w=[-(1+c)/2,(1-c)/2,-s/ROOT2],south=[(1-c)/2,-(1+c)/2,-s/ROOT2];
    ring=[e,[1,1,0],n,corner(n,w,-1),w,[-c,-c,-ROOT2*s],south,corner(e,south,1)];
  }
  // Reposition the whole sheet rigidly, leaving the closed point up and all
  // four original corners down. This changes the view, never the paper metric.
  const angle=Math.PI*t/4,c=Math.cos(angle),s=Math.sin(angle);
  return [[0,0,0],...ring].map(([x,y,z])=>{
    x-=t/2;y-=t/2;
    return [c*x-s*y,s*x+c*y,z];
  });
}
export function squareSector(x,y){
  let a=Math.atan2(y,x);if(a<0)a+=2*Math.PI;
  return Math.min(7,Math.floor((a+1e-12)/(Math.PI/4))%8);
}
export function poseSquareBase(prepared,t){
  const {bounds,pieces}=prepared,{cx,cy,size}=bounds,vertices=squareBaseVertices(t);
  const ranks=[3,3,2,1,0,0,1,2];
  return pieces.map(face=>{
    const sector=face.sector,a=squareRing[sector],b=squareRing[(sector+1)%8],det=a[0]*b[1]-a[1]*b[0];
    return {...face,renderLayer:ranks[sector],vertices:face.vertices.map(v=>{
      const x=(v.uv[0]-cx)/size,y=(v.uv[1]-cy)/size;
      const u=(x*b[1]-y*b[0])/det,w=(a[0]*y-a[1]*x)/det;
      const p=vertices[0].map((o,k)=>o+u*(vertices[sector+1][k]-o)+w*(vertices[(sector+1)%8+1][k]-o));
      return {uv:[...v.uv],p:[cx+p[0]*size,cy+p[1]*size,p[2]*size]};
    })};
  });
}
