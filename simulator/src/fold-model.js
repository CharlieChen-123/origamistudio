// fold-model.js — FOLD 数据模型（自研实现，遵循社区 FOLD 格式规范）
// 参考规范：https://github.com/edemaine/fold（MIT）——仅遵循数据格式约定，代码为原创。
// FOLD 是折纸社区标准 JSON 格式，可被 OrigamiSimulator / rabbit-ear 等生态互操作。

/**
 * FOLD 文件的键名约定（社区标准）：
 *  - vertices_coords    : 顶点坐标 [[x,y,z], ...]
 *  - edges_vertices     : 边 [ [v1,v2], ... ]
 *  - edges_assignment   : 边赋值 ['M'|'V'|'F'|'B'|'U', ...]
 *                        M=mountain(山折) V=valley(谷折) F=flat(平/折痕线) B=boundary(边界) U=unassigned
 *  - edges_foldAngle    : 边的折叠角（度），可选
 *  - faces_vertices     : 面片顶点环 [[v1,v2,...], ...]（可选，可由 edges 计算）
 *  - file_spec          : 版本说明，如 1.1
 *  - file_author / file_title / file_description : 元信息
 */

export const ASSIGNMENT = Object.freeze({
  MOUNTAIN: 'M',
  VALLEY: 'V',
  FLAT: 'F',
  BOUNDARY: 'B',
  UNASSIGNED: 'U',
});

/** 校验 FOLD 对象的基本一致性，返回错误信息数组（空数组 = 通过） */
export function validateFold(fold) {
  const errors = [];
  if (!fold || typeof fold !== 'object') return ['fold 必须是一个对象'];

  const coords = fold.vertices_coords;
  const everts = fold.edges_vertices;

  if (coords) {
    if (!Array.isArray(coords)) errors.push('vertices_coords 必须是数组');
    else {
      for (let i = 0; i < coords.length; i++) {
        const c = coords[i];
        if (!Array.isArray(c) || (c.length !== 2 && c.length !== 3)) {
          errors.push(`顶点 ${i} 坐标维度非法（需 2D 或 3D）`);
        }
      }
    }
  }

  if (everts) {
    if (!Array.isArray(everts)) errors.push('edges_vertices 必须是数组');
    else {
      const n = coords ? coords.length : 0;
      for (let i = 0; i < everts.length; i++) {
        const e = everts[i];
        if (!Array.isArray(e) || e.length !== 2) {
          errors.push(`边 ${i} 必须由两个顶点索引组成`);
          continue;
        }
        for (const vi of e) {
          if (!Number.isInteger(vi) || vi < 0 || (n > 0 && vi >= n)) {
            errors.push(`边 ${i} 的顶点索引 ${vi} 越界`);
          }
        }
        if (e[0] === e[1]) errors.push(`边 ${i} 是退化边（两端点相同）`);
      }
    }
  }

  const asg = fold.edges_assignment;
  if (asg) {
    if (!Array.isArray(asg)) errors.push('edges_assignment 必须是数组');
    else if (everts && asg.length !== everts.length) {
      errors.push(`edges_assignment 长度(${asg.length})与边数(${everts.length})不一致`);
    } else {
      const allowed = Object.values(ASSIGNMENT);
      for (let i = 0; i < asg.length; i++) {
        if (!allowed.includes(asg[i])) errors.push(`边 ${i} 赋值 "${asg[i]}" 非法（允许 M/V/F/B/U）`);
      }
    }
  }
  return errors;
}

/**
 * FoldModel —— 折痕图的统一数据模型
 * 内部始终以 3D 坐标存储（z=0 表示平面纸），2D 输入自动补 z=0。
 */
export class FoldModel {
  /**
   * @param {object} [fold] 可选，FOLD 格式对象
   */
  constructor(fold = null) {
    this.coords = [];        // [[x,y,z], ...]
    this.edges = [];         // [[v1,v2], ...]
    this.assignment = [];    // ['M'|'V'|'F'|'B'|'U', ...]
    this.foldAngle = [];     // 度数，可选
    this.faces = [];         // 面片环 [[v1,...], ...]（阶段1填充）
    this.meta = {};          // 标题/作者等元信息

    if (fold) this.load(fold);
  }

