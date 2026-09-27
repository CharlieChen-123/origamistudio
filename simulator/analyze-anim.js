// 分析顶点插值动画中间态的面片变形（拉伸/翻转）——这决定"穿模+重叠"视觉感
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
const steps = m.steps.map(st => ({
  creaseEdges: (st.creases || []).flatMap(si => segToEdges[si] || []),
  angle: (st.angle ?? 180) * Math.PI / 180,
}));

function creaseAnglesForStep(s, t) {
  const n = f.edges.length;
  const angles = new Array(n).fill(0);
  for (let i = 0; i < steps.length; i++) {
    const st = steps[i];
    let tt = 0;
    if (i < s) tt = 1;
    else if (i === s) tt = t;
    for (const ei of st.creaseEdges) angles[ei] = st.angle * tt;
  }
  return angles;
}

// 预计算 stateCache（修复后语义）
const states = [computeFolding(f, 1, Math.PI, new Array(f.edges.length).fill(0))];
for (let s = 0; s < steps.length; s++) states.push(computeFolding(f, 1, Math.PI, creaseAnglesForStep(s, 1)));

// 面片边长拉伸率：插值中间态 vs 原始 2D
function edgeStretch(result, t) {
  let maxRatio = 0, flipped = 0, total = 0;
  for (const face of f.faces) {
    for (let i = 0; i < face.length; i++) {
      const a = face[i], b = face[(i+1) % face.length];
      const l0 = Math.hypot(f.vertices[a][0]-f.vertices[b][0], f.vertices[a][1]-f.vertices[b][1]);
      if (l0 < 1e-9) continue;
      const p = result.verts3D[a], q = result.verts3D[b];
      const l1 = Math.hypot(p[0]-q[0], p[1]-q[1], p[2]-q[2]);
      const ratio = Math.abs(l1 - l0) / l0;
      if (ratio > maxRatio) maxRatio = ratio;
      total++;
    }
  }
  return maxRatio;
}

// 面片法线翻转检测（面积符号变化）
function faceFlipped(result) {
  let flipped = 0;
  for (const face of f.faces) {
    // 计算 2D 原始符号（CCW = 正）
    let s0 = 0;
    for (let i = 0; i < face.length; i++) {
      const [x1, y1] = f.vertices[face[i]];
      const [x2, y2] = f.vertices[face[(i+1)%face.length]];
      s0 += x1*y2 - x2*y1;
    }
    // 3D 插值态的投影面积符号（z 分量叉积和）
    let s1 = 0;
    for (let i = 0; i < face.length; i++) {
      const p = result.verts3D[face[i]], q = result.verts3D[face[(i+1)%face.length]];
      s1 += p[0]*q[1] - p[1]*q[0];
    }
    if (s0 * s1 < -1e-6) flipped++;
  }
  return flipped;
}

console.log('=== 顶点插值动画中间态面片变形分析（crane）===');
console.log('步骤 | 完成态z范围 | 插值50%最大边拉伸 | 插值50%翻转面数');
for (let s = 0; s <= steps.length; s++) {
  const zs = states[s].verts3D.map(v => v[2]);
  const zr = [Math.min(...zs), Math.max(...zs)];
  if (s === 0 || s === 1 || s === 2 || s === 5 || s === 10 || s === steps.length) {
    // 插值中间态：states[s-1] → states[s] 50%
    if (s >= 1) {
      const from = states[s-1], to = states[s];
      const interp = from.verts3D.map((v, k) => [v[0]+(to.verts3D[k][0]-v[0])*0.5, v[1]+(to.verts3D[k][1]-v[1])*0.5, v[2]+(to.verts3D[k][2]-v[2])*0.5]);
      const stretch = edgeStretch({ verts3D: interp }, 0.5);
      const flip = faceFlipped({ verts3D: interp });
      console.log(`步骤${String(s).padStart(2)}/20 | z ${zr[0].toFixed(0)}~${zr[1].toFixed(0)} | 拉伸 ${(stretch*100).toFixed(1)}% | 翻转 ${flip} 面`);
    }
  }
}

// 关键对比：单折痕渐进（每步只折1条）中间态 vs 顶点插值中间态
console.log('\n=== 方案对比：步骤5 动画中间态 ===');
console.log('当前方案（顶点插值，步骤5→6 之间 t=0.5）:');
{
  const from = states[5], to = states[6];
  const interp = from.verts3D.map((v, k) => [v[0]+(to.verts3D[k][0]-v[0])*0.5, v[1]+(to.verts3D[k][1]-v[1])*0.5, v[2]+(to.verts3D[k][2]-v[2])*0.5]);
  console.log('  最大边拉伸:', (edgeStretch({verts3D: interp})*100).toFixed(1)+'%', '翻转面:', faceFlipped({verts3D: interp}));
}
