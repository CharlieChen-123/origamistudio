// fold-engine.js — 面片级折叠引擎（ROADMAP 阶段2）
// 思路（借鉴 OrigamiSimulator / Tachi 刚性折叠概念，独立实现）：
//   1. 面片化：CP 折痕线段 → planarize 剖分 → halfedge 面片追踪
//   2. 折叠传播：从基准面片 BFS，跨折痕边时应用绕折痕线的旋转矩阵，
//      面片变换 = R(折痕线, θ×progress) × 父面片变换
//   3. 方向修正：用 2D 叉积判断子面片在折痕线的哪一侧，保证 V/M 折叠方向
//      在环状折痕图中传播一致（否则面片乱飞）
//   4. 顶点平均：输出全局共享顶点，每个顶点取所有引用它的面片变换位置的
//      平均值 → 纸张连续不断裂（弹性近似，折痕处轻微弯曲，像真纸）
//   5. 分层顺序折叠（解决穿模）：BFS 时记录每条折痕的「深度」（离基准面片
//      多远）。折叠时浅层折痕先到位、深层后到位（已折部分保持不动）。
//      中间态不再是「所有折痕同时转 θ」，而是像真实折纸一样分步收拢，
//      大幅减少面片互相穿透（穿模）。
// 纯前端、无依赖，面片保持刚性（顶点平均仅消除撕裂）。
import { planarize } from './planarize.js';
import { buildFaces } from './halfedge.js';
import { rotationMatrix, multiplyMatrices, transformPoint, normalize, vecSub } from './geometry.js';

// 从 CP 线段（含类型）构建可折叠模型
// segments: [{p1:[x,y], p2:[x,y], type:'M'|'V'|'B'|'U'}]
export function buildFoldable(segments) {
  // 1. 顶点去重 + 边
  const map = new Map();
  const verts = [];
  const edges = [];
  const edgeTypes = [];
  const key = (x, y) => x.toFixed(6) + ',' + y.toFixed(6);
  const idx = (x, y) => {
    const k = key(x, y);
    if (map.has(k)) return map.get(k);
    const id = verts.length;
    verts.push([x, y]);
    map.set(k, id);
    return id;
  };
  for (const s of segments) {
    const a = idx(s.p1[0], s.p1[1]);
    const b = idx(s.p2[0], s.p2[1]);
    if (a !== b) { edges.push([a, b]); edgeTypes.push(s.type || 'U'); }
  }

  // 2. planarize 剖分（交叉点打断、补边界）
  const p = planarize(verts, edges);
  // 输出边继承原边类型；记录每条输出边来自哪条原始线段（步骤映射用）
  const outTypes = p.edgeSources.map(si => edgeTypes[si] || 'U');

  // 3. 面片追踪
  const f = buildFaces(p.vertices, p.edges);
  return {
    vertices: p.vertices,       // [[x,y], ...] 2D
    edges: p.edges,             // [[a,b], ...]
    edgeTypes: outTypes,        // M/V/B/U
    edgeSources: p.edgeSources, // 每条输出边 → 原始线段索引
    faces: f.faces,             // [[vIdx,...], ...] CCW
    boundary: f.boundary,
    segmentCount: segments.length, // 原始线段数
  };
}

// ── 分步折叠：把「原始线段索引组」转成「剖分后边索引组」 ──
// steps: [{ creases: [原始线段索引...], angle: 目标角度 }]
// 返回展开后的步骤（每条折痕的边索引集合）
export function buildSteps(foldable, steps) {
  const { edgeSources, segmentCount } = foldable;
  // 原始线段 → 剖分边索引列表
  const segToEdges = Array.from({ length: segmentCount }, () => []);
  edgeSources.forEach((si, ei) => {
    if (segToEdges[si]) segToEdges[si].push(ei);
  });
  return steps.map(st => {
    const edgeSet = new Set();
    for (const si of st.creases) {
      for (const ei of segToEdges[si] || []) edgeSet.add(ei);
    }
    return {
      creaseEdges: [...edgeSet],
      angle: st.angle !== undefined ? st.angle : Math.PI,
      desc: st.desc || '',
      creases: st.creases || [],
    };
  });
}

