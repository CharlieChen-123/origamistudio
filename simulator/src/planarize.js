// planarize.js — 折痕图平面剖分（自研）
// 输入：折痕线段集合（允许交叉）；输出：无交叉的平面直线图（PSLG）。
// 处理 X 型 / T 型 / 端点接触等所有交点，在交点处切分线段并去重顶点。

import { segmentIntersect2D, pointPlaneDist, EPS } from './geometry.js';

/** 坐标量化精度：顶点去重的容差 */
export const SNAP = 1e-6;

/**
 * 把点量化到网格，用于空间去重。
 * @returns {string} 哈希键
 */
export function snapKey(x, y) {
  return `${(x / SNAP).toFixed(0)},${(y / SNAP).toFixed(0)}`;
}

/**
 * 点到线段距离（2D）。返回 { dist, t }，t 为投影参数 [0,1]。
 */
export function pointSegmentDist2D(p, a, b) {
  const abx = b[0] - a[0], aby = b[1] - a[1];
  const len2 = abx * abx + aby * aby;
  if (len2 < 1e-14) return { dist: Math.hypot(p[0] - a[0], p[1] - a[1]), t: 0 };
  let t = ((p[0] - a[0]) * abx + (p[1] - a[1]) * aby) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = a[0] + t * abx, cy = a[1] + t * aby;
  return { dist: Math.hypot(p[0] - cx, p[1] - cy), t };
}

/**
 * 平面剖分主函数。
 * @param {number[][]} vertices 顶点坐标 [[x,y],...]（2D）
 * @param {number[][]} edges 边 [ [a,b], ... ]（顶点索引）
 * @returns {{vertices: number[][], edges: number[][], edgeSources: number[]}}
 *   - vertices: 剖分后的顶点（含全部交点）
 *   - edges: 剖分后的无交叉边
 *   - edgeSources: 每条剖分边属于原哪条边（原边索引）
 */
export function planarize(vertices, edges) {
  // ── 1. 收集全部交点 ──
  const segs = edges.map(([a, b]) => ({
    a: vertices[a], b: vertices[b], src: undefined,
  }));

  // 交点集合（按量化键去重）
  const extra = new Map(); // key -> [x,y]

  const record = (x, y) => {
    const k = snapKey(x, y);
    if (!extra.has(k)) extra.set(k, [x, y]);
  };

  for (let i = 0; i < edges.length; i++) {
    const A = vertices[edges[i][0]];
    const B = vertices[edges[i][1]];
    for (let j = i + 1; j < edges.length; j++) {
      const C = vertices[edges[j][0]];
      const D = vertices[edges[j][1]];
      const hit = segmentIntersect2D(A, B, C, D);
      if (hit) record(hit.point[0], hit.point[1]);
    }
  }

  // ── 2. 顶点表：原顶点 + 交点 ──
  const pts = vertices.map(v => [v[0], v[1]]);
  const idOf = new Map(); // key -> 顶点id
  vertices.forEach((v, i) => idOf.set(snapKey(v[0], v[1]), i));
  for (const [k, p] of extra) {
    if (!idOf.has(k)) {
      idOf.set(k, pts.length);
      pts.push(p);
    }
  }

  // ── 3. 每条原边：找出其上所有节点，排序后连成子边 ──
  const outEdges = [];
  const edgeSources = [];

  for (let ei = 0; ei < edges.length; ei++) {
    const [a, b] = edges[ei];
    const A = vertices[a], B = vertices[b];
    const len = Math.hypot(B[0] - A[0], B[1] - A[1]);

    // 收集该边上所有节点（端点 + 交点 + 其他顶点恰好落在其上）
    const onEdge = new Map();
    onEdge.set(snapKey(A[0], A[1]), { id: a, t: 0 });
    onEdge.set(snapKey(B[0], B[1]), { id: b, t: 1 });

    for (let vid = 0; vid < pts.length; vid++) {
      const p = pts[vid];
      const k = snapKey(p[0], p[1]);
      if (onEdge.has(k)) continue;
      const { dist, t } = pointSegmentDist2D(p, A, B);
      // 容差：10*SNAP 且相对长度比
      if (dist < Math.max(1e-7, len * 1e-6)) {
        onEdge.set(k, { id: vid, t });
      }
    }

    // 按 t 排序
    const sorted = [...onEdge.values()].sort((p, q) => p.t - q.t);
    // 去除重复/共线相邻点
    for (let i = 0; i < sorted.length - 1; i++) {
      const u = sorted[i].id, v = sorted[i + 1].id;
      if (u === v) continue;
      outEdges.push([u, v]);
      edgeSources.push(ei);
    }
  }

  // ── 4. 去重无向边（重合线段/重复折痕会产生完全相同的边）──
  const unique = new Map();
  const uniqueEdges = [];
  const uniqueSources = [];
  for (let i = 0; i < outEdges.length; i++) {
    const [u, v] = outEdges[i];
    if (u === v) continue;
    const k = u < v ? `${u},${v}` : `${v},${u}`;
    if (!unique.has(k)) {
      unique.set(k, uniqueEdges.length);
      uniqueEdges.push([u, v]);
      uniqueSources.push(edgeSources[i]);
    }
  }

  return { vertices: pts, edges: uniqueEdges, edgeSources: uniqueSources };
}

/**
 * 便捷函数：从 FOLD 数据直接剖分。
 * @param {import('./fold-model.js').FoldModel} model
 * @param {{paperWidth?: number, paperHeight?: number}} [opts]
 *   可选纸张尺寸；缺省时从顶点坐标范围推断。OE3D 数据只有折痕线，
 *   需要补上纸张外框才能闭合面片。
 */
export function planarizeFold(model, opts = {}) {
  const coords2d = model.coords.map(c => [c[0], c[1]]);

  // 推断纸张范围
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of coords2d) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  const pw = opts.paperWidth ?? (maxX - minX);
  const ph = opts.paperHeight ?? (maxY - minY);
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const halfW = pw / 2, halfH = ph / 2;

  // 纸张四角（OE3D 坐标系：角在 ±200，这里用中心+半宽/半高）
  const corners = [
    [cx - halfW, cy - halfH],
    [cx + halfW, cy - halfH],
    [cx + halfW, cy + halfH],
    [cx - halfW, cy + halfH],
  ];

  // 追加纸张顶点与边界边（若顶点尚未存在）
  const verts = coords2d.slice();
  const keyOf = (x, y) => `${(x / SNAP).toFixed(0)},${(y / SNAP).toFixed(0)}`;
  const existing = new Set(verts.map(([x, y]) => keyOf(x, y)));
  const cornerId = [];
  for (const c of corners) {
    const k = keyOf(c[0], c[1]);
    if (existing.has(k)) {
      cornerId.push(verts.findIndex(([x, y]) => keyOf(x, y) === k));
    } else {
      cornerId.push(verts.length);
      verts.push(c);
      existing.add(k);
    }
  }

  const allEdges = model.edges.slice();
  // 边界边（若边已存在则不重复）
  const edgeKey = new Set(allEdges.map(([a, b]) => `${Math.min(a, b)},${Math.max(a, b)}`));
  for (let i = 0; i < 4; i++) {
    const a = cornerId[i], b = cornerId[(i + 1) % 4];
    const k = `${Math.min(a, b)},${Math.max(a, b)}`;
    if (!edgeKey.has(k)) {
      allEdges.push([a, b]);
      edgeKey.add(k);
    }
  }

  return planarize(verts, allEdges);
}
