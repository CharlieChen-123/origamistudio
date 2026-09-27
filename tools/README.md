# Development tools

## Current application

- `serve.mjs`: local static server (`node tools/serve.mjs 8123`).
- `build-origami3d.mjs` + `origami3d.template.html`: build the generated Fold Lab page.
- `qa/action-check.html`: open in the local browser to test action tutorials, imports, optional local seam models, narrow layouts and version 1 compatibility.
- `convert-mitani.py`: extract two specific Mitani vector PDFs using `pdfplumber`; see `cp_examples/mitani/README.md` for local inputs and artwork terms.
- `test-cp-simulator.mjs`: earlier integration checks for the original simultaneous-fold view.

Current product instructions are in the root README and `docs/folding-steps.md`. Historical development tools and notes follow; they are not required for the tutorial editor.

---

# tools/ — 开发工具与中间数据

> 本目录存放**开发期工具脚本**（从 .ori 折纸模型文件提取数据、生成 SVG/JSON）。
> 网站运行时（浏览器打开 HTML）**不需要**本目录，仅供开发者重新生成数据时使用。

## 脚本说明

| 脚本 | 作用 | 输入 → 输出 |
|---|---|---|
| `decode_all_ori.py` | **核心解码器**：解析 OE3D 的 .ori 二进制格式（LZW 解压 + 命令解码），批量导出全部模型 | `src1.3.5/src/res/models/*.ori` → `../cp_examples/`（svg/fold） |
| `extract_model_data.py` | 提取 8 个模型的折叠命令为紧凑 JSON（供 HTML 内嵌） | `src1.3.5/.../*.ori` → `models_data_compact.json` |
| `extract_folds_for_html.py` | 提取 12 个模型的详细折叠命令（含 phi 角度/多边形索引） | `src1.3.5/.../*.ori` → `models_data.json` |
| `export_models_json.py` | 解析 .ori + 计算折痕线 + 生成 SVG 折痕图 | `src1.3.5/.../*.ori` → `../cp_examples/*.svg` + `models_data_compact.json` |
| `gen_cp_svg.py` | 从折叠平面定义反算 2D 折痕线，生成 CP 折痕图 SVG | 内置模型定义 → `../cp_examples/` |
| `inject_data.py` | 把 `models_data_compact.json` 注入归档旧页面 | json → 改写 `../archive/legacy-pages/origami-fold.html` |
| `diagnose_ori.py` | 诊断 .ori 文件（raw bytes / LZW / 命令解码），调试用 | 交互式检查 |

## 依赖关系

```
decode_all_ori.py  ←  extract_folds_for_html.py / extract_model_data.py
models_data_compact.json  ←  inject_data.py → ../archive/legacy-pages/origami-fold.html
```

## 使用方式

所有脚本已修正为**相对项目根目录**的路径（`..` 定位 `src1.3.5/`、`cp_examples/`、`archive/legacy-pages/`），
在 `tools/` 目录下直接运行即可：

```bash
python decode_all_ori.py          # 重新解码全部 .ori → ../cp_examples
python extract_model_data.py      # 生成 models_data_compact.json
python extract_folds_for_html.py  # 生成 models_data.json
python gen_cp_svg.py              # 重新生成 CP 折痕图 SVG
python inject_data.py             # 注入模型数据到 ../archive/legacy-pages/origami-fold.html
```

## 数据文件

- `models_data.json`（57KB）：12 个模型的详细折叠命令（调试/参考）
- `models_data_compact.json`（6KB）：8 个模型紧凑数据（用于注入 HTML）

## 注意

- `.ori` 源文件在 `../src1.3.5/src/res/models/`（Origami Editor 3D 的示例模型，GPLv3，仅作数据参考，不随网站开源发布）
- 重新运行 `inject_data.py` 会**覆盖** `../archive/legacy-pages/origami-fold.html`，如需保留改动请先备份
