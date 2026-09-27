/* Optional CP editing tools shared by both Designer pages. */
(function () {
  'use strict';
  const R = window.CPDesignerRuntime;
  if (!R) return;
  const { cp, canvas, render, screenToWorld, worldToScreen, paperDimensions, saveToLocal, toastMsg } = R;
  cp.selected = new Set();
  let selectMode = false, panMode = false, hover = -1, start = null, moved = false, interaction = null, panOrigin = null, spaceDown = false;

  const style = document.createElement('style');
  style.textContent = `
    .pro-tools{display:flex;gap:6px;align-items:center;margin-left:4px}
    .pro-btn{border:1px solid var(--shared-line,var(--border));background:var(--shared-surface,var(--surface));color:var(--shared-muted,var(--text2));border-radius:var(--r-sm);padding:7px 10px;font:500 13px inherit;cursor:pointer}
    .pro-btn:hover,.pro-btn.active{border-color:var(--shared-accent,var(--accent));color:var(--shared-accent,var(--accent));background:var(--shared-wash,var(--accent-light))}
    .pro-selection{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:8;overflow:visible}
    .pro-selection .selected-halo{stroke:#fff;stroke-width:11;stroke-linecap:round;opacity:.95}
    .pro-selection .selected-line{stroke:var(--shared-accent,var(--accent));stroke-width:6;stroke-linecap:round;opacity:1}
    .pro-selection .selected-node{fill:#fff;stroke:var(--shared-accent,var(--accent));stroke-width:3}
    .pro-selection .hover{stroke:var(--shared-accent,var(--accent));stroke-width:8;stroke-linecap:round;opacity:.55}
    .pro-selection .select-box{fill:var(--shared-wash,var(--accent-light));fill-opacity:.7;stroke:var(--shared-accent,var(--accent));stroke-width:2;stroke-dasharray:7 5}
    .pro-actions{position:absolute;left:50%;top:16px;transform:translateX(-50%);z-index:21;display:none;align-items:center;justify-content:center;flex-wrap:wrap;gap:5px;width:max-content;max-width:calc(100% - 40px);min-height:44px;background:rgba(255,255,255,.97);border:1px solid var(--shared-line,var(--border));border-radius:12px;padding:6px;box-shadow:0 10px 28px rgba(32,54,41,.10);font:500 12px inherit;color:var(--shared-muted,var(--text2))}
    .pro-actions.show{display:flex}.pro-actions .pro-count{white-space:nowrap;background:var(--shared-accent,var(--accent));color:#fff;border-radius:7px;padding:8px 11px;font-weight:750}.pro-actions .pro-help{white-space:nowrap;color:var(--shared-muted,var(--text2));font-size:11px;padding:0 7px}
    .pro-actions button{border:0;background:transparent;border-radius:7px;padding:8px 10px;cursor:pointer;color:var(--shared-muted,var(--text2));white-space:nowrap}
    .pro-actions button:hover{border-color:var(--shared-accent,var(--accent));color:var(--shared-accent,var(--accent));background:var(--shared-wash,var(--accent-light))}.pro-actions .pro-done{border-color:var(--shared-accent,var(--accent));color:var(--shared-accent,var(--accent));font-weight:700}
    @media(max-width:1000px){.pro-actions{max-width:calc(100% - 28px);overflow-x:auto}.pro-actions .pro-help{display:none}}
    .pro-report{max-width:560px;max-height:72vh;overflow:auto;white-space:pre-wrap;line-height:1.5;color:var(--text2);background:var(--surface2);border:1px solid var(--border);padding:12px;border-radius:8px;font:13px ui-monospace,monospace}
    .pro-check-ok{color:#166534}.pro-check-warn{color:#92400e}
  `;
  document.head.appendChild(style);

  const wrap = document.querySelector('#canvasWrap');
  if (!wrap) return;
  const overlay = document.createElementNS('http://www.w3.org/2000/svg','svg');
  overlay.classList.add('pro-selection'); overlay.setAttribute('aria-hidden','true');
  wrap.appendChild(overlay);
  const actions = document.createElement('div'); actions.className='pro-actions'; actions.setAttribute('role','status'); actions.setAttribute('aria-live','polite'); wrap.appendChild(actions);
  const tools = document.createElement('div'); tools.className='pro-tools';
  tools.innerHTML='<button class="pro-btn" data-tool="select">Select</button><button class="pro-btn" data-tool="pan">Pan</button><button class="pro-btn" data-tool="clean">Clean up</button><button class="pro-btn" data-tool="check">Check pattern</button>';
  document.querySelector('.float-toolbar')?.appendChild(tools);

  function distToLine(p,l){
    const dx=l.p2.x-l.p1.x,dy=l.p2.y-l.p1.y, n=dx*dx+dy*dy;
    const t=n?Math.max(0,Math.min(1,((p.x-l.p1.x)*dx+(p.y-l.p1.y)*dy)/n)):0;
    return Math.hypot(p.x-(l.p1.x+t*dx),p.y-(l.p1.y+t*dy));
  }
  function nearest(sx,sy){
    const p=screenToWorld(sx,sy), threshold=14/(cp.zoom||1); let best=-1,bd=threshold;
    cp.lines.forEach((l,i)=>{const d=distToLine(p,l);if(d<bd){bd=d;best=i;}}); return best;
  }
  function inside(p,a,b){return p.x>=Math.min(a.x,b.x)&&p.x<=Math.max(a.x,b.x)&&p.y>=Math.min(a.y,b.y)&&p.y<=Math.max(a.y,b.y)}
  function cloneLines(){return cp.lines.map(l=>({...l,p1:{...l.p1},p2:{...l.p2}}))}
  function commitMutation(label,mutate){
    const before=cloneLines(); mutate(); const after=cloneLines();
    if(JSON.stringify(before)===JSON.stringify(after))return false;
    cp.hist.push({act:'snapshot',label,before,after}); cp.redoStack=[];
    cp.selected=new Set([...cp.selected].filter(i=>i>=0&&i<cp.lines.length));
    saveToLocal();render();drawOverlay();updateActions();toastMsg(label);return true;
  }
  function updateActions(){
    actions.innerHTML=''; if(!selectMode&&!panMode){actions.classList.remove('show');return;}
    actions.classList.add('show'); const count=document.createElement('span');count.className='pro-count';count.textContent=panMode?'Pan canvas':cp.selected.size?`${cp.selected.size} crease${cp.selected.size===1?'':'s'} selected`:'Select creases';actions.appendChild(count);
    const help=document.createElement('span');help.className='pro-help';help.textContent=panMode?'Drag anywhere to move · scroll to zoom':cp.selected.size?'Click or Shift-click to adjust · Shift-drag selects a box':'Click a crease · drag to move canvas · Shift-drag selects a box';actions.appendChild(help);
    if(selectMode&&cp.selected.size){
      [['Mountain','mountain'],['Valley','valley'],['Guide','crease']].forEach(([txt,type])=>{const b=document.createElement('button');b.textContent=txt;b.dataset.kind=type;b.onclick=()=>commitMutation(`Changed ${cp.selected.size} selected crease${cp.selected.size===1?'':'s'} to ${txt.toLowerCase()}`,()=>cp.selected.forEach(i=>{if(cp.lines[i])cp.lines[i].lt=type}));actions.appendChild(b)});
      [['Duplicate','duplicate'],['Mirror','mirror'],['Delete','delete']].forEach(([txt,type])=>{const b=document.createElement('button');b.textContent=txt;b.dataset.kind=type;b.onclick=()=>modifySelection(type);actions.appendChild(b)});
      const clear=document.createElement('button');clear.textContent='Clear';clear.onclick=()=>{cp.selected.clear();drawOverlay();updateActions()};actions.appendChild(clear);
    }
    const done=document.createElement('button');done.className='pro-done';done.textContent=selectMode?'Exit Select':'Exit Pan';done.setAttribute('aria-label',done.textContent);done.onclick=()=>selectMode?setMode(false):setPanMode(false);actions.appendChild(done);
  }
  function drawOverlay(rect){
    overlay.setAttribute('viewBox',`0 0 ${Math.max(1,canvas.width)} ${Math.max(1,canvas.height)}`);overlay.innerHTML='';
    const line=(a,b,cls)=>{const e=document.createElementNS(overlay.namespaceURI,'line');e.classList.add(cls);e.setAttribute('x1',a.x);e.setAttribute('y1',a.y);e.setAttribute('x2',b.x);e.setAttribute('y2',b.y);overlay.appendChild(e)};
    const node=p=>{const e=document.createElementNS(overlay.namespaceURI,'circle');e.classList.add('selected-node');e.setAttribute('cx',p.x);e.setAttribute('cy',p.y);e.setAttribute('r','5');overlay.appendChild(e)};
    cp.selected.forEach(i=>{const l=cp.lines[i];if(!l)return;const a=worldToScreen(l.p1.x,l.p1.y),b=worldToScreen(l.p2.x,l.p2.y);line(a,b,'selected-halo');line(a,b,'selected-line');if(cp.selected.size<=24){node(a);node(b)}});
    if(hover>=0&&!cp.selected.has(hover)&&cp.lines[hover]){const l=cp.lines[hover],a=worldToScreen(l.p1.x,l.p1.y),b=worldToScreen(l.p2.x,l.p2.y);line(a,b,'hover')}
    if(rect){const a=worldToScreen(rect.a.x,rect.a.y),b=worldToScreen(rect.b.x,rect.b.y),e=document.createElementNS(overlay.namespaceURI,'rect');e.classList.add('select-box');e.setAttribute('x',Math.min(a.x,b.x));e.setAttribute('y',Math.min(a.y,b.y));e.setAttribute('width',Math.abs(a.x-b.x));e.setAttribute('height',Math.abs(a.y-b.y));overlay.appendChild(e)}
  }
  function modifySelection(type){
    const ids=[...cp.selected].filter(i=>cp.lines[i]); if(!ids.length)return;
    const count=ids.length,label=type==='delete'?`Deleted ${count} selected crease${count===1?'':'s'}`:type==='duplicate'?`Duplicated ${count} selected crease${count===1?'':'s'}`:`Mirrored ${count} selected crease${count===1?'':'s'}`;
    commitMutation(label,()=>{
      if(type==='delete'){cp.lines=cp.lines.filter((_,i)=>!cp.selected.has(i));cp.selected.clear();}
      if(type==='duplicate'){const add=ids.map(i=>{const l=cp.lines[i];return {p1:{x:l.p1.x+8,y:l.p1.y+8},p2:{x:l.p2.x+8,y:l.p2.y+8},lt:l.lt,opacity:l.opacity}});cp.lines.push(...add);cp.selected=new Set(add.map((_,j)=>cp.lines.length-add.length+j));}
      if(type==='mirror'){const axis=ids.reduce((s,i)=>s+cp.lines[i].p1.x+cp.lines[i].p2.x,0)/(ids.length*2);ids.forEach(i=>{const l=cp.lines[i];[l.p1.x,l.p2.x]=[2*axis-l.p1.x,2*axis-l.p2.x]})}
    });
  }
  function syncModes(){
    tools.querySelector('[data-tool=select]').classList.toggle('active',selectMode);tools.querySelector('[data-tool=select]').setAttribute('aria-pressed',String(selectMode));
    tools.querySelector('[data-tool=pan]').classList.toggle('active',panMode);tools.querySelector('[data-tool=pan]').setAttribute('aria-pressed',String(panMode));
    wrap.classList.toggle('pro-mode',selectMode||panMode);
    canvas.style.cursor=panMode||spaceDown?'grab':selectMode?'default':'crosshair';drawOverlay();updateActions();
  }
  function setMode(on){selectMode=on;if(on)panMode=false;start=null;moved=false;interaction=null;hover=-1;if(!on)cp.selected.clear();syncModes()}
  function setPanMode(on){panMode=on;if(on){selectMode=false;cp.selected.clear()}start=null;moved=false;interaction=null;hover=-1;syncModes()}
  tools.querySelector('[data-tool=select]').onclick=()=>setMode(!selectMode);
  tools.querySelector('[data-tool=pan]').onclick=()=>setPanMode(!panMode);
  canvas.addEventListener('mousedown',e=>{if(!selectMode&&!panMode&&!spaceDown)return;e.preventDefault();e.stopImmediatePropagation();const r=canvas.getBoundingClientRect(),p={x:e.clientX-r.left,y:e.clientY-r.top};start=p;moved=false;const hit=nearest(p.x,p.y);interaction=selectMode&&e.shiftKey?'box':selectMode&&!panMode&&!spaceDown&&e.button===0&&hit>=0?'pick':'pan';if(interaction==='pan'){panOrigin={x:p.x,y:p.y,px:cp.px,py:cp.py};canvas.style.cursor='grabbing'}},true);
  canvas.addEventListener('mousemove',e=>{if(!selectMode&&!panMode&&!spaceDown)return;const r=canvas.getBoundingClientRect(),p={x:e.clientX-r.left,y:e.clientY-r.top};if(start){moved=Math.hypot(p.x-start.x,p.y-start.y)>5;if(interaction==='pick'&&moved){interaction='pan';panOrigin={x:start.x,y:start.y,px:cp.px,py:cp.py};canvas.style.cursor='grabbing'}if(interaction==='pan'){cp.px=panOrigin.px+p.x-panOrigin.x;cp.py=panOrigin.py+p.y-panOrigin.y;render();drawOverlay()}else if(interaction==='box'){const a=screenToWorld(start.x,start.y),b=screenToWorld(p.x,p.y);drawOverlay({a,b})}}else if(selectMode){hover=nearest(p.x,p.y);drawOverlay()}},true);
  canvas.addEventListener('mouseup',e=>{if((!selectMode&&!panMode&&!spaceDown)||!start)return;e.preventDefault();e.stopImmediatePropagation();const r=canvas.getBoundingClientRect(),p={x:e.clientX-r.left,y:e.clientY-r.top};if(interaction==='box'){const a=screenToWorld(start.x,start.y),b=screenToWorld(p.x,p.y),add=[];cp.lines.forEach((l,i)=>{if(inside(l.p1,a,b)&&inside(l.p2,a,b))add.push(i)});if(!e.ctrlKey&&!e.metaKey)cp.selected.clear();add.forEach(i=>cp.selected.add(i))}else if(interaction==='pick'&&!moved){const i=nearest(p.x,p.y);if(i>=0){if(e.shiftKey||e.ctrlKey||e.metaKey)cp.selected.has(i)?cp.selected.delete(i):cp.selected.add(i);else{cp.selected.clear();cp.selected.add(i)}}}start=null;interaction=null;panOrigin=null;canvas.style.cursor=panMode||spaceDown?'grab':selectMode?'default':'crosshair';drawOverlay();updateActions()},true);
  canvas.addEventListener('mouseleave',()=>{if(interaction==='pan'){start=null;interaction=null;panOrigin=null;canvas.style.cursor=panMode||spaceDown?'grab':selectMode?'default':'crosshair'}},true);
  window.addEventListener('resize',()=>requestAnimationFrame(()=>drawOverlay()));
  wrap.addEventListener('wheel',()=>requestAnimationFrame(()=>drawOverlay()),{passive:true});
  document.querySelectorAll('.zc-btn').forEach(b=>b.addEventListener('click',()=>requestAnimationFrame(()=>drawOverlay())));
  window.addEventListener('cp:history-changed',()=>{cp.selected=new Set([...cp.selected].filter(i=>i<cp.lines.length));drawOverlay();updateActions()});
  document.addEventListener('keydown',e=>{if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;if(e.code==='Space'&&!spaceDown){spaceDown=true;e.preventDefault();syncModes();return}if(e.key==='Escape'&&(selectMode||panMode)){e.preventDefault();e.stopImmediatePropagation();selectMode?setMode(false):setPanMode(false)}else if(selectMode&&(e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='a'){e.preventDefault();e.stopImmediatePropagation();cp.selected=new Set(cp.lines.map((_,i)=>i));drawOverlay();updateActions()}else if(selectMode&&(e.key==='Delete'||e.key==='Backspace')&&cp.selected.size){e.preventDefault();e.stopImmediatePropagation();modifySelection('delete')}},true);
  document.addEventListener('keyup',e=>{if(e.code==='Space'){spaceDown=false;syncModes()}},true);

  tools.querySelector('[data-tool=clean]').onclick=()=>{const before=cp.lines.length,next=splitAndClip(cp.lines);commitMutation(`Normalized pattern: ${before} → ${next.length} segments`,()=>{cp.lines=next;cp.selected.clear()})};
  tools.querySelector('[data-tool=check]').onclick=()=>showReport(checkPattern(cp.lines));

  function paperPolygon(){const h=cp.SIZE/2,d=paperDimensions();return cp.paperShape==='rect'?[[-d.w/2,-d.h/2],[d.w/2,-d.h/2],[d.w/2,d.h/2],[-d.w/2,d.h/2]]:cp.paperShape==='hex'?Array.from({length:6},(_,i)=>[Math.cos(Math.PI/6+i*Math.PI/3)*h,Math.sin(Math.PI/6+i*Math.PI/3)*h]):[[-h,-h],[h,-h],[h,h],[-h,h]]}
  function clipLine(l){let lo=0,hi=1,dx=l.p2.x-l.p1.x,dy=l.p2.y-l.p1.y;const poly=paperPolygon();for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],ex=b[0]-a[0],ey=b[1]-a[1],s=ex*(l.p1.y-a[1])-ey*(l.p1.x-a[0]),d=ex*dy-ey*dx;if(Math.abs(d)<1e-10){if(s<-1e-8)return null}else if(d>0)lo=Math.max(lo,-s/d);else hi=Math.min(hi,-s/d)}if(hi-lo<1e-7)return null;return {p1:{x:l.p1.x+dx*lo,y:l.p1.y+dy*lo},p2:{x:l.p1.x+dx*hi,y:l.p1.y+dy*hi},lt:l.lt,opacity:l.opacity}}
  function mergeVertices(lines,tol=Math.max(0.35,cp.SIZE*0.002)){
    const cells=new Map(),out=[]; const cell=(x,y)=>`${Math.floor(x/tol)},${Math.floor(y/tol)}`;
    function canonical(p){const cx=Math.floor(p.x/tol),cy=Math.floor(p.y/tol);let best=null,bd=tol;
      for(let ix=cx-1;ix<=cx+1;ix++)for(let iy=cy-1;iy<=cy+1;iy++){const a=cells.get(`${ix},${iy}`)||[];for(const q of a){const d=Math.hypot(q.x-p.x,q.y-p.y);if(d<=bd){bd=d;best=q}}}
      if(best)return best; const q={x:p.x,y:p.y};const k=cell(p.x,p.y);if(!cells.has(k))cells.set(k,[]);cells.get(k).push(q);return q;
    }
    lines.forEach(l=>{const a=canonical(l.p1),b=canonical(l.p2);out.push({p1:a,p2:b,lt:l.lt,opacity:l.opacity})}); return out;
  }
  function segmentKey(l){const a=`${l.p1.x.toFixed(5)},${l.p1.y.toFixed(5)}`,b=`${l.p2.x.toFixed(5)},${l.p2.y.toFixed(5)}`;return a<b?`${a}|${b}`:`${b}|${a}`}
  function dedupeSegments(lines){const seen=new Map(),out=[],duplicates=[],conflicts=[];lines.forEach(l=>{const k=segmentKey(l);if(seen.has(k)){duplicates.push(l);if(seen.get(k).lt!==l.lt)conflicts.push(k)}else{seen.set(k,l);out.push(l)}});return {lines:out,duplicates,conflicts}}
  function splitAndClip(lines){
    const clipped=mergeVertices(lines.map(clipLine).filter(Boolean)),pieces=[]; clipped.forEach((l,i)=>{const ts=[0,1];clipped.forEach((m,j)=>{if(i===j)return;const t=intersectionT(l,m);if(t&&t.t>1e-7&&t.t<1-1e-7&&t.u>1e-7&&t.u<1-1e-7)ts.push(t.t)});ts.sort((a,b)=>a-b);for(let k=1;k<ts.length;k++){const a=ts[k-1],b=ts[k];if(b-a<1e-7)continue;pieces.push({p1:{x:l.p1.x+(l.p2.x-l.p1.x)*a,y:l.p1.y+(l.p2.y-l.p1.y)*a},p2:{x:l.p1.x+(l.p2.x-l.p1.x)*b,y:l.p1.y+(l.p2.y-l.p1.y)*b},lt:l.lt,opacity:l.opacity})}});return dedupeSegments(mergeVertices(pieces)).lines.filter(l=>Math.hypot(l.p2.x-l.p1.x,l.p2.y-l.p1.y)>1e-5)}
  function intersectionT(a,b){const dx=a.p2.x-a.p1.x,dy=a.p2.y-a.p1.y,ex=b.p2.x-b.p1.x,ey=b.p2.y-b.p1.y,d=dx*ey-dy*ex;if(Math.abs(d)<1e-9)return null;const t=((b.p1.x-a.p1.x)*ey-(b.p1.y-a.p1.y)*ex)/d,u=((b.p1.x-a.p1.x)*dy-(b.p1.y-a.p1.y)*dx)/d;return {t,u}}

  function vertexMap(lines){const map=new Map();const key=(x,y)=>`${Math.round(x*10000)},${Math.round(y*10000)}`;lines.forEach(l=>{[l.p1,l.p2].forEach(p=>{const k=key(p.x,p.y);if(!map.has(k))map.set(k,{x:p.x,y:p.y,edges:[]});map.get(k).edges.push(l)})});return [...map.values()]}
  function checkPattern(lines){
    const zeroLength=lines.filter(l=>Math.hypot(l.p2.x-l.p1.x,l.p2.y-l.p1.y)<=1e-5).length;
    const merged=mergeVertices(lines.filter(l=>Math.hypot(l.p2.x-l.p1.x,l.p2.y-l.p1.y)>1e-5)),dupes=dedupeSegments(merged);
    const normalized=splitAndClip(dupes.lines),vertices=vertexMap(normalized),issues=[];
    if(zeroLength)issues.push(`Found ${zeroLength} zero-length segment${zeroLength===1?'':'s'}`);
    if(dupes.duplicates.length)issues.push(`Found ${dupes.duplicates.length} duplicate segment${dupes.duplicates.length===1?'':'s'}`);
    if(dupes.conflicts.length)issues.push(`Found ${dupes.conflicts.length} overlapping segments with different assignments`);
    vertices.forEach((v,index)=>{const es=v.edges.filter(e=>e.lt==='mountain'||e.lt==='valley');if(es.length<4||es.length%2)return;const angles=es.map(e=>{const p=Math.hypot(e.p1.x-v.x,e.p1.y-v.y)<1e-5?e.p2:e.p1;return (Math.atan2(p.y-v.y,p.x-v.x)+Math.PI*2)%(Math.PI*2)}).sort((a,b)=>a-b),sectors=angles.map((a,i)=>(angles[(i+1)%angles.length]-a+Math.PI*2)%(Math.PI*2));const kaw=Math.abs(sectors.filter((_,i)=>i%2===0).reduce((a,b)=>a+b,0)-Math.PI)<.03;const m=es.filter(e=>e.lt==='mountain').length,va=es.length-m;if(!kaw)issues.push(`Vertex ${index+1}: Kawasaki check needs review`);if(Math.abs(m-va)!==2)issues.push(`Vertex ${index+1}: Maekawa count is M${m} / V${va}`)});
    return {vertices:vertices.length,lines:normalized.length,issues,zeroLength,duplicates:dupes.duplicates.length,conflicts:dupes.conflicts.length};
  }
  function showReport(r){const detail=r.issues.length?r.issues.slice(0,16).join('\n')+(r.issues.length>16?`\n…and ${r.issues.length-16} more`:''):'No local Maekawa or Kawasaki issues found.';const text=`Pattern check\n\nCrease segments: ${r.lines}\nDetected vertices: ${r.vertices}\nZero-length: ${r.zeroLength}\nDuplicates: ${r.duplicates}\nAssignment conflicts: ${r.conflicts}\n\n${detail}\n\nThese are necessary local checks; passing them does not prove global flat-foldability.`;const box=document.createElement('div');box.className='pro-report';box.textContent=text;const modal=document.createElement('div');modal.className='modal-overlay show';modal.innerHTML='<div class="modal"><h3>Pattern check</h3><p>Review the local foldability checks before opening the simulation.</p></div>';modal.querySelector('.modal').append(box);const row=document.createElement('div');row.className='btn-row';row.innerHTML='<button class="primary">Close</button>';row.firstChild.onclick=()=>modal.remove();modal.querySelector('.modal').append(row);document.body.append(modal)}

  function currentCP(){const map={crease:1,mountain:2,valley:3},b=paperPolygon();const boundary=b.map((p,i)=>`1 ${p[0]} ${p[1]} ${b[(i+1)%b.length][0]} ${b[(i+1)%b.length][1]}`);return boundary.concat(cp.lines.map(l=>`${map[l.lt]||1} ${l.p1.x} ${l.p1.y} ${l.p2.x} ${l.p2.y}`)).join('\n')}
  window.CPDesignerProTools={checkPattern,clean:()=>{const next=splitAndClip(cp.lines);return commitMutation(`Normalized pattern: ${cp.lines.length} → ${next.length} segments`,()=>{cp.lines=next;cp.selected.clear()})},getSelection:()=>[...cp.selected],exportFOLD:currentFold,exportCP:currentCP};

  // ORIPA's compact CP format: 1 contour, 2 mountain, 3 valley, followed by endpoints.
  function cpTextToLines(text){
    const out=[];
    text.split(/\r?\n/).forEach(row=>{const p=row.trim().split(/[\s,]+/);if(p.length<5||p[0].startsWith('#'))return;const t=Number(p[0]),n=p.slice(1,5).map(Number);if([1,2,3].includes(t)&&n.every(Number.isFinite))out.push({p1:{x:n[0],y:n[1]},p2:{x:n[2],y:n[3]},lt:t===2?'mountain':t===3?'valley':'crease'})});
    if(!out.length)throw Error('No CP line records found. Expected: type x1 y1 x2 y2');return out;
  }
  function svgTextToLines(text){const doc=new DOMParser().parseFromString(text,'image/svg+xml'),out=[];doc.querySelectorAll('line').forEach(el=>{const x1=Number(el.getAttribute('x1')),y1=Number(el.getAttribute('y1')),x2=Number(el.getAttribute('x2')),y2=Number(el.getAttribute('y2')),c=(el.getAttribute('stroke')||'').toLowerCase();if(![x1,y1,x2,y2].every(Number.isFinite))return;const lt=c==='#ff0000'?'mountain':c==='#0000ff'?'valley':'crease';if(c!=='#000000'||Math.hypot(x2-x1,y2-y1)>1)out.push({p1:{x:x1,y:y1},p2:{x:x2,y:y2},lt,opacity:Number(el.getAttribute('opacity'))||1})});if(!out.length)throw Error('No straight crease lines found');return out}
  function foldToLines(f){
    const v=f.vertices_coords,e=f.edges_vertices,a=f.edges_assignment||[];if(!Array.isArray(v)||!Array.isArray(e)||!e.length)throw Error('FOLD needs vertices_coords and edges_vertices.');
    const xs=v.map(p=>p[0]),ys=v.map(p=>p[1]), minX=Math.min(...xs),minY=Math.min(...ys),span=Math.max(Math.max(...xs)-minX,Math.max(...ys)-minY)||1;
    return e.map(([i,j],k)=>{if(a[k]==='B')return null;const p=v[i],q=v[j],x1=(p[0]-minX)*400/span-200,y1=(p[1]-minY)*400/span-200,x2=(q[0]-minX)*400/span-200,y2=(q[1]-minY)*400/span-200;const type=a[k]==='M'?'mountain':a[k]==='V'?'valley':'crease';return {p1:{x:x1,y:y1},p2:{x:x2,y:y2},lt:type,opacity:f.edges_foldAngle?.[k]!=null&&Math.abs(f.edges_foldAngle[k])<180?Math.abs(f.edges_foldAngle[k])/180:undefined}}).filter(l=>l&&Math.hypot(l.p2.x-l.p1.x,l.p2.y-l.p1.y)>1e-5);
  }
  function download(name,text,type){const a=document.createElement('a'),u=URL.createObjectURL(new Blob([text],{type}));a.href=u;a.download=name;document.body.append(a);a.click();a.remove();URL.revokeObjectURL(u)}
  function currentFold(){
    const vertices=[],lookup=new Map(),edges=[],assign=[],angles=[];const key=p=>`${p.x.toFixed(5)},${p.y.toFixed(5)}`;const add=p=>{const k=key(p);if(!lookup.has(k)){lookup.set(k,vertices.length);vertices.push([p.x,p.y])}return lookup.get(k)};
    const half=cp.SIZE/2,d=paperDimensions(),bound=cp.paperShape==='rect'?[[-d.w/2,-d.h/2],[d.w/2,-d.h/2],[d.w/2,d.h/2],[-d.w/2,d.h/2]]:cp.paperShape==='hex'?Array.from({length:6},(_,i)=>[Math.cos(Math.PI/6+i*Math.PI/3)*half,Math.sin(Math.PI/6+i*Math.PI/3)*half]):[[-half,-half],[half,-half],[half,half],[-half,half]];
    const addEdge=(p,q,t)=>{edges.push([add(p),add(q)]);assign.push(t);angles.push(t==='M'?-180:t==='V'?180:0)};for(let i=0;i<bound.length;i++)addEdge({x:bound[i][0],y:bound[i][1]},{x:bound[(i+1)%bound.length][0],y:bound[(i+1)%bound.length][1]},'B');cp.lines.forEach(l=>{if(['mountain','valley','crease'].includes(l.lt))addEdge(l.p1,l.p2,l.lt==='mountain'?'M':l.lt==='valley'?'V':'U')});return {file_spec:1,file_creator:'Origami CP Designer',frame_classes:['creasePattern'],vertices_coords:vertices,edges_vertices:edges,edges_assignment:assign,edges_foldAngle:angles};
  }
  function addExportItems(){
    const menu=document.querySelector('.exp-menu');if(!menu||menu.dataset.proReady)return;menu.dataset.proReady='1';const d=document.createElement('div');d.className='exp-menu-divider';menu.append(d);[['Export as FOLD','fold'],['Export as CP','cp']].forEach(([label,type])=>{const b=document.createElement('button');b.className='exp-menu-item';b.textContent=label;b.onclick=()=>{if(type==='fold')download('crease-pattern.fold',JSON.stringify(currentFold(),null,2),'application/json');else{const map={crease:1,mountain:2,valley:3};download('crease-pattern.cp',cp.lines.map(l=>`${map[l.lt]||1} ${l.p1.x} ${l.p1.y} ${l.p2.x} ${l.p2.y}`).join('\n'),'text/plain')}document.querySelector('.export-dropdown')?.classList.remove('open');toastMsg('File exported')};menu.append(b)})
  }
  addExportItems();
  document.querySelectorAll('.exp-menu-item').forEach(b=>{if(b.textContent.trim()==='Export as CP')b.onclick=()=>{download('crease-pattern.cp',currentCP(),'text/plain');document.querySelector('.export-dropdown')?.classList.remove('open');toastMsg('File exported')}});
  const originalHandle=window.handleFile;
  if(originalHandle) window.handleFile=async function(file){
    const ext=(file?.name||'').toLowerCase().split('.').pop();if(ext==='svg'){try{const prepared=await CPImport.prepareSVG(await file.text()),check=checkPattern(svgTextToLines(prepared.svg));if(!confirm(`Import ${file.name}?\n\n${check.lines} crease segments, ${check.vertices} vertices.\n${check.issues.length} local check issue(s).`))return}catch(e){toastMsg('Could not inspect SVG: '+e.message);return}return originalHandle(file)}
    if(!['fold','cp'].includes(ext)){toastMsg('Choose an SVG, FOLD, or CP file');return}
    try{const text=await file.text();let lines;if(ext==='cp')lines=cpTextToLines(text);else{const f=JSON.parse(text);lines=foldToLines(f)};const check=checkPattern(lines);const ok=confirm(`Import ${file.name}?\n\n${lines.length} crease segments, ${check.vertices} vertices.\n${check.issues.length} local check issue(s).`);if(!ok)return;cp.lines=lines;cp.sourcePreset=null;cp.hist=[];cp.redoStack=[];saveToLocal();render();toastMsg(`Imported ${lines.length} crease segments`)}catch(e){toastMsg('Could not import: '+e.message)}
  };
})();
