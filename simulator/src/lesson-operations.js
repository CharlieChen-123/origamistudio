import {compileActions,poseAction} from './action-fold.js';
import {checkMotion} from './motion-quality.js';
import {motionStages} from './motion-stages.js';

export function validateLesson(initial,actions){
  if(!Array.isArray(actions))throw Error('The tutorial needs a list of steps.');
  let sequence;
  actions.forEach((a,i)=>{try{motionStages(a);}catch(e){throw Error(`Step ${i+1}: ${e.message}`);}});
  try{sequence=compileActions(initial,actions);}catch(error){for(let i=0;i<actions.length;i++){try{compileActions(initial,actions.slice(0,i+1));}catch(e){throw Error(`Step ${i+1}: ${e.message}`);}}throw error;}
  actions.forEach((a,i)=>{if(a.duration!==undefined&&(!Number.isFinite(a.duration)||a.duration<=0||a.duration>120))throw Error(`Step ${i+1}: use an animation duration between 0 and 120 seconds.`);if(a.view&&(!Array.isArray(a.view.target)||a.view.target.length!==3||!a.view.target.every(Number.isFinite)||!['zoom','yaw','pitch'].every(k=>Number.isFinite(a.view[k]))||a.view.zoom<=0))throw Error(`Step ${i+1}: invalid camera view.`);});
  sequence.prepared.forEach((p,i)=>{try{if(p.kind!=='demo'&&p.kind!=='unfold')checkMotion(p,poseAction,{samples:16,tolerance:1e-4});}catch(e){throw Error(`Step ${i+1}: ${e.message}`);}});
  return sequence;
}
// A recipe preserves material coordinates. It can be reused on a geometrically
// matching starting pose, including a uniformly scaled or translated sheet.
export function makeRecipe(title,initial,actions,start,end,frame){
  if(start<0||end<start||end>=actions.length)throw Error('Choose a valid step range.');
  const sequence=compileActions(initial,actions),selected=structuredClone(actions.slice(start,end+1));
  selected.forEach(a=>{if(a.kind==='unfold'){if(a.foldIndex<start)throw Error('Include the fold before its unfold in the recipe.');a.foldIndex-=start;}});
  return {version:1,title,frame,startingPose:sequence.frames[start],actions:selected};
}
export function applyRecipe(recipe,sheet,frame,offset){
  if(recipe.version!==1)throw Error('Unknown recipe version.');
  const scale=frame.w/recipe.frame.w;
  if(Math.abs(frame.h/recipe.frame.h-scale)>1e-6)throw Error('This recipe needs the same paper proportions.');
  const xy=p=>[frame.x+(p[0]-recipe.frame.x)*scale,frame.y+(p[1]-recipe.frame.y)*scale];
  const xyz=p=>[...xy(p),p[2]*scale];
  // Compare the material-to-world mapping at all current and recorded vertices,
  // allowing different triangulations and crease subdivisions.
  const mapped=recipe.startingPose.map(f=>({...f,vertices:f.vertices.map(v=>({uv:xy(v.uv),p:xyz(v.p)}))}));
  const locate=(uv,faces)=>{for(const f of faces){for(let i=1;i<f.vertices.length-1;i++){const [a,b,c]=[f.vertices[0],f.vertices[i],f.vertices[i+1]],u=b.uv.map((x,k)=>x-a.uv[k]),v=c.uv.map((x,k)=>x-a.uv[k]),q=uv.map((x,k)=>x-a.uv[k]),det=u[0]*v[1]-u[1]*v[0];if(Math.abs(det)<1e-10)continue;const s=(q[0]*v[1]-q[1]*v[0])/det,t=(u[0]*q[1]-u[1]*q[0])/det;if(s>=-1e-6&&t>=-1e-6&&s+t<=1+1e-6)return a.p.map((x,k)=>x+s*(b.p[k]-x)+t*(c.p[k]-x));}}return null;};
  for(const [a,b] of [[mapped,sheet],[sheet,mapped]])for(const f of a)for(const v of f.vertices){const p=locate(v.uv,b);if(!p||Math.hypot(...p.map((x,k)=>x-v.p[k]))>1e-4)throw Error('Start from the same paper pose used to record this recipe.');}
  const actions=structuredClone(recipe.actions);
  for(const a of actions){
    const local=a.plane;
    const mapPoint=p=>local?p.map(x=>x*scale):p.length===3?xyz(p):xy(p);
    if(a.axis)a.axis=a.axis.map(mapPoint);
    for(const k of ['tip','left','right','hingeLeft','hingeRight','pivot','spine','hinge','destination'])if(a[k])a[k]=mapPoint(a[k]);
    if(a.seed)a.seed=xy(a.seed);if(a.seeds)a.seeds=a.seeds.map(xy);
    for(const k of ['frontRegions','leftRegions','rightRegions','backRegions'])if(a[k])a[k]=a[k].map(poly=>poly.map(xy));
    if(a.plane)a.plane.origin=xyz(a.plane.origin);
    if(a.kind==='unfold')a.foldIndex+=offset;
    delete a.view;
  }
  return actions;
}
