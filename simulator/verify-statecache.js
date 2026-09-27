// 验证 stateCache 修复（使用 fold-engine.js 正确签名：opts 对象）
// computeFolding(f, 1, { maxAngle: Math.PI, creaseAngles })
import { buildFoldable, computeFolding } from './src/fold-engine.js';
import fs from 'node:fs';

const html = fs.readFileSync('../archive/legacy-pages/origami-fold.html', 'utf8');
const start = html.indexOf('const MODELS = ') + 'const MODELS = '.length;
const end = html.indexOf('\n', start);
const models = JSON.parse(html.slice(start, end));
const m = models.crane;
const f = buildFoldable(m.cp);
const segToEdges = Array.from({ length: m.cp.length }, () => []);
(f.edgeSources || []).forEach((si, ei) => { if (segToEdges[si]) segToEdges[si].push(ei); });

// 复刻 HTML 内联 creaseAnglesForStep(s, t)：前 s 步完成、第 s 步动画到 t、后续 0
function creaseAnglesForStep(s, t) {
  const n = f.edges.length;
  const angles = new Array(n).fill(0);
  for (let i = 0; i < m.steps.length; i++) {
    const st = m.steps[i];
    let tt = 0;
    if (i < s) tt = 1;
    else if (i === s) tt = t;
    const target = (st.angle ?? 180) * Math.PI / 180;
    for (const si of st.creases || []) {
      for (const ei of segToEdges[si] || []) angles[ei] = target * tt;
    }
  }
  return angles;
}

// 穿模检测
function countIntersections(result) {
  const tris = [];
  result.faces.forEach((face, fi) => {
    for (let i = 1; i < face.length - 1; i++) tris.push({ fi, t: [result.verts3D[face[0]], result.verts3D[face[i]], result.verts3D[face[i+1]]] });
  });
  let c = 0;
  for (let i = 0; i < tris.length; i++) for (let j = i+1; j < tris.length; j++) {
    if (Math.abs(tris[i].fi - tris[j].fi) < 2) continue;
    if (triHit(tris[i].t, tris[j].t)) c++;
  }
  return c;
}
function triHit(a, b) {
  for (const [p1,p2,t] of [[b[1],b[2],a],[b[2],b[0],a],[b[0],b[1],a],[a[1],a[2],b],[a[2],a[0],b],[a[0],a[1],b]]) if (segTri(p1,p2,t)) return true;
  return false;
}
function segTri(p1,p2,t,eps=1e-6) {
  const d=[p2[0]-p1[0],p2[1]-p1[1],p2[2]-p1[2]], e1=[t[1][0]-t[0][0],t[1][1]-t[0][1],t[1][2]-t[0][2]], e2=[t[2][0]-t[0][0],t[2][1]-t[0][1],t[2][2]-t[0][2]];
  const h=[d[1]*e2[2]-d[2]*e2[1],d[2]*e2[0]-d[0]*e2[2],d[0]*e2[1]-d[1]*e2[0]];
  const aa=e1[0]*h[0]+e1[1]*h[1]+e1[2]*h[2];
  if(Math.abs(aa)<eps)return false;
  const fv=[p1[0]-t[0][0],p1[1]-t[0][1],p1[2]-t[0][2]];
  const u=(fv[0]*h[0]+fv[1]*h[1]+fv[2]*h[2])/aa;
  if(u<0||u>1)return false;
  const q=[fv[1]*e1[2]-fv[2]*e1[1],fv[2]*e1[0]-fv[0]*e1[2],fv[0]*e1[1]-fv[1]*e1[0]];
  const v=(d[0]*q[0]+d[1]*q[1]+d[2]*q[2])/aa;
  if(v<0||u+v>1)return false;
  const t2=(e2[0]*q[0]+e2[1]*q[1]+e2[2]*q[2])/aa;
  return t2>eps&&t2<1-eps;
}

