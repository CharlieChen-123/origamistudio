// build-models-json.js — 生成 origami-fold.html 使用的模型数据
// 数据源：cp_examples/*.fold（折痕线，V/M/U 类型可靠）
//         tools/models_data_compact.json（折叠命令，已修正 R/F/C 映射）
// 输出：simulator/models-data.json（新版 origami-fold 加载用）
// 附加：预计算每条命令的"有效位移"，UI 可跳过无变化的冗余步骤
import { FoldModel } from './src/fold-model.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const foldRoot = path.join(root, 'cp_examples');
const cmdsData = JSON.parse(
  fs.readFileSync(path.join(root, 'tools', 'models_data_compact.json'), 'utf8')
);

// ── 折叠数学（与 origami-fold.html 一致，用于预计算位移）──
const EPS = 1e-9;
const norm = v => { const l = Math.hypot(...v); return l < EPS ? [0,0,0] : v.map(x=>x/l); };
function reflect(pt, pp, pn) {
  const n = norm(pn);
  const d = (pt[0]-pp[0])*n[0] + (pt[1]-pp[1])*n[1] + (pt[2]-pp[2])*n[2];
  return [pt[0]-2*d*n[0], pt[1]-2*d*n[1], pt[2]-2*d*n[2]];
}
function rotateAround(pt, axisPt, axisDir, phi) {
  const u = norm(axisDir);
  const rx = pt[0]-axisPt[0], ry = pt[1]-axisPt[1], rz = pt[2]-axisPt[2];
  const d = rx*u[0]+ry*u[1]+rz*u[2];
  const px = d*u[0], py = d*u[1], pz = d*u[2];
  const qx = rx-px, qy = ry-py, qz = rz-pz;
  const cx = u[1]*qz-u[2]*qy, cy = u[2]*qx-u[0]*qz, cz = u[0]*qy-u[1]*qx;
  const c = Math.cos(phi), s = Math.sin(phi);
  return [axisPt[0]+px+c*qx+s*cx, axisPt[1]+py+c*qy+s*cy, axisPt[2]+pz+c*qz+s*cz];
}
function creaseLine(pp, pn) {
  const d = pn[0]*pp[0]+pn[1]*pp[1]+pn[2]*pp[2];
  const clen = Math.hypot(pn[0], pn[1]);
  if (clen < 1e-9) return null;
  const dir = norm([-pn[1], pn[0], 0]);
  let pt;
  if (Math.abs(pn[0]) > 1e-9) pt = [d/pn[0], 0, 0];
  else if (Math.abs(pn[1]) > 1e-9) pt = [0, d/pn[1], 0];
  else return null;
  return { point: pt, direction: dir };
}
function buildVerts(pw, ph, n) {
  const verts = [];
  for (let i=0;i<=n;i++) for (let j=0;j<=n;j++)
    verts.push([(i/n)*pw, (j/n)*ph, 0]);
  return verts;
}
/** 计算命令在 state 上的位移（网格密度 n 可调） */
function cmdMove(cmds, upto, pw, ph, n = 24) {
  const verts = buildVerts(pw, ph, n);
  for (let s=0; s<upto; s++) {
    const cmd = cmds[s];
    if (cmd.ft === 'C' || cmd.ft === 'M') continue;
    const pp = cmd.pp, pn = cmd.pn;
    const phi = cmd.phi * Math.PI/180;
    if (cmd.ft === 'R') {
      const nrm = norm(pn);
      for (const v of verts) {
        if ((v[0]-pp[0])*nrm[0]+(v[1]-pp[1])*nrm[1]+(v[2]-pp[2])*nrm[2] > 0) {
          const r = reflect(v, pp, nrm); v[0]=r[0]; v[1]=r[1]; v[2]=r[2];
        }
      }
    } else if (cmd.ft === 'F') {
      const line = creaseLine(pp, pn);
      if (line && Math.abs(phi) > 1e-6) {
        const nrm = norm(pn);
        for (const v of verts) {
          if ((v[0]-pp[0])*nrm[0]+(v[1]-pp[1])*nrm[1]+(v[2]-pp[2])*nrm[2] > 0) {
            const r = rotateAround(v, line.point, line.direction, phi); v[0]=r[0]; v[1]=r[1]; v[2]=r[2];
          }
        }
      }
    }
  }
  return verts;
}

// 模型顺序：examples 目录的经典模型
const MODELS = ['crane', 'boat', 'butterfly', 'frog', 'pigeon'];

const out = {};
for (const name of MODELS) {
  const foldPath = path.join(foldRoot, 'examples', `${name}.fold`);
  if (!fs.existsSync(foldPath)) {
    console.warn(`跳过 ${name}: fold 不存在`);
    continue;
  }
  const fold = JSON.parse(fs.readFileSync(foldPath, 'utf8'));
  const model = new FoldModel(fold);

  // CP 折痕线：直接来自 fold 边（类型 V/M/U）
  const cp = model.edges.map(([a, b], i) => ({
    p1: [model.coords[a][0], model.coords[a][1]],
    p2: [model.coords[b][0], model.coords[b][1]],
    type: model.assignment[i] === 'M' ? 'mountain'
        : model.assignment[i] === 'V' ? 'valley'
        : 'crease',
  }));

  // 折叠命令：来自修正后的 compact 数据
  const cmds = (cmdsData[name]?.cmds || []).map(c => ({
    ft: c[0],           // R=反射(180°) F=旋转(phi) C=折痕(仅画线)
    phi: c[1],
    pp: [c[2], c[3], c[4]],
    pn: [c[5], c[6], c[7]],
  }));

  // 预计算每条命令的有效位移（eff=是否产生可见变化）
  // 用 64 网格与验证脚本一致，阈值 0.1
  const pw = cmdsData[name]?.pw || 400;
  const ph = cmdsData[name]?.ph || 400;
  let prev = cmdMove(cmds, 0, pw, ph, 64);
  for (let s = 0; s < cmds.length; s++) {
    const cur = cmdMove(cmds, s + 1, pw, ph, 64);
    let mx = 0;
    for (let i = 0; i < prev.length; i++)
      mx = Math.max(mx, Math.hypot(cur[i][0]-prev[i][0], cur[i][1]-prev[i][1], cur[i][2]-prev[i][2]));
    cmds[s].eff = mx > 0.1;  // 位移阈值 0.1
    prev = cur;
  }

  out[name] = {
    name,
    pw, ph,
    cp,
    cmds,
  };
  const eff = cmds.filter(c => c.eff).length;
  console.log(`${name}: CP=${cp.length} 线, 命令=${cmds.length} (有效=${eff} 冗余=${cmds.length-eff})`);
}

const outPath = path.join(__dirname, 'models-data.json');
fs.writeFileSync(outPath, JSON.stringify(out, null, 0));
console.log(`\n✓ 写入 ${outPath} (${fs.statSync(outPath).size} bytes)`);

