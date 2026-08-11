# 狐狸爱拼豆 · 双 Agent 协作日志（AGENT_CHANGELOG）

> 协作方：① SeniorDeveloper（WorkBuddy / Hy3）② ClaudeCode（deepseek-v4-pro）
> 维护人：余莎莎 ｜ 最后更新：2026-08-10（#18 去背景渐变鲁棒 / #19 小程序UI / #20 手绘改色 / #21 主预览平移 / 图片处理模块 / 视觉升级三态主题 / 豆仓库存模块 / 竞品分析文档 / 修复下载·预览放大·调色注释·默认深色 / v141 图片处理重构·自动抠图多主体·去笔刷·删提亮 / v142 羽化强度可调·灯箱直转像素·主体留边·批量对照长图·分块多板导出 / v143 补货清单导出·分块多板PDF·小程序发版就绪·保护笔刷·设置持久化·多色板切换 / v144 分块多板补跨板对齐标记·CC复核意见②核查no-op / iframe预览下载修复 / 下载修复v2-clipboard逃生通道 / 下载修复v3-统一保存对话框消除静默下载）
> 位置：`D:\余莎莎资料\fox-bead\AGENT_CHANGELOG.md`（已纳入 git，双方 checkout 共享）

---

## 0. 这个文档是干什么的（双方必读）

两个 Agent 并行维护同一份代码，但 **git 提交 author 全部是 `fox-bead`**，从 git 历史无法区分是谁改的。本文件是「谁做了什么、为什么」的唯一权威记录。

**使用纪律（双方必须遵守）：**
1. **动手前先读**：开始任何改动前，先 `git pull` 拉最新，并读本文档的 §1 约束不变式 和 §5 已知冲突，避免踩雷或重复劳动。
2. **做完就追加**：每完成一块改动，立即在 §4 追加一条（格式见 §4 表头），不要攒。
3. **提交即同步**：追加后 `git add AGENT_CHANGELOG.md && git commit -m "chore: 更新协作日志" && git push`，让对方 checkout 能看到。
4. **碰冲突先协商**：涉及 §5 已知冲突区，先在对端 Agent 条目下留言，不要各自硬改。

---

## 1. 约束不变式（改任何代码前先看，违反会搞崩对方功能）

| # | 规则 | 原因 | 提出方 |
|---|------|------|--------|
| C1 | 禁止 `?.` 可选链 | 老款手机 / 小程序基础库不兼容 | SeniorDeveloper |
| C2 | 禁止 `Object.fromEntries` | 旧环境无此 API | SeniorDeveloper |
| C3 | 禁止展开运算符 `...`（数组 / 对象 spread） | 已踩坑：spread→Array.from 修复过 | SeniorDeveloper |
| C4 | Mard 221 色板（`src/core/colors.js`）**不得改动** | 业务固定 palette，改了配色全乱 | 余莎莎 / 业务 |
| C5 | `docs/index.html` 是构建产物，**禁止手改** | 由 `build.js` 生成，手改下次构建被覆盖 | SeniorDeveloper |
| C6 | `src/core/pipeline-core.js` 内**禁止**出现 `document`/`window`/`canvas` | 该文件会被打进小程序，小程序端无 DOM | SeniorDeveloper（已落地） |
| C7 | 平台相关代码只能放 `src/core/pipeline.js`（网页，可用 canvas）或 `src/web/` | 保持内核纯净，双端共用同一算法 | SeniorDeveloper |
| C8 | `sampleCellRGB()` 返回**原始 RGB**，`mapCell()` 返回**色号字符串**，禁止混用 | 混用会「双重映射」，grid 全变 null（已真实踩坑，见 §4.1 2026-08-05） | SeniorDeveloper |

**每次构建后验证（违反任一项即失败）：**
```bash
node --check build.js
node build.js                                        # 重新生成双端产物
node tools/smoke-mini.js                             # 无 DOM 环境跑通小程序内核，须全 PASS

grep -c "?\." docs/index.html                        # 应为 0
grep -c "Object.fromEntries" docs/index.html         # 应为 0
grep -cE "document\.|window\.|\.getContext|createElement" miniapp/utils/core.js   # 应为 0
# 颜色一致性：docs/index.html 内 colors 段须与 src/core/colors.js 完全一致（221 色）
```

---

## 2. 架构地图（当前真实结构 · 2026-08-07）

```
fox-bead/
├── src/core/              # 【唯一算法内核】双端共享，8 个模块
│   ├── pipeline-core.js   # ★ 纯算法层（零 DOM）：取色/抖动/降噪/去背景/减色/提亮/描边
│   ├── pipeline.js        # 网页平台层：canvas 取像素 + processImage()，仅网页打包
│   └── color.js colors.js init.js palette.js presets.js state.js
├── src/web/               # 【网页 UI】render/editor/exporter/events/sample/main + css + template.html
│   └── css/style.css
├── miniapp/               # 【小程序】工程（core.js 为构建产物，勿手改）
│   ├── utils/core.js      # ✅ build.js §7 自动生成（51KB，0 处 DOM 依赖）
│   ├── pages/index/       # index.js / index.wxml / index.wxss
│   └── app.js app.json project.config.json
├── tools/
│   └── smoke-mini.js      # ★ 无 DOM 环境冒烟测试，改内核后必跑
├── build.js               # 构建脚本 → ①docs/index.html ②miniapp/utils/core.js
├── docs/
│   ├── index.html         # 构建产物（~481KB），GitHub Pages 部署文件
│   └── GitHub参考项目对比.md
├── assets/
├── README.md
└── .gitignore
```

**单内核数据流（2026-08-05 起）：**

```
                    src/core/pipeline-core.js   ← 唯一算法真源（零 DOM）
                              │
             ┌────────────────┴────────────────┐
             ▼                                 ▼
  src/core/pipeline.js                build.js §7 自动拼接
  （canvas 取像素，网页专用）          （只打包纯模块 + 小程序适配层）
             ▼                                 ▼
   docs/index.html                    miniapp/utils/core.js
   processImage() 分帧异步            processImageMini() 同步返回
```

> ✅ **双内核问题已解决**：算法只有 `src/core/pipeline-core.js` 一份。`miniapp/utils/core.js` 现为**构建产物**，任何手改都会被下次 `node build.js` 覆盖。

