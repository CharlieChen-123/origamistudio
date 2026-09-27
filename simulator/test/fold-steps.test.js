// fold-steps.test.js — 分步折叠（真实折纸步骤）测试
import { test } from 'node:test';
import assert from 'node:assert';
import { buildFoldable, buildSteps, creaseAnglesForSteps, foldSteps, computeFolding } from '../src/fold-engine.js';
import fs from 'node:fs';

// ═══ 简单模型：正方形 + 对角谷折 ═══
const diagSegs = [
  { p1: [0, 0], p2: [400, 0], type: 'B' },
  { p1: [400, 0], p2: [400, 400], type: 'B' },
  { p1: [400, 400], p2: [0, 400], type: 'B' },
  { p1: [0, 400], p2: [0, 0], type: 'B' },
  { p1: [0, 0], p2: [400, 400], type: 'V' }, // 对角线谷折（线段索引 4）
];

test('buildSteps：原始线段 → 剖分边映射', () => {
  const f = buildFoldable(diagSegs);
  const steps = buildSteps(f, [
    { creases: [4], angle: Math.PI, desc: 'Fold diagonal' },
  ]);
  assert.equal(steps.length, 1);
  assert.ok(steps[0].creaseEdges.length >= 1, '对角线应映射到至少1条剖分边');
});

test('creaseAnglesForSteps：前步骤保持，当前步动画，后续为0', () => {
  const f = buildFoldable(diagSegs);
  const steps = buildSteps(f, [
    { creases: [4], angle: Math.PI },
    { creases: [0], angle: Math.PI }, // 边界线（无实际折叠，仅测API）
  ]);
  // stepIdx=1, stepT=0.5：第1步(对角线)已折完=π，第2步=π×0.5，其余0
  const angles = creaseAnglesForSteps(f, steps, 1, 0.5);
  const diagEdges = steps[0].creaseEdges;
  for (const ei of diagEdges) {
    assert.ok(Math.abs(angles[ei] - Math.PI) < 1e-9, `对角线边 ${ei} 应=π, 实际 ${angles[ei]}`);
  }
});

test('分步折叠：第1步完成时对角线折好，纸立起', () => {
  const f = buildFoldable(diagSegs);
  const steps = buildSteps(f, [
    { creases: [4], angle: Math.PI, desc: 'Fold diagonal' },
  ]);
  const r0 = foldSteps(f, steps, 0, 0); // 未折
  for (const v of r0.verts3D) assert.ok(Math.abs(v[2]) < 1e-9, 'step0 z=0');
  const r1 = foldSteps(f, steps, 1, 1); // 第1步完成
  // 180° 完全对折：应镜像
  const hasMirror = r1.verts3D.some(v => Math.abs(v[0] - 400) < 1e-3 && Math.abs(v[1]) < 1e-3);
  assert.ok(hasMirror, '180°折叠后应有镜像位移');
});

test('分步动画：stepT 中间值应有过渡 z 位移', () => {
  const f = buildFoldable(diagSegs);
  const steps = buildSteps(f, [{ creases: [4], angle: Math.PI }]);
  const rMid = foldSteps(f, steps, 0, 0.5); // 当前步动画到一半
  const zs = rMid.verts3D.map(v => v[2]);
  assert.ok(zs.some(z => Math.abs(z) > 50), '动画中间应有 z 位移');
});

// ═══ 真实 MIT 模型：squareBase（正方形基底）分步折叠 ═══
// 正方形基底真实折法：1) 对角线谷折（预折）2) 中心线山折（预折）3) 收拢
test('真实数据：squareBase 分步折叠（3步）', () => {
  const data = JSON.parse(fs.readFileSync(new URL('../models-data.json', import.meta.url), 'utf8'));
  const m = data.squareBase;
  const f = buildFoldable(m.cp);
  // squareBase CP: #2 对角线谷折(135°)，#0/#1 中心线山折(0°/90°)，#3-6 边界
  const steps = buildSteps(f, [
    { creases: [2], angle: Math.PI, desc: 'Pre-crease diagonal (valley)' },
    { creases: [0, 1], angle: Math.PI, desc: 'Pre-crease center lines (mountain)' },
    { creases: [0, 1, 2], angle: Math.PI, desc: 'Collapse into square base' },
  ]);
  assert.equal(steps.length, 3);
  // 逐步折叠，每步无 NaN
  for (let s = 0; s <= steps.length; s++) {
    for (const t of [0, 0.5, 1]) {
      const r = foldSteps(f, steps, s, t);
      assert.ok(!r.verts3D.flat().some(x => isNaN(x) || !isFinite(x)), `step=${s} t=${t} 无 NaN`);
      assert.equal(r.verts3D.length, f.vertices.length, '顶点数不变');
    }
  }
  // 正方形基底是 flat-foldable：最终完成态回到平面（合法平坦态），
  // 但中间动画步骤应有立体过渡（这是教学演示的核心价值）
  const rAnim = foldSteps(f, steps, 2, 0.5); // 第3步动画中
  const zsAnim = rAnim.verts3D.map(v => v[2]);
  assert.ok(zsAnim.some(z => Math.abs(z) > 5), '动画中间步骤应有立体过渡');
  // 最终完成态：flat-foldable → z≈0（合法平坦态）
  const rDone = foldSteps(f, steps, 3, 0);
  const zs = rDone.verts3D.map(v => v[2]);
  assert.ok(zs.every(z => Math.abs(z) < 1e-3), 'squareBase 完成态应平坦');
});

// ═══ 全部 10 个模型：验证步骤序列可定义并折叠 ═══
test('全部 MIT 模型：分步折叠无 NaN（单步=全部折痕）', () => {
  const data = JSON.parse(fs.readFileSync(new URL('../models-data.json', import.meta.url), 'utf8'));
  for (const [id, m] of Object.entries(data)) {
    const f = buildFoldable(m.cp);
    // 若模型定义了 steps 则用之，否则 fallback：一步全折
    const steps = m.steps
      ? buildSteps(f, m.steps.map(st => ({ creases: st.creases, angle: st.angle ?? Math.PI, desc: st.desc })))
      : buildSteps(f, [{ creases: m.cp.map((_, i) => i).filter(i => m.cp[i].type !== 'B'), angle: Math.PI }]);
    for (const t of [0, 0.5, 1]) {
      const r = foldSteps(f, steps, steps.length, t);
      assert.ok(!r.verts3D.flat().some(x => isNaN(x) || !isFinite(x)), `${id} 全折 t=${t} 无 NaN`);
    }
    console.log(`  ✓ ${id}: 步骤=${steps.length}`);
  }
});
