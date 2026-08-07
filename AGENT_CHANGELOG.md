# 狐狸爱拼豆 · 双 Agent 协作日志（AGENT_CHANGELOG）

> 协作方：① SeniorDeveloper（WorkBuddy / Hy3）② ClaudeCode（deepseek-v4-pro）
> 维护人：余莎莎 ｜ 最后更新：2026-08-05（P0/P1/P2 已全部解决）
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
| Gitee Pages | — | 待用户开 2FA 后做镜像 | |

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
| P3 | 小程序页面缺开关 UI | `processImageMini` 第三参 `opts` 已支持 mode/dither/cleanup/maxColors/removeBg/brighten/outline，页面加控件透传即可 |
| P3 | 去背景在 `N<=52` 时按设计跳过（走 `bgStatus='small'` 分支保留背景） | 非 bug。小程序默认板子 104，不受影响；但若产品要小板子也去背景，需改 `pipeline-core.js` L458 阈值 |
| P3 | web 的 `srcRGB` 由 canvas 降采样生成，mini 由 `sampleCellRGB` 生成 | 两者路径不同，抖动结果可能有极微差异。未统一是为了不动网页既有行为，如需完全一致再议 |

---

## 6. 版本里程碑（git tag）

`v6` `v45` `v87` `v100` `v117` `v124` `v132` `v137`(=v138) `v139` —— 均为历史导入。

**v140 尚未打 tag。** 双内核已于 2026-08-05 合并完成，打 tag 的前置条件已满足，建议在小程序真机验证一轮后打 `v140`。
