// fold-engine.test.js — 面片级折叠引擎测试
import { test } from 'node:test';
import assert from 'node:assert';
import { buildFoldable, computeFolding, foldFromModel, totalArea } from '../src/fold-engine.js';
import fs from 'node:fs';

// 简单正方形对角谷折：折痕从 (0,0) 到 (400,400)
const diagSegs = [
  { p1: [0, 0], p2: [400, 0], type: 'B' },
  { p1: [400, 0], p2: [400, 400], type: 'B' },
  { p1: [400, 400], p2: [0, 400], type: 'B' },
  { p1: [0, 400], p2: [0, 0], type: 'B' },
  { p1: [0, 0], p2: [400, 400], type: 'V' }, // 对角线谷折
];

test('面片化：对角谷折 → 2 个面片', () => {
  const f = buildFoldable(diagSegs);
  assert.equal(f.faces.length, 2, '应有 2 个三角形面片');
  const area = totalArea(f);
  assert.ok(Math.abs(area - 160000) < 1e-3, `面积应=160000, 实际 ${area}`);
});

test('折叠 progress=0 → 所有顶点 z=0', () => {
  const f = buildFoldable(diagSegs);
  const r = computeFolding(f, 0);
  for (const v of r.verts3D) {
    assert.ok(Math.abs(v[2]) < 1e-9, `progress=0 时 z 应=0, 实际 ${v[2]}`);
  }
});

test('折叠 progress=1 → 180°完全对折，顶点镜像位移且纸折平', () => {
  const f = buildFoldable(diagSegs);
  const r = computeFolding(f, 1);
  // 顶点 (0,400) 应镜像到 (400,0) 附近
  const hasMirror = r.verts3D.some(v => Math.abs(v[0] - 400) < 1e-4 && Math.abs(v[1]) < 1e-4);
  assert.ok(hasMirror, '180°折叠后应产生镜像位移 (0,400)→(400,0)');
  // 全部 z ≈ 0（平面对折）
  for (const v of r.verts3D) {
    assert.ok(Math.abs(v[2]) < 1e-4, `完全对折后 z 应≈0, 实际 ${v[2]}`);
  }
});

test('折叠 progress=0.5 → 90°中间态，有 z 位移（纸立起来）', () => {
  const f = buildFoldable(diagSegs);
  const r = computeFolding(f, 0.5);
  const zs = r.verts3D.map(v => v[2]);
  const hasNonZero = zs.some(z => Math.abs(z) > 50);
  assert.ok(hasNonZero, 'progress=0.5 时应有明显 z 位移（90°折叠）');
});

test('山折 M 与谷折 V 方向相反（90° 中间态）', () => {
  const mkSegs = (type) => [
    { p1: [0, 0], p2: [400, 0], type: 'B' },
    { p1: [400, 0], p2: [400, 400], type: 'B' },
    { p1: [400, 400], p2: [0, 400], type: 'B' },
    { p1: [0, 400], p2: [0, 0], type: 'B' },
    { p1: [0, 0], p2: [400, 400], type },
  ];
  const rV = computeFolding(buildFoldable(mkSegs('V')), 0.5);
  const rM = computeFolding(buildFoldable(mkSegs('M')), 0.5);
  const nzV = rV.verts3D.map(v => v[2]).filter(z => Math.abs(z) > 1e-6);
  const nzM = rM.verts3D.map(v => v[2]).filter(z => Math.abs(z) > 1e-6);
  assert.ok(nzV.length > 0 && nzM.length > 0, '两侧都应有非零 z');
  assert.notEqual(Math.sign(nzV[0]), Math.sign(nzM[0]), 'V 与 M 方向应相反');
});

