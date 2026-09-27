// geometry.test.js — 几何数学库单测
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  dot, cross, normalize, dist, pointPlaneDist, planeSide,
  rotationMatrix, reflectionMatrix, transformPoint,
  creaseLine, segmentIntersect2D, pointInPolygon2D, polygonArea2D, wrapAngle,
} from '../src/geometry.js';

test('dot/cross 基本性质', () => {
  assert.equal(dot([1, 0, 0], [0, 1, 0]), 0);
  assert.deepEqual(cross([1, 0, 0], [0, 1, 0]), [0, 0, 1]);
  const n = normalize([3, 4, 0]);
  assert.ok(Math.abs(n[0] - 0.6) < 1e-12 && Math.abs(n[1] - 0.8) < 1e-12);
});

test('dist 距离', () => {
  assert.equal(dist([0, 0, 0], [3, 4, 0]), 5);
});

test('pointPlaneDist 带符号距离', () => {
  // 平面 z=0（法线朝+z），点 (1,1,5) 距离 +5
  assert.ok(Math.abs(pointPlaneDist([1, 1, 5], [0, 0, 0], [0, 0, 1]) - 5) < 1e-9);
  assert.equal(planeSide([1, 1, 5], [0, 0, 0], [0, 0, 1]), 1);
  assert.equal(planeSide([1, 1, -5], [0, 0, 0], [0, 0, 1]), -1);
  assert.equal(planeSide([1, 1, 0], [0, 0, 0], [0, 0, 1]), 0);
});

test('rotationMatrix: 绕 Z 轴转 90°', () => {
  // 绕 z 轴（过原点，方向 (0,0,1)）旋转 90°
  const M = rotationMatrix([0, 0, 0], [0, 0, 1], Math.PI / 2);
  const p = transformPoint(M, [1, 0, 0]);
  assert.ok(Math.abs(p[0]) < 1e-9 && Math.abs(p[1] - 1) < 1e-9, `got ${p}`);
});

test('rotationMatrix: 绕任意点旋转（不在原点）', () => {
  // 绕 (5,5) 点旋转 180°，(10,5) 应到 (0,5)
  const M = rotationMatrix([5, 5, 0], [0, 0, 1], Math.PI);
  const p = transformPoint(M, [10, 5, 0]);
  assert.ok(Math.abs(p[0]) < 1e-9 && Math.abs(p[1] - 5) < 1e-9, `got ${p}`);
});

test('reflectionMatrix: 关于 z=0 平面的镜像', () => {
  const M = reflectionMatrix([0, 0, 0], [0, 0, 1]);
  const p = transformPoint(M, [1, 2, 3]);
  assert.deepEqual(p.map(x => Math.round(x * 1e9) / 1e9), [1, 2, -3]);
});

test('reflectionMatrix: 关于斜平面的镜像（点到平面距离不变）', () => {
  // 平面 x=y（法线 (1,-1,0) 的平行方向，取 (1,-1,0)）
  const M = reflectionMatrix([0, 0, 0], [1, -1, 0]);
  const p = transformPoint(M, [3, 1, 0]); // (3,1) 关于 x=y 镜像 → (1,3)
  assert.ok(Math.abs(p[0] - 1) < 1e-9 && Math.abs(p[1] - 3) < 1e-9, `got ${p}`);
});

test('creaseLine: 水平折叠平面的折痕线', () => {
  // 平面 y=5（法线 (0,1,0)），与 z=0 交线应为 y=5 的直线
  const line = creaseLine([0, 5, 0], [0, 1, 0]);
  assert.ok(line, '应有交线');
  assert.ok(Math.abs(line.point[1] - 5) < 1e-9, `point=${line.point}`);
  // 方向应平行于 x 轴（水平线）
  assert.ok(Math.abs(Math.abs(line.direction[0]) - 1) < 1e-9);
});

test('creaseLine: 垂直平面的折痕线', () => {
  // 平面与 z=0 平行（法线 (0,0,1)）→ 无交线
  const line = creaseLine([0, 0, 5], [0, 0, 1]);
  assert.equal(line, null);
});

test('segmentIntersect2D: 相交', () => {
  const r = segmentIntersect2D([0, 0], [10, 10], [0, 10], [10, 0]);
  assert.ok(r);
  assert.ok(Math.abs(r.point[0] - 5) < 1e-9 && Math.abs(r.point[1] - 5) < 1e-9);
});

test('segmentIntersect2D: 平行不相交', () => {
  assert.equal(segmentIntersect2D([0, 0], [10, 0], [0, 5], [10, 5]), null);
});

test('pointInPolygon2D: 点在多边形内/外', () => {
  const sq = [[0, 0], [10, 0], [10, 10], [0, 10]];
  assert.equal(pointInPolygon2D([5, 5], sq), true);
  assert.equal(pointInPolygon2D([15, 5], sq), false);
});

test('polygonArea2D: 面积与方向', () => {
  const ccw = [[0, 0], [4, 0], [4, 3]];
  assert.ok(Math.abs(polygonArea2D(ccw) - 6) < 1e-9); // 逆时针为正
  const cw = [[0, 0], [4, 3], [4, 0]];
  assert.ok(Math.abs(polygonArea2D(cw) + 6) < 1e-9); // 顺时针为负
});

test('wrapAngle 归一化', () => {
  assert.ok(Math.abs(wrapAngle(3 * Math.PI) - Math.PI) < 1e-9);
  assert.ok(Math.abs(wrapAngle(-3 * Math.PI) - (-Math.PI)) < 1e-9);
  assert.ok(Math.abs(wrapAngle(0.5)) - 0.5 < 1e-9);
});