  /** 从 FOLD 对象加载 */
  load(fold) {
    const errors = validateFold(fold);
    if (errors.length) throw new Error('FOLD 数据无效: ' + errors.join('; '));

    this.coords = (fold.vertices_coords || []).map(c =>
      c.length === 2 ? [c[0], c[1], 0] : [c[0], c[1], c[2]]
    );
    this.edges = (fold.edges_vertices || []).map(e => [e[0], e[1]]);
    this.assignment = (fold.edges_assignment || []).slice();
    this.foldAngle = (fold.edges_foldAngle || []).slice();
    this.faces = (fold.faces_vertices || []).map(f => f.slice());

    this.meta = {};
    for (const k of ['file_spec', 'file_title', 'file_author', 'file_description', 'frame_title']) {
      if (fold[k] !== undefined) this.meta[k] = fold[k];
    }
    return this;
  }

  /** 导出为 FOLD 格式对象（2D 平面时输出 2D 坐标） */
  toFOLD() {
    const isFlat = this.coords.every(c => Math.abs(c[2]) < 1e-9);
    return {
      file_spec: 1.1,
      file_title: this.meta.file_title || 'Untitled Crease Pattern',
      file_author: this.meta.file_author || '',
      file_description: this.meta.file_description || '',
      vertices_coords: this.coords.map(c => isFlat ? [c[0], c[1]] : [c[0], c[1], c[2]]),
      edges_vertices: this.edges.map(e => [e[0], e[1]]),
      edges_assignment: this.assignment.slice(),
      ...(this.foldAngle.length ? { edges_foldAngle: this.foldAngle.slice() } : {}),
      ...(this.faces.length ? { faces_vertices: this.faces.map(f => f.slice()) } : {}),
    };
  }

  /** 添加一条边；折痕赋值缺省为 U */
  addEdge(v1, v2, assignment = ASSIGNMENT.UNASSIGNED, angle = 0) {
    this.edges.push([v1, v2]);
    this.assignment.push(assignment);
    this.foldAngle.push(angle);
  }

  /** 顶点数 / 边数 / 面片数 */
  get vertexCount() { return this.coords.length; }
  get edgeCount() { return this.edges.length; }
  get faceCount() { return this.faces.length; }

  /** 边的中心点 */
  edgeMidpoint(ei) {
    const [a, b] = this.edges[ei];
    const p = this.coords[a], q = this.coords[b];
    return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2];
  }

  /** 与该顶点相连的所有边索引 */
  edgesAtVertex(v) {
    const out = [];
    for (let i = 0; i < this.edges.length; i++) {
      if (this.edges[i][0] === v || this.edges[i][1] === v) out.push(i);
    }
    return out;
  }

  /** 折叠状态副本（深拷贝当前顶点坐标，供动画插值用） */
  snapshot() {
    return this.coords.map(c => [c[0], c[1], c[2]]);
  }
}

/** 从纯折痕线段（无面片）构造一个 FOLD 对象：自动去重顶点 */
export function foldFromSegments(segments, assignments = []) {
  // segments: [[x1,y1,x2,y2], ...] 或 [[x1,y1,z1,x2,y2,z2], ...]
  const index = new Map();
  const coords = [];
  const edges = [];
  const outAssignments = [];
  const key = (x, y, z) => `${x.toFixed(6)},${y.toFixed(6)},${z.toFixed(6)}`;

  const getIdx = (x, y, z) => {
    const k = key(x, y, z);
    if (index.has(k)) return index.get(k);
    const id = coords.length;
    coords.push([x, y, z]);
    index.set(k, id);
    return id;
  };

  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    const [x1, y1, x2, y2, z1 = 0, z2 = 0] = s;
    const a = getIdx(x1, y1, z1);
    const b = getIdx(x2, y2, z2);
    if (a !== b) {
      edges.push([a, b]);
      outAssignments.push(assignments[i] || ASSIGNMENT.UNASSIGNED);
    }
  }
  return { vertices_coords: coords, edges_vertices: edges, edges_assignment: outAssignments };
}
