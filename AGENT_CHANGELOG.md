# 狐狸爱拼豆 · 双 Agent 协作日志（AGENT_CHANGELOG）

> 协作方：① SeniorDeveloper（WorkBuddy / Hy3）② ClaudeCode（deepseek-v4-pro）
> 维护人：余莎莎 ｜ 最后更新：2026-08-07
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
| C6 | 内核纯函数不得直接依赖 `document` / `window` | 小程序端无 DOM，需注入 canvas 工厂 | 待定（P0） |

**每次构建后验证（违反任一项即失败）：**
```bash
node --check build.js
grep -c "?\."  src/ docs/index.html      # 应为 0
grep -c "Object.fromEntries" src/        # 应为 0
# 颜色一致性：docs/index.html 内 colors 段须与 src/core/colors.js 完全一致
```

---

## 2. 架构地图（当前真实结构 · 2026-08-07）

```
fox-bead/
├── src/core/         # 【网页版内核】7 个纯模块
│   └── color.js colors.js init.js palette.js pipeline.js presets.js state.js
├── src/web/          # 【网页版 UI】render/editor/exporter/events/sample/main + css + template.html
│   └── css/style.css
├── miniapp/          # 【小程序 MVP】独立工程
│   ├── utils/core.js # ⚠️ 1448 行单体：processImage(网页流)+processImageMini + 5 处 document 依赖
│   ├── pages/index/  # index.js / index.wxml / index.wxss
│   └── app.js app.json project.config.json
├── build.js          # Node 构建脚本 → 输出 docs/index.html（GitHub Pages 源）
├── docs/
│   ├── index.html    # 构建产物（~493KB），GitHub Pages 实际部署文件
│   └── GitHub参考项目对比.md
├── assets/           # 外置资源
├── README.md
└── .gitignore
```

> ⚠️ **双内核警告**：`src/core/*.js`（网页内核）与 `miniapp/utils/core.js`（小程序内核）是**两份独立拷贝**，逻辑已存在漂移风险。详见 §5。

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
> - ClaudeCode 对 §5 双内核问题有无方案？

---

## 5. 已知冲突 / 待决策（P0 → P2）

| 优先级 | 问题 | 现状 | 建议方案 | 负责人 |
|--------|------|------|----------|--------|
| **P0** | 双内核：`src/core/*.js` vs `miniapp/utils/core.js` 两份拷贝，已漂移 | 小程序 core.js 是 1448 行单体，含网页 processImage 全流 | 合并成单一 `src/core/`，小程序构建时拷贝 + 注入 `module.exports` + canvas 工厂 | 待分配 |
| **P1** | 小程序仅接了颜色映射（processImageMini），未接去背景 / 抖动 / 降噪 | mini 是简化 MVP | 把完整 pipeline 接到小程序 | 待分配 |
| **P2** | `miniapp/utils/core.js` 有 5 处 `document`/`getContext`/`getElementById` 依赖（L388/390/443/445/535） | 非纯内核，小程序端会崩 | 抽 canvas 工厂注入，内核保持纯函数 | 待分配 |

---

## 6. 版本里程碑（git tag）

`v6` `v45` `v87` `v100` `v117` `v124` `v132` `v137`(=v138) `v139` —— 均为历史导入。
**v140 尚未打 tag**（建议双内核合并后再打）。
