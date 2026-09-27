// intersect-check.js — 量化对比分层 vs 同时折叠的穿模数量
import { buildFoldable, computeFolding } from './src/fold-engine.js';
import fs from 'node:fs';

// 线段-三角形相交（Möller–Trumbore）
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

// 穿模计数（跳过相邻面片）
function countIntersections(result) {
  const allTris = [];
  result.faces.forEach((face, fi) => {
    for (const t of faceTris(result, face)) allTris.push({ fi, t });
  });
  let count = 0;
  for (let i = 0; i < allTris.length; i++) {
    for (let j = i + 1; j < allTris.length; j++) {
      const a = allTris[i], b = allTris[j];
      if (Math.abs(a.fi - b.fi) < 2) continue;
      if (triIntersect(a.t, b.t)) count++;
    }
  }
  return count;
}

const data = JSON.parse(fs.readFileSync('./models-data.json', 'utf8'));
console.log('模型 | 分层穿模 | 同时折叠穿模 (progress=0.5)');
for (const [id, m] of Object.entries(data)) {
  const f = buildFoldable(m.cp);
  if (f.faces.length < 4) continue;
  const rL = computeFolding(f, 0.5, { layered: true });
  const rS = computeFolding(f, 0.5, { layered: false });
  const cL = countIntersections(rL);
  const cS = countIntersections(rS);
  const mark = cS > cL ? '✓ 改善' : cS === cL ? '=' : '✗ 变差';
  console.log(`${id.padEnd(16)} | ${String(cL).padStart(5)} | ${String(cS).padStart(7)} ${mark}`);
}
