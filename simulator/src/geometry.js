// geometry.js — 3D 几何数学库（自研，零依赖）
// 提供折叠模拟所需的向量运算、平面/直线数学、反射与旋转矩阵。

export const EPS = 1e-9;

/** 向量减法 a - b */
export function vecSub(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

/** 向量加法 a + b */
export function vecAdd(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

/** 数乘 */
export function vecScale(v, s) {
  return [v[0] * s, v[1] * s, v[2] * s];
}

/** 点积 */
export function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/** 叉积 a × b */
export function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

/** 向量长度 */
export function length(v) {
  return Math.hypot(v[0], v[1], v[2]);
}

/** 归一化（零向量原样返回） */
export function normalize(v) {
  const l = length(v);
  if (l < EPS) return [0, 0, 0];
  return vecScale(v, 1 / l);
}

/** 两点间距离 */
export function dist(a, b) {
  return length(vecSub(a, b));
}

/** 点到平面距离（带符号），平面由 point+normal 定义 */
export function pointPlaneDist(p, planePoint, planeNormal) {
  const d = dot(vecSub(p, planePoint), planeNormal);
  return d / length(planeNormal);
}

/** 判断点是否在平面一侧（normal 指向侧 = +1，反侧 = -1，平面上 = 0） */
export function planeSide(p, planePoint, planeNormal) {
  const d = pointPlaneDist(p, planePoint, planeNormal);
  if (Math.abs(d) < EPS) return 0;
  return d > 0 ? 1 : -1;
}

/**
 * 4x4 平移矩阵（列主序，OpenGL 习惯）
 * @returns {number[]} 16 元素数组
 */
export function translationMatrix(tx, ty, tz) {
  return [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    tx, ty, tz, 1,
  ];
}

/**
 * 绕任意 3D 轴旋转的 4x4 矩阵（Rodrigues 公式）
 * @param {number[]} axisPoint 轴上一点
 * @param {number[]} axisDir 轴方向（任意长度，内部归一化）
 * @param {number} angle 旋转角度（弧度）
 * @returns {number[]} 4x4 矩阵（列主序）
 */
export function rotationMatrix(axisPoint, axisDir, angle) {
  const u = normalize(axisDir);
  const [ux, uy, uz] = u;
  const [px, py, pz] = axisPoint;

  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const t = 1 - c;

  // 旋转分量（线性部分）
  const R = [
    c + ux * ux * t, uy * ux * t + uz * s, uz * ux * t - uy * s, 0,
    ux * uy * t - uz * s, c + uy * uy * t, uz * uy * t + ux * s, 0,
    ux * uz * t + uy * s, uy * uz * t - ux * s, c + uz * uz * t, 0,
    0, 0, 0, 1,
  ];

  // 把旋转中心从原点平移到 axisPoint：T(p) * R * T(-p)
  return translateMatrix(multiplyMatrices(R, translationMatrix(-px, -py, -pz)), px, py, pz);
}

/** 矩阵乘（4x4，列主序） */
export function multiplyMatrices(A, B) {
  const out = new Array(16).fill(0);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) {
        sum += A[k * 4 + row] * B[col * 4 + k];
      }
      out[col * 4 + row] = sum;
    }
  }
  return out;
}

/**
 * 在矩阵左侧乘平移：返回 M' = T(tx,ty,tz) * M（左乘平移）。
 * 对仿射矩阵（第4列为 0,0,0,1）等价于平移部分直接加 (tx,ty,tz)。
 */
export function translateMatrix(M, tx, ty, tz) {
  const out = M.slice();
  // T * M 的平移列：T 的第 4 行 (tx,ty,tz,1) 与 M 的第 4 列结合
  out[12] = M[12] + tx * M[15];
  out[13] = M[13] + ty * M[15];
  out[14] = M[14] + tz * M[15];
  out[15] = M[15];
  return out;
}