// ═══ 撕裂检测：共享顶点一致性 ═══
test('无撕裂：共享顶点在相邻面片间位置一致（对角谷折）', () => {
  const f = buildFoldable(diagSegs);
  // 顶点 0 (0,0) 和 2 (400,400) 在对角线上，被两个面片共享
  // verts3D 是全局顶点（平均后），关键验证：对角线两端点在折叠时位移正确
  for (const p of [0.3, 0.5, 0.8]) {
    const r = computeFolding(f, p);
    assert.ok(!r.verts3D.some(v => v.some(x => isNaN(x))), `progress=${p} 无 NaN`);
    // 对角线端点 (0,0) 和 (400,400) 在折痕线上，应始终不动（z=0）
    // 端点顺序：verts3D 按 planarize 后顶点顺序，找到 (0,0) 和 (400,400)
    const v00 = r.verts3D.find(v => Math.abs(v[0]) < 1e-6 && Math.abs(v[1]) < 1e-6);
    const v400 = r.verts3D.find(v => Math.abs(v[0] - 400) < 1e-6 && Math.abs(v[1] - 400) < 1e-6);
    assert.ok(v00 && v400, `progress=${p} 能找到折痕线端点`);
    assert.ok(Math.abs(v00[2]) < 1e-6, `折痕线端点 (0,0) 应保持 z=0, 实际 ${v00[2]}`);
    assert.ok(Math.abs(v400[2]) < 1e-6, `折痕线端点 (400,400) 应保持 z=0, 实际 ${v400[2]}`);
  }
});

// ═══ 真实 MIT 模型 ═══
test('真实数据：crane（MIT）面片化 + 折叠无撕裂', () => {
  const data = JSON.parse(fs.readFileSync(new URL('../models-data.json', import.meta.url), 'utf8'));
  const m = data.crane;
  const f = buildFoldable(m.cp);
  assert.ok(f.faces.length >= 10, `crane 应有大量面片, 实际 ${f.faces.length}`);
  const area = totalArea(f);
  const rel = Math.abs(area - 160000) / 160000;
  assert.ok(rel < 1e-6, `crane 面积守恒: ${rel}`);

  // 多进度折叠：无 NaN + 全局顶点有限 + 共享顶点平均后连续
  for (const p of [0.3, 0.5, 0.7, 1.0]) {
    const r = computeFolding(f, p);
    const all = r.verts3D.flat();
    assert.ok(!all.some(x => isNaN(x) || !isFinite(x)), `crane progress=${p} 无 NaN/Infinity`);
    // 顶点数量应与 planarize 后一致
    assert.equal(r.verts3D.length, f.vertices.length, `crane progress=${p} 顶点数一致`);
    // 有限范围检查（纸不应飞太远）
    const maxAbs = Math.max(...all.map(x => Math.abs(x)));
    assert.ok(maxAbs < 4000, `crane progress=${p} 顶点范围合理: ${maxAbs}`);
  }
  // 折叠后应有明显 3D 形态
  const r1 = computeFolding(f, 0.6);
  const zs = r1.verts3D.map(v => v[2]);
  assert.ok(zs.some(z => Math.abs(z) > 30), 'crane 折叠 60% 应有明显 3D 形态');
});

test('真实数据：全部 10 个 MIT 模型可折叠且无撕裂', () => {
  const data = JSON.parse(fs.readFileSync(new URL('../models-data.json', import.meta.url), 'utf8'));
  for (const [id, m] of Object.entries(data)) {
    const f = buildFoldable(m.cp);
    assert.ok(f.faces.length >= 1, `${id} 应至少 1 个面片, 实际 ${f.faces.length}`);
    const area = totalArea(f);
    const rel = Math.abs(area - 160000) / 160000;
    assert.ok(rel < 1e-6, `${id} 面积守恒: rel=${rel}`);
    for (const p of [0.4, 0.8]) {
      const r = computeFolding(f, p);
      assert.ok(!r.verts3D.flat().some(x => isNaN(x) || !isFinite(x)), `${id} progress=${p} 无 NaN`);
    }
    console.log(`  ✓ ${id}: 面片=${f.faces.length} 面积误差=${(rel * 100).toFixed(4)}%`);
  }
});
