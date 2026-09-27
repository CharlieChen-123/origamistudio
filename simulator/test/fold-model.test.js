// fold-model.test.js — FOLD 数据模型单测
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FoldModel, validateFold, foldFromSegments, ASSIGNMENT } from '../src/fold-model.js';

test('validateFold: 合法 FOLD 通过', () => {
  const ok = {
    vertices_coords: [[0, 0], [1, 0], [1, 1], [0, 1]],
    edges_vertices: [[0, 1], [1, 2], [2, 3], [3, 0], [0, 2]],
    edges_assignment: ['B', 'B', 'B', 'B', 'U'],
  };
  assert.deepEqual(validateFold(ok), []);
});

test('validateFold: 顶点索引越界被拒绝', () => {
  const bad = { vertices_coords: [[0, 0], [1, 0]], edges_vertices: [[0, 5]] };
  const errors = validateFold(bad);
  assert.ok(errors.some(e => e.includes('越界')));
});

test('validateFold: 非法赋值被拒绝', () => {
  const bad = {
    vertices_coords: [[0, 0], [1, 0]],
    edges_vertices: [[0, 1]],
    edges_assignment: ['X'],
  };
  const errors = validateFold(bad);
  assert.ok(errors.some(e => e.includes('非法')));
});

test('FoldModel: 加载 2D 自动补 z=0', () => {
  const m = new FoldModel({
    vertices_coords: [[0, 0], [10, 0]],
    edges_vertices: [[0, 1]],
    edges_assignment: ['V'],
  });
  assert.equal(m.vertexCount, 2);
  assert.deepEqual(m.coords[1], [10, 0, 0]);
  assert.equal(m.assignment[0], 'V');
});

test('FoldModel: 导出 toFOLD 平面时输出 2D', () => {
  const m = new FoldModel({
    vertices_coords: [[0, 0], [10, 0]],
    edges_vertices: [[0, 1]],
    edges_assignment: ['M'],
    file_title: '测试',
  });
  const out = m.toFOLD();
  assert.deepEqual(out.vertices_coords, [[0, 0], [10, 0]]);
  assert.equal(out.file_title, '测试');
});

test('FoldModel: addEdge 与 edgeMidpoint', () => {
  const m = new FoldModel({ vertices_coords: [[0, 0, 0], [4, 4, 0]], edges_vertices: [], edges_assignment: [] });
  m.addEdge(0, 1, ASSIGNMENT.FLAT, 90);
  assert.equal(m.edgeCount, 1);
  assert.deepEqual(m.edgeMidpoint(0), [2, 2, 0]);
  assert.equal(m.foldAngle[0], 90);
});

test('FoldModel: snapshot 深拷贝', () => {
  const m = new FoldModel({ vertices_coords: [[1, 2, 0]], edges_vertices: [], edges_assignment: [] });
  const s = m.snapshot();
  s[0][0] = 999;
  assert.equal(m.coords[0][0], 1); // 原模型不受影响
});

test('FoldModel: edgesAtVertex', () => {
  const m = new FoldModel({
    vertices_coords: [[0, 0], [1, 0], [0, 1]],
    edges_vertices: [[0, 1], [1, 2], [2, 0]],
    edges_assignment: ['B', 'B', 'B'],
  });
  assert.deepEqual(m.edgesAtVertex(0), [0, 2]);
});

test('foldFromSegments: 自动去重顶点', () => {
  const fold = foldFromSegments(
    [[0, 0, 10, 0], [10, 0, 10, 10], [0, 0, 0, 10]],
    ['V', 'V', 'M']
  );
  assert.equal(fold.vertices_coords.length, 4); // 共享端点去重
  assert.equal(fold.edges_vertices.length, 3);
  assert.deepEqual(fold.edges_assignment, ['V', 'V', 'M']);
});

test('foldFromSegments: 退化线段被跳过', () => {
  const fold = foldFromSegments([[1, 1, 1, 1]]);
  assert.equal(fold.edges_vertices.length, 0);
});
