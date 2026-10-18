// The exploded view is selection-only. It never displaces simulation geometry.
import {pointInPolygon} from '../simulator/src/action-fold.js';
import {layerClosure,toggleAccessibleLayer} from '../simulator/src/layer-access.js';
const NS='http://www.w3.org/2000/svg';
const svg=(tag,attrs={})=>{const n=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);return n;};
export function createLayerPicker(){
  const neutral=document.documentElement.dataset.ui==='storyboard';
  const dialog=document.createElement('dialog');dialog.id='layerPicker';dialog.className='studio-dialog';
  dialog.innerHTML=`<div class="dialog-heading"><div><span class="flow-eyebrow">MOVING PAPER</span><h2>Choose moving paper</h2></div><button data-close aria-label="Close layer selection">Close</button></div><p class="dialog-intro">Closed edges stay joined. Choose an accessible paper group; any covering layers needed for this motion are included automatically.</p><div class="layer-picker-layout"><div class="exploded-stage"><div class="exploded-canvas-wrap"><svg id="explodedLayers" role="img" aria-label="Separated paper flaps"></svg></div><label>Layer spacing<input id="layerSpacing" type="range" min="20" max="90" value="55"></label><small>Separated for selection only</small></div><div><p id="layerSelectionCount" role="status"></p><div id="explodedLayerList"></div><button id="pickAllLayers">Select all</button></div></div><div class="dialog-footer"><button data-close>Cancel</button><button id="applyPaperLayers" class="primary">Use these layers</button></div>`;
  document.body.append(dialog);let data=[],selected=new Set(),hover=-1,box,onApply;
  dialog.querySelectorAll('[data-close]').forEach(n=>n.onclick=()=>dialog.close());
  dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
  const $=id=>dialog.querySelector('#'+id);
  function draw(){
    const canvas=$('explodedLayers'),spacing=Number($('layerSpacing').value),points=data.flatMap(c=>c.faces.flatMap(f=>f.vertices.map(v=>v.p))),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y,scale=260/Math.max(w,h*.6,1),height=70+h*scale*.43+(data.length-1)*spacing,width=80+(w+h*.22)*scale;
    canvas.setAttribute('viewBox',`0 0 ${width} ${height}`);canvas.style.minHeight=data.length>6?height+'px':'0';canvas.replaceChildren();
    data.forEach((c,i)=>{
      const group=svg('g',{'data-layer':i,tabindex:0,role:'button','aria-label':`Toggle flap ${i+1}`,'aria-pressed':selected.has(i)});
      const transform=p=>[(p[0]-x)*scale+55+(p[1]-y)*scale*.22,(p[1]-y)*scale*.43+30+i*spacing];
      for(const f of c.faces){const poly=svg('polygon',{points:f.vertices.map(v=>transform(v.p).join(',')).join(' '),fill:neutral?(selected.has(i)?'#fafafa':'#ececea'):(selected.has(i)?'#87b8a8':'#e7eae6'),stroke:neutral?(hover===i?'#353533':'#888884'):(hover===i?'#143e35':'#59776e'),'stroke-width':hover===i?2:1,opacity:hover===i?1:hover>=0?.22:selected.has(i)?1:.35});group.append(poly);}
      const label=svg('text',{x:12,y:65+i*spacing,fill:neutral?'#555550':'#31564b','font-size':14});label.textContent=String(i+1);group.append(label);
      group.onclick=()=>toggle(i);group.onkeydown=e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();toggle(i);}};
      group.onpointerenter=()=>highlight(i);group.onpointerleave=()=>highlight(-1);group.onfocus=()=>highlight(i);group.onblur=()=>highlight(-1);canvas.append(group);
    });
    $('layerSelectionCount').textContent=`${selected.size} of ${data.length} paper groups selected. Connected folds stay together; covered groups bring the paper above them in the fold direction.`;
    $('applyPaperLayers').disabled=!selected.size;
    dialog.querySelectorAll('[data-choice]').forEach(n=>{n.querySelector('input').checked=selected.has(Number(n.dataset.choice));});
  }
  function highlight(i){hover=i;dialog.querySelectorAll('#explodedLayers g').forEach((g,j)=>g.querySelectorAll('polygon').forEach(p=>{p.setAttribute('opacity',i===j?1:i>=0?.22:selected.has(j)?1:.35);p.setAttribute('stroke-width',i===j?2:1);}));}
  function toggle(i){selected=toggleAccessibleLayer(data,selected,i);draw();}
  $('layerSpacing').oninput=draw;$('pickAllLayers').onclick=()=>{selected=new Set(data.map((_,i)=>i));draw();};
  $('applyPaperLayers').onclick=()=>{onApply([...selected].map(i=>data[i].seed));dialog.close();};
  return {open(candidates,seeds,bounds,apply){
    data=candidates;box=bounds;onApply=apply;hover=-1;selected=new Set(data.map((c,i)=>!seeds||seeds.some(s=>c.faces.some(f=>pointInPolygon(s,f.vertices.map(v=>v.uv))))?i:-1).filter(i=>i>=0));
    selected=layerClosure(data,selected);
    const list=$('explodedLayerList');list.replaceChildren();data.forEach((c,i)=>{const row=document.createElement('label');row.dataset.choice=i;row.className='exploded-layer-choice';const input=document.createElement('input');input.type='checkbox';input.onchange=()=>toggle(i);const text=document.createElement('span'),required=[...layerClosure(data,[i])].filter(j=>j!==i);text.textContent=`Group ${i+1}${c.layerCount>1?' · '+c.layerCount+' joined layers':''}${required.length?' · brings '+required.map(j=>j+1).join(', '):' · independently accessible'}`;const only=document.createElement('button');only.type='button';only.textContent='Choose';only.onclick=e=>{e.preventDefault();selected=layerClosure(data,[i]);draw();};row.append(input,text,only);row.onpointerenter=()=>highlight(i);row.onpointerleave=()=>highlight(-1);list.append(row);});draw();dialog.showModal();
  }};
}
