/* CP Designer import adapter. Original project code, MIT license.
 * Geometry and GPU solving remain in Amanda Ghassaei's OrigamiSimulator. */
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const geometry = 'line,path,rect,polygon,polyline';
  const colors = {
    '#000000':'#000000', '#444444':'#000000', '#333333':'#000000', '#cccccc':'#000000',
    '#ff0000':'#ff0000', '#ef4444':'#ff0000', '#c0392b':'#ff0000',
    '#0000ff':'#0000ff', '#3b82f6':'#0000ff', '#2e5fa3':'#0000ff', '#2980b9':'#0000ff',
    '#00ff00':'#00ff00', '#008000':'#00ff00', '#ffff00':'#ffff00', '#ff00ff':'#ff00ff',
    '#666666':null, '#8b8b8b':null, '#aaaaaa':null
  };
  function hexColor(value) {
    if (/^#[0-9a-f]{3}$/i.test(value)) return '#' + [...value.slice(1)].map(x => x+x).join('').toLowerCase();
    const rgb = value.match(/^rgb\(\s*(\d+)[, ]+\s*(\d+)[, ]+\s*(\d+)\s*\)$/i);
    return rgb ? '#' + rgb.slice(1).map(x => Number(x).toString(16).padStart(2,'0')).join('') : value.toLowerCase();
  }
  const properties = ['stroke','stroke-opacity','opacity','display','visibility'];
  function safeStyle(style) {
    return properties.map(k => {
      const v = style.getPropertyValue(k);
      return v && !/url\s*\(|var\s*\(/i.test(v) ? k + ':' + v + (style.getPropertyPriority(k) ? '!important' : '') : '';
    }).filter(Boolean).join(';');
  }
  function safeCSS(text) {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(text);
    return [...sheet.cssRules].filter(r => r.type === 1).map(r => 'svg :is(' + r.selectorText + '),svg:is(' + r.selectorText + '){' + safeStyle(r.style) + '}').join('\n');
  }
  const attrs = new Set(('id class x y x1 y1 x2 y2 width height viewBox preserveAspectRatio points d transform stroke stroke-opacity opacity display visibility').split(' '));
  function copySafe(el, doc) {
    const tag = el.localName;
    if (!['svg','g','defs','style',...geometry.split(',')].includes(tag)) return null;
    const out = doc.createElementNS(NS, tag);
    if (tag === 'style') { out.textContent = safeCSS(el.textContent); return out; }
    for (const a of el.attributes) {
      if (attrs.has(a.name) && !/url\s*\(/i.test(a.value)) out.setAttribute(a.name, a.value);
    }
    if (el.style) out.setAttribute('style', safeStyle(el.style));
    for (const child of el.children) { const c = copySafe(child, doc); if (c) out.appendChild(c); }
    return out;
  }

  // Resolve inherited CSS inside an isolated, script-free document. Only geometry,
  // colors and numeric transforms leave it; source SVG is never inserted in the app.
  async function prepareSVG(text) {
    const parsed = new DOMParser().parseFromString(text.replace(/^\uFEFF/, ''), 'image/svg+xml');
    if (parsed.querySelector('parsererror') || parsed.documentElement.localName !== 'svg') throw Error('The SVG could not be parsed. Check the file format.');
    if (parsed.querySelector('use,clipPath,mask,image,circle,ellipse')) throw Error('This version supports straight creases only. Expand referenced objects, remove clipping masks, and convert curves to line segments.');
    const frame = document.createElement('iframe');
    frame.setAttribute('sandbox', 'allow-same-origin');
    frame.setAttribute('aria-hidden','true');
    frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:1000px;height:1000px;visibility:hidden;border:0;pointer-events:none';
    const loaded = new Promise(resolve => frame.onload = resolve);
    frame.srcdoc = '<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'"></head><body></body></html>';
    document.body.appendChild(frame);
    try {
      await loaded;
      const doc = frame.contentDocument;
      const svg = copySafe(parsed.documentElement, doc);
      svg.style.visibility = 'visible';
      doc.body.appendChild(svg);
      const output = document.createElementNS(NS, 'svg');
      const group = document.createElementNS(NS,'g');
      output.appendChild(group);
      const bounds = [Infinity, Infinity, -Infinity, -Infinity];
      let ignored = 0, boundaries = 0, count = 0;
      for (const el of svg.querySelectorAll(geometry)) {
        if (el.closest('defs')) continue;
        const style = frame.contentWindow.getComputedStyle(el);
        let opacity = Number(style.strokeOpacity), hidden = false;
        for (let parent = el; parent && parent !== doc.body; parent = parent.parentElement) {
          const s = frame.contentWindow.getComputedStyle(parent);
          opacity *= Number(s.opacity);
          if (s.display === 'none' || s.visibility === 'hidden') hidden = true;
        }
        if (hidden || !opacity || style.stroke === 'none') { ignored++; continue; }
        const key = hexColor(style.stroke);
        if (!(key in colors)) throw Error('Unrecognized crease color ' + key + '. Use red mountain folds, blue valley folds, and a black boundary.');
        const color = colors[key];
        if (!color) { ignored++; continue; }
        if (el.localName === 'path' && /[acqst]/i.test((el.getAttribute('d') || '').replace(/[eE][-+]?\d+/g,''))) throw Error('A curved path was found. Convert curves to line segments first.');
        const matrix = el.getCTM();
        if (!matrix) throw Error('The SVG contains a coordinate transform that could not be read.');
        const box = el.getBBox();
        for (const [x,y] of [[box.x,box.y],[box.x+box.width,box.y],[box.x,box.y+box.height],[box.x+box.width,box.y+box.height]]) {
          const p = new DOMPoint(x,y).matrixTransform(matrix);
          bounds[0] = Math.min(bounds[0],p.x); bounds[1] = Math.min(bounds[1],p.y);
          bounds[2] = Math.max(bounds[2],p.x); bounds[3] = Math.max(bounds[3],p.y);
        }
        const copy = document.createElementNS(NS,el.localName);
        for (const a of el.attributes) if (attrs.has(a.name) && !['id','class','transform','stroke','opacity','stroke-opacity','display','visibility'].includes(a.name)) copy.setAttribute(a.name,a.value);
        copy.setAttribute('stroke',color); copy.setAttribute('fill','none');
        copy.setAttribute('opacity',String(opacity));
        copy.setAttribute('stroke-opacity','1');
        copy.setAttribute('transform',`matrix(${matrix.a} ${matrix.b} ${matrix.c} ${matrix.d} ${matrix.e} ${matrix.f})`);
        group.appendChild(copy); count++;
        if (color === '#000000') boundaries++;
      }
      const span = Math.max(bounds[2]-bounds[0],bounds[3]-bounds[1]);
      if (!count || !(span > 0) || !Number.isFinite(span)) throw Error('No valid crease geometry was found.');
      if (!boundaries) throw Error('The paper boundary is missing. Use a closed black outline for the paper edge.');
      const s = 400/span;
      group.setAttribute('transform',`matrix(${s} 0 0 ${s} ${-bounds[0]*s} ${-bounds[1]*s})`);
      output.setAttribute('viewBox','0 0 400 400');
      return { svg:new XMLSerializer().serializeToString(output), ignored };
    } finally { frame.remove(); }
  }

  function prepareFOLD(text) {
    let f;
    try { f = JSON.parse(text.replace(/^\uFEFF/,'')); } catch { throw Error('The FOLD file is not valid JSON.'); }
    if (!f || !Array.isArray(f.vertices_coords) || !Array.isArray(f.edges_vertices)) throw Error('FOLD needs vertices_coords and edges_vertices. Export a frame containing its full vertices and edges.');
    const v = f.vertices_coords, e = f.edges_vertices;
    if (v.length < 3 || !e.length || v.some(p => !Array.isArray(p) || ![2,3].includes(p.length) || p.some(x => !Number.isFinite(x)))) throw Error('FOLD vertex coordinates are invalid.');
    if (e.some(p => !Array.isArray(p) || p.length!==2 || p[0]===p[1] || p.some(i => !Number.isInteger(i) || i<0 || i>=v.length))) throw Error('FOLD edges contain invalid vertex indices.');
    const a = f.edges_assignment;
    if (!Array.isArray(a) || a.length!==e.length || a.some(x => !['B','M','V','F','U','C'].includes(x))) throw Error('FOLD needs edges_assignment values (B/M/V/F/U/C) for every edge.');
    const angles = f.edges_foldAngle || a.map(x => x==='M' ? -180 : x==='V' ? 180 : x==='F' ? 0 : null);
    if (!Array.isArray(angles) || angles.length!==e.length || angles.some(x => x!==null && (!Number.isFinite(x) || Math.abs(x)>180))) throw Error('FOLD fold angles must be between -180° and 180°.');
    const planarXY = v.every(p => p.length===2 || Math.abs(p[2]-(v[0][2]||0))<1e-8);
    const planarXZ = v.every(p => p.length===3 && Math.abs(p[1]-v[0][1])<1e-8);
    if (!planarXY && !planarXZ) {
      if (!Array.isArray(f.faces_vertices) || !f.faces_vertices.length || f.faces_vertices.some(p => !Array.isArray(p) || p.length<3 || p.some(i => !Number.isInteger(i) || i<0 || i>=v.length))) throw Error('A 3D FOLD model needs valid faces_vertices face data.');
      return { fold:{...f,edges_foldAngle:angles} };
    }
    // Feed planar FOLD through upstream SVG planarization as well: crossings and
    // missing faces must be processed before the solver sees the graph.
    const coords = v.map(p => [p[0],p[planarXY ? 1 : 2]]);
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    coords.forEach(([x,y])=>{minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);});
    const span=Math.max(maxX-minX,maxY-minY);
    if (!(span>0)) throw Error('The FOLD paper size is zero.');
    const palette={B:'#000000',M:'#ff0000',V:'#0000ff',F:'#ffff00',U:'#ff00ff',C:'#00ff00'};
    let svg='<svg xmlns="'+NS+'" viewBox="0 0 400 400">';
    e.forEach(([i,j],k)=>{
      const p=coords[i].map((x,d)=>(x-(d?minY:minX))*400/span), q=coords[j].map((x,d)=>(x-(d?minY:minX))*400/span);
      const angle=angles[k], color=angle===0 && (a[k]==='M'||a[k]==='V') ? palette.F : (a[k]==='M'||a[k]==='V') && angle!==null ? (angle<0?palette.M:palette.V) : palette[a[k]];
      svg+=`<line x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}" stroke="${color}" opacity="${angle===null || angle===0 ? 1 : Math.abs(angle)/180}"/>`;
    });
    return {svg:svg+'</svg>',ignored:0,exact:true};
  }

  function designerSVG(cp) {
    if (cp.sourcePreset?.support && cp.paperShape === cp.sourcePreset.paper) {
      const palette={mountain:'#ff0000',valley:'#0000ff'};
      const edges=[...cp.sourcePreset.support,...cp.lines.filter(l=>palette[l.lt]).map(l=>({...l,color:palette[l.lt]}))];
      return `<svg xmlns="${NS}" viewBox="-200 -200 400 400">`+edges.map(l=>`<line x1="${l.p1.x}" y1="${l.p1.y}" x2="${l.p2.x}" y2="${l.p2.y}" stroke="${l.color}" opacity="${l.opacity ?? 1}"/>`).join('')+'</svg>';
    }
    const h=cp.SIZE/2,aspect=Math.max(.15,Math.min(8,Number(cp.paperAspect)||2)),pw=cp.paperShape==='rect'?(aspect>=1?cp.SIZE:cp.SIZE*aspect):cp.SIZE,ph=cp.paperShape==='rect'?(aspect>=1?cp.SIZE/aspect:cp.SIZE):cp.SIZE;
    const paper=cp.paperShape==='hex' ? Array.from({length:6},(_,i)=>({x:Math.cos(Math.PI/6+i*Math.PI/3)*h,y:Math.sin(Math.PI/6+i*Math.PI/3)*h})) : [{x:-pw/2,y:-ph/2},{x:pw/2,y:-ph/2},{x:pw/2,y:ph/2},{x:-pw/2,y:ph/2}];
    let svg=`<svg xmlns="${NS}" viewBox="${-h} ${-h} ${cp.SIZE} ${cp.SIZE}"><polygon points="${paper.map(p=>p.x+','+p.y).join(' ')}" fill="none" stroke="#000000"/>`;
    let count=0;
    for (const l of cp.lines) {
      if (!['mountain','valley'].includes(l.lt)) continue;
      if (![l.p1.x,l.p1.y,l.p2.x,l.p2.y].every(Number.isFinite)) continue;
      // Clip to convex paper, so drawing outside the sheet cannot grow extra faces.
      let t0=0,t1=1; const dx=l.p2.x-l.p1.x,dy=l.p2.y-l.p1.y;
      for (let i=0;i<paper.length;i++) {
        const a=paper[i],b=paper[(i+1)%paper.length],ex=b.x-a.x,ey=b.y-a.y;
        const start=ex*(l.p1.y-a.y)-ey*(l.p1.x-a.x),delta=ex*dy-ey*dx;
        if (Math.abs(delta)<1e-12) {if(start < -1e-8) t1=-1;}
        else if (delta>0) t0=Math.max(t0,-start/delta); else t1=Math.min(t1,-start/delta);
      }
      if (t1-t0<1e-8 || Math.hypot(dx,dy)<1e-8) continue;
      const opacity = Number.isFinite(l.opacity) ? Math.max(0, Math.min(1, l.opacity)) : 1;
      svg+=`<line x1="${l.p1.x+t0*dx}" y1="${l.p1.y+t0*dy}" x2="${l.p1.x+t1*dx}" y2="${l.p1.y+t1*dy}" stroke="${l.lt==='mountain'?'#ff0000':'#0000ff'}" opacity="${opacity}"/>`; count++;
    }
    if (!count) throw Error('Draw at least one mountain or valley fold first. Grey guide lines are not simulated.');
    return svg+'</svg>';
  }
  window.CPImport = {prepareSVG,prepareFOLD,designerSVG};
})();
