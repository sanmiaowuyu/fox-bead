/* 处理模式说明 + 每个模式对应的参数预设 */
const MODE_DESC = {
  cartoon: '卡通：使用格子内最频繁的颜色，配合高清理阈值，形成干净、清晰的大色块，适合插画、Logo、新手体验。',
  average: '真实：计算格子内所有颜色的平均值，保留光影渐变，24色作为日常主力，适合人像、宠物、风景。',
};
// 每个模式对应的预设参数（切模式时自动应用，用户可手动微调覆盖）
const MODE_PRESET = {
  cartoon: { dither: false, maxColors: 14, cleanup: 10 }, // v122: maxColors 实际由 recommendMaxColors 按板子覆盖；此处默认 104 板值
  average: { dither: false, maxColors: 24, cleanup: 5 },
};
// v117: 按板子大小动态推荐颜色数——小板子格子少，颜色给太多会糊；板子越大越能还原。
// 真实模式映射（v121 修正 78 偏色；v131 将 104 从 24 提到 26）：48→16, 52→20, 78→24, 104→26, 130→30。
// 卡通模式（v122 设动态；v130 大幅提高）：用户实测 78 板卡通黑边全失、52 板更惨——根因是预算过低 +
//   卡通 dominantColor 取众数把细黑勾边吃掉。v130 把卡通预算提到接近真实（仍少 4~6 色保持大色块感），
//   并配合 dominantColor 暗部勾边加权 + reduceColors 描边色保护，确保黑边存活：48→10, 52→14, 78→18, 104→22, 130→26。
// v118: 新增 130×130 巨幅板，真实模式颜色增至 30 色，专供结婚照/轿车/摩托车等大幅真实场景。
function recommendMaxColors(mode, N) {
  if (mode === 'cartoon') {
    // v130: 卡通随板子动态（比真实少 4~6 色保持大色块感，但给足预算保黑边/特点）
    if (N <= 48) return 10;
    if (N <= 52) return 14;
    if (N <= 78) return 18;
    if (N <= 104) return 22;
    return 26; // 130 巨幅板
  }
  if (N <= 48) return 16;
  if (N <= 52) return 20;
  if (N <= 78) return 24;   // 78 保持 24：保证色相正确（v121 修正 78 偏色）
  if (N <= 104) return 26;  // 104 用户要求提到 26（v131）
  return 30; // 130 巨幅板
}
function applyModePreset() {
  const p = MODE_PRESET[state.mode];
  if (!p) return;
  state.dither = p.dither;
  state.maxColors = recommendMaxColors(state.mode, state.N); // v117: 随板子大小推荐
  state.cleanup = p.cleanup;
  // 同步色数上限滑块
  const mc = $('max-colors');
  if (mc) mc.value = state.maxColors;
  const mcv = $('max-colors-val');
  if (mcv) mcv.textContent = state.maxColors;
  // 同步杂色清理滑块
  const cu = $('cleanup');
  if (cu) cu.value = state.cleanup;
  const cuv = $('cleanup-val');
  if (cuv) cuv.textContent = state.cleanup;
}
function updateModeDesc() {
  const el = $('mode-desc');
  if (el) el.textContent = MODE_DESC[state.mode] || '';
}