---

## 3. 部署现状

| 渠道 | 地址 | 状态 | 备注 |
|------|------|------|------|
| GitHub Pages | `https://sanmiaowuyu.github.io/fox-bead/` | ✅ 运行中 | 源 = docs/index.html |
| CloudStudio（旧） | `…sh4.agentos-app.net` | ❌ 指向已删 fox_v139_upload | 建议删除 |
| CloudStudio（新） | `…bj2.agentos-app.net` | 待确认 | |
| Gitee Pages | `https://gitee.com/three-little-kitty/fox-bead` | ✅ 仓库已推送（main + 11 tags）；Gitee Pages 服务待用户在 Gitee 开启 | 国内镜像，外网不稳时兜底 |

---

## 4. 变更日志

**格式**：`| 日期 | Agent | 变更 | 原因 | 影响文件 | 状态 |`

### 4.1 SeniorDeveloper（WorkBuddy / Hy3）经手

| 日期 | 变更 | 原因 | 影响文件 | 状态 |
|------|------|------|----------|------|
| 2026-08-05 | v139 全面优化：去背景（边界分析+BFS 洪水填充+自动检测）、UI/UX、导出、移动端适配 | 用户要求「各方面都要优化」 | 单文件 → src 拆分前 | ✅ |
| 2026-08-05 | P0 兼容修复：spread→Array.from、滑块防抖、自动去背景检测 | 旧手机实测崩溃，修兼容 | src/* | ✅ |
| 2026-08-05 | v139 模块化：拆成 src/core + src/web + build.js | 单文件 4566 行难维护 | src/、build.js | ✅ |
| 2026-08-05 | GitHub 开源调研 + 对比文档（10 个项目，Zippland/perler-beads 822⭐ 为算法源） | 用户要求找参考 | docs/GitHub参考项目对比.md | ✅ |
| 2026-08-05 | 部署策略建议：GitHub Pages / CloudStudio / 艾可秀 对比 | 用户问用什么发布 | — | ✅ |
| 2026-08-05 | 修复 git 分叉（detached HEAD）：`checkout -B master 058630d` + 恢复 README | 用户「修复」指令 | — | ✅ |
| 2026-08-06 | 迁移项目到 `D:\余莎莎资料\fox-bead\` | 用户要求整体移动 | — | ✅ |
| 2026-08-06 | 评审 v140 改动，指出双内核 / 5 处 document 依赖问题 | 用户「你再看一下我改的」 | 评审结论 | ✅ |
| 2026-08-05 | 建立本协作日志 AGENT_CHANGELOG.md | 双 Agent 无法从 git author 区分 | AGENT_CHANGELOG.md | ✅ |
| 2026-08-05 | **【P0】抽出 `pipeline-core.js` 纯算法层**：把全部算法从 pipeline.js 迁出，pipeline.js 只留 canvas 相关（getSourceData / pixelateToGrid / buildSrcRGB / processImage） | 双内核漂移，算法必须单一真源 | 新增 src/core/pipeline-core.js（~470 行）、重写 src/core/pipeline.js | ✅ |
| 2026-08-05 | **【P1】小程序接入完整管线**：重写 build.js §7 适配层，`processImageMini` 串起裁剪→取色→FS抖动→降噪→去背景→减色→提亮→描边，返回 `{grid,totalBeads,colorCount}` | 小程序此前只有颜色映射，效果和网页差一大截 | build.js §7 | ✅ |
| 2026-08-05 | **【P2】小程序产物零 DOM**：§7 只打包纯模块（color/palette/state/pipeline-core），生成物 DOM 引用 5 → 0 | 小程序无 DOM，原产物会崩 | build.js、miniapp/utils/core.js | ✅ |
| 2026-08-05 | 🐛 **修复双重映射致命 bug**：适配层误用 `mapCell()`（已返回色号）当原始 RGB 再喂 `mapToPalette()`，导致 grid 全 null、珠数 0；且 srcRGB 存成色号字符串，连带抖动/去背景失效 | 冒烟测试暴露 | 抽出共用 `sampleCellRGB()`，web `_processChunk` 与 mini 适配层共用同一采样器 | ✅ |
| 2026-08-05 | 新增 `tools/smoke-mini.js` 无 DOM 冒烟测试：44 项断言（色板 221 / 导出完整性 / 采样器契约 / 7 种参数组合 / 3 种尺寸） | 双端共内核后需要回归防线 | tools/smoke-mini.js | ✅ |
| 2026-08-05 | 修正 miniapp/pages/index/index.js 过时注释（管线已非「简化 MVP」） | 注释误导 | miniapp/pages/index/index.js | ✅ |
| 2026-08-07 | **去背景全面增强（算法层）**：①黑底自动识别——`_manualBgRGB` 与边界极性相反时回退自动判断，纯黑底图不再清不掉；②清理强度随板子自动调低（≤40→上限30 / ≤80→55 / 大板→80）防过度清理；③白底/黑底场景收紧 `BG_T`(0.05) 缓解浅色主体被误删 | 交接文档 §6.2 已知失效场景 + §十二「清理强度随板子自动调低」待办 | src/core/pipeline-core.js | ✅ |
| 2026-08-07 | 扩展 `tools/smoke-mini.js`：新增 7 项去背景回归断言（黑底识别 + 逆极性取样回退 + 浅主体保护） | 防去背景改动回归 | tools/smoke-mini.js | ✅ |
| 2026-08-07 | **描边体验增强**：`applyOutline` 加 `thickness` 参数（在边缘像素膨胀 t-1 圈实现 1~4 格宽描边）；`state.outline` 加 `thickness` 字段；网页端新增「描边粗细」滑块（1~4），miniapp 适配层同步透传 | 交接文档 §十二待办「描边粗细控制」 | src/core/pipeline-core.js、src/core/state.js、build.js §7、src/web/template.html、src/web/events.js | ✅ |
| 2026-08-07 | **移动端深度适配（主预览画布触屏）**：新增双指 pinch 缩放（映射 `state.zoom`，rAF 节流重绘，居中缩放不引入 pan 状态）+ 单指轻点取样（消除 iOS 300ms 延迟）；双指 `preventDefault` 防页面缩放、单指不拦截以保留页面滚动 | 主预览画布此前仅按钮缩放/click 取样，手机无触屏交互（编辑画布 editor.js 已有完整触屏） | src/web/events.js | ✅ |
| 2026-08-07 | **#18 去背景鲁棒增强（渐变/浅水印）**：`removeBackground` 背景色估计从 RGB 中点改为边界采样点的 Oklab 中位数（`medianLab`），不再被单边明暗带偏置；对渐变背景/浅水印更稳 | 交接文档 §9 / §6.2 非纯色背景为已知失效场景；纯前端渐变背景此前易把主体当背景 | src/core/pipeline-core.js、tools/smoke-mini.js(新增 7d 渐变背景用例) | ✅ |
| 2026-08-07 | **#19 小程序管线 UI 开关**：`index.js` 透传 mode/removeBg/dither/brighten/maxColors(4-64)/outline(on+strength) 到 `processImageMini` 第三参 `opts`；`index.wxml/wxss` 加控制面板（模式 picker、去背景/抖动/提亮/描边 switch、减色上限/描边强度 slider），复用缓存 `_imgData` 重跑 `_reprocess` | §5.2 P3「小程序页面缺开关 UI」待办闭环 | miniapp/pages/index/index.js、index.wxml、index.wxss | ✅ |
| 2026-08-07 | **#20 编辑器拖拽手绘改色**：`state.editTool('select'\|'paint')` + `selectedColor`；`editor.js` 单指拖拽连续刷色，复用增量重绘 `_patchEditCell`/`patchMainCell`，单次手势一次撤销（`_pushUndo` 在 `startPaint`）；`template.html`/`events.js` 加工具切换分段控件 + 画笔色显示；`css` 加 `.edit-tool`/`.edit-paint-color` 等样式 | 用户要「拖拽手绘改色」体验 | src/core/state.js、src/web/editor.js、src/web/template.html、src/web/events.js、src/web/css/style.css | ✅ |
| 2026-08-07 | **#21 移动端主预览画布单指平移**：`events.js` 主画布触屏加单指拖拽平移（CSS `transform: translate`，仅在画布溢出容器时启用），`clampMainPan` 边界夹取防拖飞，与双指 pinch 缩放协同（缩放后重新夹取），`resetMainPan` 在导入新图/示例/粘贴/URL 加载时清零；不侵入 render.js 重绘模型 | §6 注「完整自由平移(pan)为已知待办」闭环 | src/web/events.js | ✅ |
| 2026-08-07 | **图片处理模块（通用预处理 + 去背景笔刷）**：新增「🖼 图片处理」弹窗，含 旋转(±90°)/翻转(水平垂直)/自由裁剪/调色(亮度·对比度·饱和度) 与 去背景手动笔刷（擦除背景/保留主体，按当前 N 构建 N×N 遮罩）；纯函数 `adjustImageData` 入 `image-prep.js`（零 DOM，web+小程序共用），栅格化 `computePrepCanvas`/`bakePrep`/`resetPrep` 入 `pipeline.js`（web 专属）；遮罩经 `state.userMask` 注入 `removeBackground`（复用洪水填充，无需大模型） | 用户问「去背景留主体是否要接大模型」→ 结论：常见拼豆素材无需模型，增强现有无模型算法 + 手动笔刷即可，离线零成本保铁律 | src/core/image-prep.js、src/core/pipeline-core.js、src/core/pipeline.js、src/core/state.js、src/web/template.html、src/web/events.js、src/web/css/style.css、build.js | ✅ |
| 2026-08-07 | **视觉升级（清晰度 + 浅/深/跟随系统三态主题）**：①浅色层次增强——加深辅助文字（`--ink2`/`--ink3`）、左右栏加边框分隔、卡片加轻投影、顶栏改毛玻璃渐变、主按钮改品牌紫渐变、画布区加径向渐变「影棚」背景；②新增深色主题（`[data-resolved="dark"]` 重映射全部变量 + 棋盘格/遮罩/弹窗等硬编码白色元素重映射）；③顶栏加三态主题切换（太阳/月亮/显示器 SVG），`localStorage` 记忆，内联脚本防闪屏，「跟随系统」用 `matchMedia` 实时切换；④修复图片处理按钮 `prep-btn` 原引用未定义变量 `--bg-card/--text` 导致样式失效 | 用户反馈「目前是纯白的，看起来很不清晰」 | src/web/css/style.css、src/web/template.html、src/web/events.js | ✅ |
| 2026-08-07 | **豆仓库存模块（用量统计 + 缺口提醒）**：左栏新增「📦 豆仓库存」按钮→弹窗按当前图纸统计每色「需要/库存/缺口」，缺口色号标红；`state.inventory` 持久化 `localStorage`（key `foxbead-inventory-v1`）；工具栏「按用量一键填 / 全部+100 / 清空库存 / 视图切换(仅用到的·全部221)」；`computeUsage()` 复用 `subject`/`excluded`/`bgMask` 排除背景统计口径；`renderAll` 末尾派发 `fb:render-done` 事件，弹窗打开时自动重算 | 竞品调研（pindouwuxian 豆仓管理）启发；用户要「图片处理模块」同时选了「做豆仓」+「写竞品对比清单」 | src/core/state.js、src/web/render.js、src/web/template.html、src/web/events.js、src/web/css/style.css | ✅ |
| 2026-08-07 | **竞品分析文档**：新增 `竞品分析_可借鉴清单.md`，对比 pindouwuxian/Zippland/PixelBead/Jett-Wu 等 8 个项目，给出 P0(豆仓+分块多板PDF)/P1(多色板+补货清单)/P2(3D预览·多图层，需降级) 路线；结论：狐狸去背景算法/移动端/离线单文件已领先，AI 类不建议接（破铁律） | 用户问「Gitee/论坛有什么好的可学习」+ 明确要「做豆仓 + 写对比清单」 | 竞品分析_可借鉴清单.md | ✅ |
| 2026-08-07 | **修复三处体验问题（用户反馈）**：①**下载修复**——`downloadCanvasPNG` 改用 `genPNGSource`（带 5s 超时回退 dataURL）；顶层页面走 `a.download` 直接下载，iframe/沙箱环境（预览面板、CloudStudio）改弹窗让用户右键/长按保存，`showMobileSaveOverlay` 文案按设备区分（桌面「右键另存为」/移动「长按存相册」）；②**图片处理预览放大**——`renderPrepPreview` 去掉 `scale>1` 上限（允许放大填充预览框，上限 4x 防内存爆），笔刷在显示坐标作画、`prepScale` 已正确处理放大映射；`.prep-card` 宽度 460→520、`.prep-preview-wrap` max-height 360→460；③**调色注释**——亮度/对比度/饱和度滑块下加 `.slider-hint` 说明高低影响；④**默认深色**——内联 head 脚本首次访问默认 `dark` | 用户反馈「下载不了 / 示例图太小笔刷看不清 / 默认暗色」 | src/web/exporter.js、src/web/events.js、src/web/template.html、src/web/css/style.css | ✅ |
| 2026-08-10 | **修复 iframe 下载失效（CloudStudio 预览面板·纯 bug 修复·不 bump）**：根因——应用运行在预览 iframe 内，`downloadCanvasPNG`/`downloadBlob`/`downloadSVG` 检测到 `window.self!==window.top` 后**跳过真实下载**、只弹「右键另存」覆盖层，而预览沙箱右键常被宿主 UI 拦截 → 用户「一直无法下载图纸」。高度钳制修复(v141)早已在线、生成无问题，是保存这步在 iframe 里被废。修复——iframe 下新增 `tryRealDownload`（页内 `<a download>` 真实点击，不被宿主 UI 拦截）+ 统一保存对话框（`下载图片`主按钮 + `新窗口打开`次按钮 + 右键/长按兜底），PDF/SVG 同步走该对话框；顶层窗口逻辑不变。Gitee Pages 实测 404（未启用），确认用户走 CloudStudio 预览路径 | 用户「先排查一直无法下载图纸的原因」 | src/web/exporter.js、src/web/events.js | ✅ |
| 2026-08-11 | **下载修复 v3（统一保存对话框·不 bump）**：用户反馈在 CloudStudio 顶层窗口打开仍「没有弹窗」——根因是顶层窗口下 `downloadCanvasPNG`/`downloadBlob`/`downloadSVG` 仍走静默 `<a download>`（文件默默进 Downloads，用户看不到任何反馈以为没下载）。修复——三条下载路径全部统一为**始终弹保存对话框**：①`downloadCanvasPNG` 不再区分顶层/iframe，直接 `showMobileSaveOverlay`；②`downloadBlob`（PDF）同理，去掉 `inIframe` 分支；③`downloadSVG` 桌面端去掉静默 `<a download>` 分支，统一走对话框。对话框内「复制图片」(剪贴板) / 「下载图片」(`<a download>`) / 「新窗口打开」三按钮覆盖所有环境。线上已验证含全部修复标记 | 用户「仍然无法下载，网页没有弹窗」 | src/web/exporter.js | ✅ |

### 4.2 余莎莎 直接改动（部分可能经 ClaudeCode 协助 — 待认领）

| 日期 | 变更 | 原因 | 影响文件 | 状态 |
|------|------|------|----------|------|
| 2026-08-06 | v140 重构：core/web 分层 + 死代码清理（058630d→e56ecaa） | 结构优化 | src/ | ✅ |
| 2026-08-06 | 材料统计清单 + 去背景状态反馈（002c3f1） | 产品增强 | src/ | ✅ |
| 2026-08-06 | 分帧批处理 — 大板子不卡 UI（e2b2c80） | 性能 | src/web | ✅ |
| 2026-08-06 | 性能优化三连：颜色缓存 + 编辑器增量 + SVG 合并（4262e83） | 性能 | src/web | ✅ |
| 2026-08-06 | v140：Floyd-Steinberg 抖动 + PNG/SVG 合并 + 主预览增量 + 版本自增 + 小程序 MVP（36ad3e6） | 核心功能 | src/、miniapp/ | ✅ |
| 2026-08-06 | FS 抖动大板子分帧 N≥104 逐行异步（3bfc5fd） | 大图卡顿 | src/web | ✅ |
| 2026-08-06 | 产品增强：采购清单开关 + 编辑撤销重做 + 去背景手动取样（b4b2a87） | 产品 | src/web | ✅ |
| 2026-08-06 | 部署到 GitHub Pages：dist → docs（8f83176） | 发布 | docs/、build.js | ✅ |
| 2026-08-06 | 清理残留文件（6ca8e36） | 整洁 | — | ✅ |

### 4.3 🔴 待 ClaudeCode 认领 / 补充

> ClaudeCode 请读此文件后：
> 1. 把你自己做的改动按 §4 格式补到 4.1/4.2 上方或本区，并认领 4.2 中属于你的条目；
> 2. 当前 git author 全是 `fox-bead`，无法自动区分，需人工认领。
>
> **待补充项：**
> - v140 哪些 commit 是 ClaudeCode 协助完成的？
> - ClaudeCode 是否独立改过 `miniapp/` 或 `src/`？
>
> **⚠️ 给 ClaudeCode 的重要变更提醒（2026-08-05）：**
> 1. `src/core/pipeline.js` 已被拆分——**算法都搬到了 `src/core/pipeline-core.js`**，pipeline.js 现在只剩 canvas 相关 4 个函数。改算法请改 pipeline-core.js。
> 2. `miniapp/utils/core.js` **不再是手写文件，是构建产物**。改小程序算法请改 `src/core/pipeline-core.js`，改小程序适配请改 `build.js` §7，然后 `node build.js` 重新生成。
> 3. 新增约束 C6/C7/C8，特别注意 **C8 采样器契约**（`sampleCellRGB` 返 RGB / `mapCell` 返色号，混用会导致 grid 全 null）。
> 4. 动内核后请跑 `node tools/smoke-mini.js`，须全 PASS。

---

## 5. 已知冲突 / 待决策

### 5.1 ✅ 已解决（2026-08-05 · SeniorDeveloper）

| 优先级 | 问题 | 解决方式 | 验证 |
|--------|------|----------|------|
| **P0** | 双内核：`src/core/*.js` vs `miniapp/utils/core.js` 两份拷贝已漂移 | 算法全部收敛到 `src/core/pipeline-core.js` 单一真源；`miniapp/utils/core.js` 改为 build.js §7 自动生成的产物 | 构建通过，产物 51KB |
| **P1** | 小程序只有颜色映射，缺去背景 / 抖动 / 降噪 | `processImageMini` 接入完整管线，与网页同算法 | 7 种参数组合冒烟全 PASS |
| **P2** | 小程序产物 5 处 `document`/`getContext` 依赖 | §7 只打包零 DOM 的纯模块 | `grep -cE "document\.\|window\.\|\.getContext\|createElement"` = **0** |

#### 5.1.1 去背景算法增强（2026-08-07 · SeniorDeveloper）

针对交接文档 §6.2 已知失效场景 + §十二待办，对 `removeBackground` / `cleanupNoise` 做了三处增强（均位于 `src/core/pipeline-core.js`，web 与小程序共用）：

| 改动 | 内容 | 解决的问题 |
|------|------|-----------|
| A 黑底自动识别 | `removeBackground` 先算边界中位数亮度定极性；若用户取样色（`_manualBgRGB`）与边界极性相反（如取白但图是黑底），回退自动判断，用 `BG_BLACK_ID` | 纯黑底图此前因取白而清不掉 |
| B 清理强度自适应 | `_finishAfter` 按 N 设清理天花板（≤40→30 / ≤80→55 / 大板→80），`Math.min(state.cleanup, cap)` | 小板每格覆盖大图区、细节珍贵，原固定阈值易过度清理吃掉细节 |
| C 浅主体阈值收紧 | 白底/黑底（`bgLab.L>0.88` 或 `<0.18`）时 `BG_T` 收紧到 0.05，中性灰底保持 0.08 | 白猫脸/浅灰主体距白底仅 0.04~0.06 易被当背景误删（缓解，非根治——彻底解决需 AI 分割） |

> ⚠️ 非纯色背景（渐变/网格/水印/杂色）仍无法纯前端可靠去除，文档 §6.2 / §9 已定位为需接 AI 分割，本次未解。

**回归结果**（`node tools/smoke-mini.js`，纯 Node 无 DOM）：

| 场景 | N | 珠数 | 用色 | 耗时 |
|------|---|------|------|------|
| 默认 | 32 | 1024 | 3 | 7ms |
| 抖动 | 32 | 1024 | 20 | 20ms |
| 减色到 4 | 32 | 1024 | 3 | 3ms |
| 去背景 | 64 | 4096→**1601** | 2 | 28ms |
| 全开（抖动+去背景+提亮+减色12+描边） | 64 | 1601 | 8 | 29ms |

### 5.2 ⚠️ 遗留待办

| 优先级 | 事项 | 说明 |
|--------|------|------|
| P3 | `miniapp/utils/core.js` 已是产物，建议加入 `.gitignore`？ | 暂**保留在 git**——小程序开发者工具需要它，且方便对端 Agent 直接 checkout 就能跑。但**禁止手改**（见 C5 同理） |
| P3 | ~~小程序页面缺开关 UI~~ → **✅ 已解决（#19）** | `processImageMini` 第三参 `opts` 已支持 mode/dither/cleanup/maxColors/removeBg/brighten/outline，`miniapp/pages/index` 已加控制面板透传 |
| P3 | 去背景在 `N<=52` 时按设计跳过（走 `bgStatus='small'` 分支保留背景） | 非 bug。小程序默认板子 104，不受影响；但若产品要小板子也去背景，需改 `pipeline-core.js` L458 阈值 |
| P3 | web 的 `srcRGB` 由 canvas 降采样生成，mini 由 `sampleCellRGB` 生成 | 两者路径不同，抖动结果可能有极微差异。未统一是为了不动网页既有行为，如需完全一致再议 |
| P3 | 浅色主体（白猫脸/白衣物）误删为已知限制，需 AI 分割根治 | 2026-08-07 收紧 `BG_T` 仅缓解明显浅主体；彻底解决见文档 §9 生图模块（需加后端+付费） |

---

## 6. 版本里程碑（git tag）

`v6` `v45` `v87` `v100` `v117` `v124` `v132` `v137`(=v138) `v139` —— 均为历史导入。

**v140**（2026-08-07，SeniorDeveloper）：双内核合并里程碑闭环 + 三项体验增强。
- 架构：算法单一真源 `src/core/pipeline-core.js`，小程序 `miniapp/utils/core.js` 为构建产物（P0/P1/P2 全解决）；修复双重映射致命 bug
- 去背景增强：黑底自动识别 / 清理强度随板子自适应 / 浅色主体阈值收紧
- 描边增强：`applyOutline` 加 `thickness`（1~4 格宽），网页端新增「描边粗细」滑块
- 移动端：主预览画布补双指 pinch 缩放 + 轻点取样触屏
- 验证：`node tools/smoke-mini.js` 全 PASS（含去背景/描边新增回归）；`docs/index.html` ?.=0、`miniapp/utils/core.js` DOM=0

> 注：小程序真机手感（pinch 缩放/轻点取样）需余总本机验收。完整自由平移(pan)已于 **#21** 实现（主预览画布单指 CSS transform 平移 + `clampMainPan` 边界夹取，与 pinch 缩放协同）。

**v141**（2026-08-07，SeniorDeveloper）：图片处理模块重构——自动抠图 + 多主体分张 + 像素图转换；移除手动笔刷与「提亮一档」。

需求背景：用户实际图片常杂乱无章，需要自动抠出主体并转为拼豆像素图；原「手动笔刷 + 提亮一档」方案不符使用场景。

- 抠图（需求1）：新增 `segmentSubjects`（image-prep.js，零 DOM，web/小程序共用）。边界 Oklab 中位数估背景 + 4-连通分量分离多主体，**无 ML 模型**（守住离线/旧移动端铁律）。一张图多个主体 → 各生成一张透明底独立图。
- 像素图（需求2）：弹窗新增「自动抠图」按钮，运行后列出抠出的主体缩略图，每张配「转为像素图」→ 设为 `state.sourceImage`（透明底）并 `processImage()`，即拼豆化。
- 去笔刷（需求3）：彻底移除手动去背景笔刷——`state.js` 删 `userMask/brushMode/brushSize`、`pipeline-core.js` 的 `removeBackground` 删 `userMask` 分支、`events.js` 删 `prepPaintAt` 及笔刷 UI、`template.html` 删笔刷区块；预览仅保留「拖动裁切」。
- 拖拽条（需求4）：对比度/饱和度本就是 range 拖拽条（与亮度一致），沿用无需改动。
- 删提亮（需求5）：删除 `brighten` 状态与 `applyBrighten`（`state.js`/`pipeline-core.js`/`build.js` 适配器/`events.js` 同步清理）。
- UI：新增 `prep-auto-seg` / `prep-results` / `subject-thumb`（透明棋盘格）/「转为像素图」按钮，浅/深主题可读；`prep-tool-seg` 工具栏与笔刷样式移除。
- 验证：`node --check` 全过；`docs/index.html` `?.`=0 / `Object.fromEntries`=0；`miniapp/utils/core.js` DOM=0；`node tools/smoke-mini.js` 全 PASS（导出清单去掉 `applyBrighten`）；合成双主体图实测 `segmentSubjects` 返回 2 个主体。
> 注：真实照片抠图精度受限于无模型算法（浅色主体/杂乱背景可能需多试旋转+调色/裁切）；彻底 AI 分割见文档 §9 生图模块（需后端+付费）。

## v141 补丁 · 下载"生成失败"修复（2026-08-07，SeniorDeveloper）
- **根因**：`buildExportCanvas` 只按宽度把每格像素 `cell` 钳到 ≤16384，但总高度 `H=标题栏+图案区+色板区` 里色板区随色卡数增长，导致 `N≥80`（真实照片拼豆常见）时 `H` 突破浏览器 canvas 硬上限 → `toBlob`/`toDataURL` 静默失败 → 回调空 → 弹"生成失败，请重试"。与抠图无关；历史"修复下载"只修了 iframe 拦截未修此坑。
- **修复**：① 导出加总高度钳制（按 H 比例缩 `cell` 并完整重算布局，桌面/移动/微信单边上限统一覆盖）；② `PALETTE_BY_ID[tid]` 越界保护（两处 `_pngGetCell`）；③ `buildExportCanvas` 入口空 grid/displayRect 保护。
- **验证**：node 模拟 N=40~221 × 色卡30/60 全部 H≤16384（旧逻辑 N≥80 及大色卡全超限）；`node --check`/smoke-mini 全过；铁律 `?.=0`、mini DOM=0。未 bump 版本（修 bug），保持 v141。

## v141 图片模块再优化（抠图质量/体验/批量导出，未 bump）
- 余总「继续优化」→ 三项，仍不 bump（APP_VERSION=141）：
  1. **抠图边缘羽化** `featherAlpha`（image-prep.js 纯函数，零 DOM）：主体前景边缘像素按相邻背景数降 alpha（1邻→0.7 / 2邻→0.45 / 3+→0.25），消除硬锯齿/白边；已进小程序 core.js
  2. **自动抠图 loading 态**：`runAutoSeg` 先显「正在分离主体…」再 setTimeout 跑重计算，大图不再卡死无反馈
  3. **批量分张导出** `exportAllSubjects`：弹窗「逐个导出 N 张」→ 串行给每个主体 processImage(onDone)+下载 PNG（文件名带主体序号+时间戳），结束恢复主图；`processImage` 加可选 onDone 回调（向后兼容）；浏览器可能拦截多次下载，已提示用户允许
- 验证：featherAlpha node 单测通过（中心255/边角115/边缘179/背景0）；语法+构建+smoke 全过；铁律精确 `?.`=0 / 字面 `document.`=0；featherAlpha 进 mini core 无 DOM
- 部署：CloudStudio 同沙箱；Gitee main `7e92877..0db4077`

## ⚠️ 后续部署注意
- v141 已推 Gitee main；Gitee Pages 部署目录 `/docs`，改代码后需在 Pages 页点「更新」重新部署（免费版仅公开仓库）
- 分支陷阱仍在：本地 `master` → 远端 `main`，推送 `git push origin master:main`

## 图片处理模块体验补强（v141 补强，未 bump；2026-08-07 15:16）
- 用户指令「继续优化吧」→ 聚焦刚交付的 v141 图片模块，三项低风险体验增强。按版本纪律**不 bump**（APP_VERSION 保持 141，仅记此条）。
- ① **抠图强度滑块**：暴露 `segmentSubjects` 的 `bgT` 容差（默认 `null`=算法自适应最稳；用户可调 0.04~0.22，解决真实照片「扣不净留边」往右调、「抠过头缺角」往左调）。`runAutoSeg` 传 `opts.bgT`；弹窗加 `prep-seg-strength` 滑块 + `prep-seg-val` 显示「自动」或数值。
- ② **主体缩略图标注**：每个主体显示 `序号 · 宽×高`（如 `① 120×80`），多主体一眼分清谁是谁。
- ③ **「全部拼成一张」按钮**：所有主体按原构图 `drawImage` 合成一张透明底大图 → `processImage()` 一次出含全部主体的拼豆总稿；分张仍用逐个「转为像素图」。`applyAllAsOne` 复用 `prepSegSubs` 缓存。
- 改动文件：`src/web/template.html`（滑块+结果区标题栏+全部按钮）、`src/web/events.js`（变量/重置/传参/标注/滑块+全部绑定/合成函数）、`src/web/css/style.css`（head/all/label 样式）。
- 验证：node --check 过；docs ?.=0 / Object.fromEntries=0 / mini DOM=0；smoke-mini 全 PASS；新控件已进产物。

## v141 优化（图片模块交互/下载体验，未 bump；2026-08-10）
- 用户指令「继续优化吧」→ 在 v141 图片模块基础上再加三项低风险优化，按版本纪律**不 bump**（APP_VERSION 保持 141）。
- ① **抠图强度滑块实时重抠**：拖动滑块 250ms 防抖后自动 `runAutoSeg()` 重新分离主体，所见即所得（原需手动点「自动抠图」）；未抠过时提示先点抠图。新增模块级 `prepSegTimer` 防抖变量。
- ② **导出文件名带时间戳**：图纸 `狐狸爱拼豆_i喵绘工坊_${N}x${N}_MARD_${时间戳}.png`、分享图同步加时间戳，避免多次下载互相覆盖（原固定名无时间戳）。新增 `timeStamp()` helper（YYYYMMDD_HHMMSS）。
- ③ **主体缩略图点击放大**：抠完点缩略图弹 lightbox 大图（透明棋盘格背景），确认抠图效果再「转为像素图」。新增全局 `seg-lightbox` 遮罩 + `openSegLightbox`/`closeSegLightbox` + `template.html` 节点 + `style.css` 棋盘格样式。
- 改动文件：`src/web/events.js`、`src/web/template.html`、`src/web/css/style.css`。
- 验证：node --check 过；build 成功（v141 未 bump）；smoke-mini 全 PASS；铁律 `?.=0` / `fromEntries=0` / mini DOM=0；新控件（seg-lightbox/openSegLightbox/timeStamp/prepSegTimer/实时重抠文案）已进 docs/index.html 产物。已部署 CloudStudio 预览 + 推送 Gitee main（de58edf..7e92877）。

## v142 图片模块精修 + 分块多板导出（2026-08-07，SeniorDeveloper）
- 用户指令「好的，都做了」→ 在 v141 图片模块基础上落地 A 档四件套 + B6 分块多板导出，按版本纪律 **bump 到 v142**（B6 是新增对外功能；B7/BOM 经核查前版已交付，本次 no-op）。
- **A1 羽化强度可调**：`featherAlpha(data,w,h,strength)` 新增 `strength`（默认 0.5=标准；0=硬边；1=羽化最强）。`Math.pow(base, strength*2)`，`strength=0.5` 与原行为完全一致（向后兼容）。抠图弹窗加「羽化强度」滑块（0=硬边/50=标准/100=最强），250ms 防抖实时重抠。
- **A2 灯箱内直接转像素图**：抠图 lightbox 加「就此转像素图」按钮 → `applySubjectAsPixel(prepSegSubs[idx])` 直接把当前主体转像素图，省去关弹窗再点缩略图的步骤。
- **A3 主体 trim 透明边 + 居中留边距**：新增纯函数 `padAlphaImage(data,w,h,pad)`，给主体四周加透明留边（最小 2 格，约 8% 边长）再合成，避免拼大图时主体贴边/缺角；`setSubjectSource` 与 `applyAllAsOne` 均接入，后者加全局留白保留原构图比例。
- **A4 批量导出改合成对照长图**：`exportAllSubjects` 重写——收集各主体 canvas → `composeSubjectSheet()` 统一缩放到宽 1100 竖向堆叠（间距留白 + 序号标题标注），单张 PNG 一次下载，规避浏览器「允许多文件下载」拦截；高度封顶 HARD（16384 桌面 / 4096 移动+微信）。导出按钮文案改为「导出对照长图 (N张)」。
- **B6 分块多板导出**：导出弹窗加「分块多板导出」开关 + 每块尺寸滑块（15~40 格，默认 29）。勾选后 `buildExportCanvas(opts)` 改走新独立函数 `buildBlockExportCanvas(opts)`：把 M×M 整图按 bs×bs 切块，每块独立对照图 + 该块色号清单，网格（cols×rows）排列，超 HARD 上限时 `cellB` 16→4 降采样；与稳定版 `buildExportCanvas` 零耦合、零回归。三个调用点（m-confirm / mobileQuickExport / 预览导出）均透传 `blocks` + `blockSize`。
- **B7（坐标标注）/ BOM（采购清单）核查结论**：`exporter.js` 已存在 `opts.coords` / `opts.bom` 及 export 弹窗 `m-coords`/`m-bom` 开关（前版已实现），本次确认为 no-op，未重复实现。
- 改动文件：`src/core/image-prep.js`（featherAlpha strength + padAlphaImage）、`src/core/init.js`（APP_VERSION 141→142）、`src/web/template.html`（羽化滑块/灯箱按钮/分块导出开关/批量按钮文案）、`src/web/events.js`（变量/重置/实时羽化重抠/灯箱转像素/主体留边/A4 长图/分块监听/opts 透传）、`src/web/exporter.js`（buildBlockExportCanvas）。
- 验证：node --check 过；build 成功（v142）；smoke-mini 全 PASS；铁律 `?.=0`（仅注释文本提及，无真实调用）/ `fromEntries=0`（同上）/ mini DOM=0；新控件已进 docs/index.html 产物。待部署 CloudStudio 预览 + 推送 Gitee main。

## v143 P0 三件套 + 体验增强（2026-08-07，SeniorDeveloper）
- 用户指令「按你的方案」→ P0（补货清单/分块多板PDF/小程序发版就绪）+ P1（保护笔刷/设置持久化/多色板切换）六件套，按版本纪律 **bump 到 v143**（均含新增对外功能）。
- **① 补货清单导出（含拼货型号）**：豆仓面板加「复制补货清单」「导出补货图」按钮。基于豆仓库存缺口（`need - stock`，未填不计）列出 `拼豆型号(MARD221-色号) / 色号 / 缺口 / 现有`。复制为 TSV 文本（可直接发供应商/分销商），导出为 PNG 对照图。型号默认派生 `MARD221-色号`（如 A1→MARD221-A1），不依赖外部数据。
- **② 分块多板导出补 PDF**：导出弹窗分块子面板加「PNG / PDF」格式选择。`exportBlocksPDF(opts)` 复用 `buildBlockExportCanvas` 拼图 → 按固定页宽（≤1400）切片成多页 → 每页 JPEG 内嵌（`/DCTDecode`，零依赖手写最小 PDF，不破单文件铁律）。桌面/移动端均触发下载。
- **③ 小程序发版就绪**：`build.js §7` 修复版本注入（此前因 `CORE` 未定义导致小程序核心包显示 `N/A`，改为 `CORE` 定义后读 `APP_VERSION` → 现显示真实版本）；产出 `小程序真机验收清单.md`（appid 填写 / 基础链路 / 管线开关 / 性能兼容 / 已知非阻塞项 / 结论签名）。小程序核心零 DOM 已确认。
- **④ 去背景保护笔刷**：`segmentSubjects` 新增 `opts.protect`（Uint8Array 强制前景），自动抠图绝不误删浅色主体（白猫脸/白衣物）。抠图弹窗加「🛡 保护笔刷」开关 + 笔刷大小 + 清除；预览叠加层源分辨率遮罩（绿色半透明），指针拖动涂抹；仅整图模式生效（裁切改变坐标空间，保护不映射）。纯算法、零 DOM。
- **⑤ 用户设置持久化（localStorage）**：`foxbead-settings-v1` 保存羽化强度/分块尺寸/分块开关，抠图弹窗重开自动恢复（reset 时清除）。沿用既有 localStorage 模式，零新增依赖。
- **⑥ 多色板切换**：`palette.js` 中 `PALETTE` / `PALETTE_BY_ID` / `PALETTE_LAB` / `LAB_BY_ID` 由 `const` 改 `var`，新增 `setActivePalette(list)` + `MARD_PALETTE_BY_ID`（冻结 Mard 映射，豆仓库存/补货仍按 Mard 实物统计）。顶栏加「色板」下拉 + 导入按钮：默认 Mard 221（C4 永不改动），可导入品牌色板 JSON（`[{id,name,hex}]`）并持久化（`foxbead-palettes-v1` / `foxbead-active-palette-v1`）。**不编造任何色值**——无导入数据则仅 Mard 221 可选。
- 改动文件：`src/core/image-prep.js`（opts.protect）、`src/core/palette.js`（可变色板 + setActivePalette）、`src/core/init.js`（142→143）、`src/web/template.html`（补货按钮/分块PDF格式/保护笔刷栏/色板下拉）、`src/web/events.js`（补货导出/分块PDF分发/保护笔刷/设置持久化/色板绑定/豆仓改 MARD_PALETTE_BY_ID）、`src/web/exporter.js`（exportBlocksPDF + downloadBlob）、`src/web/css/style.css`（保护栏+色板样式）、`build.js`（§7 版本注入修复）、新增 `小程序真机验收清单.md`。
- 验证：node --check 过；build 成功（v143，581KB）；smoke-mini 全 PASS；铁律 `?.=0` / `fromEntries=0` / core+pipeline+mini DOM=0 全绿；小程序核心包版本头正确显示 `版本: 143`。已部署 CloudStudio 预览 + 推送 Gitee main（71efaa7..59bdc3f）。

## v144 分块多板导出补跨板对齐标记（2026-08-10，SeniorDeveloper）
- 背景：CC 复核意见两条 → ① 跨板衔接处要对齐标记（拼豆实际制作板与板要边对边拼）；② 保护笔刷 vs 手动去背景笔刷别搞混。
- 核查结论：② 不成立——手动去背景笔刷早在前版已移除（`pipeline.js:137` 空实现 + `events.js:525`「交互仅保留拖动裁切」），现存 `protect` 是唯一笔刷，逻辑仅「涂=强制前景」，无擦除/保留二义性，**无重叠、no-op**。
- 落地 ①：在 `buildBlockExportCanvas` 复合画布上加三类对齐标记（PNG/PDF 同源，PDF 切片自该画布自动受益）：
  1. 顶部**拼装示意图**：N×N 编号网格，定拼合顺序（防打印页打乱后无法复原）；
  2. 每块**四角 + 定位点**：打印后边对边对齐参考；
  3. 每块标题下**邻接方向行**（↑↓←→接第几块）：消除板间对齐歧义。
- titleH 46→64 容纳两行块头（主标题 + 邻接行）；assembleH/ovW/ovH 计入 HARD 上限，cellB 降采样逻辑不变。
- 改动文件：`src/web/exporter.js`（buildBlockExportCanvas 对齐标记）、`src/core/init.js`（143→144）。
- 验证：node --check 过；build 成功（v144，583KB）；smoke-mini 全 PASS；铁律 `?.=0` / `fromEntries=0` / core+pipeline+mini DOM=0 全绿。已部署 CloudStudio 预览 + 推送 Gitee main（64df4f5..d08dde2）。

---

## 交接任务：GitHub Pages 发布（cc 执行，2026-08-11 由 SeniorDeveloper 整理）

**背景**：CloudStudio 预览面板是 sandboxed iframe（无 allow-downloads / allow-popups 令牌），`<a download>` 与 `window.open` 被静默拦截，下载在沙箱内始终无法正常落文件。Gitee Pages 已确认不可用（账号服务菜单无 Pages 选项、`/pages` URL 404，Gitee 已收紧免费 Pages）。故改用 **GitHub Pages**——它是顶层窗口托管，`<a download>` 真实生效，下载能真正落文件。

**当前状态（已 ready，cc 直接推即可，无需改代码）**：
- 本地分支 `master`，最新提交 `cc6ec28`（v3 下载修复：PDF / SVG / PNG 三条下载路径统一弹保存对话框）
- 构建产物 `docs/index.html` 已在 git 跟踪中（未被 .gitignore 忽略），含全部修复
- 仅 `origin` 指向 Gitee，尚无 GitHub remote

**cc 执行步骤**：
1. 进目录 `C:\Users\余莎莎\WorkBuddy\2026-08-05-17-47-02\fox-bead`
2. 加 GitHub remote：`git remote add github https://github.com/<用户名>/fox-bead.git`
3. 推代码 + 构建产物（本地 `master` → 远程 `main`，与 Gitee 一致）：`git push github master:main`
4. **不要重新 build**——`docs/index.html` 已在 git 中，会一起推上去
5. GitHub 仓库 **Settings → Pages** → Source 选 **main** 分支、目录选 **/docs** → Save
6. 等约 1 分钟，访问 `https://<用户名>.github.io/fox-bead/` 验证

**关键配置点（务必核对）**：
- 部署目录必须是 **`/docs`**（不是根目录）——`index.html` 构建在此
- 分支用 **`main`**（我们一直 push `master:main`）
- 仓库设**公开**最省事（私有也能用 Pages，但公开免额外配置）

**验证标准**：网页 200 打开；顶层窗口下点「下载图纸」→ 弹保存对话框 → 点「下载图片」按钮真实落文件（GitHub Pages 是顶层窗口，`<a download>` 不被 sandbox 拦截，这点 CloudStudio 沙箱做不到）。

**版本纪律**：本次仍为「下载」bug 延续修复，保持 v144 未 bump。
