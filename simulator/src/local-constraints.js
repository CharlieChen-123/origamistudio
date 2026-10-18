// Exact local distance constraints for a triangulated pocket. These utilities
// solve specified branches; they do not search for a folding order or contact path.
const sub=(a,b)=>a.map((x,i)=>x-b[i]);
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>Math.hypot(...a);
export function solveRimAngle(a,b,edge,height){
  if(![a,b,edge,height].every(Number.isFinite)||Math.min(a,b,edge)<=0||height<0||height>Math.min(a,b)+1e-10)throw Error('This pocket cannot reach the requested opening.');
  const ra=Math.sqrt(Math.max(0,a*a-height*height)),rb=Math.sqrt(Math.max(0,b*b-height*height));
  const numerator=(a*a+b*b-edge*edge)/2-height*height;
  if(ra*rb<1e-12){if(Math.abs(numerator)>1e-8)throw Error('The pocket rim cannot close without stretching.');return Math.PI/2;}
  const cos=numerator/(ra*rb);
  if(Math.abs(cos)>1+1e-8)throw Error('The selected pocket has incompatible edge lengths.');
  return Math.acos(Math.max(-1,Math.min(1,cos)));
}
// Intersection of three spheres. hint chooses the intended side of the hinge.
export function solveDistanceVertex(centers,lengths,hint){
  const [a,b,c]=centers,d=norm(sub(b,a));if(d<1e-10)throw Error('Separate the hinge landmarks.');
  const ex=sub(b,a).map(x=>x/d),ca=sub(c,a),i=dot(ex,ca),ey0=ca.map((x,k)=>x-i*ex[k]),j=norm(ey0);
  if(j<1e-10)throw Error('The pocket is at a flat singularity. Specify an opening direction.');
  const ey=ey0.map(x=>x/j),ez=cross(ex,ey),[r0,r1,r2]=lengths;
  const x=(r0*r0-r1*r1+d*d)/(2*d),y=(r0*r0-r2*r2+i*i+j*j-2*i*x)/(2*j),z2=r0*r0-x*x-y*y;
  if(z2<-1e-8*Math.max(1,r0*r0))throw Error('The target would stretch this pocket.');
  const z=Math.sqrt(Math.max(0,z2))*(dot(sub(hint,a),ez)<0?-1:1);
  return a.map((v,k)=>v+x*ex[k]+y*ey[k]+z*ez[k]);
}
export function rigidTriangleMap(point,source,target){
  const u=sub(source[1],source[0]),v=sub(source[2],source[0]),q=sub(point,source[0]);
  const uu=dot(u,u),uv=dot(u,v),vv=dot(v,v),det=uu*vv-uv*uv;
  if(det<1e-20)throw Error('Choose a pocket with a wider opening.');
  const a=(dot(q,u)*vv-dot(q,v)*uv)/det,b=(dot(q,v)*uu-dot(q,u)*uv)/det;
  return target[0].map((x,k)=>x+a*(target[1][k]-x)+b*(target[2][k]-x));
}
