// halfedge.js — 半边结构 + 面片环追踪（自研）
// 输入：平面直线图（剖分后无交叉的顶点+边）
// 输出：面片（face）顶点环，每个环为 CCW（逆时针）方向。
// 原理：对每个半边 (u→v)，在顶点 v 处按极角选择"下一跳"半边——
//       从入方向逆时针看，取前一条出边（最右转），保持面在行进方向左侧，
//       即可追踪出所有内面（CCW）。完整闭合的环才被记录。

import { polygonArea2D, EPS } from './geometry.js';

/**
 * 构建 half-edge 并追踪所有面片。
 * @param {number[][]} vertices 顶点坐标 [[x,y],...]
 * @param {number[][]} edges 边 [[a,b],...]
 * @returns {{ faces: number[][], boundary: number[][], faceSigns: number[] }}
 *   - faces: 所有内面片顶点环（CCW）
 *   - boundary: 无界面环（纸张外边界，CW 方向）
 *   - faceSigns: 每个面的有向面积符号（+ 内面 / - 外面）
 */
export function buildFaces(vertices, edges) {
  const n = vertices.length;

  // ── 邻接表：顶点 -> 邻居顶点列表 ──
  const adj = Array.from({ length: n }, () => []);
  for (const [a, b] of edges) {
    if (a === b) continue; // 跳过退化边
    adj[a].push(b);
    adj[b].push(a);
  }

  // 每个顶点的邻居按极角逆时针排序（0 在 +x 方向，范围 [-π, π]）
  const angle = (v, w) => {
    const dx = vertices[w][0] - vertices[v][0];
    const dy = vertices[w][1] - vertices[v][1];
    return Math.atan2(dy, dx);
  };
  const angleRank = new Map(); // `${v},${w}` -> 排序位置
  for (let v = 0; v < n; v++) {
    adj[v].sort((w1, w2) => angle(v, w1) - angle(v, w2));
    adj[v].forEach((w, i) => angleRank.set(`${v},${w}`, i));
  }

  // next 半边：在 v 处从入边 (u→v) 出发，取"逆时针看最右转"的边。
  // 即在 v 的逆时针排序邻居中取 u 的**前一个**（i-1，循环）。
  const nextOf = (u, v) => {
    const neigh = adj[v];
    if (neigh.length === 0) return null;
    if (neigh.length === 1) return neigh[0]; // 悬边：原路返回
    const i = angleRank.get(`${v},${u}`);
    if (i === undefined) return null;
    return neigh[(i - 1 + neigh.length) % neigh.length];
  };

  // ── 追踪：每条有向边（半边）属于唯一一个面 ──
  const visited = new Set();
  const faces = [];
  const faceSigns = [];

  for (const [a, b] of edges) {
    for (const start of [[a, b], [b, a]]) {
      const startKey = `${start[0]},${start[1]}`;
      if (visited.has(startKey)) continue;

      // 追踪环
      const ring = [];
      let [u, v] = start;
      let guard = 0;
      const maxSteps = edges.length * 2 + 10;
      let closed = true;
      while (!visited.has(`${u},${v}`)) {
        visited.add(`${u},${v}`);
        ring.push(u);
        const w = nextOf(u, v);
        if (w === null) { closed = false; break; }
        u = v; v = w;
        if (++guard > maxSteps) { closed = false; break; }
      }
      // 环必须闭合回到起点才有效
      if (!closed || ring.length < 3) continue;
      if (ring[0] !== start[0]) continue;

      // 环的有向面积：正 = CCW = 内面
      const area = polygonArea2D(ring.map(idx => vertices[idx]));
      if (Math.abs(area) > EPS * 100) {
        faces.push(ring);
        faceSigns.push(area > 0 ? 1 : -1);
      }
    }
  }

  // 内面（CCW）与外面（CW）
  const inner = [];
  const boundary = [];
  for (let i = 0; i < faces.length; i++) {
    if (faceSigns[i] > 0) inner.push(faces[i]);
    else boundary.push(faces[i]);
  }

  return { faces: inner, boundary, faceSigns };
}

/**
 * 计算面片总面积（2D），用于面积守恒校验。
 * @param {number[][]} vertices
 * @param {number[][]} faces
 */
export function totalFaceArea(vertices, faces) {
  let sum = 0;
  for (const f of faces) {
    sum += polygonArea2D(f.map(idx => vertices[idx]));
  }
  return sum;
}