/** 用 4x4 矩阵变换一个 3D 点（列主序；w=1） */
export function transformPoint(M, p) {
  const x = p[0], y = p[1], z = p[2];
  return [
    M[0] * x + M[4] * y + M[8] * z + M[12],
    M[1] * x + M[5] * y + M[9] * z + M[13],
    M[2] * x + M[6] * y + M[10] * z + M[14],
  ];
}

/**
 * 平面反射矩阵：把点关于平面 (point, normal) 镜像。
 * 这是"对折 180°"的基础变换。
 */
export function reflectionMatrix(planePoint, planeNormal) {
  const n = normalize(planeNormal);
  const [nx, ny, nz] = n;
  const [px, py, pz] = planePoint;
  const d = -(nx * px + ny * py + nz * pz);

  // 反射线性部分 H = I - 2nn^T
  const H = [
    1 - 2 * nx * nx, -2 * ny * nx, -2 * nz * nx, 0,
    -2 * nx * ny, 1 - 2 * ny * ny, -2 * nz * ny, 0,
    -2 * nx * nz, -2 * ny * nz, 1 - 2 * nz * nz, 0,
    0, 0, 0, 1,
  ];
  // 平移：T = (I - H) * p = 2n(n·p)
  const tx = 2 * nx * (nx * px + ny * py + nz * pz);
  const ty = 2 * ny * (nx * px + ny * py + nz * pz);
  const tz = 2 * nz * (nx * px + ny * py + nz * pz);
  return translateMatrix(H, tx, ty, tz);
}

/**
 * 折痕线：折叠平面与纸张平面(z=0)的交线。
 * 平面由 (planePoint, planeNormal) 定义；返回轴上一点 + 方向，或 null（平行不相交）。
 */
export function creaseLine(planePoint, planeNormal) {
  const n = planeNormal;
  const clen = Math.hypot(n[0], n[1]);
  if (clen < EPS) return null; // 平面与纸面平行，无交线

  // 交线方向 = n × (0,0,1)
  const dir = normalize(cross(n, [0, 0, 1]));

  // 求线上一点：取交线上距离原点最近点
  const d = n[0] * planePoint[0] + n[1] * planePoint[1] + n[2] * planePoint[2];
  const px = (d * n[0]) / (n[0] * n[0] + n[1] * n[1]);
  const py = (d * n[1]) / (n[0] * n[0] + n[1] * n[1]);
  return { point: [px, py, 0], direction: dir };
}

/** 两条 2D 线段求交；返回 {point, t, u} 或 null */
export function segmentIntersect2D(p1, p2, p3, p4) {
  const d1 = vecSub(p2, p1);      // p1->p2
  const d2 = vecSub(p4, p3);      // p3->p4
  const denom = d1[0] * d2[1] - d1[1] * d2[0];
  if (Math.abs(denom) < EPS) return null;

  const t = ((p3[0] - p1[0]) * d2[1] - (p3[1] - p1[1]) * d2[0]) / denom;
  const u = ((p3[0] - p1[0]) * d1[1] - (p3[1] - p1[1]) * d1[0]) / denom;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return {
    point: [p1[0] + t * d1[0], p1[1] + t * d1[1]],
    t, u,
  };
}

/** 2D 点在多边形内（射线法），多边形顶点按顺序排列 */
export function pointInPolygon2D(point, polygon) {
  let inside = false;
  const [x, y] = point;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i], [xj, yj] = polygon[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** 多边形有向面积（2D，鞋带公式）——正 = 逆时针 */
export function polygonArea2D(polygon) {
  let area = 0;
  for (let i = 0; i < polygon.length; i++) {
    const [x1, y1] = polygon[i];
    const [x2, y2] = polygon[(i + 1) % polygon.length];
    area += x1 * y2 - x2 * y1;
  }
  return area / 2;
}

/** 角度归一化到 [-π, π] */
export function wrapAngle(a) {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}
