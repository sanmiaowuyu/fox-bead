# 拼豆开源项目对比 — v140 规划参考

> 整理时间：2026-08-06
> 目的：对比 GitHub 上星星较高的拼豆类开源项目，为「狐狸爱拼豆」v140 功能规划提供对标参考。
> 数据来源：GitHub Search API（按 star 降序）+ 各仓库 README / Roadmap。

---

## 一、Star 排行总览

| 排名 | 项目 | Star | 主语言 | 架构形态 | License |
|------|------|------|--------|----------|---------|
| 1 | **Zippland/perler-beads** | ⭐ 822 | TypeScript | Next.js + React + Web Worker | AGPL-3.0 |
| 2 | **liangdabiao/perler-beads-ai** | ⭐ 236 | TypeScript | 基于 Zippland + AI 图片优化 + 微信小程序 | — |
| 3 | HEN3DRIK/BeadSorter | ⭐ 69 | C++ | 桌面分珠器（偏硬件） | MIT |
| 4 | dolkow/perler | ⭐ 28 | Java | 图片→模板 CLI/Web | — |
| 5 | Jett-Wu/Perler_Beads_Generator | ⭐ 24 | TypeScript | 拼豆图纸编辑器，支持 MARD 221/291 | — |
| 6 | liangdabiao/perlerBeadsApplet | ⭐ 21 | TS | Taro + Vue3 微信小程序 | — |
| 7 | ktwu01/perler-beads | ⭐ 21 | TS | 拼豆转换 | — |
| 8 | stone-j/BeadMaker | ⭐ 18 | Java | 图片映射最近色 | — |
| 9 | DanZai233/PixelBead | ⭐ 13 | TS | AI 生成 + 图片转换 + 素材广场 | — |
| 10 | a31521424/pixel-to-beads | ⭐ 10 | JS | 量化 + 抖动算法 + 材料统计 | — |

---

## 二、关键项目深度对比

### 1. Zippland/perler-beads（822⭐）— 算法源头

**这是「狐狸爱拼豆」的算法祖源。** v139 注释中 "算法参考 Zippland/perler-beads" 即指它。

- **核心算法**：
  - 主导色提取（dominant color）
  - BFS 区域合并（合并小邻域到最近主色）
  - 洪水填充（flood fill）去背景
  - 最近色映射（291 色板 / 5 个品牌）
- **Roadmap 中尚未实现、值得借鉴的方向**：
  - ✅ **CIEDE2000 (Delta E)** 替代 RGB 欧氏距离做色差 → 感知更准
  - ✅ **Floyd-Steinberg 抖动** → 有限色板下模拟更平滑过渡
  - ✅ **Web Workers 后台计算** → 大图不卡 UI
  - 微信小程序版
- **与我们的差异**：它是多文件 Next.js 工程；我们走「单文件零依赖」路线。算法内核一致，工程形态相反。
- **我们的优势**：Oklab 感知色差（比 Delta E 更先进，已内置）；单文件可直接丢服务器/微信打开。

### 2. liangdabiao/perler-beads-ai（236⭐）— 生图方向对标

- 基于 Zippland 二次开发，**加入了 AI 优化图片**环节（应该接了图像分割/增强 API）再转拼豆。
- 配套微信小程序。
- **这正是 CC 意见里提到的「生图功能」方向**。若要做「豆包生图 → 本站转图」一体化，本项目是最佳对标参考。
- **风险**：引入后端/API 会打破「单文件零依赖」形态，需余总定产品方向。

### 3. DanZai233/PixelBead（13⭐）— UX / 社区参考

- 支持 **AI 生成** + 图片转换。
- 有「素材广场」社区功能（用户分享图纸）。
- 移动端虚拟摇杆交互。
- **可借鉴点**：社区分享、移动端手势交互，提升用户粘性。

### 4. a31521424/pixel-to-beads（10⭐）— 算法细节参考

- 量化 + **抖动算法**（dithering）+ 材料统计（每种色需要多少颗）。
- **可借鉴点**：材料统计（自动算出每种颜色需要多少粒）是实用功能，我们的导出可加「所需珠子清单」。

### 5. Jett-Wu/Perler_Beads_Generator（24⭐）— 图纸编辑

- 拼豆图纸编辑器，支持 MARD 221/291 色板。
- **可借鉴点**：221 色板与我们一致，编辑器交互（网格点选换色）与我们 edit 模式类似。

---

## 三、对「狐狸爱拼豆」v140 的启示

### 我们已经领先的（保持）
- ✅ **Oklab 感知色差**（v139 已用，比 Zippland Roadmap 里的 Delta E 更先进）
- ✅ **单文件零依赖**（部署最简单，手机直接打开）
- ✅ **自动去背景检测**（v139 已修最高频痛点，Zippland 仍需手动）
- ✅ **编辑模式 + 放大预览**（网格点选换色，体验不输 Jett-Wu）

### 可以补强的（按性价比排序）
| 功能 | 对标项目 | 成本 | 收益 | 建议 |
|------|----------|------|------|------|
| **材料统计清单** | pixel-to-beads | 低（0.5天） | 中高，实用 | ✅ v140 做 |
| **Floyd-Steinberg 抖动** | Zippland | 中（1天） | 中，过渡更平滑 | v140 评估 |
| **Web Worker 后台计算** | Zippland | 中（1天） | 高，大图不卡 | v140 评估 |
| **社区分享/素材广场** | PixelBead | 高（需后端） | 高，粘性 | 暂缓 |
| **AI 生图一体化** | perler-beads-ai | 高（需后端+API费） | 极高 | 等余总定方向 |
| **小程序版** | liangdabiao | 高 | 中 | 暂缓 |

### 架构层面
- 我们已 P1 拆模块 + build 脚本，**避免 4566 行单文件膨胀**，这正是 Zippland 多文件工程的本地化版本。
- 下一步 P2 可做 **playwright 像素回归测试**（zippland 有 CI 但无像素 diff；我们可领先）。

---

## 四、结论

拼豆是极细分领域，**Zippland 是绝对源头（822⭐）**，其他高星项目基本为其衍生。

- 算法层面我们已不落后（Oklab > Delta E）。
- 工程形态我们走差异化（单文件 vs 多文件）。
- **最值得立即对标补齐的是「材料统计清单」（低成本高实用）**。
- **最值得观望的是「AI 生图一体化」**（perler-beads-ai 已验证方向，但需产品决策）。

> 注：本项目为单文件零依赖形态，引入任何后端/API 功能都会改变产品形态，需余总明确授权后再动手。
