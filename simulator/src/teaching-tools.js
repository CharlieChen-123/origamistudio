// Tutorial marks are attached to material coordinates, never screen pixels.
const finitePoint=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite);
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0);
export function barycentric(point,a,b,c){
  const u=sub(b,a),v=sub(c,a),q=sub(point,a),uu=dot(u,u),uv=dot(u,v),vv=dot(v,v),qu=dot(q,u),qv=dot(q,v),den=uu*vv-uv*uv;
  if(Math.abs(den)<1e-16)return null;
  const s=(vv*qu-uv*qv)/den,t=(uu*qv-uv*qu)/den;return [1-s-t,s,t];
}
export function resolveAnchor(anchor,faces){
  if(!anchor||!finitePoint(anchor.uv))return null;
  for(const face of faces){
    if(anchor.faceId!==undefined&&face.id!==anchor.faceId)continue;
    for(let i=1;i<face.vertices.length-1;i++){
      const tri=[face.vertices[0],face.vertices[i],face.vertices[i+1]],weights=barycentric(anchor.uv,...tri.map(v=>v.uv));
      if(weights&&weights.every(v=>v>=-1e-6&&v<=1+1e-6))return tri[0].p.map((_,k)=>tri.reduce((n,v,j)=>n+v.p[k]*weights[j],0));
    }
  }return null;
}
export function validateTeaching(action,faces){
  const teaching=action?.teaching;if(teaching===undefined)return;
  if(!teaching||typeof teaching!=='object'||Array.isArray(teaching))throw Error('Teaching notes must contain marks and checkpoints.');
  const marks=teaching.marks??[],cues=teaching.cues??[];
  if(!Array.isArray(marks)||marks.length>24||!Array.isArray(cues)||cues.length>16)throw Error('Use up to 24 marks and 16 checkpoints in one step.');
  const anchor=a=>{if(!a||!finitePoint(a.uv)||!resolveAnchor(a,faces))throw Error('A teaching mark is outside this paper. Place it on the paper again.');};
  const text=t=>{if(typeof t!=='string'||t.length>240)throw Error('Keep each teaching note within 240 characters.');};
  for(const m of marks){
    if(!m||!['label','arrow'].includes(m.kind))throw Error('Choose a label or an arrow for a teaching mark.');
    anchor(m.from);if(m.kind==='arrow')anchor(m.to);text(m.text??'');
    if(!Number.isFinite(m.start)||!Number.isFinite(m.end)||m.start<0||m.end>1||m.start>m.end)throw Error('A mark needs a start and end between 0% and 100%.');
    if(m.offset!==undefined&&(!finitePoint(m.offset)||m.offset.some(n=>Math.abs(n)>500)))throw Error('A label offset is invalid.');
  }
  for(const c of cues){
    if(!c||!Number.isFinite(c.at)||c.at<=0||c.at>1)throw Error('Place checkpoints after 0% and at or before 100%.');
    text(c.text??'');if(c.pause!==undefined&&typeof c.pause!=='boolean')throw Error('Choose whether to pause at this checkpoint.');
    if(c.focus){anchor(c.focus.anchor);if(!Number.isFinite(c.focus.zoom)||c.focus.zoom<1||c.focus.zoom>3)throw Error('Detail zoom must be between 1× and 3×.');}
  }
  const sorted=cues.map(c=>c.at).sort((a,b)=>a-b);if(sorted.some((t,i)=>i>0&&t-sorted[i-1]<.01-1e-8))throw Error('Keep checkpoints at least 1% apart.');
}
export function nextTeachingStop(action,from,to){return (action?.teaching?.cues||[]).filter(c=>c.pause!==false&&c.at>from+1e-8&&c.at<=to+1e-8).sort((a,b)=>a.at-b.at)[0]?.at;}
export function teachingCueAt(action,t){return (action?.teaching?.cues||[]).filter(c=>c.at<=t+1e-8).sort((a,b)=>b.at-a.at)[0]||null;}
export function transformTeaching(teaching,map){
  if(!teaching)return teaching;const next=structuredClone(teaching),anchor=a=>({uv:map(a.uv)});
  next.marks?.forEach(m=>{m.from=anchor(m.from);if(m.to)m.to=anchor(m.to);});next.cues?.forEach(c=>{if(c.focus)c.focus.anchor=anchor(c.focus.anchor);});return next;
}
// Project a dragged point onto the circular path of a rigid fold.
export function foldAngleAtPoint(axis,start,point,previous=90){
  const u=sub(axis[1],axis[0]),length=Math.hypot(...u);if(length<1e-8)throw Error('Move the fold-line handles apart.');
  const ux=u[0]/length,uy=u[1]/length,r=-uy*(start[0]-axis[0][0])+ux*(start[1]-axis[0][1]);
  if(Math.abs(r)<1e-8)throw Error('Choose a point away from the fold line.');
  const q=-uy*(point[0]-axis[0][0])+ux*(point[1]-axis[0][1]),z=point[2]||0;
  let angle=Math.atan2(z/r,q/r)*180/Math.PI;
  if(Math.abs(angle)>179.5)angle=Math.sign(previous||1)*180;
  return Math.max(-180,Math.min(180,angle));
}
