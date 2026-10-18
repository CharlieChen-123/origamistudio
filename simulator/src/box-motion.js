// Symmetric gusset closure for a planar square packet. Each corner consists of
// two rigid triangles. Their shared outer vertex is the intersection of the
// distance constraints to the rising walls and the fixed inner corner.
export function prepareBox(sheet,action,splitFaces){
  const pts=sheet.flatMap(f=>f.vertices.map(v=>v.p)),xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);
  const x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;
  if(!(w>0)||Math.abs(w-h)>w*1e-6||pts.some(p=>Math.abs(p[2])>w*1e-6))throw Error('Raise box walls starts from a flat square packet.');
  if([[x,y],[x+w,y],[x+w,y+h],[x,y+h]].some(c=>!pts.some(p=>Math.hypot(p[0]-c[0],p[1]-c[1])<w*1e-6)))throw Error('Prepare a square packet with four square corners before raising the walls.');
  const cx=x+w/2,cy=y+h/2,r=w/2,a=r*(action.baseRatio??.5),b=r-a;
  if(a<r*.5||a>=r*.9)throw Error('The box base must use 50–89% of the packet width.');
  const axes=[[[cx-a,y],[cx-a,y+h]],[[cx+a,y],[cx+a,y+h]],[[x,cy-a],[x+w,cy-a]],[[x,cy+a],[x+w,cy+a]],[[x,y],[x+w,y+h]],[[x+w,y],[x,y+h]]];
  return {kind:'box',pieces:splitFaces(sheet,axes),cx,cy,r,a,b,action,creases:[]};
}
export function poseBox(p,t){
  const theta=Math.PI/2*Math.max(0,Math.min(1,t)),c=Math.cos(theta),s=Math.sin(theta),{cx,cy,a,b}=p;
  return p.pieces.map(f=>({...f,vertices:f.vertices.map(v=>{
    const x=v.p[0]-cx,y=v.p[1]-cy,sx=Math.sign(x)||1,sy=Math.sign(y)||1,dx=Math.abs(x)-a,dy=Math.abs(y)-a;let q;
    if(dx<=1e-7&&dy<=1e-7)q=[x,y,0];
    else if(dx>1e-7&&dy<=1e-7)q=[sx*(a+dx*c),y,dx*s];
    else if(dy>1e-7&&dx<=1e-7)q=[x,sy*(a+dy*c),dy*s];
    else {
      const k=b*(c-Math.SQRT2*s*s)/(2-c*c),z=t===0?0:(b-k*c)/s;
      const C=[sx*(a+k),sy*(a+k),z],Q=[sx*a,sy*a,0],P=[sx*a,sy*(a+b*c),b*s],R=[sx*(a+b*c),sy*a,b*s];
      const weights=dx>=dy?[1-dx/b,(dx-dy)/b,dy/b]:[1-dy/b,(dy-dx)/b,dx/b],tri=dx>=dy?[Q,R,C]:[Q,P,C];
      q=[0,1,2].map(i=>weights.reduce((n,w,j)=>n+w*tri[j][i],0));
    }
    return {...v,p:[q[0]+cx,q[1]+cy,q[2]]};
  })}));
}
