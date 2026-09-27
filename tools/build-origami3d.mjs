// build-origami3d.mjs — 从模板 + 上游着色器生成 ../origami-3d.html
// 上游的 GPU 求解器通过 document.getElementById("<id>").text 读取 13 段 GLSL，
// 这些 <script type="x-shader/..."> 只能内联在页面里，所以用脚本从 vendor 的 index.html 原样抽取，
// 避免手抄 700 行 GLSL 出错。
// 用法：node tools/build-origami3d.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const TEMPLATE = path.join(HERE, 'origami3d.template.html');
const VENDOR_INDEX = path.join(ROOT, 'vendor', 'origamisimulator', 'index.html');
const OUT = path.join(ROOT, 'origami-3d.html');

const template = fs.readFileSync(TEMPLATE, 'utf8');
const vendorHtml = fs.readFileSync(VENDOR_INDEX, 'utf8');

const SHADER_RE = /<script id="([A-Za-z0-9_]+)" type="x-shader\/x-(?:vertex|fragment)">[\s\S]*?<\/script>/g;
const blocks = vendorHtml.match(SHADER_RE) || [];
if (blocks.length === 0) throw new Error('没有从 vendor/index.html 里抽到着色器，检查上游版本是否变了');

// 必需清单（GLBoilerplate.js / dynamicSolver.js 里 getElementById 的名字）
const REQUIRED = [
  'vertexShader', 'packToBytesShader', 'zeroTexture', 'zeroThetaTexture', 'centerTexture',
  'copyTexture', 'positionCalcShader', 'velocityCalcVerletShader', 'velocityCalcShader',
  'positionCalcVerletShader', 'thetaCalcShader', 'normalCalc', 'updateCreaseGeo',
];
const got = blocks.map(b => /id="([A-Za-z0-9_]+)"/.exec(b)[1]);
const missing = REQUIRED.filter(id => !got.includes(id));
if (missing.length) throw new Error('缺少着色器: ' + missing.join(', '));

const shaders = blocks.join('\n');
if (!template.includes('<!--@SHADERS@-->')) throw new Error('模板里找不到 <!--@SHADERS@--> 占位符');

fs.writeFileSync(OUT, template.replace('<!--@SHADERS@-->', shaders), 'utf8');
console.log(`已生成 ${path.relative(ROOT, OUT)}（内联 ${blocks.length} 段着色器，共 ${(shaders.length / 1024).toFixed(1)} KB）`);
