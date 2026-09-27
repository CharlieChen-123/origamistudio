// Reusable rigid motion recipes. Landmarks are in the current paper plane;
// material sectors choose the pocket walls, independently of display layers.
const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]);
const mul=(a,s)=>a.map(v=>v*s),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit=a=>mul(a,1/Math.hypot(...a));
const p3=p=>[p[0],p[1],p[2]||0];
export function rotatePoint(p,axis,angle){
  const a=p3(axis[0]),u=unit(sub(p3(axis[1]),a)),v=sub(p,a),c=Math.cos(angle),s=Math.sin(angle);
  return add(a,add(add(mul(v,c),mul(cross(u,v),s)),mul(u,dot(u,v)*(1-c))));
}
function mapTriangle(p,from,to){
  const a=from[0],u=sub(from[1],a),v=sub(from[2],a),r=sub(p,a);
  const uu=dot(u,u),vv=dot(v,v),uv=dot(u,v),det=uu*vv-uv*uv;
  if(det<1e-16)throw Error('The template landmarks form a degenerate triangle.');
  const s=(dot(r,u)*vv-dot(r,v)*uv)/det,t=(dot(r,v)*uu-dot(r,u)*uv)/det;
  return add(to[0],add(mul(sub(to[1],to[0]),s),mul(sub(to[2],to[0]),t)));
}
function centroid(f){return mul(f.vertices.reduce((s,v)=>add(s,v.p),[0,0,0]),1/f.vertices.length);}
function transformFace(f,fn,rank=f.renderLayer||0){return {...f,renderLayer:rank,vertices:f.vertices.map(v=>({uv:[...v.uv],p:fn(v.p)}))};}
function triangleContains(p,tri){
  const signs=tri.map((a,i)=>{const b=tri[(i+1)%3];return (b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);});
  return signs.every(v=>v>=-1e-7)||signs.every(v=>v<=1e-7);
}
// Assign creases from the actual relative rotation of adjacent material faces.
// A valley is negative signed dihedral with respect to the original front face.
export function templateCreases(prepared){
  if(prepared.template==='turn')return [];
  const start=poseTemplate(prepared,0),posed=poseTemplate(prepared,.7),edges=new Map(),out=[];
  const normal=f=>{const a=f.vertices[0].p;for(let i=1;i<f.vertices.length-1;i++){const n=cross(sub(f.vertices[i].p,a),sub(f.vertices[i+1].p,a));if(Math.hypot(...n)>1e-10)return unit(n);}return [0,0,0];};
  posed.forEach((f,fi)=>f.vertices.forEach((v,i)=>{
    const w=f.vertices[(i+1)%f.vertices.length],key=[v.uv,w.uv].map(p=>p.map(x=>x.toFixed(6)).join(',')).sort().join('|');
    if(!edges.has(key)){edges.set(key,{fi,v,w});return;}
    const other=edges.get(key),n=normal(f),m=normal(posed[other.fi]),n0=normal(start[fi]),m0=normal(start[other.fi]);
    if(Math.abs(dot(n,m)-dot(n0,m0))<1e-7)return;
    const axis=unit(sub(w.p,v.p)),signed=dot(axis,cross(n,m));
    if(Math.abs(signed)<1e-7)return;
    out.push({a:[...v.uv],b:[...w.uv],type:signed<0?'V':'M'});
  }));return out;
}
export const motionTemplates=[
  {id:'petal',name:'Petal fold',landmarks:['tip','left','right','hingeLeft','hingeRight']},
  {id:'reverse',name:'Inside reverse fold',landmarks:['pivot','spine','hinge']},
  {id:'turn',name:'Turn the paper',landmarks:['axis']}
];
export function prepareTemplate(sheet,action,{splitFaces,creaseMarks}){
  const id=action.template;
  if(id==='turn')return {kind:'template',template:id,pieces:sheet,action,creases:[]};
  if(sheet.some(f=>f.vertices.some(v=>Math.abs(v.p[2])>1e-5)))throw Error('Start this compound fold from a flat pose.');
  if(id==='petal'){
    const {tip,left,right,hingeLeft,hingeRight,frontSectors,leftSectors,rightSectors}=action;
    const [B,L,R,A,C]=[tip,left,right,hingeLeft,hingeRight].map(p3);
    const mid=mul(add(A,C),.5),u=unit(sub(C,A)),v=unit(sub(B,mid)),n=cross(u,v);
    const height=Math.hypot(...sub(B,mid)),halfWidth=Math.hypot(...sub(C,A))/2;
    if(Math.abs(dot(u,v))>1e-6||Math.abs(Math.hypot(...sub(L,A))-halfWidth)>height*1e-5||Math.abs(Math.hypot(...sub(L,B))-height)>height*1e-5||Math.abs(Math.hypot(...sub(R,B))-height)>height*1e-5)throw Error('This petal template needs a symmetric square-base pocket and its angle-bisector guides.');
    const pieces=splitFaces(sheet,[[A,C],[A,B],[C,B]]).map(f=>{
      const p=centroid(f);let panel=null;
      if(frontSectors.includes(f.sector))panel=triangleContains(p,[A,L,B])?'frontLeft':triangleContains(p,[C,R,B])?'frontRight':triangleContains(p,[A,C,B])?'center':null;
      else if(leftSectors.includes(f.sector)&&triangleContains(p,[A,L,B]))panel='innerLeft';
      else if(rightSectors.includes(f.sector)&&triangleContains(p,[C,R,B]))panel='innerRight';
      return {...f,panel};
    });
    if(!pieces.some(f=>f.panel==='center')||!pieces.some(f=>f.panel==='innerLeft'))throw Error('The selected paper layers do not form a petal pocket.');
    const creases=creaseMarks(pieces.filter(f=>f.panel),[[A,C],[A,B],[C,B]],'V');
    return {kind:'template',template:id,pieces,action,creases,B,L,R,A,C,mid,u,v,n,height,halfWidth};
  }
  if(id==='reverse'){
    const P=p3(action.pivot),v=unit(sub(p3(action.spine),P)),u=[v[1],-v[0],0],Q=p3(action.hinge);
    const q=sub(Q,P),qx=dot(q,u),qy=dot(q,v);
    if(Math.abs(qx)<1e-7||Math.abs(qy)<1e-7)throw Error('Choose an oblique reverse-fold hinge.');
    const pieces=splitFaces(sheet,[[P,add(P,v)],[P,Q]]).map(f=>{
      const c=sub(centroid(f),P),inSide=dot(c,u)*qx>1e-7;
      const wall=action.frontSectors.includes(f.sector)?1:action.backSectors.includes(f.sector)?-1:0;
      const cap=(qx*dot(c,v)-qy*dot(c,u))*qx>1e-7;
      return {...f,wall:inSide?wall:0,cap:inSide&&cap};
    });
    if(!pieces.some(f=>f.wall&&f.cap))throw Error('The reverse-fold hinge does not cross the selected point.');
    return {kind:'template',template:id,pieces,action,P,Q,u,v,qx,qy,creases:creaseMarks(pieces.filter(f=>f.cap),[[P,Q]],'V')};
  }
  throw Error('Unknown motion template: '+id);
}
export function poseTemplate(p,t){
  t=Math.max(0,Math.min(1,t));
  if(p.template==='turn')return p.pieces.map(f=>transformFace(f,v=>rotatePoint(v,p.action.axis,t*p.action.angle*Math.PI/180),t===1?-(f.renderLayer||0):f.renderLayer));
  if(p.template==='petal'){
    const {A,C,B,L,R,mid,u,v,n,height:h,halfWidth:a}=p,theta=Math.PI*t,sign=p.action.direction||1;
    const movingB=add(mid,add(mul(v,h*Math.cos(theta)),mul(n,sign*h*Math.sin(theta))));
    const ch=Math.cos(theta/2),sh=Math.sin(theta/2),radius=h*ch;
    const K=add(mid,add(mul(v,h*ch*ch),mul(n,sign*h*sh*ch)));
    const e=add(mul(v,-sh),mul(n,sign*ch));
    const solve=(hinge,side)=>{
      if(t===0)return side<0?L:R;if(t===1)return [...mid];
      const w=sub(hinge,K),den=a*a+radius*radius;
      return add(K,add(mul(w,radius*radius/den),mul(cross(e,w),side*sign*radius*a/den)));
    };
    const left=solve(A,-1),right=solve(C,1);
    const maps={center:[[A,C,B],[A,C,movingB]],frontLeft:[[A,L,B],[A,left,movingB]],frontRight:[[C,R,B],[C,right,movingB]],innerLeft:[[A,L,B],[A,left,B]],innerRight:[[C,R,B],[C,right,B]]};
    return p.pieces.map(f=>{const m=maps[f.panel];return m?transformFace(f,v=>mapTriangle(v,...m),t===0?f.renderLayer:20+(f.panel==='center'?0:f.panel.startsWith('front')?1:2)):transformFace(f,v=>[...v]);});
  }
  if(p.template==='reverse'){
    const {P,Q,u,v,qx,qy}=p,opening=t<=.4,phi=(opening?t/.4:(1-t)/.6)*Math.PI/2;
    const c=Math.cos(phi),den=qx*qx*c*c+qy*qy;
    const tip=opening?add(P,v):add(P,add(mul(u,2*qx*qy*c/den),mul(v,(qy*qy-qx*qx*c*c)/den)));
    return p.pieces.map(f=>{
      if(!f.wall)return transformFace(f,v=>[...v]);
      const angle=f.wall*phi,rot=p=>rotatePoint(p,[P,add(P,v)],angle),turnedQ=rot(Q);
      return transformFace(f,point=>f.cap?mapTriangle(point,[P,Q,add(P,v)],[P,turnedQ,tip]):rot(point));
    });
  }
  throw Error('Unknown prepared template.');
}
