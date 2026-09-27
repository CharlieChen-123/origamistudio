// build-mit-json.js — 解析 MIT OrigamiSimulator 的 SVG CP 图 → FOLD JSON
// 颜色约定（来自 pattern.js typeForStroke）：
//   #FF0000 = mountain(山折 M)   #0000FF = valley(谷折 V)   #000000 = boundary/其他(B/U)
// 输入: cp_examples/mit/models/*.svg  输出: simulator/models-data.json（与 build-models-json.js 同格式）
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const modelDir = path.join(root, 'cp_examples', 'mit', 'models');

// ── 模型清单与显示名（新手友好） ──
const MODELS = [
  { file: 'flat_crane.svg',            id: 'crane',        name: 'Traditional Crane',   zh: '传统纸鹤' },
  { file: 'birdBase.svg',              id: 'birdBase',     name: 'Bird Base',           zh: '鸟基底' },
  { file: 'boatBase.svg',              id: 'boatBase',     name: 'Boat Base',           zh: '船基底' },
  { file: 'frogBase.svg',              id: 'frogBase',     name: 'Frog Base',           zh: '蛙基底' },
  { file: 'waterbombBase.svg',         id: 'waterbombBase', name: 'Waterbomb Base',    zh: '水弹基底' },
  { file: 'squareBase.svg',            id: 'squareBase',   name: 'Square Base',        zh: '正方形基底' },
  { file: 'pinwheelBase.svg',          id: 'pinwheelBase', name: 'Pinwheel Base',      zh: '风车基底' },
  { file: 'openSinkBase.svg',          id: 'openSinkBase', name: 'Open Sink Base',     zh: '开沉折基底' },
  { file: 'traditionalCrane.svg',      id: 'tradCrane',    name: 'Crane (folded)',     zh: '纸鹤(折痕)' },
  { file: 'airplane.svg',              id: 'airplane',     name: 'Paper Airplane',     zh: '纸飞机' },
];

// ── SVG line 解析 ──
function parseLines(svg) {
  const lines = [];
  const re = /<line\b[^>]*>/g;
  let m;
  while ((m = re.exec(svg)) !== null) {
    const tag = m[0];
    const get = (attr) => {
      const mm = tag.match(new RegExp(`${attr}="([^"]*)"`));
      return mm ? parseFloat(mm[1]) : NaN;
    };
    const x1 = get('x1'), y1 = get('y1'), x2 = get('x2'), y2 = get('y2');
    const stroke = (tag.match(/stroke="([^"]*)"/) || [])[1] || '';
    if ([x1, y1, x2, y2].some(isNaN)) continue;
    lines.push({ x1, y1, x2, y2, stroke: stroke.toLowerCase() });
  }
  return lines;
}

// rect 解析（纸张边界）
function parseRects(svg) {
  const rects = [];
  const re = /<rect\b[^>]*>/g;
  let m;
  while ((m = re.exec(svg)) !== null) {
    const tag = m[0];
    const get = (attr) => {
      const mm = tag.match(new RegExp(`${attr}="([^"]*)"`));
      return mm ? parseFloat(mm[1]) : NaN;
    };
    const x = get('x'), y = get('y'), w = get('width'), h = get('height');
    if ([x, y, w, h].some(isNaN)) continue;
    rects.push({ x, y, w, h });
  }
  return rects;
}

// 颜色 → 折痕类型
function typeForStroke(stroke) {
  const s = stroke.toLowerCase();
  if (s === '#ff0000' || s === '#f00' || s === 'red' || s === 'rgb(255,0,0)') return 'M';
  if (s === '#0000ff' || s === '#00f' || s === 'blue' || s === 'rgb(0,0,255)') return 'V';
  if (s === '#000000' || s === '#000' || s === 'black' || s === 'rgb(0,0,0)') return 'B';
  return 'U'; // 其他颜色/半透明 → 引导线
}

// 主流程
const out = {};
let skipped = [];