// ── 按分步进度计算每步折叠角度 ──
// stepIdx: 当前完成的步骤数（0..steps.length）
// stepT: 当前步骤动画进度（0~1，仅当 stepIdx < steps.length 时有效）
// 前 stepIdx 步的折痕 = 目标角度（保持折叠），当前步 = 目标×stepT，后续 = 0
export function creaseAnglesForSteps(foldable, steps, stepIdx, stepT = 0) {
  const n = foldable.edges.length;
  const angles = new Array(n).fill(0);
  for (let s = 0; s < steps.length; s++) {
    const st = steps[s];
    const target = st.angle;
    let t = 0;
    if (s < stepIdx) t = 1;
    else if (s === stepIdx) t = stepT;
    for (const ei of st.creaseEdges) {
      angles[ei] = target * t;
    }
  }
  return angles;
}

// 便捷：按步骤序列折叠（供 HTML 播放器使用）
// 返回 { verts3D, faces, maxAngle }
export function foldSteps(foldable, steps, stepIdx, stepT = 0, opts = {}) {
  const angles = creaseAnglesForSteps(foldable, steps, stepIdx, stepT);
  return computeFolding(foldable, 1, { ...opts, creaseAngles: angles });
}

// 面片中心（2D）
function faceCenter2D(face, vertices) {
  let cx = 0, cy = 0;
  for (const vi of face) { cx += vertices[vi][0]; cy += vertices[vi][1]; }
  return [cx / face.length, cy / face.length];
}

