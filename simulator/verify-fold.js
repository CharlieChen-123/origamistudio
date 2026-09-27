// verify-fold.js — 验证折叠算法每一步的真实位移（独立于 three.js）
import { FoldModel } from './src/fold-model.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'models-data.json'), 'utf8'));

// ── 数学（与 origami-fold.html 相同实现）──
const EPS = 1e-9;
const norm = v => { const l = Math.hypot(...v); return l < EPS ? [0,0,0] : v.map(x=>x/l); };
function reflect(pt, pp, pn) {
  const n = norm(pn);
  const dx = pt[0]-pp[0], dy = pt[1]-pp[1], dz = pt[2]-pp[2];
  const d = dx*n[0] + dy*n[1] + dz*n[2];
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

function buildVerts(pw, ph, n=64) {
  const verts = [];
  for (let i=0;i<=n;i++) for (let j=0;j<=n;j++)
    verts.push([(i/n)*pw, (j/n)*ph, 0]);
  return verts;
}

function applyCmds(cmds, upto, pw, ph) {
  const verts = buildVerts(pw, ph);
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

const maxMove = (a, b) => {
  let mx = 0;
  for (let i=0;i<a.length;i++) mx = Math.max(mx, Math.hypot(a[i][0]-b[i][0], a[i][1]-b[i][1], a[i][2]-b[i][2]));
  return mx;
};

// ── 验证每个模型：eff=true 的步骤必须有位移，eff=false 的必须位移≈0 ──
let allOk = true;
for (const [name, m] of Object.entries(data)) {
  let prev = applyCmds(m.cmds, 0, m.pw, m.ph);
  let badEff = 0, badNoop = 0;
  for (let s = 0; s < m.cmds.length; s++) {
    const cur = applyCmds(m.cmds, s + 1, m.pw, m.ph);
    const mv = maxMove(prev, cur);
    const cmd = m.cmds[s];
    if (cmd.eff && mv < 0.1) {
      badEff++;
      console.log(`  ⚠ ${name} 步骤${s+1}(${cmd.ft} ${cmd.phi}°) 标为有效但位移=${mv.toFixed(2)}`);
    }
    if (cmd.eff === false && mv > 0.1) {
      badNoop++;
      console.log(`  ⚠ ${name} 步骤${s+1}(${cmd.ft} ${cmd.phi}°) 标为冗余但位移=${mv.toFixed(2)}`);
    }
    prev = cur;
  }
  const effCount = m.cmds.filter(c => c.eff).length;
  const status = (badEff === 0 && badNoop === 0) ? '✓' : '✗';
  if (badEff > 0 || badNoop > 0) allOk = false;
  console.log(`${status} ${name}: 有效=${effCount}/${m.cmds.length} 有效但无位移=${badEff} 冗余但有位移=${badNoop}`);
}
console.log(allOk ? '\n✅ eff 标记与位移一致，UI 跳过后每步必有变化' : '\n⚠ eff 标记与位移不一致');