for (const mod of MODELS) {
  const filePath = path.join(modelDir, mod.file);
  if (!fs.existsSync(filePath)) { skipped.push(`${mod.file} 不存在`); continue; }
  const svg = fs.readFileSync(filePath, 'utf8');

  const lines = parseLines(svg);
  const rects = parseRects(svg);

  // 纸张边界：优先 rect，否则从所有 line 坐标推算
  let minX, minY, maxX, maxY;
  if (rects.length) {
    const r = rects[0];
    minX = r.x; minY = r.y; maxX = r.x + r.w; maxY = r.y + r.h;
  } else {
    const xs = lines.flatMap(l => [l.x1, l.x2]);
    const ys = lines.flatMap(l => [l.y1, l.y2]);
    minX = Math.min(...xs); maxX = Math.max(...xs);
    minY = Math.min(...ys); maxY = Math.max(...ys);
  }

  // 折痕线段（含边界线，统一归一化到 0~400）
  const segs = [];
  for (const l of lines) {
    // 跳过 rect 自身的填充线（stroke 为空/白色）
    if (!l.stroke || l.stroke === '#ffffff' || l.stroke === 'white') continue;
    const t = typeForStroke(l.stroke);
    // 归一化坐标到 0~400
    const nx1 = ((l.x1 - minX) / (maxX - minX)) * 400;
    const ny1 = ((l.y1 - minY) / (maxY - minY)) * 400;
    const nx2 = ((l.x2 - minX) / (maxX - minX)) * 400;
    const ny2 = ((l.y2 - minY) / (maxY - minY)) * 400;
    segs.push({ p1: [nx1, ny1], p2: [nx2, ny2], type: t });
  }

  // 若 SVG 有 rect 边界，补四条边界线
  if (rects.length) {
    segs.push(
      { p1: [0, 0], p2: [400, 0], type: 'B' },
      { p1: [400, 0], p2: [400, 400], type: 'B' },
      { p1: [400, 400], p2: [0, 400], type: 'B' },
      { p1: [0, 400], p2: [0, 0], type: 'B' }
    );
  }

  // 统计
  const cnt = { M: 0, V: 0, B: 0, U: 0 };
  for (const s of segs) cnt[s.type]++;

  // ── 自动生成分步折叠序列（折纸逻辑）──
  // 策略：折痕按「角度族」分组（同一方向的折痕一起折，几何协调），
  // 组内按长度降序。角度族顺序：对角线(45/135°)→中心线(0/90°)→斜折→其他。
  // 这样步骤数少、语义清晰（预折→收拢），动画中间态更自然。
  const creaseIdx = segs
    .map((s, i) => ({ i, len: Math.hypot(s.p2[0]-s.p1[0], s.p2[1]-s.p1[1]), type: s.type }))
    .filter(c => c.type === 'M' || c.type === 'V');

  function angNorm(s) {
    const ang = Math.round(Math.atan2(s.p2[1]-s.p1[1], s.p2[0]-s.p1[0]) * 180 / Math.PI);
    return ((ang % 180) + 180) % 180;
  }
  // 角度族排序：45/135（对角）→ 0/90（中心）→ 22/68/112/158（斜折）→ 其他
  function familyRank(a) {
    const d = Math.min(a, 180 - a);
    if (Math.abs(d - 45) < 6) return 0;   // 对角线族
    if (d < 6) return 1;                   // 中心线族
    if (d > 20 && d < 70) return 2;        // 斜折族
    return 3;                              // 细节族
  }
  creaseIdx.forEach(c => {
    const ang = angNorm(segs[c.i]);
    c.family = familyRank(ang);
    c.ang = ang;
  });
  creaseIdx.sort((a, b) => a.family - b.family || b.len - a.len);

  // ── 手工定义的真实折纸步骤（体现折法认知）──
  // 基底类模型遵循经典折纸教程顺序：预折对角线 → 预折中心线 → 收拢。
  // creases 是 CP 线段索引（与 segs 顺序对应）。
  const MANUAL_STEPS = {
    squareBase: [
      { creases: [2], angle: 180, desc: 'Pre-crease the diagonal (valley)' },
      { creases: [0, 1], angle: 180, desc: 'Pre-crease the center lines (mountain)' },
      { creases: [0, 1, 2], angle: 180, desc: 'Collapse into the square base' },
    ],
    waterbombBase: [
      { creases: [0, 1], angle: 180, desc: 'Pre-crease the diagonals (mountain)' },
      { creases: [2, 3], angle: 180, desc: 'Pre-crease the center lines (valley)' },
      { creases: [0, 1, 2, 3], angle: 180, desc: 'Collapse into the waterbomb base' },
    ],
    birdBase: [
      { creases: [0], angle: 180, desc: 'Pre-crease the diagonal (valley)' },
      { creases: [1, 2], angle: 180, desc: 'Pre-crease the center lines (mountain)' },
      { creases: [3, 4, 5, 6, 7, 8, 9, 10], angle: 180, desc: 'Pre-crease the petal folds' },
      { creases: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], angle: 180, desc: 'Collapse into the bird base' },
    ],
  };

  let steps;
  if (MANUAL_STEPS[mod.id]) {
    steps = MANUAL_STEPS[mod.id];
  } else {
    // 按角度族分组：每族一步（若族内折痕过多则拆成多个子步，每步最多 6 条）
    steps = [];
    const byFamily = {};
    creaseIdx.forEach(c => {
      if (!byFamily[c.family]) byFamily[c.family] = [];
      byFamily[c.family].push(c.i);
    });
    const familyDesc = ['main diagonals', 'center lines', 'diagonal creases', 'detail creases'];
    Object.keys(byFamily).sort().forEach(fam => {
      const ids = byFamily[fam];
      for (let i = 0; i < ids.length; i += 6) {
        const group = ids.slice(i, i + 6);
        const isFirst = steps.length === 0;
        steps.push({
          creases: group,
          angle: 180,
          desc: isFirst
            ? `Step ${steps.length + 1}: Pre-crease the ${familyDesc[fam]}`
            : `Step ${steps.length + 1}: Fold along the ${familyDesc[fam]}`,
        });
      }
    });
  }

  out[mod.id] = {
    name: mod.name,
    zh: mod.zh,
    pw: 400, ph: 400,
    cp: segs,
    steps, // 分步折叠序列（每步：折痕线段索引组 + 角度）
    cmds: [],
  };
  console.log(`✓ ${mod.id.padEnd(14)} ${mod.name.padEnd(22)} 线=${segs.length} (M:${cnt.M} V:${cnt.V} B:${cnt.B} U:${cnt.U}) 步骤=${steps.length}`);
}

if (skipped.length) console.log('\n跳过:', skipped.join('; '));

const outPath = path.join(__dirname, 'models-data.json');
fs.writeFileSync(outPath, JSON.stringify(out, null, 0));
console.log(`\n✓ 写入 ${outPath} (${fs.statSync(outPath).size} bytes, ${Object.keys(out).length} 模型)`);
