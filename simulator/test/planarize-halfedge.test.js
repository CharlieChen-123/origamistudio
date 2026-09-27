// planarize-halfedge.test.js — 面片化单测
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planarize, planarizeFold } from '../src/planarize.js';
import { buildFaces, totalFaceArea } from '../src/halfedge.js';
import { polygonArea2D } from '../src/geometry.js';
import { FoldModel } from '../src/fold-model.js';

/** 便捷：从线段列表直接构建面片 */
function facesFromSegments(segments) {
  // 先去重顶点
  const map = new Map();
  const verts = [];
  const edges = [];
  const key = (x, y) => `${(x / 1e-6).toFixed(0)},${(y / 1e-6).toFixed(0)}`;
  const idx = (x, y) => {
    const k = key(x, y);
    if (map.has(k)) return map.get(k);
    const id = verts.length;
    verts.push([x, y]);
    map.set(k, id);
    return id;
  };
  for (const [x1, y1, x2, y2] of segments) {
    const a = idx(x1, y1), b = idx(x2, y2);
    if (a !== b) edges.push([a, b]);
  }
  const p = planarize(verts, edges);
  return buildFaces(p.vertices, p.edges);
}

test('正方形：单个面，面积=边长²', () => {
  const { faces } = facesFromSegments([
    [0, 0, 10, 0], [10, 0, 10, 10], [10, 10, 0, 10], [0, 10, 0, 0],
  ]);
  assert.equal(faces.length, 1);
  assert.ok(Math.abs(polygonArea2D(faces[0].map(i => [[0,0],[10,0],[10,10],[0,10]][i])) - 100) < 1e-6);
});

test('正方形 + 对角线 → 2 个三角形，面积和守恒', () => {
  const { faces, boundary } = facesFromSegments([
    [0, 0, 10, 0], [10, 0, 10, 10], [10, 10, 0, 10], [0, 10, 0, 0],
    [0, 0, 10, 10], // 对角线
  ]);
  assert.equal(faces.length, 2);
  // 每个都是三角形
  for (const f of faces) assert.equal(f.length, 3);
  const total = totalFaceArea([[0,0],[10,0],[10,10],[0,10]], faces);
  assert.ok(Math.abs(total - 100) < 1e-6, `面积守恒失败: ${total}`);
  // 边界外环存在
  assert.ok(boundary.length >= 1);
});

test('X 型交叉：四条线段在中心交叉 → 剖分后 8 个面', () => {
  // 外框 + 4 条交叉线：两条对角线 X + 十字 +
  const segs = [
    [0, 0, 10, 0], [10, 0, 10, 10], [10, 10, 0, 10], [0, 10, 0, 0], // 外框
    [0, 0, 10, 10], [10, 0, 0, 10],   // 对角线 X
    [0, 5, 10, 5], [5, 0, 5, 10],     // 十字 +
  ];
  const map = new Map();
  const verts = [];
  const edges = [];
  const key = (x, y) => `${(x / 1e-6).toFixed(0)},${(y / 1e-6).toFixed(0)}`;
  const idx = (x, y) => {
    const k = key(x, y);
    if (map.has(k)) return map.get(k);
    const id = verts.length;
    verts.push([x, y]);
    map.set(k, id);
    return id;
  };
  for (const [x1, y1, x2, y2] of segs) {
    const a = idx(x1, y1), b = idx(x2, y2);
    if (a !== b) edges.push([a, b]);
  }
  const p = planarize(verts, edges);
  // 中心点应该被加入
  const hasCenter = p.vertices.some(v => Math.abs(v[0]-5)<1e-6 && Math.abs(v[1]-5)<1e-6);
  assert.ok(hasCenter, '中心交点应被剖分加入');
  const { faces } = buildFaces(p.vertices, p.edges);
  // 8 条放射线把正方形分成 8 个三角形
  assert.equal(faces.length, 8, `期望 8 面，实际 ${faces.length}`);
  const total = totalFaceArea(p.vertices, faces);
  assert.ok(Math.abs(total - 100) < 1e-6, `面积守恒失败: ${total}`);
});

