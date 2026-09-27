// compare-anim.js — 对比两种动画方案（折痕渐进 vs 顶点插值）的穿模量
import { buildFoldable, buildSteps, foldSteps, creaseAnglesForSteps } from './src/fold-engine.js';
import fs from 'node:fs';

function countIntersections(result) {
  const tris = [];
  result.faces.forEach((face, fi) => {
    for (let i = 1; i < face.length - 1; i++) tris.push({ fi, t: [result.verts3D[face[0]], result.verts3D[face[i]], result.verts3D[face[i+1]]] });
  });
  let c = 0;
  for (let i = 0; i < tris.length; i++) for (let j = i+1; j < tris.length; j++) {
    if (Math.abs(tris[i].fi - tris[j].fi) < 2) continue;
    if (triHit(tris[i].t, tris[j].t)) c++;
  }
  return c;
}
function triHit(a, b) {
  for (const [p1,p2,t] of [[b[1],b[2],a],[b[2],b[0],a],[b[0],b[1],a],[a[1],a[2],b],[a[2],a[0],b],[a[0],a[1],b]]) if (segTri(p1,p2,t)) return true;
  return false;
}
function segTri(p1,p2,t,eps=1e-6) {
  const d=[p2[0]-p1[0],p2[1]-p1[1],p2[2]-p1[2]], e1=[t[1][0]-t[0][0],t[1][1]-t[0][1],t[1][2]-t[0][2]], e2=[t[2][0]-t[0][0],t[2][1]-t[0][1],t[2][2]-t[0][2]];
  const h=[d[1]*e2[2]-d[2]*e2[1],d[2]*e2[0]-d[0]*e2[2],d[0]*e2[1]-d[1]*e2[0]];
  const aa=e1[0]*h[0]+e1[1]*h[1]+e1[2]*h[2];
  if(Math.abs(aa)<eps)return false;
  const fv=[p1[0]-t[0][0],p1[1]-t[0][1],p1[2]-t[0][2]];
  const u=(fv[0]*h[0]+fv[1]*h[1]+fv[2]*h[2])/aa;
  if(u<0||u>1)return false;
  const q=[fv[1]*e1[2]-fv[2]*e1[1],fv[2]*e1[0]-fv[0]*e1[2],fv[0]*e1[1]-fv[1]*e1[0]];
  const v=(d[0]*q[0]+d[1]*q[1]+d[2]*q[2])/aa;
  if(v<0||u+v>1)return false;
  const t2=(e2[0]*q[0]+e2[1]*q[1]+e2[2]*q[2])/aa;
  return t2>eps&&t2<1-eps;
}

const data = JSON.parse(fs.readFileSync('./models-data.json', 'utf8'));
for (const id of ['crane', 'waterbombBase', 'birdBase', 'frogBase']) {
  const m = data[id];
  const f = buildFoldable(m.cp);
  const steps = buildSteps(f, m.steps.map(st => ({ creases: st.creases, angle: st.angle*Math.PI/180 })));

  // 预计算完成态
  const states = [];
  for (let s = 0; s <= steps.length; s++) {
    const angles = creaseAnglesForSteps(f, steps, s, 0);
    states.push(foldSteps(f, steps, 0, 0, { creaseAngles: angles }));
  }

  let sumA = 0, sumB = 0, n = 0, worstB = 0, worstA = 0;
  for (let s = 1; s <= steps.length; s++) {
    const rA = foldSteps(f, steps, s, 0.5);  // 折痕渐进
    const cA = countIntersections(rA);
    const from = states[Math.max(0, s-1)], to = states[s];
    const interp = from.verts3D.map((v, i) => [
      v[0] + (to.verts3D[i][0] - v[0]) * 0.5,
      v[1] + (to.verts3D[i][1] - v[1]) * 0.5,
      v[2] + (to.verts3D[i][2] - v[2]) * 0.5,
    ]);
    const cB = countIntersections({ verts3D: interp, faces: to.faces });
    sumA += cA; sumB += cB; n++;
    if (cB > worstB) worstB = cB;
    if (cA > worstA) worstA = cA;
  }
  console.log(`${id.padEnd(14)} 折痕渐进: 均${(sumA/n).toFixed(1)} 最差${worstA} | 顶点插值: 均${(sumB/n).toFixed(1)} 最差${worstB}`);
}
