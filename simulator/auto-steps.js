// auto-steps.js — 自动生成分步折叠序列（基于折纸逻辑）+ 穿模量化对比
// 原理：真实折纸每步只折一两条折痕。穿模的根源是"所有折痕同时转"。
// 自动分组策略：折痕按"长度降序"排列（长折痕=大结构先折，短折痕=细节后折），
// 每 2 条一组 → 每步只动 2 条折痕 → 中间态合法度大幅提升。
import { buildFoldable, buildSteps, foldSteps } from './src/fold-engine.js';
import fs from 'node:fs';

// ── 线段-三角形相交 ──
function segTri(p1, p2, t1, t2, t3, eps = 1e-6) {
  const d = [p2[0]-p1[0], p2[1]-p1[1], p2[2]-p1[2]];
  const e1 = [t2[0]-t1[0], t2[1]-t1[1], t2[2]-t1[2]];
  const e2 = [t3[0]-t1[0], t3[1]-t1[1], t3[2]-t1[2]];
  const h = cross(d, e2);
  const a = dot(e1, h);
  if (Math.abs(a) < eps) return false;
  const fv = [p1[0]-t1[0], p1[1]-t1[1], p1[2]-t1[2]];
  const u = dot(fv, h) / a;
  if (u < 0 || u > 1) return false;
  const q = cross(fv, e1);
  const v = dot(d, q) / a;
  if (v < 0 || u + v > 1) return false;
  const t = dot(e2, q) / a;
  return t > eps && t < 1 - eps;
}
function dot(a, b) { return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]; }
function cross(a, b) { return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]; }
function triIntersect(ta, tb) {
  const [a, b, c] = ta, [d, e, f] = tb;
  for (const [p1, p2, t] of [[e, f, ta], [f, d, ta], [d, e, ta], [b, c, tb], [c, a, tb], [a, b, tb]]) {
    if (segTri(p1, p2, t[0], t[1], t[2])) return true;
  }
  return false;
}
function faceTris(result, face) {
  const out = [];
  for (let i = 1; i < face.length - 1; i++) {
    out.push([result.verts3D[face[0]], result.verts3D[face[i]], result.verts3D[face[i+1]]]);
  }
  return out;
}
function countIntersections(result) {
  const allTris = [];
  result.faces.forEach((face, fi) => {
    for (const t of faceTris(result, face)) allTris.push({ fi, t });
  });
  let count = 0;
  for (let i = 0; i < allTris.length; i++) {
    for (let j = i + 1; j < allTris.length; j++) {
      if (Math.abs(allTris[i].fi - allTris[j].fi) < 2) continue;
      if (triIntersect(allTris[i].t, allTris[j].t)) count++;
    }
  }
  return count;
}

// ── 自动分组：折痕按长度降序，每 n 条一组 ──
function autoSteps(model, groupSize = 2) {
  // 非边界折痕（M/V），按长度降序
  const creases = model.cp
    .map((s, i) => ({ i, len: Math.hypot(s.p2[0]-s.p1[0], s.p2[1]-s.p1[1]), type: s.type }))
    .filter(c => c.type === 'M' || c.type === 'V')
    .sort((a, b) => b.len - a.len);
  const steps = [];
  for (let i = 0; i < creases.length; i += groupSize) {
    const group = creases.slice(i, i + groupSize).map(c => c.i);
    const isPreCrease = i < groupSize; // 最长的几条当预折
    steps.push({
      creases: group,
      angle: Math.PI,
      desc: isPreCrease
        ? `Step ${steps.length + 1}: Pre-crease the main lines`
        : `Step ${steps.length + 1}: Fold the next creases`,
    });
  }
  return steps;
}

// ── 主流程：对比 自动分步 vs 同时折叠 的穿模 ──
const data = JSON.parse(fs.readFileSync('./models-data.json', 'utf8'));
console.log('模型 | 分步步骤数 | 分步穿模(中间采样) | 同时折叠穿模(0.5)');
let totalImprove = 0, totalWorse = 0;
for (const [id, m] of Object.entries(data)) {
  const f = buildFoldable(m.cp);
  if (f.faces.length < 4) continue;

  // 自动分步
  const steps = autoSteps(m, 2);
  const built = buildSteps(f, steps);

  // 分步折叠：采样所有步骤中间态，统计穿模
  let stepIntersect = 0, samples = 0;
  for (let s = 0; s < built.length; s++) {
    for (const t of [0.3, 0.6, 0.9]) {
      const r = foldSteps(f, built, s, t);
      stepIntersect += countIntersections(r);
      samples++;
    }
  }
  const avgStep = stepIntersect / samples;

  // 同时折叠（旧方案）
  const rS = (await import('./src/fold-engine.js')).computeFolding(f, 0.5, { layered: false });
  const cS = countIntersections(rS);

  const mark = avgStep < cS ? '✓ 改善' : avgStep > cS ? '✗ 变差' : '=';
  if (avgStep < cS) totalImprove++; else if (avgStep > cS) totalWorse++;
  console.log(`${id.padEnd(16)} | ${String(built.length).padStart(5)} | ${String(avgStep.toFixed(1)).padStart(10)} | ${String(cS).padStart(8)} ${mark}`);
}
console.log(`\n改善模型: ${totalImprove}, 变差模型: ${totalWorse}`);