test('T 型交点：横线终点落在竖线上 → 剖分', () => {
  const { faces } = facesFromSegments([
    [0, 0, 10, 0], [10, 0, 10, 10], [10, 10, 0, 10], [0, 10, 0, 0], // 外框
    [0, 5, 5, 5],  // 左半横线，终点 (5,5) 在内部
    [5, 5, 5, 10], // 竖线从 (5,5) 到顶边
  ]);
  // 面数应 > 1（至少被切成两块）
  assert.ok(faces.length >= 2, `期望 ≥2 面，实际 ${faces.length}`);
});

test('重合边：重复线段应被去重（不产生退化面）', () => {
  const { faces } = facesFromSegments([
    [0, 0, 10, 0], [10, 0, 10, 10], [10, 10, 0, 10], [0, 10, 0, 0],
    [0, 0, 10, 0], // 重复
  ]);
  assert.equal(faces.length, 1);
});

test('真实数据：crane.fold 面片化 + 面积守恒', async () => {
  const fs = await import('node:fs');
  const raw = fs.readFileSync(
    new URL('../../cp_examples/examples/crane.fold', import.meta.url), 'utf8');
  const fold = JSON.parse(raw);
  const model = new FoldModel(fold);
  assert.ok(model.edgeCount > 0, 'crane.fold 应有边');

  const p = planarizeFold(model);
  const { faces, boundary } = buildFaces(p.vertices, p.edges);
  assert.ok(faces.length >= 2, `crane 应被剖分成多面，实际 ${faces.length}`);
  assert.ok(boundary.length >= 1, '应有外边界环');

  // 面积守恒：面片面积和 ≈ 纸张面积（400×400）
  const total = totalFaceArea(p.vertices, faces);
  const paperArea = 400 * 400;
  const rel = Math.abs(total - paperArea) / paperArea;
  assert.ok(rel < 1e-4, `crane 面积守恒失败: total=${total}, 期望≈${paperArea}, 相对误差=${rel}`);
});

test('真实数据：frog.fold 面片化', async () => {
  const fs = await import('node:fs');
  const raw = fs.readFileSync(
    new URL('../../cp_examples/examples/frog.fold', import.meta.url), 'utf8');
  const fold = JSON.parse(raw);
  const model = new FoldModel(fold);
  const p = planarizeFold(model);
  const { faces } = buildFaces(p.vertices, p.edges);
  assert.ok(faces.length >= 2, `frog 应被剖分成多面，实际 ${faces.length}`);
  const total = totalFaceArea(p.vertices, faces);
  const paperArea = 400 * 400;
  const rel = Math.abs(total - paperArea) / paperArea;
  assert.ok(rel < 1e-4, `frog 面积守恒失败: rel=${rel}`);
});

test('真实数据：批量模型面片化，面积全守恒 + 无重复边', async () => {
  const fs = await import('node:fs');
  const names = ['crane', 'frog', 'boat', 'butterfly'];
  for (const name of names) {
    const raw = fs.readFileSync(
      new URL(`../../cp_examples/examples/${name}.fold`, import.meta.url), 'utf8');
    const model = new FoldModel(JSON.parse(raw));
    const p = planarizeFold(model);

    // 无重复无向边
    const seen = new Set();
    for (const [a, b] of p.edges) {
      const k = a < b ? `${a},${b}` : `${b},${a}`;
      assert.ok(!seen.has(k), `${name}: 存在重复边 ${k}`);
      seen.add(k);
    }

    const { faces, boundary } = buildFaces(p.vertices, p.edges);
    assert.ok(faces.length >= 2, `${name}: 面数 ${faces.length} 过少`);
    assert.equal(boundary.length, 1, `${name}: 应恰好 1 个外边界环`);

    const rel = Math.abs(totalFaceArea(p.vertices, faces) - 160000) / 160000;
    assert.ok(rel < 1e-6, `${name}: 面积守恒失败 rel=${rel}`);
  }
});
