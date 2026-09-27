import {checkMotion} from '../simulator/src/motion-quality.js';
import {craneActions} from '../simulator/src/crane-lesson.js';
import {makeSheet,compileActions,poseSequence,prepareAction,poseAction,axisForMatch,sideOf,pointInPolygon} from '../simulator/src/action-fold.js';
const $=id=>document.getElementById(id), NS='http://www.w3.org/2000/svg';
const state={active:false,builtIn:false,showCP:false,fold:null,initial:[],sequence:null,actions:[],draft:null,deletedStep:null,mode:'axis',authorTool:null,axisInput:'auto',points:[],matchEndpoints:null,side:0,seed:null,selectedIndex:-1,progress:0,playing:false,raf:0,group:null,zoom:1,pan:[0,0],phase:'define',visibility:null};
const color={M:'#bf5a50',V:'#497bbb',B:'#414b55',F:'#c6cbd0',U:'#c6cbd0'};
function svgEl(tag,attrs={}){const el=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));return el;}
function message(text){$('actionMessage').textContent=text;}
function sourceFold(){const f=G.pattern.getFoldData(true);if(!f?.faces_vertices?.length)throw Error('Import a crease pattern first.');return JSON.parse(JSON.stringify(f));}
function frame(){return state.frame;}
function sheet(){return state.sequence?.frames.at(-1)||state.initial;}
function compile(){state.sequence=compileActions(state.initial,state.actions);}
function toScene(p){const f=frame();return [(p[0]-f.cx)/f.r,p[2]/f.r,(p[1]-f.cy)/f.r];}
function clearGroup(){if(!state.group)return;while(state.group.children.length){const c=state.group.children[0];state.group.remove(c);c.geometry?.dispose();(Array.isArray(c.material)?c.material:[c.material]).forEach(m=>m?.dispose());}}
function lineObject(points,colorValue,opacity=.78){if(!points.length)return;const geometry=new THREE.BufferGeometry();geometry.addAttribute('position',new THREE.Float32BufferAttribute(points,3));const object=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:colorValue,transparent:true,opacity,depthTest:true}));object.renderOrder=4;state.group.add(object);}
function revealedCreases(){
  const refs=[];
  state.actions.forEach((action,index)=>{
    if(index<(state.selectedIndex<0?state.actions.length:state.selectedIndex)||(index===state.selectedIndex&&state.progress>.03))refs.push(...(state.sequence?.prepared[index]?.creases||[]));
  });
  if(state.draft&&state.progress>.03)refs.push(...(state.preparedDraft?.creases||[]));
  const latest=new Map();for(const r of refs){const key=[r.a,r.b].map(p=>p.map(x=>x.toFixed(5)).join(',')).sort().join('|');latest.set(key,r);}return [...latest.values()];
}
function render3D(faces){
  if(!state.group){state.group=new THREE.Group();G.threeView.scene.add(state.group);}state.group.visible=true;clearGroup();
  state.group.add(new THREE.AmbientLight(0xffffff,.7));
  const displayPoint=(p,layer=0)=>{const q=toScene(p);q[1]+=layer*.00003;return q;};
  const positions=[],boundary=[],mountains=[],valleys=[];faces.forEach(f=>{for(let i=1;i<f.vertices.length-1;i++)for(const v of [f.vertices[0],f.vertices[i],f.vertices[i+1]])positions.push(...displayPoint(v.p,f.renderLayer));});
  const geo=new THREE.BufferGeometry();geo.addAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.computeVertexNormals();
  state.group.add(new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:0xf6f3ea,side:THREE.FrontSide,roughness:.9,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1})));
  state.group.add(new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:0x8aa8bd,side:THREE.BackSide,roughness:.9,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1})));
  const edges=new Map();faces.forEach(f=>f.vertices.forEach((v,i)=>{const w=f.vertices[(i+1)%f.vertices.length];const k=[v.uv.map(x=>x.toFixed(5)).join(','),w.uv.map(x=>x.toFixed(5)).join(',')].sort().join('|');const entry=edges.get(k);if(entry)entry.count++;else edges.set(k,{v,w,count:1,layer:f.renderLayer||0});}));
  for(const {v,w,count,layer} of edges.values())if(count===1)boundary.push(...displayPoint(v.p,layer),...displayPoint(w.p,layer));
  const refs=state.showCP?state.refs:revealedCreases();
  for(const {a,b,type,renderLayer} of posedCreases(faces,refs))if(type==='M'||type==='V')(type==='M'?mountains:valleys).push(...displayPoint(a,renderLayer),...displayPoint(b,renderLayer));
  lineObject(boundary,0x435367,.7);lineObject(mountains,0xd95755,.95);lineObject(valleys,0x4c82db,.95);
}
function referenceSegments(){const f=state.fold;return f.edges_vertices.map(([a,b],i)=>({a:point(f.vertices_coords[a]),b:point(f.vertices_coords[b]),type:f.edges_assignment[i]}));}
function point(p){return p.length===2?p:[p[0],p[2]];}
function posedCreases(faces,refs=state.refs){
  const output=[];
  for(const face of faces){const vs=face.vertices,uv=vs.map(v=>v.uv),orientation=Math.sign(uv.reduce((sum,p,i)=>{const q=uv[(i+1)%uv.length];return sum+p[0]*q[1]-q[0]*p[1];},0));
    const a=vs[0],b=vs[1],c=vs[2],det=(b.uv[0]-a.uv[0])*(c.uv[1]-a.uv[1])-(b.uv[1]-a.uv[1])*(c.uv[0]-a.uv[0]);if(Math.abs(det)<1e-9)continue;
    const map=p=>{const x=p[0]-a.uv[0],y=p[1]-a.uv[1],s=(x*(c.uv[1]-a.uv[1])-y*(c.uv[0]-a.uv[0]))/det,t=((b.uv[0]-a.uv[0])*y-(b.uv[1]-a.uv[1])*x)/det;return a.p.map((v,i)=>v+s*(b.p[i]-v)+t*(c.p[i]-v));};
    for(const line of refs){let lo=0,hi=1;for(let i=0;i<uv.length;i++){const edge=[uv[i],uv[(i+1)%uv.length]],d=sideOf(line.a,edge)*orientation,e=sideOf(line.b,edge)*orientation,delta=e-d;if(Math.abs(delta)<1e-9){if(d<-1e-7){hi=-1;break;}}else if(delta>0)lo=Math.max(lo,-d/delta);else hi=Math.min(hi,-d/delta);}if(hi-lo>1e-7){const p=t=>line.a.map((v,i)=>v+(line.b[i]-v)*t);output.push({a:map(p(lo)),b:map(p(hi)),type:line.type,renderLayer:face.renderLayer||0});}}
  }return output;
}
function guidedGeometry(stage){
  const diamond=(width=1.25,height=1.7,lift=.04)=>[
    [[0,lift,-height/2],[width/2,0,0],[0,lift*.25,0]],[[width/2,0,0],[0,lift,height/2],[0,lift*.25,0]],
    [[0,lift,height/2],[-width/2,0,0],[0,lift*.25,0]],[[-width/2,0,0],[0,lift,-height/2],[0,lift*.25,0]]
  ];
  if(stage==='flat')return [[[-.78,0,-.78],[.78,0,-.78],[0,0,0]],[[.78,0,-.78],[.78,0,.78],[0,0,0]],[[.78,0,.78],[-.78,0,.78],[0,0,0]],[[-.78,0,.78],[-.78,0,-.78],[0,0,0]]];
  if(stage==='collapse')return diamond(1.35,1.7,.12);
  if(stage==='kite')return diamond(1.05,1.9,.1);
  if(stage==='petal')return diamond(.82,2.05,.14);
  if(stage==='bird')return [...diamond(.86,2.08,.09),[[-.42,0,.02],[0,.03,.48],[.42,0,.02]]];
  if(stage==='narrow')return [...diamond(.62,1.9,.12),[[-.3,0,.25],[-.72,.05,.92],[0,.05,.58]],[[.3,0,.25],[.72,.05,.92],[0,.05,.58]]];
  if(stage==='reverse'||stage==='head'){
    const beak=stage==='head'?[[[.55,.18,-.55],[.9,.2,-.72],[.61,.17,-.42]]]:[];
    return [...diamond(.78,1.05,.18),[[-.3,.02,.18],[-.88,.12,.52],[-.08,.08,.48]],[[.3,.02,.18],[.7,.18,-.62],[.08,.08,.48]],...beak];
  }
  return [
    [[-.08,.18,.12],[-1.08,.04,-.12],[-.25,.02,.48]],[[.08,.18,.12],[1.08,.04,-.12],[.25,.02,.48]],
    [[-.34,.04,.38],[.34,.04,.38],[0,.22,-.18]],[[-.22,.03,.35],[-.92,.07,.62],[0,.08,.55]],
    [[.18,.06,.26],[.54,.18,-.62],[.05,.12,.38]],[[.54,.18,-.62],[.82,.18,-.73],[.58,.17,-.49]]
  ];
}
function guidedPreviousStage(stage){return ({collapse:'flat',kite:'collapse',petal:'kite',bird:'petal',narrow:'bird',reverse:'narrow',head:'reverse',finish:'head'})[stage]||'flat';}
function morphGuidedGeometry(fromStage,toStage,progress){
  const from=guidedGeometry(fromStage),to=guidedGeometry(toStage),count=Math.max(from.length,to.length),result=[];
  const center=triangle=>triangle.reduce((sum,p)=>sum.map((v,i)=>v+p[i]/3),[0,0,0]);
  for(let i=0;i<count;i++){
    const a=from[i]||Array(3).fill(center(to[i]||to.at(-1))),b=to[i]||Array(3).fill(center(from[i]||from.at(-1)));
    result.push(a.map((p,j)=>p.map((value,k)=>value+(b[j][k]-value)*progress+(k===1?Math.sin(Math.PI*progress)*.16*(i%2?.55:1):0))));
  }
  return result;
}
function guidedStageCreases(stage,offset=0){
  const point=(x,z,y=.012)=>[x+offset,y,z],mountains=[],valleys=[];
  const add=(target,a,b)=>target.push(...point(...a),...point(...b));
  if(stage==='collapse'){add(mountains,[0,-.84],[0,.84]);add(valleys,[-.65,0],[.65,0]);}
  else if(stage==='kite'){add(valleys,[-.52,0],[0,.82]);add(valleys,[.52,0],[0,.82]);add(mountains,[-.5,0],[.5,0]);}
  else if(stage==='petal'||stage==='bird'){add(mountains,[-.39,.02],[.39,.02]);add(valleys,[0,-.98],[0,.98]);}
  else if(stage==='narrow'){add(valleys,[-.3,.25],[0,.58]);add(valleys,[.3,.25],[0,.58]);}
  else if(stage==='reverse'){add(mountains,[-.3,.18],[-.08,.48]);add(mountains,[.3,.18],[.08,.48]);}
  else if(stage==='head'){add(mountains,[.54,-.57],[.66,-.52]);add(valleys,[.3,.18],[.08,.48]);}
  else {add(valleys,[-.25,.32],[-.08,.12]);add(valleys,[.25,.32],[.08,.12]);add(mountains,[.54,-.57],[.66,-.52]);}
  return {mountains,valleys};
}
function renderCPInset(){
  const boundary=[],mountains=[],valleys=[],f=frame(),scale=.36,offset=-.78;
  const map=p=>[(p[0]-f.cx)/f.r*scale+offset,.015,(p[1]-f.cy)/f.r*scale];
  state.refs.forEach(line=>{const out=line.type==='M'?mountains:line.type==='V'?valleys:line.type==='B'?boundary:null;if(out)out.push(...map(line.a),...map(line.b));});
  lineObject(boundary,0x435367,.65);lineObject(mountains,0xd95755,.78);lineObject(valleys,0x4c82db,.78);
}
function renderGuidedModel(action,progress){
  if(!state.group){state.group=new THREE.Group();G.threeView.scene.add(state.group);}state.group.visible=true;clearGroup();
  const stage=action.stage||action.diagram,offset=state.showCP ? .38 : 0,triangles=morphGuidedGeometry(guidedPreviousStage(stage),stage,progress),positions=[],edges=[];
  triangles.forEach(triangle=>{triangle.forEach(p=>positions.push(p[0]+offset,p[1],p[2]));for(let i=0;i<3;i++){const a=triangle[i],b=triangle[(i+1)%3];edges.push(a[0]+offset,a[1]+.004,a[2],b[0]+offset,b[1]+.004,b[2]);}});
  const geometry=new THREE.BufferGeometry();geometry.addAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();
  state.group.add(new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:0xf6f3ea,side:THREE.DoubleSide,roughness:.82,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1})));
  const creases=guidedStageCreases(stage,offset),creaseOpacity=Math.max(0,(progress-.55)/.45);
  lineObject(edges,0x435367,.72);lineObject(creases.mountains,0xd95755,.96*creaseOpacity);lineObject(creases.valleys,0x4c82db,.96*creaseOpacity);if(state.showCP)renderCPInset();
}
function setupFold(fold,paper=null){state.fold=fold;state.paper=paper;state.initial=makeSheet(paper||fold);state.refs=referenceSegments();const pts=state.initial.flatMap(f=>f.vertices.map(v=>v.uv));const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]),x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;state.frame={x,y,w,h,cx:x+w/2,cy:y+h/2,r:Math.hypot(w,h)/2};}
function hideGPU(){state.visibility={mesh:G.meshVisible,edges:G.edgesVisible,running:G.simulationRunning};G.meshVisible=false;G.edgesVisible=false;G.simulationRunning=false;G.model.updateMeshVisibility();G.model.updateEdgeVisibility();}
function restoreGPU(){if(!state.visibility)return;G.meshVisible=state.visibility.mesh;G.edgesVisible=state.visibility.edges;G.simulationRunning=state.visibility.running;G.model.updateMeshVisibility();G.model.updateEdgeVisibility();state.visibility=null;}
function setPattern(){if(state.active)exit();setupFold(sourceFold());state.actions=[];state.draft=null;state.deletedStep=null;state.points=[];state.side=0;state.seed=null;state.selectedIndex=-1;state.zoom=1;state.pan=[0,0];state.showCP=false;if($('showTutorialCP'))$('showTutorialCP').checked=false;compile();}
function activate(){try{window.SeamLab?.exit();if(!state.fold)setPattern();if(!state.initial.length)throw Error('No paper faces found.');window.playing=false;window.updatePlayButton?.();state.active=true;document.body.classList.add('action-mode');$('stepStudio').classList.add('active');$('tutorialToggle').textContent='Exit tutorial';hideGPU();define();G.friendlyView.top();}catch(e){window.showError(e.message);}}
function setBuiltIn(on){state.builtIn=on;document.body.classList.toggle('builtin-lesson',on);$('lessonTitle').readOnly=on;}
function exit(){stop();state.active=false;setBuiltIn(false);document.body.classList.remove('action-mode');$('stepStudio').classList.remove('active');$('actionCanvas').hidden=true;$('lessonPlayer').hidden=true;$('tutorialToggle').textContent='Make a tutorial';if(state.group)state.group.visible=false;restoreGPU();G.friendlyView?.enable(true);G.friendlyView?.top();}
function setComposerPane(pane){$('motionChooser').hidden=pane!=='choose';$('markControls').hidden=pane!=='mark';}
function canUnfoldLast(){const last=state.actions.at(-1);return !!last&&!['unfold','demo'].includes(last.kind);}
function define(){stop();state.templateType=null;state.authorTool=null;state.mode='axis';state.axisInput='auto';state.phase='define';state.draft=null;state.points=[];state.matchEndpoints=null;state.matchDrag=null;state.side=0;state.seed=null;state.selectedIndex=-1;state.zoom=1;state.pan=[0,0];$('actionTitle').value='';$('actionCaption').value='';$('axisInput').value='auto';$('actionLayers').value='all';$('actionDirection').value='toward';$('actionAngle').value='180';$('matchHelp').hidden=true;$('defineControls').hidden=false;$('previewControls').hidden=true;$('actionCanvas').hidden=false;$('lessonPlayer').hidden=true;setComposerPane('choose');message('');G.friendlyView.enable(false);render3D(sheet());renderEditor();renderSteps();updateHint();}
function chooseMotion(mode){state.authorTool=mode;state.mode=mode;state.templateType=null;state.points=[];state.matchEndpoints=null;state.side=0;state.seed=null;$('selectedActionName').textContent=mode==='match'?'Bring points together':'Fold along a line';$('matchHelp').hidden=mode!=='match';$('templateGuide').hidden=true;$('undoLandmark').hidden=true;$('foldSettings').hidden=false;$('templateSettings').hidden=true;$('flipSide').hidden=false;setComposerPane('mark');message('');renderEditor();updateHint();}
function updateHint(){
  if(!state.authorTool){$('canvasInstruction').textContent='Choose a move on the right to begin the next step.';$('previewAction').disabled=true;return;}
  if(state.templateType){const names=state.templateType==='petal'?['bottom tip','left shoulder','right shoulder','left guide hinge','right guide hinge']:['pivot where the point joins the body','current tip','point on the new diagonal hinge'];const n=state.points.length;const text=n<names.length?`Click ${n+1} of ${names.length}: ${names[n]}.`:'All landmarks selected. Preview the motion.';$('canvasInstruction').textContent=text;$('markProgress').textContent=`${Math.min(n+1,names.length)} / ${names.length} · ${text}`;$('previewAction').disabled=n!==names.length;$('flipSide').disabled=true;$('clearAxis').disabled=!n;$('undoLandmark').disabled=!n;$('templateGuide').querySelectorAll('[data-landmark]').forEach((item,i)=>{item.classList.toggle('active',i===n);item.classList.toggle('done',i<n);});return;}
  const n=state.points.length,ready=n===2&&state.side;let text=state.mode==='match'?'Press a paper point, drag it to another point, then release.':'Click a colored crease, or click two points to draw a guide line.';
  if(state.mode==='match'&&ready)text='Point A will land on B. Preview the motion.';
  else if(n===1)text='Click the second point of your fold line.';
  else if(n===2&&!state.side)text='Click the paper on the side that should move.';
  else if(ready)text='The highlighted paper will move. Preview the result.';
  $('canvasInstruction').textContent=text;$('markProgress').textContent=`${ready?'Ready':state.mode==='match'?'Select alignment':n===2?'2 / 2':`${n+1} / 2`} · ${text}`;$('previewAction').disabled=!ready;$('flipSide').disabled=n!==2;$('clearAxis').disabled=!n;$('axisSource').hidden=state.mode!=='axis';
}
function visibleBox(){const f=frame(),w=Math.max(f.w,f.h)*1.35/state.zoom;return [f.cx-w/2+state.pan[0],f.cy-w/2+state.pan[1],w,w];}
function worldPoint(e){const svg=$('paperEditor'),p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const q=p.matrixTransform(svg.getScreenCTM().inverse());return [q.x,q.y];}
function pointNear(p){const all=sheet().flatMap(f=>f.vertices.map(v=>v.p.slice(0,2))),f=frame();all.push([f.cx,f.cy]);let best=p,dist=visibleBox()[2]*.025;all.forEach(v=>{const d=Math.hypot(p[0]-v[0],p[1]-v[1]);if(d<dist){best=v;dist=d;}});return [...best];}
function closestCrease(p){let best=null,distance=visibleBox()[2]*.016;for(const l of state.posedRefs||[]){if(!['M','V'].includes(l.type))continue;const dx=l.b[0]-l.a[0],dy=l.b[1]-l.a[1],length=dx*dx+dy*dy;if(length<1e-12)continue;const t=Math.max(0,Math.min(1,((p[0]-l.a[0])*dx+(p[1]-l.a[1])*dy)/length));const d=Math.hypot(p[0]-l.a[0]-t*dx,p[1]-l.a[1]-t*dy);if(d<distance){best=l;distance=d;}}return best;}
function clickedSeed(p){const faces=sheet();for(let i=faces.length-1;i>=0;i--){const vs=faces[i].vertices;if(!pointInPolygon(p,vs.map(v=>v.p)))continue;const [a,b,c]=vs;const d=(b.p[0]-a.p[0])*(c.p[1]-a.p[1])-(b.p[1]-a.p[1])*(c.p[0]-a.p[0]);if(Math.abs(d)<1e-9)continue;const x=p[0]-a.p[0],y=p[1]-a.p[1],s=(x*(c.p[1]-a.p[1])-y*(c.p[0]-a.p[0]))/d,t=((b.p[0]-a.p[0])*y-(b.p[1]-a.p[1])*x)/d;return a.uv.map((v,k)=>v+s*(b.uv[k]-v)+t*(c.uv[k]-v));}return null;}
function actionFromForm(){if(state.templateType)return templateFromPoints();return {kind:'fold',axis:state.points.map(p=>[...p]),side:state.side,seed:$('actionLayers').value==='flap'?state.seed:null,angle:Number($('actionAngle').value)*state.side*($('actionDirection').value==='toward'?1:-1),title:$('actionTitle').value.trim()||`Fold ${state.actions.length+1}`,caption:$('actionCaption').value.trim(),duration:2.4};}
function renderEditor(){
  const svg=$('paperEditor');svg.replaceChildren();svg.setAttribute('viewBox',visibleBox().join(' '));const faces=sheet();
  faces.forEach(f=>svg.appendChild(svgEl('polygon',{points:f.vertices.map(v=>v.p.slice(0,2).join(',')).join(' '),fill:'#fffdf7',stroke:'none'})));
  const show=$('showReference').checked;
  state.posedRefs=posedCreases(faces,show?state.refs:[...state.refs.filter(r=>r.type==='B'),...revealedCreases()]);
  state.posedRefs.forEach(l=>{svg.appendChild(svgEl('line',{x1:l.a[0],y1:l.a[1],x2:l.b[0],y2:l.b[1],stroke:color[l.type]||'#bbc1c6','stroke-width':l.type==='B'?1.8:1,'vector-effect':'non-scaling-stroke',opacity:l.type==='B'?1:.65,'pointer-events':'none'}));});
  if(state.points.length===2&&!state.templateType){const [a,b]=state.points,dx=b[0]-a[0],dy=b[1]-a[1],extension=visibleBox()[2]*2/Math.hypot(dx,dy);
    if(state.side){try{prepareAction(faces,actionFromForm()).pieces.filter(f=>f.moving).forEach(f=>svg.appendChild(svgEl('polygon',{points:f.vertices.map(v=>v.p.slice(0,2).join(',')).join(' '),fill:'#286b64',opacity:.22,'pointer-events':'none'})));}catch{}}
    svg.appendChild(svgEl('line',{x1:a[0]-dx*extension,y1:a[1]-dy*extension,x2:b[0]+dx*extension,y2:b[1]+dy*extension,stroke:'#1e625c','stroke-width':2.5,'stroke-dasharray':'9 5','vector-effect':'non-scaling-stroke','pointer-events':'none'}));
  }
  const dotRadius=visibleBox()[2]*.009;
  if(state.mode==='match'){const unique=new Map();faces.forEach(f=>f.vertices.forEach(v=>{const p=v.p.slice(0,2),key=p.map(x=>x.toFixed(4)).join(',');unique.set(key,p);}));
    const all=[...unique.values()],f=frame(),targets=[[f.x,f.y],[f.x+f.w,f.y],[f.x+f.w,f.y+f.h],[f.x,f.y+f.h],[f.cx,f.cy]];
    const snapPoints=all.length<=80?all:targets.map(target=>all.reduce((best,p)=>Math.hypot(p[0]-target[0],p[1]-target[1])<Math.hypot(best[0]-target[0],best[1]-target[1])?p:best,all[0]));
    snapPoints.forEach(p=>svg.appendChild(svgEl('circle',{cx:p[0],cy:p[1],r:dotRadius*.85,fill:'#e7f2ec',stroke:'#4c8b75','stroke-width':1.5,'vector-effect':'non-scaling-stroke','pointer-events':'none'})));
  }
  state.points.forEach(p=>svg.appendChild(svgEl('circle',{cx:p[0],cy:p[1],r:dotRadius,fill:'#1e625c',stroke:'white','stroke-width':2,'vector-effect':'non-scaling-stroke','pointer-events':'none'})));
  if(state.templateType)state.points.forEach((p,i)=>{const label=svgEl('text',{x:p[0]+dotRadius*1.6,y:p[1]-dotRadius*1.6,fill:'#1e625c','font-size':dotRadius*2.8,'font-weight':'bold','pointer-events':'none'});label.textContent=i+1;svg.appendChild(label);});
  if(state.matchDrag)svg.appendChild(svgEl('line',{x1:state.matchDrag.start[0],y1:state.matchDrag.start[1],x2:state.matchDrag.end[0],y2:state.matchDrag.end[1],stroke:'#1e625c','stroke-width':2,'vector-effect':'non-scaling-stroke','pointer-events':'none'}));
  if(state.mode==='match'&&state.matchEndpoints)state.matchEndpoints.forEach((p,i)=>{svg.appendChild(svgEl('circle',{cx:p[0],cy:p[1],r:dotRadius*1.35,fill:i?'#b3534f':'#286b64',stroke:'white','stroke-width':2,'vector-effect':'non-scaling-stroke','pointer-events':'none'}));const label=svgEl('text',{x:p[0]+dotRadius*1.6,y:p[1]-dotRadius*1.6,fill:i?'#a33f3c':'#225c53','font-size':dotRadius*2.8,'font-weight':'bold','pointer-events':'none'});label.textContent=i?'B':'A';svg.appendChild(label);});
  $('editorZoom').textContent=Math.round(state.zoom*100)+'%';
}
function preview(){try{stop();const a=actionFromForm();if(!state.templateType&&$('actionLayers').value==='flap'&&!a.seed)throw Error('Click inside the flap to choose it, then preview again.');state.preparedDraft=compileActions(sheet(),[a]).prepared[0];checkMotion(state.preparedDraft,poseAction,{tolerance:frame().r*1e-5});state.draft=a;state.phase='preview';state.selectedIndex=-1;state.progress=0;showPreview();play();}catch(e){message(e.message);}}
function demoDiagram(kind){
  const diagrams={
    collapse:`<svg viewBox="0 0 240 120"><rect x="14" y="14" width="92" height="92"/><path d="M14 14L106 106M106 14L14 106M60 14V106M14 60H106"/><path class="arrow" d="M122 60H152"/><path d="M176 18L222 60L176 102L130 60Z"/></svg>`,
    kite:`<svg viewBox="0 0 240 120"><path d="M60 10L108 60L60 110L12 60Z"/><path d="M60 10V110M12 60L60 82L108 60"/><path class="arrow" d="M122 60H152"/><path d="M182 10L218 60L182 110L146 60Z"/><path d="M182 10V110M146 60L182 78L218 60"/></svg>`,
    petal:`<svg viewBox="0 0 240 120"><path d="M58 108L104 60L58 12L12 60Z"/><path d="M58 12V108M12 60H104"/><path class="arrow" d="M122 82Q142 30 158 20"/><path d="M184 8L220 92L184 112L148 92Z"/><path d="M184 8V112"/></svg>`,
    reverse:`<svg viewBox="0 0 240 120"><path d="M12 94L68 18L112 94M68 18V106"/><path class="arrow" d="M126 84Q150 42 170 62"/><path d="M150 102L198 24L228 102M198 24L174 48"/></svg>`,
    finish:`<svg viewBox="0 0 240 120"><path d="M18 72L84 20L120 62L156 20L222 72L156 62L142 104L120 70L98 104L84 62Z"/><path class="arrow" d="M95 88Q120 108 145 88"/></svg>`
  };return diagrams[kind]||diagrams.kite;
}
function renderDemoCard(action){const card=$('demoFoldCard');if(!card)return;const demo=action?.kind==='demo';card.hidden=!demo;if(!demo)return;$('demoType').textContent=action.foldType||'Guided compound fold';$('demoDiagram').innerHTML=demoDiagram(action.diagram);}
function showPreview(){
  $('actionCanvas').hidden=true;$('defineControls').hidden=true;$('previewControls').hidden=false;$('lessonPlayer').hidden=false;
  $('saveAction').hidden=!state.draft;$('authorReview').hidden=!state.draft;$('copyLesson').hidden=!state.builtIn;
  $('savedStepActions').hidden=!!state.draft||state.builtIn;$('quickUnfoldPreview').hidden=!!state.draft||state.builtIn||state.selectedIndex!==state.actions.length-1||!canUnfoldLast();$('savedTextForm').hidden=true;
  $('stepNavigation').hidden=!!state.draft;$('previousStep').disabled=state.selectedIndex<=0;$('nextStep').disabled=state.selectedIndex>=state.actions.length-1;
  $('editAction').textContent=state.draft?'Adjust motion':state.selectedIndex===state.actions.length-1?'Add another step':'Continue after final step';
  const action=state.draft||state.actions[state.selectedIndex],kind=actionLabel(action);
  $('lessonPosition').textContent=state.selectedIndex>=0?`Step ${state.selectedIndex+1} of ${state.actions.length}`:`Preview · step ${state.actions.length+1}`;
  $('lessonKind').textContent=kind;$('previewTitle').textContent=action?.title||'';$('previewCaption').textContent=action?.caption||'';$('previewCaption').hidden=!!state.draft;
  if(state.draft){$('reviewTitle').value=action.title||'';$('reviewCaption').value=action.caption||'';}
  $('showTutorialCP').checked=state.showCP;renderDemoCard(action);$('lessonPlayer').classList.remove('static-step');$('staticStepLabel').hidden=action?.kind!=='demo';G.friendlyView.enable(true);updatePose();
}
function draftFaces(t){return state.draft?.kind==='unfold'?poseAction(state.preparedDraft.ref,1-t):poseAction(state.preparedDraft,t);}
function updatePose(){state.progress=Math.max(0,Math.min(1,Number.isFinite(state.progress)?state.progress:0));const action=state.draft||state.actions[state.selectedIndex];if(action?.kind==='demo')renderGuidedModel(action,state.progress);else render3D(state.draft?draftFaces(state.progress):poseSequence(state.sequence,state.selectedIndex,state.progress));$('stepScrub').value=state.progress*100;$('stepPercent').textContent=Math.round(state.progress*100)+'%';$('replayAction').textContent=state.playing?'Pause':state.progress>=1?'Replay':'Play';}
function stop(){state.playing=false;cancelAnimationFrame(state.raf);$('replayAction')&&($('replayAction').textContent='Play');}
function play(){if(state.playing){stop();return;}if(state.progress>=1)state.progress=0;state.playing=true;const duration=((state.draft||state.actions[state.selectedIndex])?.duration||3.2)*1000;const start=performance.now()-state.progress*duration;const tick=now=>{if(!state.playing)return;state.progress=Math.max(0,Math.min(1,(now-start)/duration));updatePose();if(state.progress<1)state.raf=requestAnimationFrame(tick);else {state.playing=false;updatePose();}};state.raf=requestAnimationFrame(tick);}
function saveAction(){
  if(!state.draft)return;
  stop();state.draft.title=$('reviewTitle').value.trim()||`Step ${state.actions.length+1}`;
  state.draft.caption=$('reviewCaption').value.trim();
  state.actions.push(state.draft);
  try{compile();state.draft=null;define();}catch(e){state.actions.pop();compile();message(e.message);}
}
function fitTutorialView(){const faces=state.draft?draftFaces(state.progress):poseSequence(state.sequence,state.selectedIndex,state.progress);const pts=faces.flatMap(f=>f.vertices.map(v=>toScene(v.p)));const lo=[0,1,2].map(i=>Math.min(...pts.map(p=>p[i]))),hi=[0,1,2].map(i=>Math.max(...pts.map(p=>p[i])));G.friendlyView.frame({target:lo.map((v,i)=>(v+hi[i])/2),zoom:Math.min(2.6,2/Math.max(...hi.map((v,i)=>v-lo[i]))),yaw:.65,pitch:.38});}
function selectStep(i){stop();state.draft=null;state.selectedIndex=Math.max(0,Math.min(state.actions.length-1,i));state.progress=0;state.phase='preview';showPreview();renderSteps();if(state.actions[state.selectedIndex]?.title==='Your paper crane'){state.progress=1;fitTutorialView();state.progress=0;}play();}
function actionLabel(a){return a?.kind==='demo'?'Guided illustration':a?.kind==='unfold'?'Unfold':a?.kind==='squareBase'?'Base collapse':a?.template==='petal'?'Petal fold':a?.template==='reverse'?'Inside reverse fold':a?.template==='turn'?'Turn paper':'Fold';}
function stepNotice(text,canUndo=false){$('stepNoticeText').textContent=text;$('undoStepDelete').hidden=!canUndo;$('stepNotice').hidden=!text;}
function undoStepDelete(){const saved=state.deletedStep;if(!saved||state.actions!==saved.after||state.actions.length!==saved.afterLength){stepNotice('The lesson has changed since that deletion. Open a saved tutorial to restore an older version.');return;}stop();state.actions=saved.before;state.sequence=saved.sequence;state.deletedStep=null;stepNotice('Step restored.');if(saved.phase==='define')define();else selectStep(saved.index);}
function closeStepMenu(){const menu=$('stepContextMenu');if(menu)menu.hidden=true;}
function editStepText(index){if(state.builtIn){stepNotice('Make an editable copy of this lesson first.');return;}if(state.draft){stepNotice('Add or adjust the new step before editing an earlier one.');return;}selectStep(index);stop();$('savedTitle').value=state.actions[index].title||'';$('savedCaption').value=state.actions[index].caption||'';$('savedTextForm').hidden=false;$('savedTitle').focus();}
function deleteStep(index){
  closeStepMenu();if(state.builtIn){stepNotice('Make an editable copy of this lesson first.');return;}
  if(state.draft){stepNotice('Add or adjust the new step before deleting an earlier one.');return;}
  const dependent=state.actions.findIndex((action,i)=>i>index&&action.kind==='unfold'&&action.foldIndex===index);
  if(dependent!==-1){stepNotice(`Step ${dependent+1} unfolds step ${index+1}. Delete that unfold step first.`);return;}
  const actions=state.actions.filter((_,i)=>i!==index).map(action=>action.kind==='unfold'&&action.foldIndex>index?{...action,foldIndex:action.foldIndex-1}:action);
  let sequence;try{sequence=compileActions(state.initial,actions);}catch(error){stepNotice(`Step ${index+1} is needed by a later motion: ${error.message}`);return;}
  stop();state.deletedStep={before:state.actions,sequence:state.sequence,after:actions,afterLength:actions.length,index:Math.min(index,state.actions.length-1),phase:state.phase};state.actions=actions;state.sequence=sequence;stepNotice(`Step ${index+1} deleted. Review the later steps before sharing.`,true);
  if(actions.length)selectStep(Math.min(index,actions.length-1));else define();
}
function openStepMenu(event,index){
  event.preventDefault();event.stopPropagation();closeStepMenu();const menu=$('stepContextMenu');menu.replaceChildren();
  const add=(label,fn)=>{const button=document.createElement('button');button.type='button';button.textContent=label;button.onclick=()=>{closeStepMenu();fn();};menu.appendChild(button);return button;};
  const first=add('Replay step',()=>selectStep(index));
  if(state.builtIn)add('Make an editable copy',()=>{selectStep(index);$('copyLesson').click();});
  else{add('Edit title & instructions',()=>editStepText(index));add('Delete step',()=>deleteStep(index)).className='danger';}
  menu.hidden=false;const left=Math.max(8,Math.min(event.clientX,innerWidth-menu.offsetWidth-8)),top=Math.max(8,Math.min(event.clientY,innerHeight-menu.offsetHeight-8));menu.style.left=`${left}px`;menu.style.top=`${top}px`;first.focus();
}
function renderSteps(){
  closeStepMenu();const list=$('actionList');list.replaceChildren();
  state.actions.forEach((a,i)=>{
    const wrapper=document.createElement('div'),b=document.createElement('button'),number=document.createElement('span'),description=document.createElement('span'),kind=document.createElement('small');
    wrapper.className='lesson-step-wrap';
    b.className='lesson-step'+(a.kind==='demo'?' guided':'')+(i===state.selectedIndex?' current':'');
    b.type='button';b.setAttribute('aria-label',`Play step ${i+1}: ${a.title||`Step ${i+1}`}`);
    number.textContent=i+1;kind.textContent=actionLabel(a);description.append(kind,document.createTextNode(a.title||`Step ${i+1}`));b.append(number,description);
    b.onclick=()=>selectStep(i);wrapper.oncontextmenu=event=>openStepMenu(event,i);wrapper.appendChild(b);
    if(!state.builtIn){const remove=document.createElement('button');remove.type='button';remove.className='lesson-step-delete';remove.textContent='×';remove.title=`Delete step ${i+1}`;remove.setAttribute('aria-label',`Delete step ${i+1}: ${a.title||`Step ${i+1}`}`);remove.onclick=event=>{event.stopPropagation();deleteStep(i);};wrapper.appendChild(remove);}
    list.appendChild(wrapper);
  });
  $('undoAction').disabled=!state.actions.length||state.builtIn;$('unfoldAction').disabled=!canUnfoldLast();$('quickUnfold').hidden=!canUnfoldLast();$('lastStepContext').hidden=!state.actions.length;$('saveLesson').disabled=!state.actions.length;
  if(state.actions.length)$('lastStepContext').textContent=`Step ${state.actions.length} saved: ${state.actions.at(-1).title||`Step ${state.actions.length}`}.`;
  $('actionCount').textContent=`Step ${state.actions.length+1}`;$('timelineCount').textContent=state.actions.length?`${state.actions.length} ${state.actions.length===1?'step':'steps'}`:'No steps yet';$('newAction').hidden=!state.actions.length||state.phase==='define'||!!state.draft||state.builtIn||state.selectedIndex!==state.actions.length-1;
  $('lessonTimeline').classList.toggle('empty',!state.actions.length);
  list.querySelector('.current')?.scrollIntoView({block:'nearest',inline:'nearest'});
}
function unfold(){try{
  const ref=state.sequence.prepared.at(-1);
  if(!canUnfoldLast()||!ref)throw Error('Fold the paper first, then you can unfold it.');
  stop();state.authorTool='unfold';state.draft={kind:'unfold',foldIndex:state.actions.length-1,title:'Open the paper',caption:'Open the previous fold, keeping the creases it made.',duration:2.4};
  state.preparedDraft={kind:'unfold',ref};state.selectedIndex=-1;state.progress=0;state.phase='preview';showPreview();play();
}catch(e){message(e.message);}}
function quickAddUnfold(){
  if(!canUnfoldLast()){window.showError('Fold the paper first, then you can unfold it.');return;}
  stop();const action={kind:'unfold',foldIndex:state.actions.length-1,title:'Open the paper',caption:'Open the previous fold, keeping the creases it made.',duration:2.4};
  state.actions.push(action);
  try{compile();state.draft=null;state.authorTool=null;selectStep(state.actions.length-1);}catch(e){state.actions.pop();compile();window.showError(e.message);}
}
function tutorialData(){return {format:'fold-lab-tutorial',version:2,title:$('lessonTitle').value,fold:state.fold,paper:state.paper,actions:state.actions};}
function save(){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(tutorialData(),null,2)],{type:'application/json'}));a.download='folding-lesson.origami-tutorial.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
function load(data){if(data.format!=='fold-lab-tutorial'||data.version!==2)throw Error('This editor opens version 2 action tutorials. Older crease-only files need the archived editor.');const initial=makeSheet(data.paper||data.fold),sequence=compileActions(initial,data.actions);if(state.active)exit();setupFold(data.fold,data.paper);state.actions=data.actions;state.sequence=sequence;activate();$('lessonTitle').value=data.title||'Folding lesson';if(state.actions.length)selectStep(0);}
async function craneLesson(){try{if(state.active)exit();const ok=await window.importModelSource({name:'Traditional Crane.svg',url:'cp_examples/mit/models/traditionalCrane.svg',id:'traditionalCrane'});if(!ok)return;setPattern();
    // The tutorial uses one exact square. The imported illustration contains
    // rounded / tolerance-merged vertices, which must not distort the paper.
    const original=state.fold,vs=original.vertices_coords.map(point),xs=vs.map(p=>p[0]),ys=vs.map(p=>p[1]);
    const x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;
    const reference={...original,vertices_coords:vs.map(p=>[(p[0]-x)/w*400,(p[1]-y)/h*400])};
    const paper={vertices_coords:[[0,0],[400,0],[400,400],[0,400]],faces_vertices:[[0,1,2,3]]};
    setupFold(reference,paper);compile();activate();const f=frame();
    state.actions=craneActions(f);compile();setBuiltIn(true);$('lessonTitle').value='Traditional Paper Crane';G.friendlyView.perspective();renderSteps();selectStep(0);
  }catch(e){message(e.message);}}