// 计算给定折叠百分比（0~1）时的 3D 形态
// opts:
//   maxAngle: 完全折叠时的角度（默认 π = 180°）
//   creaseAngles: 每条折痕的独立目标角度数组（可选，替代统一 progress）。
//     传了 creaseAngles 时，progress 被忽略，直接用各折痕角度（0~maxAngle）。
// 分步折叠用法：前几步的折痕设为 maxAngle（保持折叠），当前步设中间值，
//   后续设 0 → 每步只动一组折痕，穿模大幅减少，符合真实折纸分步逻辑。
export function computeFolding(foldable, progress, opts = {}) {
  const { vertices, edges, edgeTypes, faces } = foldable;
  const maxAngle = opts.maxAngle !== undefined ? opts.maxAngle : Math.PI;
  const creaseAngles = opts.creaseAngles || null;

  // 边索引 + 面片邻接
  const ekey = (a, b) => (a < b ? a + ',' + b : b + ',' + a);
  const edgeIdxByKey = new Map();
  edges.forEach((e, i) => edgeIdxByKey.set(ekey(e[0], e[1]), i));
  const edgeFaces = new Map();
  faces.forEach((face, fi) => {
    for (let i = 0; i < face.length; i++) {
      const a = face[i], b = face[(i + 1) % face.length];
      const k = ekey(a, b);
      if (!edgeFaces.has(k)) edgeFaces.set(k, []);
      edgeFaces.get(k).push(fi);
    }
  });

  // ── 基准面片：最大面片 ──
  let baseFace = 0, maxArea = -1;
  faces.forEach((face, fi) => {
    let a2 = 0;
    for (let i = 0; i < face.length; i++) {
      const [x1, y1] = vertices[face[i]];
      const [x2, y2] = vertices[face[(i + 1) % face.length]];
      a2 += x1 * y2 - x2 * y1;
    }
    const area = Math.abs(a2) / 2;
    if (area > maxArea) { maxArea = area; baseFace = fi; }
  });

  // ── BFS 传播折叠 ──
  const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  const faceTransform = new Array(faces.length).fill(null);
  faceTransform[baseFace] = IDENTITY;

  const visited = new Set([baseFace]);
  const queue = [baseFace];
  const faceCenter = (face) => {
    let cx = 0, cy = 0;
    for (const vi of face) { cx += vertices[vi][0]; cy += vertices[vi][1]; }
    return [cx / face.length, cy / face.length];
  };

  while (queue.length) {
    const fi = queue.shift();
    const face = faces[fi];
    const M = faceTransform[fi];

    for (let i = 0; i < face.length; i++) {
      const a = face[i], b = face[(i + 1) % face.length];
      const k = ekey(a, b);
      const adj = edgeFaces.get(k);
      if (!adj || adj.length < 2) continue;
      const other = adj.find(x => x !== fi);
      if (other === undefined || visited.has(other)) continue;

      // 折痕类型（用规范化 key 查边索引，方向与面片环序无关）
      const ei = edgeIdxByKey.get(k);
      const type = ei >= 0 ? edgeTypes[ei] : 'U';

      let R = null;
      if (type === 'V' || type === 'M') {
        // ── 方向修正 ──
        // 1) 2D 叉积判断「子面片」在折痕线的哪一侧
        const [ea, eb] = edges[ei];
        const A2 = vertices[ea], B2 = vertices[eb];
        const d2x = B2[0] - A2[0], d2y = B2[1] - A2[1];
        const [ocx, ocy] = faceCenter(faces[other]);
        const cross = d2x * (ocy - A2[1]) - d2y * (ocx - A2[0]);
        const side = cross > 0 ? 1 : -1;

        // 2) 折痕线在 3D 中的位置（父面片变换后），方向取原边方向 A2→B2
        const A3 = transformPoint(M, [A2[0], A2[1], 0]);
        const B3 = transformPoint(M, [B2[0], B2[1], 0]);
        const axisDir = normalize(vecSub(B3, A3));

        // 3) 折叠角度：优先用 per-crease 独立角度（分步折叠），否则统一 progress
        let angle;
        if (creaseAngles) {
          angle = Math.max(0, Math.min(maxAngle, creaseAngles[ei] || 0));
        } else {
          angle = maxAngle * progress;
        }

        // V 谷折（纸面向观察者凹陷）→ 子面片翻向 z+；M → z-
        const baseSign = type === 'V' ? 1 : -1;
        R = rotationMatrix(A3, axisDir, baseSign * side * angle);
      }

      faceTransform[other] = R ? multiplyMatrices(R, M) : M;
      visited.add(other);
      queue.push(other);
    }
  }

  // ── 全局顶点平均（消除撕裂）──
  const nV = vertices.length;
  const acc = Array.from({ length: nV }, () => ({ x: 0, y: 0, z: 0, c: 0 }));
  faces.forEach((face, fi) => {
    const M = faceTransform[fi] || IDENTITY;
    for (const vi of face) {
      const p = transformPoint(M, [vertices[vi][0], vertices[vi][1], 0]);
      acc[vi].x += p[0]; acc[vi].y += p[1]; acc[vi].z += p[2]; acc[vi].c++;
    }
  });
  const verts3D = acc.map(a => [a.x / a.c, a.y / a.c, a.z / a.c]);

  // ── 兜底：孤立边界顶点（退化三角被丢弃导致 acc.c=0）──
  const neighborOf = Array.from({ length: nV }, () => []);
  edges.forEach(([a, b]) => { neighborOf[a].push(b); neighborOf[b].push(a); });
  let pending = verts3D.map((v, i) => ({ v, i })).filter(x => acc[x.i].c === 0).map(x => x.i);
  for (let iter = 0; iter < 20 && pending.length; iter++) {
    const next = [];
    for (const vi of pending) {
      const nb = neighborOf[vi].filter(w => acc[w].c > 0);
      if (!nb.length) { next.push(vi); continue; }
      let sx = 0, sy = 0, sz = 0;
      for (const w of nb) { sx += verts3D[w][0]; sy += verts3D[w][1]; sz += verts3D[w][2]; }
      verts3D[vi] = [sx / nb.length, sy / nb.length, sz / nb.length];
      acc[vi].c = 1;
    }
    pending = next;
  }
  for (const vi of pending) {
    if (acc[vi].c === 0) verts3D[vi] = [vertices[vi][0], vertices[vi][1], 0];
  }

  return { verts3D, faces, edges, edgeTypes, vertices, baseFace };
}

// 便捷：从模型 JSON 直接折叠（用于 HTML）
export function foldFromModel(model, progress, opts = {}) {
  const foldable = buildFoldable(model.cp || []);
  return computeFolding(foldable, progress, opts);
}

// 总面积（验证面片完整性）
export function totalArea(foldable) {
  const { vertices, faces } = foldable;
  let area = 0;
  for (const face of faces) {
    let a2 = 0;
    for (let i = 0; i < face.length; i++) {
      const [x1, y1] = vertices[face[i]];
      const [x2, y2] = vertices[face[(i + 1) % face.length]];
      a2 += x1 * y2 - x2 * y1;
    }
    area += Math.abs(a2) / 2;
  }
  return area;
}
