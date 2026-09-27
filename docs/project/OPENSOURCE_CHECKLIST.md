# GitHub 开源发布清单（历史发布记录）

> 文件已归档到 `docs/project/`。当前网站是 https://charliechen-123.github.io/origamistudio/；当前启动、测试和发布结构以根目录 `README.md` 为准。

> 目标：把折纸网站开源到 GitHub，让所有人通过网址访问。
> ✅ = 我已帮你完成 · ⬜ = 需要你操作 · 📋 = 我提供的文件

---

## 📋 环境检查结果（2026-08-07）

| 工具 | 版本 | 状态 |
|---|---|---|
| Node.js | v22.22.2 | ✅ 就绪 |
| npm | 10.9.7 | ✅ 就绪 |
| Git | 2.47.1 | ✅ 就绪 |
| simulator 测试 | 24/24 全绿 | ✅ 就绪 |
| 项目 git 仓库 | 未初始化 | ⬜ 需要你做（第 1 步） |

---

## 第一步：本地 git 仓库（约 2 分钟）

- ✅ `.gitignore` 已创建（见文件列表）
- ⬜ **在 VSCode 里打开项目文件夹** → 按 `` Ctrl+` `` 打开终端，输入：

```bash
git init
git add .
git commit -m "init: Origami Studio"
```

> 如果 git 提示要配置用户名（首次使用），先执行这两行（把名字邮箱换成你的）：
> ```bash
> git config --global user.name "你的名字"
> git config --global user.email "你的邮箱"
> ```

## 第二步：添加 LICENSE（约 1 分钟）

- ⬜ 打开项目根目录的 `LICENSE` 文件（我提供了 MIT 模板，**只需把 `[姓名]` 改成你的真名**）
- 保存即可，GitHub 会自动识别协议徽章

## 第三步：完善 README（约 5 分钟）

- 📋 我已创建 `README.md` 初版（含项目简介、功能、使用方式）
- ⬜ 可选：替换成你自己的截图（把图片放进 `screenshots/` 文件夹）
- ⬜ 可选：在顶部补上你的名字/联系方式

## 第四步：处理 GPL 代码（重要！避免版权问题）

- ⬜ 把 `src1.3.5/`（OE3D 源码，GPLv3）**从项目里移出去**：
  - 在文件管理器里把 `src1.3.5` 剪切到项目外（比如放到 `E:\陈曦霖\升学\Portfolio\参考代码\`）
  - 原因：GPLv3 代码混入会让你的 MIT 开源协议失效，还可能侵权
- ⬜ `tools/` 里的解码脚本依赖 src1.3.5 的 .ori 文件，一起移出或留作本地参考
- ✅ `.gitignore` 已忽略 `src1.3.5/` 和 `tools/`，即使不移走也不会提交

## 第五步：创建 GitHub 仓库（约 2 分钟）

1. 浏览器打开 https://github.com/new
2. Repository name 填：`origamistudio`
3. 选 **Public**（公开）
4. 不要勾选任何初始化选项（README/.gitignore/LICENSE 都不要勾，本地已经有了）
5. 点 **Create repository**

## 第六步：推送代码（约 1 分钟）

回到 VSCode 终端，按提示输入（把 `你的用户名` 换成实际的）：

```bash
git remote add origin https://github.com/你的用户名/origamistudio.git
git branch -M main
git push -u origin main
```

> 首次推送会弹出 GitHub 登录窗口，用浏览器登录授权即可。

## 第七步：开启 GitHub Pages（约 2 分钟，让所有人能访问）

1. 打开你的仓库页面 → 顶部 **Settings**
2. 左侧菜单找到 **Pages**
3. Build and deployment → **Source** 选 `Deploy from a branch`
4. **Branch** 选 `main` + 目录选 `/ (root)` → 点 **Save**
5. 等 1-3 分钟，页面顶部会出现网址：
   `https://你的用户名.github.io/origamistudio/`
6. 手机浏览器打开这个网址，就是你的网站了！

## 第八步：可选美化（发布后再做）

- [ ] 绑定自定义域名（Settings → Pages → Custom domain）
- [ ] 在仓库 About 区域点齿轮，加上 Website 链接
- [ ] 写一份 `CHANGELOG.md` 记录更新
- [ ] 给项目打第一个版本标签：`git tag v1.0.0 && git push --tags`

---

## 完成后你的网站结构（预期）

```
origamistudio/            ← GitHub 仓库
├── index.html            ← 门户页（跳转设计器/模拟器）
├── cp-designer.html      ← 原版设计器
├── cp-designer-modified.html ← 新版设计器
├── origami-fold.html     ← 3D 折叠模拟器
├── origami-studio.html   ← 集成工作室
├── simulator/            ← 模拟器核心库（有测试）
├── cp_examples/          ← 示例模型
├── README.md / LICENSE / .gitignore
```

> ⚠️ 提醒：`src1.3.5/`、`tools/`、`OrigamiEditor3D.jar` 都不在仓库里（GPL 或开发工具），这正是我们想要的开源状态。