function templateFromPoints(){
  const back=$('pocketSide').value==='back',front=back?[4,5,6,3]:[0,1,2,7],other=back?[0,1,2,7]:[4,5,6,3];
  const a={kind:'template',template:state.templateType,title:$('actionTitle').value.trim()||(state.templateType==='petal'?'Petal fold':'Inside reverse fold'),caption:$('actionCaption').value.trim(),duration:6};
  if(state.templateType==='petal'){const [tip,left,right,hingeLeft,hingeRight]=state.points;return {...a,tip,left,right,hingeLeft,hingeRight,frontSectors:back?[4,5]:[0,1],leftSectors:back?[6]:[2],rightSectors:back?[3]:[7]};}
  const [pivot,spine,hinge]=state.points;return {...a,pivot,spine,hinge,frontSectors:front,backSectors:other};
}
function templateGuide(id){
  if(id==='petal')return `<strong>Petal fold · open one pocket</strong><p>First collapse a square base and flatten the kite precreases. Keep that base flat. Pick the pocket facing you.</p><svg class="template-diagram" viewBox="0 0 150 150" role="img" aria-label="Petal landmarks: 1 bottom tip, 2 left shoulder, 3 right shoulder, 4 left guide hinge, 5 right guide hinge"><path d="M75 8L130 72L75 142L20 72Z M20 72L130 72 M75 8L75 142 M38 52L75 142L112 52"/><g><circle cx="75" cy="142" r="10"/><text x="75" y="146">1</text><circle cx="20" cy="72" r="10"/><text x="20" y="76">2</text><circle cx="130" cy="72" r="10"/><text x="130" y="76">3</text><circle cx="38" cy="52" r="10"/><text x="38" y="56">4</text><circle cx="112" cy="52" r="10"/><text x="112" y="56">5</text></g></svg><ol><li data-landmark>Bottom open tip</li><li data-landmark>Left shoulder</li><li data-landmark>Right shoulder</li><li data-landmark>Left precrease hinge</li><li data-landmark>Right precrease hinge</li></ol><small>Lift only the front pocket; the side folds tuck in as the tip rises.</small>`;
  return `<strong>Inside reverse fold · turn a narrow point</strong><p>First prepare a flat two-layer point, such as the crane’s neck or tail. The point must have two walls to open.</p><svg class="template-diagram" viewBox="0 0 150 150" role="img" aria-label="Reverse fold landmarks: 1 pivot, 2 current tip, 3 point on the new diagonal hinge"><path d="M30 28L75 82L120 28 M75 82L75 142 M75 82L105 112"/><path class="fold-guide" d="M75 82L105 112"/><g><circle cx="75" cy="82" r="10"/><text x="75" y="86">1</text><circle cx="75" cy="142" r="10"/><text x="75" y="146">2</text><circle cx="105" cy="112" r="10"/><text x="105" y="116">3</text></g></svg><ol><li data-landmark>Pivot at the base of the point</li><li data-landmark>Current tip, along its center spine</li><li data-landmark>Point on the new diagonal hinge</li></ol><small>Open the two walls, push the point between them, then close the packet.</small>`;
}
function setupTemplate(){try{
  stop();const id=$('compoundTemplate').value;
  if(id==='petal'||id==='reverse'){
    if(!sheet().every(f=>Number.isInteger(f.sector)))throw Error('First add Square-base collapse. These pocket templates currently support that base family.');
    if(sheet().some(f=>f.vertices.some(v=>Math.abs(v.p[2])>frame().r*1e-5)))throw Error('Return to a flat step before selecting a pocket.');
    state.authorTool=id;state.mode='axis';state.templateType=id;state.points=[];state.side=0;
    $('pocketSide').value=state.actions.filter(a=>a.template==='turn'&&Math.abs(a.angle)===180).length%2?'back':'front';
    $('selectedActionName').textContent=id==='petal'?'Petal fold':'Inside reverse fold';$('templateGuide').innerHTML=templateGuide(id);$('templateGuide').hidden=false;$('undoLandmark').hidden=false;$('foldSettings').hidden=true;$('templateSettings').hidden=false;$('axisSource').hidden=true;$('flipSide').hidden=true;$('cancelTemplate').hidden=false;
    setComposerPane('mark');message('');renderEditor();updateHint();return;
  }
  const f=frame(),a=id==='squareBase'?{kind:'squareBase',title:'Collapse into a square base',duration:5}:{kind:'template',template:'turn',axis:[[f.cx,f.cy-1,0],[f.cx,f.cy+1,0]],angle:180,title:'Turn the paper over',duration:3};
  state.authorTool=id;state.preparedDraft=compileActions(sheet(),[a]).prepared[0];checkMotion(state.preparedDraft,poseAction,{tolerance:f.r*1e-5});state.draft=a;state.selectedIndex=-1;state.progress=0;state.phase='preview';showPreview();play();
}catch(e){message(e.message);}}
function mount(){
  $('stepStudio').innerHTML=`
    <div class="lesson-heading"><span>TUTORIAL STUDIO</span><div class="lesson-heading-actions"><button id="saveLesson" disabled>Save tutorial</button><button id="closeLesson">Close</button></div></div>
    <input id="lessonTitle" aria-label="Tutorial title" value="My folding lesson">
    <details id="lessonMenu"><summary>Open a lesson or remove a step</summary><div class="lesson-files"><button id="openLesson">Open tutorial</button><button id="undoAction">Remove last step</button><input id="openLessonFile" type="file" accept=".json" hidden></div></details>
    <div id="defineControls">
      <div id="motionChooser">
        <span class="flow-eyebrow">CHOOSE A MOVE</span><h2 id="actionCount">Step 1</h2>
        <p id="lastStepContext" class="last-step-context" hidden></p><p class="composer-lead">What should happen to the paper next?</p>
        <button id="quickUnfold" class="quick-unfold" hidden><strong>Unfold and add step</strong><span>Open this fold and play the new step</span></button>
        <div class="action-mode-buttons"><button id="actionModeAxis" aria-pressed="false"><strong>Fold along a line</strong><span>Pick a crease, then the paper to move</span></button><button id="actionModeMatch" aria-pressed="false"><strong>Bring points together</strong><span>Drag one paper point to another</span></button></div>
        <details id="moreMoves" class="template-picker"><summary>More moves</summary><p>Use these after the matching paper shape has been prepared.</p><div class="more-move-list"><button data-template="squareBase">Collapse square base</button><button data-template="petal">Petal fold</button><button data-template="reverse">Inside reverse fold</button><button data-template="turn">Turn paper over</button><button id="unfoldAction">Unfold last step</button></div></details>
      </div>
      <div id="markControls" hidden>
        <div class="composer-selected"><span id="selectedActionName">Fold along a line</span><button id="changeAction">Change move</button></div>
        <p id="markProgress" class="mark-progress"></p>
        <div id="templateGuide" class="template-guide" hidden></div>
        <div id="matchHelp" class="match-help" hidden><strong>Move point A onto point B</strong><span>1. Press and hold a corner or marked point.</span><span>2. Drag to its destination and release.</span><small>Example: bottom-left corner → top-left corner folds the paper in half.</small></div>
        <section id="actionAdvanced" aria-label="More control"><h3>More control</h3>
          <div id="axisSource" class="action-options"><label>Line<select id="axisInput"><option value="auto">Crease or draw on paper</option><option value="crease">Only existing creases</option><option value="guide">Draw a new guide</option></select></label></div>
          <div id="foldSettings" class="action-options"><label>Paper layers<select id="actionLayers"><option value="all">All layers on this side</option><option value="flap">One connected flap</option></select></label><label>Direction<select id="actionDirection"><option value="toward">Towards you</option><option value="away">Away from you</option></select></label><label>Angle<select id="actionAngle"><option value="180">180° · Fold flat</option><option value="90">90° · Stand up</option><option value="45">45° · Partial fold</option></select></label></div>
          <div id="templateSettings" class="action-options" hidden><label>Pocket side<select id="pocketSide"><option value="front">Original front</option><option value="back">After turning over</option></select></label></div>
          <button id="flipSide" disabled>Move the other side</button>
        </section>
        <button id="undoLandmark" class="quiet-button" hidden disabled>Undo last point</button><button id="clearAxis" class="quiet-button" disabled>Clear selection</button><button id="cancelTemplate" hidden>Cancel compound action</button>
        <button id="previewAction" class="primary" disabled>Preview motion</button>
      </div>
      <p id="actionMessage" role="status"></p>
      <select id="compoundTemplate" hidden aria-label="Compound action"><option value="squareBase">Square-base collapse</option><option value="petal">Petal fold</option><option value="reverse">Inside reverse fold</option><option value="turn">Turn paper over</option></select><button id="setupTemplate" hidden>Set up action</button>
      <input id="actionTitle" type="hidden"><textarea id="actionCaption" hidden></textarea>
    </div>
    <div id="previewControls" hidden>
      <div class="lesson-preview-head"><div class="lesson-progress"><span id="lessonPosition">New step</span><span id="lessonKind">Animated fold</span></div><label class="cp-visibility"><input id="showTutorialCP" type="checkbox"> Show full CP</label></div>
      <h2 id="previewTitle"></h2><div id="demoFoldCard" hidden><div id="demoType"></div><div id="demoDiagram"></div><p>Guided illustration · follow the written alignment cues</p></div>
      <div id="stepNavigation" class="minor-actions"><button id="previousStep">Previous step</button><button id="nextStep">Next step</button></div>
      <p id="previewCaption"></p>
      <div id="authorReview" hidden><label>Step title<input id="reviewTitle" placeholder="Name this action"></label><label>What should the learner do?<textarea id="reviewCaption" placeholder="For example: bring the lower corner up and flatten the pocket."></textarea></label></div>
      <div id="savedStepActions" class="saved-step-actions" hidden><button id="quickUnfoldPreview">Unfold and add step</button><button id="editSavedText">Edit title & instructions</button></div>
      <div id="savedTextForm" class="saved-text-form" hidden><label>Step title<input id="savedTitle"></label><label>What should the learner do?<textarea id="savedCaption"></textarea></label><div><button id="applySavedText" class="primary">Save wording</button><button id="cancelSavedText">Cancel</button></div></div>
      <button id="saveAction" class="primary">Add step</button><button id="editAction">Adjust motion</button><button id="copyLesson">Make an editable copy through this step</button>
      <details class="model-limit"><summary>About this animation</summary><p>The paper keeps the same material throughout. Full CP is an optional reference. Thickness and body inflation are not simulated.</p></details>
    </div>
    <div id="lessonTimeline" class="lesson-sequence"><div class="timeline-heading"><span>STEPS</span><span id="timelineCount"></span></div><div id="actionList"></div><button id="newAction">Add next step</button><div id="stepNotice" role="status" hidden><span id="stepNoticeText"></span><button id="undoStepDelete" type="button" hidden>Undo deletion</button></div></div><div id="stepContextMenu" role="menu" aria-label="Step actions" hidden></div>`;
  $('tutorialCanvasGuide').remove();
  const canvas=document.createElement('section');canvas.id='actionCanvas';canvas.hidden=true;canvas.innerHTML=`<div class="editor-heading"><span id="canvasInstruction"></span><label><input type="checkbox" id="showReference" checked> Show full CP</label></div><svg id="paperEditor" aria-label="Full size paper editor" tabindex="0"></svg><div class="editor-bottom"><span>Scroll to zoom · Right-drag to pan</span><div><button id="zoomOut">Zoom out</button><span id="editorZoom">100%</span><button id="zoomIn">Zoom in</button><button id="zoomFit">Fit paper</button></div></div>`;document.body.appendChild(canvas);
  const player=document.createElement('div');player.id='lessonPlayer';player.hidden=true;player.innerHTML=`<button id="replayAction">Play</button><input id="stepScrub" aria-label="Step progress" type="range" min="0" max="100" value="0"><span id="stepPercent">0%</span><span id="staticStepLabel" hidden>Guided transition</span><button id="viewPaper">Top view</button><button id="viewAngle">Fit 3D view</button>`;document.body.appendChild(player);
  $('tutorialToggle').textContent='Make a tutorial';$('tutorialToggle').onclick=()=>{if(state.active){exit();return;}setBuiltIn(false);activate();};$('closeLesson').onclick=exit;
  $('undoStepDelete').onclick=undoStepDelete;
  $('setupTemplate').onclick=setupTemplate;
  const changeMotion=()=>{state.authorTool=null;state.templateType=null;state.mode='axis';state.points=[];state.matchEndpoints=null;state.matchDrag=null;state.side=0;state.seed=null;$('cancelTemplate').hidden=true;$('matchHelp').hidden=true;$('templateGuide').hidden=true;$('undoLandmark').hidden=true;$('moreMoves').open=false;setComposerPane('choose');message('');renderEditor();updateHint();};
  $('changeAction').onclick=changeMotion;$('cancelTemplate').onclick=changeMotion;
  $('copyLesson').onclick=()=>{const end=state.selectedIndex+1;stop();state.actions=JSON.parse(JSON.stringify(state.actions.slice(0,end)));setBuiltIn(false);$('lessonTitle').value='My crane lesson';compile();define();$('showReference').checked=false;renderEditor();};
  $('actionModeAxis').onclick=()=>chooseMotion('axis');$('actionModeMatch').onclick=()=>chooseMotion('match');
  $('moreMoves').querySelectorAll('[data-template]').forEach(button=>button.onclick=()=>{$('compoundTemplate').value=button.dataset.template;setupTemplate();});
  $('clearAxis').onclick=()=>{state.points=[];state.matchEndpoints=null;state.side=0;state.seed=null;renderEditor();updateHint();};$('undoLandmark').onclick=()=>{state.points.pop();renderEditor();updateHint();};$('flipSide').onclick=()=>{state.side=-(state.side||1);state.seed=null;renderEditor();updateHint();};
  document.addEventListener('pointerdown',event=>{if(!event.target.closest('#stepContextMenu'))closeStepMenu();});window.addEventListener('keydown',event=>{if(event.key==='Escape')closeStepMenu();});window.addEventListener('scroll',closeStepMenu,true);
  $('previewAction').onclick=preview;$('saveAction').onclick=saveAction;$('newAction').onclick=define;$('unfoldAction').onclick=unfold;$('quickUnfold').onclick=quickAddUnfold;$('quickUnfoldPreview').onclick=quickAddUnfold;
  $('editSavedText').onclick=()=>{const action=state.actions[state.selectedIndex];if(!action||state.builtIn)return;$('savedTitle').value=action.title||'';$('savedCaption').value=action.caption||'';$('savedTextForm').hidden=false;$('savedTitle').focus();};
  $('cancelSavedText').onclick=()=>$('savedTextForm').hidden=true;
  $('applySavedText').onclick=()=>{const action=state.actions[state.selectedIndex];if(!action||state.builtIn)return;action.title=$('savedTitle').value.trim()||`Step ${state.selectedIndex+1}`;action.caption=$('savedCaption').value.trim();$('previewTitle').textContent=action.title;$('previewCaption').textContent=action.caption;$('savedTextForm').hidden=true;renderSteps();};
  $('editAction').onclick=()=>{if(!state.draft||['squareBase','turn','unfold'].includes(state.authorTool)){define();return;}stop();state.phase='define';$('actionTitle').value=$('reviewTitle').value;$('actionCaption').value=$('reviewCaption').value;state.draft=null;G.friendlyView.enable(false);$('actionCanvas').hidden=false;$('defineControls').hidden=false;$('previewControls').hidden=true;$('lessonPlayer').hidden=true;setComposerPane('mark');renderEditor();updateHint();};
  $('previousStep').onclick=()=>selectStep(state.selectedIndex-1);$('nextStep').onclick=()=>selectStep(state.selectedIndex+1);$('replayAction').onclick=play;$('stepScrub').oninput=e=>{stop();state.progress=Number(e.target.value)/100;updatePose();};$('viewPaper').onclick=()=>G.friendlyView.top();$('viewAngle').onclick=fitTutorialView;
  $('showTutorialCP').onchange=e=>{state.showCP=e.target.checked;updatePose();};
  $('undoAction').onclick=()=>{if(!state.builtIn&&state.actions.length)deleteStep(state.actions.length-1);};$('saveLesson').onclick=save;$('openLesson').onclick=()=>$('openLessonFile').click();$('openLessonFile').onchange=async e=>{if(!e.target.files.length)return;try{load(JSON.parse(await e.target.files[0].text()));}catch(error){window.showError(error.message);}e.target.value='';};
  $('axisInput').onchange=e=>{state.axisInput=e.target.value;state.points=[];state.matchEndpoints=null;state.side=0;renderEditor();updateHint();};$('showReference').onchange=renderEditor;$('actionLayers').onchange=()=>{renderEditor();updateHint();};
  $('zoomIn').onclick=()=>{state.zoom=Math.min(8,state.zoom*1.3);renderEditor();};$('zoomOut').onclick=()=>{state.zoom=Math.max(.5,state.zoom/1.3);renderEditor();};$('zoomFit').onclick=()=>{state.zoom=1;state.pan=[0,0];renderEditor();};
  const svg=$('paperEditor');let drag=null;svg.addEventListener('keydown',e=>{if(e.key==='Escape'){state.matchDrag=null;drag=null;if(state.templateType)changeMotion();else{state.points=[];state.matchEndpoints=null;state.side=0;renderEditor();updateHint();}}});
  svg.addEventListener('contextmenu',e=>e.preventDefault());
  svg.addEventListener('wheel',e=>{e.preventDefault();const before=worldPoint(e);state.zoom=Math.max(.5,Math.min(8,state.zoom*Math.exp(-e.deltaY*.001)));svg.setAttribute('viewBox',visibleBox().join(' '));const after=worldPoint(e);state.pan=state.pan.map((v,i)=>v+before[i]-after[i]);renderEditor();},{passive:false});
  svg.addEventListener('pointerdown',e=>{if(!state.authorTool&&e.button!==2)return;if(e.buttons)svg.setPointerCapture(e.pointerId);const p=pointNear(worldPoint(e));drag={start:p,pixel:[e.clientX,e.clientY],pan:[...state.pan],button:e.button};if(e.button===0&&state.mode==='match')state.matchDrag={start:p,end:p};});
  svg.addEventListener('pointermove',e=>{if(!drag)return;if(drag.button===2){const scale=visibleBox()[2]/Math.min(svg.clientWidth,svg.clientHeight);state.pan=[drag.pan[0]-(e.clientX-drag.pixel[0])*scale,drag.pan[1]-(e.clientY-drag.pixel[1])*scale];renderEditor();}else if(state.mode==='match'){state.matchDrag.end=pointNear(worldPoint(e));renderEditor();}});
  svg.addEventListener('pointerup',e=>{if(!drag)return;const start=drag.start,button=drag.button;drag=null;if(button!==0||!state.authorTool)return;const p=pointNear(worldPoint(e));message('');if(state.templateType){const limit=state.templateType==='petal'?5:3;if(state.points.length>=limit)state.points=[];state.points.push(p);renderEditor();updateHint();return;}if(state.mode==='match'){try{const result=axisForMatch(start,p);state.points=result.axis;state.matchEndpoints=[start,p];state.side=result.side;state.seed=clickedSeed(start);state.matchDrag=null;renderEditor();updateHint();}catch(error){state.matchDrag=null;message('Drag a paper point onto a different destination point, then release.');}return;}
    if(state.points.length===2){const raw=worldPoint(e);state.side=Math.sign(sideOf(raw,state.points));state.seed=clickedSeed(raw);if(!state.seed){state.side=0;message('Click on the paper to choose the moving side.');return;}}
    else if(!state.points.length){const line=state.axisInput==='guide'||e.shiftKey?null:closestCrease(worldPoint(e));if(state.axisInput==='crease'&&!e.shiftKey&&!line){message('No crease there. Choose another crease or change Line under More control.');return;}state.points=line?[line.a.slice(0,2),line.b.slice(0,2)]:[p];}
    else if(Math.hypot(p[0]-state.points[0][0],p[1]-state.points[0][1])>frame().r*1e-4)state.points.push(p);
    renderEditor();updateHint();
  });svg.addEventListener('pointercancel',()=>{drag=null;state.matchDrag=null;});
  const demo=document.createElement('button');demo.id='craneLesson';demo.className='study-button';demo.innerHTML='<strong>Traditional Paper Crane</strong><span>Complete 33-step folding lesson</span>';demo.onclick=craneLesson;$('panel').insertBefore(demo,$('cpBox'));
  const viewTools=document.createElement('div');viewTools.id='viewTools';viewTools.innerHTML='<button id="homeCamera">Top view</button><button id="angleCamera">3D view</button>';document.body.appendChild(viewTools);$('homeCamera').onclick=()=>G.friendlyView.top();$('angleCamera').onclick=()=>G.friendlyView.perspective();
  const hints=[...$('panel').children].filter(el=>el.classList.contains('hint'));const detail=document.createElement('details');detail.className='workspace-details';detail.innerHTML='<summary>Import settings & credits</summary>';hints.forEach(el=>detail.appendChild(el));$('panel').appendChild(detail);
  window.addEventListener('foldlab:pattern-ready',()=>{try{if(state.active)exit();setPattern();G.friendlyView.top();}catch(e){message(e.message);}});
  window.StepStudio={activate,exit,load,craneLesson,getState:()=>({active:state.active,steps:state.actions.length,position:state.selectedIndex,progress:state.progress,phase:state.phase}),tutorialData};
}
mount();

