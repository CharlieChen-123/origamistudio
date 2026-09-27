# 本地化说明（OrigamiSimulator）

这个目录是 **第三方 MIT 开源项目的本地副本**，不是本项目自研代码；本地改动逐项列在下面。

| 项目 | 值 |
|---|---|
| 上游仓库 | https://github.com/amandaghassaei/OrigamiSimulator |
| 作者 | Amanda Ghassaei（MIT，2018），基于 7OSME 论文 *Fast, Interactive Origami Simulation using GPU Computation* |
| 引入版本 | commit `7855983a613c879c171b2b1557f8cd102d2640cf`（main） |
| 协议 | MIT（见同目录 `LICENSE`，请勿删除） |
| 引入日期 | 2026-09-15 |

## 相对上游的改动

1. `index.html`：移除 Google Analytics 的 `<script async src="https://www.googletagmanager.com/...">`，让整个站点**完全离线、零外部请求**。
2. `index.html`：保留一个 `window.gtag` 空函数兜底。上游应用代码内部仍有 `gtag(...)` 埋点调用，
   直接删掉 GA 会抛 `ReferenceError: gtag is not defined`，打断 `jQuery.Deferred` 流程导致模型加载不出来
   （本地化时踩过这个坑）。

3. `js/pattern.js`：`loadSVG` 增加可选的第三个参数 `{ complete, error }`，供本站显示导入完成或失败；加载后的临时 SVG 在 `finally` 中清理。原来两个参数的调用方式保持兼容，几何与 GPU 求解算法未改写。

`assets/`、`dependencies/`、`css/`、`fonts/` 均未改动。本站模拟页额外加载原有的 `numeric-1.2.6.js`，以支持 SVG 分组坐标变换。

## 怎么跑

使用附带的 Node 静态服务器（`tools/serve.mjs` 已纳入发布用文件）：

```bash
node tools/serve.mjs 8123
# 浏览器打开：
# http://127.0.0.1:8123/vendor/origamisimulator/index.html
```

必须通过 http 打开，不能用 `file://` 双击——它要 XHR 读取 `assets/` 里的 SVG/FOLD。
`?model=` 参数可直接指定模型，取值是 `index.html` 里 `<a class="demo" data-url="...">` 的值：

```
.../index.html?model=Origami/traditionalCrane.svg
.../index.html?model=Tessellations/miura-ori.svg
```

## 导入自己的折痕图（重要：颜色约定是硬编码的）

`js/pattern.js` 的 `typeForStroke()` 只认这几种描边颜色，其它颜色会被丢进 `badColors` 并报错：

| 颜色 | 含义 |
|---|---|
| `#000000` / black | 纸张边界 B |
| `#ff0000` / red | 山折 M |
| `#0000ff` / blue | 谷折 V |
| `#00ff00` / green | 裁切 C |
| `#ffff00` / yellow | 三角剖分 F |
| `#ff00ff` / magenta | 铰链 U |

本站 `origami-3d.html` 现已通过 `assets/cp-import.js` 兼容设计器红蓝色、旧版深红深蓝色和灰色边界，并忽略灰色辅助线。设计器“3D 折叠模拟”入口会直接传递规范色 SVG；本目录原始 `index.html` 仍遵循上表的颜色约定。

## 它和你自己 `simulator/` 的关系

- 上游这套是**同时折叠所有折痕**的动态松弛求解器（GPU 分片着色器算的），适合"整张纸一次折起来"的演示。
- 你自己 `simulator/` 那套是**分步教学**路线（OE3D 思路 + half-edge 面片化）。
- 两条路线不冲突：可以先把它当"3D 折叠参考实现/对照答案"，也可以把它的求解器作为成品展示页，
  自己的引擎继续做分步教程。