// stateCache（修复后语义）
const states = [];
states.push(computeFolding(f, 1, { maxAngle: Math.PI, creaseAngles: new Array(f.edges.length).fill(0) }));
for (let s = 0; s < m.steps.length; s++) {
  const angles = creaseAnglesForStep(s, 1);
  states.push(computeFolding(f, 1, { maxAngle: Math.PI, creaseAngles: angles }));
}

console.log('=== 正确签名验证 stateCache（crane, ' + m.steps.length + ' 步）===');
const z0 = states[0].verts3D.map(v => v[2]);
console.log('stateCache[0]: z ' + Math.min(...z0).toExponential(1) + '~' + Math.max(...z0).toExponential(1) + ' ' + (z0.every(z=>Math.abs(z)<1e-9) ? '✓ 真平坦（全 0 角度）' : '✗ 不平坦!'));

let worst = { s: 0, c: 0 };
for (let i = 1; i <= m.steps.length; i++) {
  const st = states[i];
  const zs = st.verts3D.map(v => v[2]);
  const c = countIntersections(st);
  if (c > worst.c) worst = { s: i, c };
  const depth = Math.max(...zs) - Math.min(...zs);
  const hasNaN = st.verts3D.some(v => v.some(x => isNaN(x)));
  if (i <= 5 || i === m.steps.length || c > 0 || depth > 10) {
    console.log(`  Step ${String(i).padStart(2)}/${m.steps.length}: 穿模=${c} 立体度=${depth.toFixed(1)}${hasNaN ? ' ✗NaN' : c===0 ? ' ✓' : ' ✗'}`);
  }
}
console.log('最差穿模: Step ' + worst.s + ' = ' + worst.c);

// 顶点插值动画中间态面片翻转
console.log('\n=== 顶点插值动画中间态面片翻转/拉伸（正确签名）===');
function faceFlipped(result) {
  let flipped = 0;
  for (const face of f.faces) {
    let s0 = 0;
    for (let i = 0; i < face.length; i++) {
      const [x1, y1] = f.vertices[face[i]];
      const [x2, y2] = f.vertices[face[(i+1)%face.length]];
      s0 += x1*y2 - x2*y1;
    }
    let s1 = 0;
    for (let i = 0; i < face.length; i++) {
      const p = result.verts3D[face[i]], q = result.verts3D[face[(i+1)%face.length]];
      s1 += p[0]*q[1] - p[1]*q[0];
    }
    if (s0 * s1 < -1e-6) flipped++;
  }
  return flipped;
}
function edgeStretch(result) {
  let maxRatio = 0;
  for (const face of f.faces) {
    for (let i = 0; i < face.length; i++) {
      const a = face[i], b = face[(i+1) % face.length];
      const l0 = Math.hypot(f.vertices[a][0]-f.vertices[b][0], f.vertices[a][1]-f.vertices[b][1]);
      if (l0 < 1e-9) continue;
      const p = result.verts3D[a], q = result.verts3D[b];
      const l1 = Math.hypot(p[0]-q[0], p[1]-q[1], p[2]-q[2]);
      const ratio = Math.abs(l1 - l0) / l0;
      if (ratio > maxRatio) maxRatio = ratio;
    }
  }
  return maxRatio;
}
let worstFlip = { s: 0, f: 0 };
for (let i = 1; i <= m.steps.length; i++) {
  const from = states[i-1], to = states[i];
  for (const t of [0.3, 0.5, 0.7]) {
    const interp = from.verts3D.map((v, k) => [v[0]+(to.verts3D[k][0]-v[0])*t, v[1]+(to.verts3D[k][1]-v[1])*t, v[2]+(to.verts3D[k][2]-v[2])*t]);
    const fl = faceFlipped({ verts3D: interp });
    if (fl > worstFlip.f) worstFlip = { s: i, f: fl };
  }
}
console.log('顶点插值动画中间态最差面片翻转: Step ' + worstFlip.s + ' = ' + worstFlip.f + ' 面');
