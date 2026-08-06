// 狐狸爱拼豆 小程序核心算法包 — 由 build.js 自动生成
// 版本: N/A

/* ---------- 2. 颜色空间工具 ---------- */
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}
function srgbToLinear(c) { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
function rgbToOklab({ r, g, b }) {
  const lr = srgbToLinear(r), lg = srgbToLinear(g), lb = srgbToLinear(b);
  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;
  const l_ = Math.cbrt(l), m_ = Math.cbrt(m), s_ = Math.cbrt(s);
  return {
    L: 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
  };
}
function oklabDist(p, q) {
  const dL = p.L - q.L, da = p.a - q.a, db = p.b - q.b;
  return Math.sqrt(dL * dL + da * da + db * db);
}
// 预计算调色板 Oklab（PALETTE_LAB 已在上方定义，固定 Mard 221 色）
/* ---------- 1. 官方 Mard 221 色库（A~M 九系，按用户实物豆标准色卡） ---------- */
/* 数据来自 pixelbead.art / pindou.online / pixel-beads.com 三源交叉核对一致 */
const MARD_PALETTE = [
  { id:'A1', name:'黄橙系', hex:'#FAF4C8' },
  { id:'A2', name:'黄橙系', hex:'#FFFFD5' },
  { id:'A3', name:'黄橙系', hex:'#FEFF8B' },
  { id:'A4', name:'黄橙系', hex:'#FBED56' },
  { id:'A5', name:'黄橙系', hex:'#F4D738' },
  { id:'A6', name:'黄橙系', hex:'#FEAC4C' },
  { id:'A7', name:'黄橙系', hex:'#FE8B4C' },
  { id:'A8', name:'黄橙系', hex:'#FFDA45' },
  { id:'A9', name:'黄橙系', hex:'#FF995B' },
  { id:'A10', name:'黄橙系', hex:'#F77C31' },
  { id:'A11', name:'黄橙系', hex:'#FFDD99' },
  { id:'A12', name:'黄橙系', hex:'#FE9F72' },
  { id:'A13', name:'黄橙系', hex:'#FFC365' },
  { id:'A14', name:'黄橙系', hex:'#FD543D' },
  { id:'A15', name:'黄橙系', hex:'#FFF365' },
  { id:'A16', name:'黄橙系', hex:'#FFFF9F' },
  { id:'A17', name:'黄橙系', hex:'#FFE36E' },
  { id:'A18', name:'黄橙系', hex:'#FEBE7D' },
  { id:'A19', name:'黄橙系', hex:'#FD7C72' },
  { id:'A20', name:'黄橙系', hex:'#FFD568' },
  { id:'A21', name:'黄橙系', hex:'#FFE395' },
  { id:'A22', name:'黄橙系', hex:'#F4F57D' },
  { id:'A23', name:'黄橙系', hex:'#E6C9B7' },
  { id:'A24', name:'黄橙系', hex:'#F7F8A2' },
  { id:'A25', name:'黄橙系', hex:'#FFD67D' },
  { id:'A26', name:'黄橙系', hex:'#FFC830' },
  { id:'B1', name:'绿色系', hex:'#E6EE31' },
  { id:'B2', name:'绿色系', hex:'#63F347' },
  { id:'B3', name:'绿色系', hex:'#9EF780' },
  { id:'B4', name:'绿色系', hex:'#5DE035' },
  { id:'B5', name:'绿色系', hex:'#35E352' },
  { id:'B6', name:'绿色系', hex:'#65E2A6' },
  { id:'B7', name:'绿色系', hex:'#3DAF80' },
  { id:'B8', name:'绿色系', hex:'#1C9C4F' },
  { id:'B9', name:'绿色系', hex:'#27523A' },
  { id:'B10', name:'绿色系', hex:'#95D3C2' },
  { id:'B11', name:'绿色系', hex:'#5D722A' },
  { id:'B12', name:'绿色系', hex:'#166F41' },
  { id:'B13', name:'绿色系', hex:'#CAEB7B' },
  { id:'B14', name:'绿色系', hex:'#ADE946' },
  { id:'B15', name:'绿色系', hex:'#2E5132' },
  { id:'B16', name:'绿色系', hex:'#C5ED9C' },
  { id:'B17', name:'绿色系', hex:'#9BB13A' },
  { id:'B18', name:'绿色系', hex:'#E6EE49' },
  { id:'B19', name:'绿色系', hex:'#24B88C' },
  { id:'B20', name:'绿色系', hex:'#C2F0CC' },
  { id:'B21', name:'绿色系', hex:'#156A6B' },
  { id:'B22', name:'绿色系', hex:'#0B3C43' },
  { id:'B23', name:'绿色系', hex:'#303A21' },
  { id:'B24', name:'绿色系', hex:'#EEFCA5' },
  { id:'B25', name:'绿色系', hex:'#4E846D' },
  { id:'B26', name:'绿色系', hex:'#8D7A35' },
  { id:'B27', name:'绿色系', hex:'#CCE1AF' },
  { id:'B28', name:'绿色系', hex:'#9EE5B9' },
  { id:'B29', name:'绿色系', hex:'#C5E254' },
  { id:'B30', name:'绿色系', hex:'#E2FCB1' },
  { id:'B31', name:'绿色系', hex:'#B0E792' },
  { id:'B32', name:'绿色系', hex:'#9CAB5A' },
  { id:'C1', name:'蓝青系', hex:'#E8FFE7' },
  { id:'C2', name:'蓝青系', hex:'#A9F9FC' },
  { id:'C3', name:'蓝青系', hex:'#A0E2FB' },
  { id:'C4', name:'蓝青系', hex:'#41CCFF' },
  { id:'C5', name:'蓝青系', hex:'#01ACEB' },
  { id:'C6', name:'蓝青系', hex:'#50AAF0' },
  { id:'C7', name:'蓝青系', hex:'#3677D2' },
  { id:'C8', name:'蓝青系', hex:'#0F54C0' },
  { id:'C9', name:'蓝青系', hex:'#324BCA' },
  { id:'C10', name:'蓝青系', hex:'#3EBCE2' },
  { id:'C11', name:'蓝青系', hex:'#28DDDE' },
  { id:'C12', name:'蓝青系', hex:'#1C334D' },
  { id:'C13', name:'蓝青系', hex:'#CDE8FF' },
  { id:'C14', name:'蓝青系', hex:'#D5FDFF' },
  { id:'C15', name:'蓝青系', hex:'#22C4C6' },
  { id:'C16', name:'蓝青系', hex:'#1557A8' },
  { id:'C17', name:'蓝青系', hex:'#04D1F6' },
  { id:'C18', name:'蓝青系', hex:'#1D3344' },
  { id:'C19', name:'蓝青系', hex:'#1887A2' },
  { id:'C20', name:'蓝青系', hex:'#176DAF' },
  { id:'C21', name:'蓝青系', hex:'#BEDDFF' },
  { id:'C22', name:'蓝青系', hex:'#67B4BE' },
  { id:'C23', name:'蓝青系', hex:'#C8E2FF' },
  { id:'C24', name:'蓝青系', hex:'#7CC4FF' },
  { id:'C25', name:'蓝青系', hex:'#A9E5E5' },
  { id:'C26', name:'蓝青系', hex:'#3CAED8' },
  { id:'C27', name:'蓝青系', hex:'#D3DFFA' },
  { id:'C28', name:'蓝青系', hex:'#BBCFED' },
  { id:'C29', name:'蓝青系', hex:'#34488E' },
  { id:'D1', name:'蓝紫系', hex:'#AEB4F2' },
  { id:'D2', name:'蓝紫系', hex:'#858EDD' },
  { id:'D3', name:'蓝紫系', hex:'#2F54AF' },
  { id:'D4', name:'蓝紫系', hex:'#182A84' },
  { id:'D5', name:'蓝紫系', hex:'#B843C5' },
  { id:'D6', name:'蓝紫系', hex:'#AC7BDE' },
  { id:'D7', name:'蓝紫系', hex:'#8854B3' },
  { id:'D8', name:'蓝紫系', hex:'#E2D3FF' },
  { id:'D9', name:'蓝紫系', hex:'#D5B9F8' },
  { id:'D10', name:'蓝紫系', hex:'#361851' },
  { id:'D11', name:'蓝紫系', hex:'#B9BAE1' },
  { id:'D12', name:'蓝紫系', hex:'#DE9AD4' },
  { id:'D13', name:'蓝紫系', hex:'#B90095' },
  { id:'D14', name:'蓝紫系', hex:'#8B279B' },
  { id:'D15', name:'蓝紫系', hex:'#2F1F90' },
  { id:'D16', name:'蓝紫系', hex:'#E3E1EE' },
  { id:'D17', name:'蓝紫系', hex:'#C4D4F6' },
  { id:'D18', name:'蓝紫系', hex:'#A45EC7' },
  { id:'D19', name:'蓝紫系', hex:'#D8C3D7' },
  { id:'D20', name:'蓝紫系', hex:'#9C32B2' },
  { id:'D21', name:'蓝紫系', hex:'#9A009B' },
  { id:'D22', name:'蓝紫系', hex:'#333A95' },
  { id:'D23', name:'蓝紫系', hex:'#EBDAFC' },
  { id:'D24', name:'蓝紫系', hex:'#7786E5' },
  { id:'D25', name:'蓝紫系', hex:'#494FC7' },
  { id:'D26', name:'蓝紫系', hex:'#DFC2F8' },
  { id:'E1', name:'粉玫系', hex:'#FDD3CC' },
  { id:'E2', name:'粉玫系', hex:'#FEC0DF' },
  { id:'E3', name:'粉玫系', hex:'#FFB7E7' },
  { id:'E4', name:'粉玫系', hex:'#E8649E' },
  { id:'E5', name:'粉玫系', hex:'#F551A2' },
  { id:'E6', name:'粉玫系', hex:'#F13D74' },
  { id:'E7', name:'粉玫系', hex:'#C63478' },
  { id:'E8', name:'粉玫系', hex:'#FFDBE9' },
  { id:'E9', name:'粉玫系', hex:'#E970CC' },
  { id:'E10', name:'粉玫系', hex:'#D33793' },
  { id:'E11', name:'粉玫系', hex:'#FCDDD2' },
  { id:'E12', name:'粉玫系', hex:'#F78FC3' },
  { id:'E13', name:'粉玫系', hex:'#B5006D' },
  { id:'E14', name:'粉玫系', hex:'#FFD1BA' },
  { id:'E15', name:'粉玫系', hex:'#F8C7C9' },
  { id:'E16', name:'粉玫系', hex:'#FFF3EB' },
  { id:'E17', name:'粉玫系', hex:'#FFE2EA' },
  { id:'E18', name:'粉玫系', hex:'#FFC7DB' },
  { id:'E19', name:'粉玫系', hex:'#FEBAD5' },
  { id:'E20', name:'粉玫系', hex:'#D8C7D1' },
  { id:'E21', name:'粉玫系', hex:'#BD9DA1' },
  { id:'E22', name:'粉玫系', hex:'#B785A1' },
  { id:'E23', name:'粉玫系', hex:'#937A8D' },
  { id:'E24', name:'粉玫系', hex:'#E1BCE8' },
  { id:'F1', name:'红色系', hex:'#FD957B' },
  { id:'F2', name:'红色系', hex:'#FC3D46' },
  { id:'F3', name:'红色系', hex:'#F74941' },
  { id:'F4', name:'红色系', hex:'#FC283C' },
  { id:'F5', name:'红色系', hex:'#E7002F' },
  { id:'F6', name:'红色系', hex:'#943630' },
  { id:'F7', name:'红色系', hex:'#971937' },
  { id:'F8', name:'红色系', hex:'#BC0028' },
  { id:'F9', name:'红色系', hex:'#E2677A' },
  { id:'F10', name:'红色系', hex:'#8A4526' },
  { id:'F11', name:'红色系', hex:'#5A2121' },
  { id:'F12', name:'红色系', hex:'#FD4E6A' },
  { id:'F13', name:'红色系', hex:'#F35744' },
  { id:'F14', name:'红色系', hex:'#FFA9AD' },
  { id:'F15', name:'红色系', hex:'#D30022' },
  { id:'F16', name:'红色系', hex:'#FEC2A6' },
  { id:'F17', name:'红色系', hex:'#E69C79' },
  { id:'F18', name:'红色系', hex:'#D37C46' },
  { id:'F19', name:'红色系', hex:'#C1444A' },
  { id:'F20', name:'红色系', hex:'#CD9391' },
  { id:'F21', name:'红色系', hex:'#F7B4C6' },
  { id:'F22', name:'红色系', hex:'#FDC0D0' },
  { id:'F23', name:'红色系', hex:'#F67E66' },
  { id:'F24', name:'红色系', hex:'#E698AA' },
  { id:'F25', name:'红色系', hex:'#E54B4F' },
  { id:'G1', name:'棕肤系', hex:'#FFE2CE' },
  { id:'G2', name:'棕肤系', hex:'#FFC4AA' },
  { id:'G3', name:'棕肤系', hex:'#F4C3A5' },
  { id:'G4', name:'棕肤系', hex:'#E1B383' },
  { id:'G5', name:'棕肤系', hex:'#EDB045' },
  { id:'G6', name:'棕肤系', hex:'#E99C17' },
  { id:'G7', name:'棕肤系', hex:'#9D5B3E' },
  { id:'G8', name:'棕肤系', hex:'#753832' },
  { id:'G9', name:'棕肤系', hex:'#E6B483' },
  { id:'G10', name:'棕肤系', hex:'#D98C39' },
  { id:'G11', name:'棕肤系', hex:'#E0C593' },
  { id:'G12', name:'棕肤系', hex:'#FFC890' },
  { id:'G13', name:'棕肤系', hex:'#B7714A' },
  { id:'G14', name:'棕肤系', hex:'#8D614C' },
  { id:'G15', name:'棕肤系', hex:'#FCF9E0' },
  { id:'G16', name:'棕肤系', hex:'#F2D9BA' },
  { id:'G17', name:'棕肤系', hex:'#78524B' },
  { id:'G18', name:'棕肤系', hex:'#FFE4CC' },
  { id:'G19', name:'棕肤系', hex:'#E07935' },
  { id:'G20', name:'棕肤系', hex:'#A94023' },
  { id:'G21', name:'棕肤系', hex:'#B88558' },
  { id:'H1', name:'黑白系', hex:'#FDFBFF' },
  { id:'H2', name:'黑白系', hex:'#FEFFFF' },
  { id:'H3', name:'黑白系', hex:'#B6B1BA' },
  { id:'H4', name:'黑白系', hex:'#89858C' },
  { id:'H5', name:'黑白系', hex:'#48464E' },
  { id:'H6', name:'黑白系', hex:'#2F2B2F' },
  { id:'H7', name:'黑白系', hex:'#000000' },
  { id:'H8', name:'黑白系', hex:'#E7D6DB' },
  { id:'H9', name:'黑白系', hex:'#EDEDED' },
  { id:'H10', name:'黑白系', hex:'#EEE9EA' },
  { id:'H11', name:'黑白系', hex:'#CECDD5' },
  { id:'H12', name:'黑白系', hex:'#FFF5ED' },
  { id:'H13', name:'黑白系', hex:'#F5ECD2' },
  { id:'H14', name:'黑白系', hex:'#CFD7D3' },
  { id:'H15', name:'黑白系', hex:'#98A6A8' },
  { id:'H16', name:'黑白系', hex:'#1D1414' },
  { id:'H17', name:'黑白系', hex:'#F1EDED' },
  { id:'H18', name:'黑白系', hex:'#FFFDF0' },
  { id:'H19', name:'黑白系', hex:'#F6EFE2' },
  { id:'H20', name:'黑白系', hex:'#949FA3' },
  { id:'H21', name:'黑白系', hex:'#FFFBE1' },
  { id:'H22', name:'黑白系', hex:'#CACAD4' },
  { id:'H23', name:'黑白系', hex:'#9A9D94' },
  { id:'M1', name:'大地系', hex:'#BCC6B8' },
  { id:'M2', name:'大地系', hex:'#8AA386' },
  { id:'M3', name:'大地系', hex:'#697D80' },
  { id:'M4', name:'大地系', hex:'#E3D2BC' },
  { id:'M5', name:'大地系', hex:'#D0CCAA' },
  { id:'M6', name:'大地系', hex:'#B0A782' },
  { id:'M7', name:'大地系', hex:'#B4A497' },
  { id:'M8', name:'大地系', hex:'#B38281' },
  { id:'M9', name:'大地系', hex:'#A58767' },
  { id:'M10', name:'大地系', hex:'#C5B2BC' },
  { id:'M11', name:'大地系', hex:'#9F7594' },
  { id:'M12', name:'大地系', hex:'#644749' },
  { id:'M13', name:'大地系', hex:'#D19066' },
  { id:'M14', name:'大地系', hex:'#C77362' },
  { id:'M15', name:'大地系', hex:'#757D78' },
];
function fromEntries(entries) { const obj = {}; for (let i = 0; i < entries.length; i++) { obj[entries[i][0]] = entries[i][1]; } return obj; }

const BRAND_LABEL = 'Mard';
const PALETTE = MARD_PALETTE;
const PALETTE_BY_ID = fromEntries(PALETTE.map(c => [c.id, c]));
const PALETTE_LAB = PALETTE.map(function(c) { var o = { id: c.id, name: c.name, hex: c.hex }; o.lab = rgbToOklab(hexToRgb(c.hex)); return o; });
const LAB_BY_ID = fromEntries(PALETTE_LAB.map(c => [c.id, c.lab])); // v123: 描边边缘检测用，避免逐格 find
// 背景填充专用：最接近纯黑 / 纯白的调色板色号
let BG_BLACK_ID = null, BG_WHITE_ID = null;
function updateBgIds() {
  let bestB = null, bestBD = Infinity, bestW = null, bestWD = Infinity;
  for (const c of PALETTE_LAB) {
    const r = parseInt(c.hex.slice(1, 3), 16), g = parseInt(c.hex.slice(3, 5), 16), b = parseInt(c.hex.slice(5, 7), 16);
    const dk = r * r + g * g + b * b;
    const wt = (255 - r) * (255 - r) + (255 - g) * (255 - g) + (255 - b) * (255 - b);
    if (dk < bestBD) { bestBD = dk; bestB = c.id; }
    if (wt < bestWD) { bestWD = wt; bestW = c.id; }
  }
  BG_BLACK_ID = bestB; BG_WHITE_ID = bestW;
}
updateBgIds();
// 提亮映射表：每个色号 → 同系列（同首字母）里亮度高一档的真实色号
// 每系按 Oklab L 升序排列（暗→亮），每个色号指向下一个更亮的；最亮的保持自身不变
let BRIGHTEN_MAP = {};
function buildBrightenMap() {
  BRIGHTEN_MAP = {};
  const series = {};
  for (const c of PALETTE_LAB) {
    const m = c.id.match(/^([A-Za-z]+)/);
    if (!m) continue;
    const letter = m[1];
    if (!series[letter]) series[letter] = [];
    series[letter].push(c);
  }
  for (const letter in series) {
    const colors = series[letter].sort(function(a, b) { return a.lab.L - b.lab.L; });
    for (var i = 0; i < colors.length; i++) {
      BRIGHTEN_MAP[colors[i].id] = (i + 1 < colors.length) ? colors[i + 1].id : colors[i].id;
    }
  }
}
buildBrightenMap();
/* ---------- 3. 状态 ---------- */
const CELL = 28; // 画布内每格像素
const state = {
  sourceImage: null,     // 原图 Image
  grid: null,            // grid[y][x] = colorId | null
  N: 104,                // 默认 104×104（2.6mm 小豆超大板 28×28cm）
  view: 'template',      // 'template' | 'original'
  zoom: 1,
  mode: 'average',       // 'cartoon' | 'average'（卡通 / 真实，默认真实模式）
  dither: false,         // 抖动已随模式固化，当前各模式均关闭抖动，由采样方式决定风格
  cleanup: 5,
  crop: false,           // 默认不裁剪：原图按比例居中(letterbox)显示，四周留白，不裁不拉
  mirror: false,         // 镜像翻转（左右）：预览 / 图纸 / 采购清单同步翻转
  showGrid: true,
  bgMode: 'white',       // 一键切换背景：'black' 黑底 / 'white' 白底（默认白底）
  removeBg: false,        // 自动去背景：默认关，整张图都参与拼豆（白色主体正常标色号）；纯色背景图才手动开
  brighten: false,        // 提亮一档：默认关，开后每个色号替换成同系列更亮一档的真实色号
  outline: { on: false, strength: 50, colorId: 'H7' }, // v123: 像素描边（后处理）：在颜色边界描轮廓线，呈现像素插画线条感。默认关。
  paletteView: 'grid',   // 右侧色板清单视图：'grid' 紧凑色块 / 'list' 行列表
  showCoords: true,      // 画布预览是否显示坐标数字（左侧/底部轴）
  excluded: new Set(),   // 用户排除的颜色
  maxColors: 24,         // 最终图纸颜色数量上限（4~64），与默认真实模式一致；切模式时按预设自动调整为 8/24
  bgMask: null,          // 二维布尔数组：true=该格为背景填充（导出不画色号、不计入用料）
  bgStatus: '',           // 去背景状态反馈：''=未开启 / 'ok'=成功 / 'no_bg'=未检测到背景 / 'small'=板子太小跳过 / 'full'=主体占满
  // v100: 编辑模式
  editMode: false,       // 编辑模式开关
  editSel: null,         // 选中的显示格子 [{gx,gy},...]（displayRect 坐标）
};
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
/* ---------- 5. 图片处理管线 ---------- */
function getCropRect(img) {
  if (!state.crop) return { sx: 0, sy: 0, sw: img.width, sh: img.height };
  const side = Math.min(img.width, img.height);
  return { sx: (img.width - side) / 2, sy: (img.height - side) / 2, sw: side, sh: side };
}
function getSourceData(img) {
  // 取裁剪后的全分辨率像素，供逐格主导色统计
  const cr = getCropRect(img);
  const off = document.createElement('canvas');
  off.width = cr.sw; off.height = cr.sh;
  const octx = off.getContext('2d');
  octx.drawImage(img, cr.sx, cr.sy, cr.sw, cr.sh, 0, 0, cr.sw, cr.sh);
  return octx.getImageData(0, 0, cr.sw, cr.sh);
}
function quantKey(r, g, b) { return ((r >> 4) << 10) | ((g >> 4) << 5) | (b >> 4); }
// 卡通模式核心：取每格内"最频繁色"（大色块最干净）。
// 撤掉 v76 饱和度加权：细黑/深棕勾边在格内是少数，自然被周围填充色吸收，不再变成孤立黑点。
// v130: 新增 edgeAware 参数（卡通模式传 true）。卡通用众数取色，但细黑勾边在格内是少数像素，
//       被周围浅色填充吸收→黑边整条消失。当某色极暗(L<DARK_EDGE_L，典型黑/深棕勾边)时，
//       给该暗色加权(DARK_EDGE_BOOST)，让细勾边在众数投票中能赢过浅色填充，保留轮廓线。
//       阈值收紧到 0.28（只认极暗真勾边含深棕，避开中灰阴影，避免误把阴影染黑）；权重 4.5 使约 20% 占比的勾边格翻盘。
const DARK_EDGE_BOOST = 4.5;
const DARK_EDGE_L = 0.28;
function lumRGB(r, g, b) { return (0.299 * r + 0.587 * g + 0.114 * b) / 255; }
function dominantColor(data, w, h, x0, y0, x1, y1, edgeAware) {
  const counts = new Map();
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * w + x) * 4;
      if (data[i + 3] < 128) continue; // 跳过透明
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const k = quantKey(r, g, b);
      const cur = counts.get(k);
      if (cur) cur.c++; else counts.set(k, { c: 1, r, g, b });
    }
  }
  let best = null, bestC = -1;
  for (const v of counts.values()) {
    let c = v.c;
    if (edgeAware && lumRGB(v.r, v.g, v.b) < DARK_EDGE_L) c *= DARK_EDGE_BOOST; // 暗部勾边加权
    if (c > bestC) { bestC = c; best = v; }
  }
  return best ? { r: best.r, g: best.g, b: best.b } : null;
}
function mapToPalette(rgb) {
  const target = rgbToOklab(rgb);
  // 暗调色相保护：暗调(L<0.35)偏暖(a>0)像素跳过偏冷(a<0)色号，避免暗棕→深橄榄绿(B23)
  const darkWarm = target.L < 0.35 && target.a > 0;
  let best = null, bestD = Infinity;
  for (const c of PALETTE_LAB) {
    if (state.excluded.has(c.id)) continue;
    if (darkWarm && c.lab.a < 0) continue;
    const d = oklabDist(target, c.lab);
    if (d < bestD) { bestD = d; best = c.id; }
  }
  return best; // 全排除时回退 null
}

/* ---------- 5.5 像素化 + 误差扩散抖动（新管线，默认） ---------- */
// 最近邻重采样：把原图清晰缩放到 N×N 网格（关键：imageSmoothingEnabled=false，不模糊）
// 采用 letterbox：保持原图宽高比，居中放进 N×N，四周留透明（=无豆），不裁不拉
function pixelateToGrid(img, N) {
  const cr = getCropRect(img);
  const off = document.createElement('canvas');
  off.width = N; off.height = N;
  const octx = off.getContext('2d');
  octx.imageSmoothingEnabled = false; // 最近邻：每格取一个真实像素，避免均值糊成脏色
  // 计算居中矩形（最短边填满 N，长边按比例，居中）
  const scale = Math.min(N / cr.sw, N / cr.sh);
  const dw = Math.max(1, Math.round(cr.sw * scale));
  const dh = Math.max(1, Math.round(cr.sh * scale));
  const dx = Math.floor((N - dw) / 2);
  const dy = Math.floor((N - dh) / 2);
  octx.clearRect(0, 0, N, N); // 透明底，四周留白 ⇒ 抖动/映射时判为 null
  octx.drawImage(img, cr.sx, cr.sy, cr.sw, cr.sh, dx, dy, dw, dh);
  return octx.getImageData(0, 0, N, N);
}

function buildSrcRGB(img, N) {
  // 最近邻重采样原图到 N×N，记录每格原始 RGB（去背景时据此判断背景，而非量化后的调色板色）。
  // 这样白底被抖动扩散成的「浅灰杂点」其原图仍是白色→判为背景清除；主体浅色装饰（如小太阳）原图有真实颜色→保留。
  const imgData = pixelateToGrid(img, N);
  const data = imgData.data;
  const arr = Array.from({ length: N }, () => new Array(N).fill(null));
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const i = (y * N + x) * 4;
      if (data[i + 3] < 128) { arr[y][x] = null; continue; }
      arr[y][x] = { r: data[i], g: data[i + 1], b: data[i + 2] };
    }
  }
  return arr;
}

// 真实模式专用：饱和度加权均值（区域权重识别法，v81）
// 普通均值会把鲜艳但面积小的特征（眼睛/高光/鲜艳色块）被周围浅色稀释成灰绿；
// 给高饱和像素更高权重，使其在格内代表色中有更高占比，避免被"中和"成灰。
// 注意：这是加权平均(仍是低通滤波)，不同于 v76 对 dominantColor 的"投票"加权——
// 少数饱和像素只能"拉动"均值、无法"赢过"多数，因此不会产生孤立黑点，也不增加总色号。
// v99: 新增亮度保护——白色高光饱和度=0 原公式保护不到，被黑色平均成灰；
//      对极端亮像素（lum>0.9）加额外权重，让高光在格内代表色中占比更高。
const REAL_SAT_ALPHA = 15.0; // 饱和度权重强度：值越大鲜艳特征越突出。v83 5.0→8.0 眼睛仍不够突出（蓝色占比仅61%），v89 8.0→15.0 提升到~74%
const REAL_LUM_THRESHOLD = 0.9; // 亮度保护阈值：lum>此值的近白像素获得额外加权
function satWeightedAverage(data, w, x0, y0, x1, y1, alpha) {
  let r = 0, g = 0, b = 0, wsum = 0;
  for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) {
    const i = (yy * w + xx) * 4;
    if (data[i + 3] < 128) continue; // 跳过透明
    const cr = data[i], cg = data[i + 1], cb = data[i + 2];
    const max = Math.max(cr, cg, cb), min = Math.min(cr, cg, cb);
    const sat = max === 0 ? 0 : (max - min) / max; // 0~1 纯度（近白/近黑/灰≈0，鲜艳色高）
    let wt = 1 + alpha * sat;
    // v100: 饱和度加权改为非线性平方——小面积高饱和特征色(如眼睛蓝色反光)面积太小，
    //       线性加权仍被主体色平均掉。平方后高饱和色权重随饱和度二次方增长，
    //       与中等饱和主体色的权重比从 ~2.6 拉大到 ~7，蓝色反光能拉动格内均值不被淹没。
    wt = wt * wt;
    // v99: 亮度保护——白色高光(近白)饱和度=0，原公式权重仅1，被周围深色平均掉；
    //      对 lum>0.9 的像素按超出量线性加权，让白色高光在均值中占比更高，不被黑毛中和成灰。
    const lum = (0.299 * cr + 0.587 * cg + 0.114 * cb) / 255;
    if (lum > REAL_LUM_THRESHOLD) wt += alpha * (lum - REAL_LUM_THRESHOLD) * 10;
    r += cr * wt; g += cg * wt; b += cb * wt; wsum += wt;
  }
  if (wsum === 0) return null;
  return { r: Math.round(r / wsum), g: Math.round(g / wsum), b: Math.round(b / wsum) };
}

// v140: 分帧批处理 — 把 N×N 逐格映射拆成每批 2000 格，setTimeout 之间让浏览器渲染
var _chunkSize = 2000;
function _processChunk(N, grid, sd, cr, dx, dy, dw, dh, cw, ch, startIdx, onDone) {
  var endIdx = Math.min(startIdx + _chunkSize, N * N);
  for (var idx = startIdx; idx < endIdx; idx++) {
    var y = Math.floor(idx / N);
    var x = idx % N;
    if (x < dx || x >= dx + dw || y < dy || y >= dy + dh) continue;
    var mx = x - dx, my = y - dy;
    var x0 = Math.floor(mx * cw), y0 = Math.floor(my * ch);
    var x1 = Math.max(x0 + 1, Math.floor((mx + 1) * cw));
    var y1 = Math.max(y0 + 1, Math.floor((my + 1) * ch));
    var rgb = null;
    if (state.mode === 'average') {
      rgb = satWeightedAverage(sd.data, sd.width, x0, y0, x1, y1, REAL_SAT_ALPHA);
    } else {
      rgb = dominantColor(sd.data, sd.width, sd.height, x0, y0, x1, y1, true);
    }
    grid[y][x] = rgb ? mapToPalette(rgb) : null;
  }
  if (endIdx < N * N) {
    setTimeout(function() { _processChunk(N, grid, sd, cr, dx, dy, dw, dh, cw, ch, endIdx, onDone); }, 0);
  } else {
    onDone();
  }
}

function processImage() {
  if (!state.sourceImage) return;
  var _wrapEl = document.getElementById('canvas-wrap');
  if (_wrapEl) _wrapEl.classList.add('processing');
  var N = state.N;
  state.srcRGB = buildSrcRGB(state.sourceImage, N);
  var cr = getCropRect(state.sourceImage);
  var sd = getSourceData(state.sourceImage);
  var scale = Math.min(N / cr.sw, N / cr.sh);
  var dw = Math.max(1, Math.round(cr.sw * scale));
  var dh = Math.max(1, Math.round(cr.sh * scale));
  var dx = Math.floor((N - dw) / 2);
  var dy = Math.floor((N - dh) / 2);
  var cw = cr.sw / dw, ch = cr.sh / dh;
  var grid = Array.from({ length: N }, function() { return new Array(N).fill(null); });

  // v140: 分帧处理（小板子一步完成，大板子分批异步）
  if (N <= 78) {
    // 小板子：同步处理，零开销
    _processChunk(N, grid, sd, cr, dx, dy, dw, dh, cw, ch, 0, function() {
      _finishPipeline(grid, N);
    });
  } else {
    // 大板子：分帧异步，UI 不卡
    setTimeout(function() {
      _processChunk(N, grid, sd, cr, dx, dy, dw, dh, cw, ch, 0, function() {
        _finishPipeline(grid, N);
      });
    }, 0);
  }
}

// Floyd-Steinberg 单行处理（供分帧异步调用）
var _fsW = [7/16, 3/16, 5/16, 1/16];
function _fsProcessRow(grid, acc, y, N) {
  for (var x = 0; x < N; x++) {
    if (!acc[y][x]) continue;
    var cur = acc[y][x];
    cur.r = Math.max(0, Math.min(255, Math.round(cur.r)));
    cur.g = Math.max(0, Math.min(255, Math.round(cur.g)));
    cur.b = Math.max(0, Math.min(255, Math.round(cur.b)));
    var newId = mapToPalette(cur);
    if (!newId) continue;
    var palHex = PALETTE_BY_ID[newId].hex;
    var pr = parseInt(palHex.slice(1,3), 16), pg = parseInt(palHex.slice(3,5), 16), pb = parseInt(palHex.slice(5,7), 16);
    var errR = cur.r - pr, errG = cur.g - pg, errB = cur.b - pb;
    grid[y][x] = newId;
    var nb = [[x+1,y,_fsW[0]],[x-1,y+1,_fsW[1]],[x,y+1,_fsW[2]],[x+1,y+1,_fsW[3]]];
    for (var n = 0; n < 4; n++) {
      var nx = nb[n][0], ny = nb[n][1], nw = nb[n][2];
      if (nx < 0 || nx >= N || ny < 0 || ny >= N || !acc[ny][nx]) continue;
      acc[ny][nx].r += errR * nw;
      acc[ny][nx].g += errG * nw;
      acc[ny][nx].b += errB * nw;
    }
  }
}

// v140: 同步 Floyd-Steinberg（小板子）
function applyFloydSteinberg(grid, srcRGB, N) {
  if (!srcRGB) return;
  var acc = Array.from({ length: N }, function() { return new Array(N).fill(null); });
  for (var y = 0; y < N; y++)
    for (var x = 0; x < N; x++)
      if (srcRGB[y][x]) acc[y][x] = { r: srcRGB[y][x].r, g: srcRGB[y][x].g, b: srcRGB[y][x].b };
  for (var y = 0; y < N; y++) _fsProcessRow(grid, acc, y, N);
}

// v140: 异步分帧 Floyd-Steinberg（大板子，逐行 setTimeout）
function applyFloydSteinbergAsync(grid, srcRGB, N, onDone) {
  if (!srcRGB) { onDone(); return; }
  var acc = Array.from({ length: N }, function() { return new Array(N).fill(null); });
  for (var y = 0; y < N; y++)
    for (var x = 0; x < N; x++)
      if (srcRGB[y][x]) acc[y][x] = { r: srcRGB[y][x].r, g: srcRGB[y][x].g, b: srcRGB[y][x].b };
  var row = 0;
  var batchSize = 4; // 每批处理 4 行
  function nextBatch() {
    var end = Math.min(row + batchSize, N);
    for (; row < end; row++) _fsProcessRow(grid, acc, row, N);
    if (row < N) { setTimeout(nextBatch, 0); }
    else { onDone(); }
  }
  nextBatch();
}

function _finishPipeline(grid, N) {
  // v140: Floyd-Steinberg 抖动（在降噪之前，利用原图 RGB 信息）
  if (state.dither) {
    if (N <= 78) {
      applyFloydSteinberg(grid, state.srcRGB, N);
      _finishAfter(grid, N);
    } else {
      applyFloydSteinbergAsync(grid, state.srcRGB, N, function() {
        _finishAfter(grid, N);
      });
      return; // async, _finishAfter will be called later
    }
  }
  _finishAfter(grid, N);
}
function _finishAfter(grid, N) {
  // 清理去噪按常规执行（卡通/真实一致）
  cleanupNoise(grid, state.cleanup);
  // 去背景：默认关闭。关掉时整张图都参与拼豆，白色主体也正常标色号（解决「白色空白、识别不到主图」）；
  // 只有用户明确要抠纯色背景时才在 UI 打开「自动去背景」。
  if (state.removeBg) {
    state.bgStatus = 'ok'; // will be overwritten if a gate fails
    removeBackground(grid);
  } else {
    state.bgMask = Array.from({ length: N }, () => new Array(N).fill(false));
    state.bgStatus = '';
  }
  // 颜色数量上限：合并肉眼难分的相近色，让卡通/插画色块更干净
  reduceColors(grid, state.maxColors);
  // 提亮一档：把每个色号替换成同系列里更亮一档的真实色号（开关控制，默认关）
  applyBrighten(grid);
  // v123: 像素描边（后处理）——在颜色边界描轮廓线，呈现像素插画线条感。默认关，开启时改写边缘格为描边色。
  if (state.outline.on) applyOutline(grid, state.outline.strength, state.outline.colorId);
  state.grid = grid;
  // 图片实际覆盖的有效格子数（排除背景格与空格子的最小外接包围盒），供导出图/界面标注"有效 W×H"
  let eminX = N, eminY = N, emaxX = -1, emaxY = -1;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const id = grid[y][x];
      if (id == null) continue;
      if (state.bgMask && state.bgMask[y][x]) continue; // 背景填充格不计入有效区
      if (x < eminX) eminX = x;
      if (x > emaxX) emaxX = x;
      if (y < eminY) eminY = y;
      if (y > emaxY) emaxY = y;
    }
  }
  state.effective = emaxX < 0 ? { cols: 0, rows: 0, minX: 0, minY: 0, maxX: 0, maxY: 0 } : { cols: emaxX - eminX + 1, rows: emaxY - eminY + 1, minX: eminX, minY: eminY, maxX: emaxX, maxY: emaxY };
  // v98: 软裁——计算主体边界 subject（排除四周纯背景色留白豆子）。
  //      effective（含 H2 留白豆子）用于导出图画布裁剪；subject 用于规格标注和色号统计。
  //      逻辑：取 effective 四角众数判断背景色 bgId（≥3/4 才算），
  //            从四边向内收缩，整行/列所有非null格都是 bgId 的边缘排除。
  //            保护：subject 面积 < effective 50% → 回退（防白猫类白色主体被误判）。
  state.subject = (function () {
    if (emaxX < 0) return state.effective;
    var corners = [];
    if (grid[eminY][eminX] != null) corners.push(grid[eminY][eminX]);
    if (grid[eminY][emaxX] != null) corners.push(grid[eminY][emaxX]);
    if (grid[emaxY][eminX] != null) corners.push(grid[emaxY][eminX]);
    if (grid[emaxY][emaxX] != null) corners.push(grid[emaxY][emaxX]);
    if (corners.length < 3) return state.effective;
    var cc = {};
    for (var i = 0; i < corners.length; i++) cc[corners[i]] = (cc[corners[i]] || 0) + 1;
    var bgId = null, bgMax = 0;
    for (var id in cc) { if (cc[id] > bgMax) { bgMax = cc[id]; bgId = id; } }
    if (bgMax < 3) return state.effective; // 四角不统一 → 无明确背景
    // 从四边向内收缩
    var sMinY = eminY;
    while (sMinY <= emaxY) {
      var allBg = true;
      for (var x = eminX; x <= emaxX; x++) {
        var v = grid[sMinY][x];
        if (v != null && v !== bgId) { allBg = false; break; }
      }
      if (!allBg) break;
      sMinY++;
    }
    var sMaxY = emaxY;
    while (sMaxY >= sMinY) {
      var allBg2 = true;
      for (var x2 = eminX; x2 <= emaxX; x2++) {
        var v2 = grid[sMaxY][x2];
        if (v2 != null && v2 !== bgId) { allBg2 = false; break; }
      }
      if (!allBg2) break;
      sMaxY--;
    }
    var sMinX = eminX;
    while (sMinX <= emaxX) {
      var allBg3 = true;
      for (var y = sMinY; y <= sMaxY; y++) {
        var v3 = grid[y][sMinX];
        if (v3 != null && v3 !== bgId) { allBg3 = false; break; }
      }
      if (!allBg3) break;
      sMinX++;
    }
    var sMaxX = emaxX;
    while (sMaxX >= sMinX) {
      var allBg4 = true;
      for (var y2 = sMinY; y2 <= sMaxY; y2++) {
        var v4 = grid[y2][sMaxX];
        if (v4 != null && v4 !== bgId) { allBg4 = false; break; }
      }
      if (!allBg4) break;
      sMaxX--;
    }
    // 50% 回退保护
    var sArea = (sMaxX - sMinX + 1) * (sMaxY - sMinY + 1);
    var eArea = (emaxX - eminX + 1) * (emaxY - eminY + 1);
    if (sArea < eArea * 0.5) return state.effective;
    return { cols: sMaxX - sMinX + 1, rows: sMaxY - sMinY + 1, minX: sMinX, minY: sMinY, maxX: sMaxX, maxY: sMaxY };
  })();
  // v128: 始终把「四周留白」标记为背景（透明、不算豆），与主体内白豆区分。
  // 主体内的白色(如白猫身体)仍保留为白豆、计入用料。背景格后续渲染为透明棋盘格、导出透明底。
  {
    const sub = state.subject || state.effective;
    const sMinX = sub && sub.cols > 0 ? sub.minX : 0;
    const sMinY = sub && sub.cols > 0 ? sub.minY : 0;
    const sMaxX = sub && sub.cols > 0 ? sub.maxX : N - 1;
    const sMaxY = sub && sub.cols > 0 ? sub.maxY : N - 1;
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++)
        if (x < sMinX || x > sMaxX || y < sMinY || y > sMaxY) state.bgMask[y][x] = true;
  }
  // v100: 固定裁剪布局——导出图/预览统一为 (N-4)×(N-4) 正方形，内容居中、四周填背景色。
  // 适配电子拼豆板：图片需比板子限制小一点才能导入（104板→100、78→74、52→48、48→44）。
  // 预览与导出共用此布局，确保编辑所见即所得。
  // 内容来源=effective（含留白豆子，和 v98 方案B一致）；超出 M 则从内容居中裁剪 M 格。
  state.displayRect = (function () {
    var M = N - 4;
    var eff = state.effective;
    if (eff.cols === 0) return { M: M, offX: 0, offY: 0, srcMinX: 0, srcMinY: 0, drawCols: 0, drawRows: 0 };
    function fit(contentLen, srcStart) {
      if (contentLen <= M) return { off: Math.floor((M - contentLen) / 2), srcStart: srcStart, len: contentLen };
      var cut = Math.floor((contentLen - M) / 2);
      return { off: 0, srcStart: srcStart + cut, len: M };
    }
    var fx = fit(eff.cols, eff.minX);
    var fy = fit(eff.rows, eff.minY);
    return { M: M, offX: fx.off, offY: fy.off, srcMinX: fx.srcStart, srcMinY: fy.srcStart, drawCols: fx.len, drawRows: fy.len };
  })();
  renderAll();
}
function cleanupNoise(grid, threshold) {
  // threshold 0-100 → Oklab 距离阈值
  const okT = 0.02 + (threshold / 100) * 0.22;
  const N = grid.length;
  const lab = id => LAB_BY_ID[id] || null;
  for (let iter = 0; iter < 3; iter++) {
    const next = grid.map(r => r.slice());
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const cur = grid[y][x];
        if (cur == null) continue;
        const counts = {};
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const ny = y + dy, nx = x + dx;
            if (ny < 0 || nx < 0 || ny >= N || nx >= N) continue;
            const v = grid[ny][nx];
            if (v != null) counts[v] = (counts[v] || 0) + 1;
          }
        }
        let majority = cur, max = 0;
        for (const k in counts) if (counts[k] > max) { max = counts[k]; majority = k; }
        if (majority !== cur && max >= 5) {
          const curLab = lab(cur), majLab = lab(majority);
          if (curLab && majLab && oklabDist(curLab, majLab) < okT) next[y][x] = majority;
        }
      }
    }
    grid.length = 0;
    for (var _i = 0; _i < next.length; _i++) grid.push(next[_i]);
  }
}
// v123: 像素描边（后处理）——把颜色边界描成轮廓线，呈现像素插画的干净线条感（替代豆包出图的描边效果）。
// 在 reduceColors 之后、state.grid 赋值之前调用：对网格做 Oklab 色差边缘检测，
// 相邻非背景格色差超过阈值即判为边缘，整格改写为描边色（取调色板现成深色，不新发明颜色）。
// 只读扫描生成 edgeMask 再统一改写，避免描边格自身引发级联加粗。背景/留白(null)邻格跳过，不描外轮廓，避免矩形黑框。
function applyOutline(grid, strength, colorId) {
  if (!colorId || !LAB_BY_ID[colorId]) return;
  const N = grid.length;
  // v124: 阈值映射重新校准。旧版 0.55~0.05 让"中等强度=几乎不描"，要拉到 100 才有感觉（用户实测：强度 31 啥都没描）。
  // 新版 0.20~0.02：强度 0=几乎不描（仅描主体外轮廓），30=开始出现可见描边，50=明显（默认），70=较重，100=几乎所有相邻差异都描。
  const thr = 0.20 - (strength / 100) * 0.18;
  const lab = new Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const id = grid[y][x];
    lab[y * N + x] = (id != null) ? LAB_BY_ID[id] : null;
  }
  const edge = new Uint8Array(N * N);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const cur = lab[y * N + x];
      if (!cur) continue;
      let isEdge = false;
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (let k = 0; k < 4; k++) {
        const nx = x + nb[k][0], ny = y + nb[k][1];
        if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
        const nlab = lab[ny * N + nx];
        // v124: 前景 vs 留白也算边界 → 描出"主体外轮廓"（旧版会跳过，导致狗狗四周没描边）
        if (!nlab) { isEdge = true; break; }
        // v125 根因修复：rgbToOklab 返回 {L,a,b} 对象，旧代码用 cur[0] 数字索引取值恒为 undefined
        // → 色差恒 NaN → NaN>thr 永远 false → 描边彻底失效（v123 引入，v124 调阈值白调）。
        // 改用现成 oklabDist（属性访问 .L/.a/.b），与 mapToPalette/oklabDist 全局一致。
        if (oklabDist(cur, nlab) > thr) { isEdge = true; break; }
      }
      if (isEdge) edge[y * N + x] = 1;
    }
  }
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (edge[y * N + x]) grid[y][x] = colorId;
  }
}
function removeBackground(grid = state.grid) {
  if (!grid || !state.srcRGB) return;
  const N = grid.length;
  const srcRGB = state.srcRGB;
  // v139: 不再依赖 state.bgMode 手动切换——先用中位数亮度自动判断背景是亮还是暗，
  // 再选对应的填充色号。用户仍可用 bgMode 覆盖（强制黑/白底），但默认走自动检测。
  // bgColorId 在下方检测完 bgLab 后再赋值。

  // 初始化背景掩码：标记哪些格子是「背景填充」（导出不画色号、不计入用料）
  state.bgMask = Array.from({ length: N }, () => new Array(N).fill(false));

  // 计算非 null 内容区域与格子总数
  let minX = N, minY = N, maxX = -1, maxY = -1, nonNull = 0;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (grid[y][x] != null) {
        nonNull++;
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return; // 全空

  // 收集内容四条边界上的原图像素
  const boundary = [];
  const acc = (x, y) => { const s = srcRGB[y][x]; if (s) boundary.push(s); };
  for (let x = minX; x <= maxX; x++) { acc(x, minY); acc(x, maxY); }
  for (let y = minY; y <= maxY; y++) { acc(minX, y); acc(maxX, y); }
  if (!boundary.length) return;

  // 背景基准：边界像素按亮度排序后的「中位数」颜色。
  // 用中位数（而非最亮 50%）可同时适配亮底与暗底：纯白底取白、深黑底取黑，
  // 且对边界上少量主体边缘像素不敏感。
  const sorted = boundary.slice().sort((a, b) => (a.r + a.g + a.b) - (b.r + b.g + b.b));
  const mid = sorted[Math.floor(sorted.length / 2)];
  const bgLab = rgbToOklab({ r: mid.r, g: mid.g, b: mid.b });

  // v139: 自动检测背景色——根据中位数亮度判断是亮底还是暗底，
  // 不再硬性依赖用户手动切换 bgMode。用户选的 bgMode 仍影响画布底色渲染，
  // 但去背景填充色由算法自动选择，解决"纯黑底图但停在白底"导致去不掉的问题。
  var bgColorId = bgLab.L > 0.5 ? BG_WHITE_ID : BG_BLACK_ID;
  if (bgColorId == null) return;

  // —— 保护闸：仅当边界是「亮底或暗底且整体均匀」时才填充。
  // v139: 放宽均匀度要求 vL<0.12→0.15（豆包生图常有轻微水印/渐变，0.12 太严），
  // 并增加「中位数亮度」辅助判断：只要中位数明确亮(>0.88)或暗(<0.30)，
  // 即使边界均值被主体边缘拉偏，也判定为有背景。
  const topLab = boundary.map(s => rgbToOklab(s));
  let mL = 0;
  for (var ti = 0; ti < topLab.length; ti++) mL += topLab[ti].L;
  mL /= topLab.length;
  let vL = 0;
  for (var tj = 0; tj < topLab.length; tj++) vL += (topLab[tj].L - mL) * (topLab[tj].L - mL);
  vL = Math.sqrt(vL / topLab.length);
  var midL = bgLab.L;
  var mainGate = ((mL > 0.86 || mL < 0.35) && vL < 0.15) ||
                 ((midL > 0.88 || midL < 0.30) && vL < 0.18);

  // 角落兜底：检查画布四角（非 effective 边缘）是否为统一亮/暗底
  // v139: 放宽 N 限制 52→40，让中等板子也能用角落兜底；
  //       采样从单点改为 3×3 区域取均值，抗 JPEG 噪声更稳定。
  var cornerGate = false;
  if (!mainGate && N > 40) {
    var corners_avg = [];
    var corner_offsets = [[0,0], [0,N-1], [N-1,0], [N-1,N-1]];
    for (var ci = 0; ci < corner_offsets.length; ci++) {
      var cx0 = corner_offsets[ci][0], cy0 = corner_offsets[ci][1];
      var sumR = 0, sumG = 0, sumB = 0, cnt = 0;
      for (var dy = -1; dy <= 1; dy++) {
        for (var dx = -1; dx <= 1; dx++) {
          var px = cx0 + dx, py = cy0 + dy;
          if (px < 0 || px >= N || py < 0 || py >= N) continue;
          var s = srcRGB[py] && srcRGB[py][px];
          if (s) { sumR += s.r; sumG += s.g; sumB += s.b; cnt++; }
        }
      }
      if (cnt > 0) corners_avg.push({ r: sumR/cnt, g: sumG/cnt, b: sumB/cnt });
    }
    if (corners_avg.length >= 3) {
      var cLabs = corners_avg.map(function(s) { return rgbToOklab(s); });
      var cmL = 0;
      for (var ck = 0; ck < cLabs.length; ck++) cmL += cLabs[ck].L;
      cmL /= cLabs.length;
      var cvL = 0;
      for (var cj = 0; cj < cLabs.length; cj++) cvL += (cLabs[cj].L - cmL) * (cLabs[cj].L - cmL);
      cvL = Math.sqrt(cvL / cLabs.length);
      // v139: 角落阈值略放宽（0.06→0.08），亮度边界略放宽（0.92→0.90 / 0.20→0.22）
      cornerGate = ((cmL > 0.90 || cmL < 0.22) && cvL < 0.08);
      // 若角落判定为有背景，同步更新 bgLab 为角落均值（更准确）
      if (cornerGate) {
        var bestCornerL = cmL > 0.5 ? 0 : 1; // 找最亮/最暗的角落
        var bestCorner = null, bestScore = -1;
        for (var cw = 0; cw < corners_avg.length; cw++) {
          var cl = rgbToOklab(corners_avg[cw]).L;
          var score = cmL > 0.5 ? cl : (1 - cl);
          if (score > bestScore) { bestScore = score; bestCorner = corners_avg[cw]; }
        }
        if (bestCorner) {
          var newLab = rgbToOklab(bestCorner);
          bgLab.L = newLab.L; bgLab.a = newLab.a; bgLab.b = newLab.b;
          bgColorId = newLab.L > 0.5 ? BG_WHITE_ID : BG_BLACK_ID;
        }
      }
    }
  }

  if (!mainGate && !cornerGate) {
    // 无统一亮/暗背景：保留原图，但仍把残留的 null 填充，避免图纸出现空号
    state.bgStatus = 'no_bg';
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (grid[y][x] == null) grid[y][x] = bgColorId;
      }
    }
    return;
  }

  // —— 小尺寸保护：N ≤ 52（钥匙扣/小挂件尺寸）时跳过去背景，保留完整主体。
  // 小图主体格数少，去背景 BFS 极易把主体同色区域当背景吃掉（如白猫在白底上）。
  // 背景豆子用户可用「颜色数量上限」+「排除色」自行处理。
  if (N <= 52) {
    state.bgStatus = 'small';
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (grid[y][x] == null) grid[y][x] = bgColorId;
      }
    }
    if (grid === state.grid) renderAll();
    return;
  }

  // 某格是否应视为背景：依据「原图像素」是否接近背景基准（而非量化调色板色）。
  // 用原图可区分「浅灰/肉色主体」（离白底较远）与「纯白背景」（离白底极近），
  // 避免浅色主体被量化合并到接近白色后误判为背景吃掉（如白猫的胳膊/脸）。
  // v139: 自适应阈值——边界越纯(低 vL)越有把握是背景，适当放宽阈值吃更多背景；
  //       边界越杂(高 vL)越保守，收紧阈值防误吃主体。
  var BG_T = 0.08;
  if (vL < 0.05) BG_T = 0.12;       // 极纯背景（如纯白/纯黑）：放宽到 0.12
  else if (vL < 0.10) BG_T = 0.10;  // 较纯：0.10
  else BG_T = 0.08;                 // 一般：保持 0.08
  const isBg = (x, y) => {
    if (grid[y][x] == null) return false; // 透明留白不算背景
    const s = srcRGB[y][x];
    if (!s) return false;
    return oklabDist(rgbToOklab(s), bgLab) < BG_T;
  };

  // 形态学保护：把「确定属于前景」的格子（颜色离背景足够远）向外膨胀几格，
  // 形成一层保护罩（与下方边缘墙配合，双重保险防止主体被吃掉）。
  const DILATE_R = 2; // 膨胀半径（格）
  const isBgArr = Array.from({ length: N }, () => new Array(N).fill(false));
  const cover = Array.from({ length: N }, () => new Array(N).fill(false));
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (grid[y][x] == null) continue;
      const s = srcRGB[y][x];
      const d = s ? oklabDist(rgbToOklab(s), bgLab) : 1;
      if (d < BG_T) {
        isBgArr[y][x] = true;
      } else {
        cover[y][x] = true; // 确定前景种子
      }
    }
  }
  for (let k = 0; k < DILATE_R; k++) {
    const next = Array.from({ length: N }, (_, y) => cover[y].slice());
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (cover[y][x]) continue;
        let hit = false;
        for (let dy = -1; dy <= 1 && !hit; dy++) {
          for (let dx = -1; dx <= 1 && !hit; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx < minX || nx > maxX || ny < minY || ny > maxY) continue;
            if (cover[ny][nx]) { hit = true; break; }
          }
        }
        if (hit) next[y][x] = true;
      }
    }
    for (let y = 0; y < N; y++) cover[y] = next[y];
  }

  // 边缘墙：原图相邻格颜色距离过大处视为硬边界，BFS 不可穿越。
  // 这样主体被描边/轮廓包围时，内部(即使颜色与背景相近)不会被连通填充吃掉。
  const EDGE_T = 42; // 0-255 RGB 欧氏距离阈值
  const edgeBetween = (x1, y1, x2, y2) => {
    const a = srcRGB[y1] && srcRGB[y1][x1], b = srcRGB[y2] && srcRGB[y2][x2];
    if (!a || !b) return 0;
    const dr = a.r - b.r, dg = a.g - b.g, db = a.b - b.b;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  };

  // 连通域填充：从画布四条边向内 BFS（v137 改用画布边缘而非 effective 包围盒边缘，
  // 解决豆包等生图「主体大/贴边」时 effective 边缘紧贴主体、无背景种子可启动的问题）。
  // 只填「从边缘连通的背景」、不在 cover 保护下、且不跨越硬边缘(边缘墙)的格子。
  const toFill = [];
  const visited = Array.from({ length: N }, () => new Array(N).fill(false));
  const queue = [];
  const seed = (x, y) => {
    if (x < 0 || x >= N || y < 0 || y >= N) return;
    if (visited[y][x] || !isBgArr[y][x] || cover[y][x]) return;
    visited[y][x] = true; queue.push([x, y]);
  };
  const step = (fx, fy, x, y) => {
    if (x < 0 || x >= N || y < 0 || y >= N) return;
    if (visited[y][x] || !isBgArr[y][x] || cover[y][x]) return;
    if (edgeBetween(fx, fy, x, y) > EDGE_T) return; // 硬边界：不穿越
    visited[y][x] = true; queue.push([x, y]);
  };
  // v137: 从画布绝对边缘种子（行0/N-1、列0/N-1），确保即使主体贴边也能命中白底
  for (let x = 0; x < N; x++) { seed(x, 0); seed(x, N - 1); }
  for (let y = 0; y < N; y++) { seed(0, y); seed(N - 1, y); }
  while (queue.length) {
    const [x, y] = queue.pop();
    toFill.push([x, y]);
    step(x, y, x - 1, y); step(x, y, x + 1, y);
    step(x, y, x, y - 1); step(x, y, x, y + 1);
  }

  // 安全闸：若待填充比例过高，说明在吃主体（如纯灰满幅图绕过保护闸），整图保留不填充。
  // 置信度自适应：边界越纯(极亮或极暗且均匀)，越有把握是背景，放宽阈值；
  // 避免把「主体小+背景大」的正常白底图误判为满幅主体而整图保留。
  // v139: 也用 midL 判断置信度（中位数比均值更稳定，不受主体边缘干扰）
  var gateConfident = (mL > 0.95 && vL < 0.05) || (mL < 0.08 && vL < 0.05) ||
                      (midL > 0.95 && vL < 0.06) || (midL < 0.06 && vL < 0.06);
  var safetyLimit = gateConfident ? 0.98 : 0.85;
  if (nonNull && toFill.length / nonNull > safetyLimit) { state.bgStatus = 'full'; return; }

  for (const [x, y] of toFill) { grid[y][x] = bgColorId; state.bgMask[y][x] = true; }

  // 二次清理：主体内部孤立的背景小点(≤15 豆)也填成背景色，避免杂点残留。
  {
    const visited2 = Array.from({ length: N }, () => new Array(N).fill(false));
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (grid[y][x] == null || visited2[y][x]) continue;
        if (!isBg(x, y)) { visited2[y][x] = true; continue; }
        const stack = [[x, y]];
        visited2[y][x] = true;
        const cells = [];
        while (stack.length) {
          const [cx, cy] = stack.pop();
          cells.push([cx, cy]);
          const nx = [cx - 1, cx + 1, cx, cx], ny = [cy, cy, cy - 1, cy + 1];
          for (let i = 0; i < 4; i++) {
            const xx = nx[i], yy = ny[i];
            if (xx < minX || xx > maxX || yy < minY || yy > maxY) continue;
            if (visited2[yy][xx]) continue;
            if (grid[yy][xx] == null) continue;
            if (!isBg(xx, yy)) { visited2[yy][xx] = true; continue; }
            visited2[yy][xx] = true;
            stack.push([xx, yy]);
          }
        }
        if (cells.length <= 15) {
          for (const [cx, cy] of cells) { grid[cy][cx] = bgColorId; state.bgMask[cy][cx] = true; }
        }
      }
    }
  }

  // 最终填充：主体内部或留白区的任何 null 统一用背景色豆子填充，避免图纸出现空号。
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (grid[y][x] == null) grid[y][x] = bgColorId;
    }
  }

  // 内部空洞回填：被前景完全包围、不接触内容边框的背景区域，在拼豆里无法做成
  // 「空心」（必须一整片），回填为周围最主流的前景色，避免手/胳膊中间出现空洞。
  fillEnclosedHoles(grid);

  if (grid === state.grid) renderAll();
}

/* 内部空洞回填：把被前景包围、不接触边框的背景连通域填回周围前景色。 */
function fillEnclosedHoles(grid) {
  if (!grid || !state.bgMask) return;
  const N = grid.length;
  // 内容边框（非背景格的包围盒）
  let minX = N, minY = N, maxX = -1, maxY = -1;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (grid[y][x] != null && !state.bgMask[y][x]) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return;
  const visited = Array.from({ length: N }, () => new Array(N).fill(false));
  const isBg = (x, y) => x >= 0 && x < N && y >= 0 && y < N && state.bgMask[y][x];
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (!isBg(x, y) || visited[y][x]) continue;
      // BFS 收集这个背景连通域
      const stack = [[x, y]];
      visited[y][x] = true;
      const cells = [];
      let touchesBorder = false;
      while (stack.length) {
        const [cx, cy] = stack.pop();
        cells.push([cx, cy]);
        if (cx <= minX || cx >= maxX || cy <= minY || cy >= maxY) touchesBorder = true;
        const nx = [cx - 1, cx + 1, cx, cx], ny = [cy, cy, cy - 1, cy + 1];
        for (let i = 0; i < 4; i++) {
          const xx = nx[i], yy = ny[i];
          if (xx < minX || xx > maxX || yy < minY || yy > maxY) continue;
          if (visited[yy][xx] || !isBg(xx, yy)) continue;
          visited[yy][xx] = true;
          stack.push([xx, yy]);
        }
      }
      if (touchesBorder) continue; // 接触边框 = 真背景，保留
      // 内部空洞：统计邻居前景色，回填最主流的那个
      const near = {};
      for (const [cx, cy] of cells) {
        const nx = [cx - 1, cx + 1, cx, cx], ny = [cy, cy, cy - 1, cy + 1];
        for (let i = 0; i < 4; i++) {
          const xx = nx[i], yy = ny[i];
          if (xx < 0 || xx >= N || yy < 0 || yy >= N) continue;
          const id = grid[yy][xx];
          if (id == null || isBg(xx, yy)) continue;
          near[id] = (near[id] || 0) + 1;
        }
      }
      let fillId = null, best = -1;
      for (const id in near) {
        if (near[id] > best) { best = near[id]; fillId = +id; }
      }
      if (fillId == null) continue; // 无邻居前景，保持不动
      for (const [cx, cy] of cells) {
        grid[cy][cx] = fillId;
        state.bgMask[cy][cx] = false;
      }
    }
  }
}

/* ---------- 5.5 颜色数量上限：合并相近色（保护浅色不被吃掉） ---------- */
// v119: 计算每个颜色在网格中的「最大连通区」大小（4 邻接）。
// 用途：≥2 格的连贯区域视为真实特征（眼睛/鼻子/色块边界），而非孤立噪点，
// 在 reduceColors 中优先保护，确保任意板子大小都保留特点、清晰不糊。
function computeMaxRegion(grid, bgMask) {
  const N = grid.length;
  const visited = new Uint8Array(N * N);
  const maxReg = {};
  const stack = [];
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const idx = y * N + x;
      if (visited[idx]) continue;
      const id = grid[y][x];
      if (id == null) { visited[idx] = 1; continue; }
      if (bgMask && bgMask[y][x]) { visited[idx] = 1; continue; }
      let size = 0;
      stack.length = 0; stack.push(idx); visited[idx] = 1;
      while (stack.length) {
        const cur = stack.pop();
        size++;
        const cy = (cur / N) | 0, cx = cur % N;
        if (cx > 0) { const n = cur - 1; if (!visited[n] && grid[cy][cx - 1] === id) { visited[n] = 1; stack.push(n); } }
        if (cx < N - 1) { const n = cur + 1; if (!visited[n] && grid[cy][cx + 1] === id) { visited[n] = 1; stack.push(n); } }
        if (cy > 0) { const n = cur - N; if (!visited[n] && grid[cy - 1][cx] === id) { visited[n] = 1; stack.push(n); } }
        if (cy < N - 1) { const n = cur + N; if (!visited[n] && grid[cy + 1][cx] === id) { visited[n] = 1; stack.push(n); } }
      }
      if (!(id in maxReg) || size > maxReg[id]) maxReg[id] = size;
    }
  }
  return maxReg;
}

function reduceColors(grid, maxColors) {
  if (!grid || maxColors <= 0) return;
  const N = grid.length;
  // 统计实际使用的颜色频次（跳过背景填充格）
  const counts = {};
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const id = grid[y][x];
      if (id == null) continue;
      if (state.bgMask && state.bgMask[y][x]) continue; // 背景填充格不参与合并
      counts[id] = (counts[id] || 0) + 1;
    }
  }
  let ids = Object.keys(counts);
  if (ids.length <= maxColors) return;

  // 初始化每个颜色先映射到自己
  const mapping = {};
  for (const id of ids) mapping[id] = id;

  // 预取 Lab，避免反复 find；同时计算 lightness/chroma 用于浅色保护
  const labOf = id => LAB_BY_ID[id] || null;
  const labCache = {};
  const meta = {};
  for (const id of ids) {
    const lab = labOf(id);
    labCache[id] = lab;
    if (lab) meta[id] = { L: lab.L, C: Math.sqrt(lab.a * lab.a + lab.b * lab.b) };
  }

  // 极浅色：L 最大的前 15%（至少 3 个）。这些颜色接近白底，不能作为"有色"的合并目标。
  const lightest = new Set(ids.slice().sort((a, b) => ((meta[b] && meta[b].L) || 0) - ((meta[a] && meta[a].L) || 0)).slice(0, Math.max(3, Math.ceil(ids.length * 0.15))));

  // v99: 反差保护——低频色若与所有更高频色 Oklab 距离都超过阈值（高反差特征色），跳过不合并。
  //      阈值 0.12：同色系相邻色号距离约 0.05~0.08（正常合并），跨色系约 0.2+（保护）。
  //      这样粉色耳朵、红色舌头等小面积特征色不会被合并到灰/黑色里。
  //      若所有剩余色都被保护（极端情况），清空保护集强制合并频次最低的。
  const CONTRAST_THRESHOLD = 0.12;
  const contrastProtected = new Set();

  // v119: 特征保留——先算每个颜色的最大连通区；≥2 格的连贯区域是真实特征（眼睛/鼻子/色块边界），
  //       而非孤立噪点，预先加入保护集，让有限的颜色预算优先花在主体特点上，任意板子大小都清晰不糊。
  const regionSize = computeMaxRegion(grid, state.bgMask);
  const MIN_FEATURE = 2;
  for (const id of ids) {
    if ((regionSize[id] || 0) >= MIN_FEATURE) contrastProtected.add(id);
  }

  // v122: 保护集上限——受保护特征色不能超过色数预算，否则循环里会 all-protected 触发 forceMerge 清空全部保护、
  //       低频重要特征（眼睛/鼻子/嘴等）被暴力合并→卡通模式尤为严重（大板子原图色多、8色预算必丢特点）。
  //       只保留「频次×反差」打分最高的 maxColors 个特征色，其余解除保护（可被正常合并）。
  const featScore = (id) => counts[id] * (1 + 4 * Math.min(1, (meta[id] && meta[id].C) || 0) / 0.1);
  if (contrastProtected.size > maxColors) {
    var ranked = Array.from(contrastProtected).sort(function(a, b) { return featScore(b) - featScore(a); }).slice(0, maxColors);
    contrastProtected.clear();
    for (const id of ranked) contrastProtected.add(id);
  }

  // v130: 描边色保护——极暗色（黑/深灰/深棕，通常是轮廓线/勾边）即使频次极低、区域仅单格宽(line)，
  //       也强制保留，避免卡通模式黑边在合并阶段被当低频色吃掉。独立保护池（不受 feature 上限约束），
  //       最多保留 3 个最暗色，作为「最后才合并」的对象；仅当实在无其它可合并色时才牺牲。
  const OUTLINE_L = 0.30;
  const outlineCandidates = ids.filter(id => { const m = meta[id]; return m && m.L < OUTLINE_L; })
    .sort((a, b) => (meta[a].L - meta[b].L)); // 最暗的排前面
  const outlineProtected = new Set(outlineCandidates.slice(0, 3));

  // 贪心合并：每次把当前使用频次最低的颜色，合并到 Oklab 距离最近的更高频颜色
  while (ids.length > maxColors) {
    // 找频次最低且未被反差保护/描边保护的颜色
    let lowId = null;
    for (const id of ids) {
      if (contrastProtected.has(id) || outlineProtected.has(id)) continue;
      if (!lowId || counts[id] < counts[lowId]) lowId = id;
    }
    let forceMerge = false;
    if (!lowId) {
      // 所有剩余色都被保护 → 先清 feature 保护，但保留描边保护再找一次
      contrastProtected.clear();
      lowId = null;
      for (const id of ids) {
        if (outlineProtected.has(id)) continue;
        if (!lowId || counts[id] < counts[lowId]) lowId = id;
      }
      if (!lowId) {
        // 连描边色都要动 → 清掉描边保护，强制合并频次最低的
        outlineProtected.clear();
        lowId = ids[0];
        for (const id of ids) if (counts[id] < counts[lowId]) lowId = id;
      }
      forceMerge = true;
    }

    let bestId = null, bestD = Infinity;
    for (const id of ids) {
      if (id === lowId) continue;
      if (counts[id] < counts[lowId]) continue; // 只往更高频或同频的颜色合并，避免吃掉主色
      const la = labCache[lowId], lb = labCache[id];
      if (!la || !lb) continue;
      // 浅色保护：不能把"有色"合并到"极浅色"（如浅肤色合到白底），否则会在白底上"吃掉颜色"
      if (lightest.has(id) && !lightest.has(lowId) && meta[lowId] && meta[id] && meta[lowId].C > meta[id].C * 1.5) continue;
      const d = oklabDist(la, lb);
      if (d < bestD) { bestD = d; bestId = id; }
    }
    // 若找不到更高频目标（理论上不会发生），则找最近任意颜色
    if (!bestId) {
      for (const id of ids) {
        if (id === lowId) continue;
        const d = oklabDist(labCache[lowId], labCache[id]);
        if (d < bestD) { bestD = d; bestId = id; }
      }
    }
    if (!bestId) break;

    // v100-fix: 彩度保护——卡通模式要“鲜艳、突出重点”。低频次但高彩度的点缀色
    //           （如蓝眼睛、黄眼睛）不应被合并到近中性色（灰/白/黑底）里。
    //           当 lowId 明显带彩而目标很灰时，把反差保护阈值收紧，避免重点色被吃掉。
    const lowC = meta[lowId] ? meta[lowId].C : 0;
    const bestC = meta[bestId] ? meta[bestId].C : 0;
    const effectiveThreshold = (lowC > 0.07 && bestC < Math.max(0.03, lowC * 0.3))
      ? CONTRAST_THRESHOLD * 0.6
      : CONTRAST_THRESHOLD;

    // v122: 反差保护——非强制时，距离超过有效阈值 → 此色值得保护。但保护集已满(maxColors)时，
    //       让高反差新色挤出最低分旧色；仍不够则允许被合并（预算用尽）。避免撑爆触发 forceMerge 清空全部保护。
    if (!forceMerge && bestD > effectiveThreshold && !contrastProtected.has(lowId)) {
      const sLow = featScore(lowId);
      if (contrastProtected.size < maxColors) {
        contrastProtected.add(lowId);
        continue;
      }
      let minId = null, minS = Infinity;
      for (const id of contrastProtected) {
        const s = featScore(id);
        if (s < minS) { minS = s; minId = id; }
      }
      if (minId && sLow > minS) { contrastProtected.delete(minId); contrastProtected.add(lowId); continue; }
      // 否则此色仍被合并（预算用尽，无法再保）
    }

    // 更新 transitive mapping：所有指向 lowId 的实际颜色都改为指向 bestId
    for (const key in mapping) {
      if (mapping[key] === lowId) mapping[key] = bestId;
    }
    counts[bestId] += counts[lowId];
    delete counts[lowId];
    delete labCache[lowId];
    delete meta[lowId];
    ids = ids.filter(id => id !== lowId);
  }

  // 应用映射（跳过背景填充格，背景色号保持不变）
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const id = grid[y][x];
      if (id && mapping[id] !== id) {
        if (state.bgMask && state.bgMask[y][x]) continue; // 背景格不改动
        grid[y][x] = mapping[id];
      }
    }
  }
}

/* ---------- 5.6 提亮一档：色号替换为同系列更亮一档的真实色号 ---------- */
function applyBrighten(grid) {
  if (!state.brighten) return;
  var N = grid.length;
  for (var y = 0; y < N; y++) {
    for (var x = 0; x < N; x++) {
      var id = grid[y][x];
      if (!id) continue;                       // 空格不提亮
      if (state.bgMask && state.bgMask[y][x]) continue; // 背景填充格不提亮
      var brighter = BRIGHTEN_MAP[id];
      if (brighter && brighter !== id && !state.excluded.has(brighter)) {
        grid[y][x] = brighter;
      }
    }
  }
}
/* ---------- 6. 颜色排除 / 恢复 ---------- */
function nearestAvailable(id) {
  const src = PALETTE_BY_ID[id];
  if (!src) return null;
  const sLab = LAB_BY_ID[id];
  let best = null, bestD = Infinity;
  for (const c of PALETTE_LAB) {
    if (state.excluded.has(c.id) || c.id === id) continue;
    const d = oklabDist(sLab, c.lab);
    if (d < bestD) { bestD = d; best = c.id; }
  }
  return best;
}
function excludeColor(id) {
  if (state.excluded.has(id)) return;
  state.excluded.add(id);
  if (state.grid) {
    for (let y = 0; y < state.N; y++)
      for (let x = 0; x < state.N; x++)
        if (state.grid[y][x] === id) state.grid[y][x] = nearestAvailable(id);
  }
  renderAll();
}
function restoreColor(id) {
  if (!state.excluded.has(id)) return;
  state.excluded.delete(id);
  renderAll();
}

// 小程序适配层
function processImageMini(imgData, N) {
  // MVP: 简化管线 — 仅做颜色映射
  var grid = Array.from({ length: N }, function() { return new Array(N).fill(null); });
  var scale = Math.min(N / imgData.width, N / imgData.height);
  var counts = {};
  for (var y = 0; y < N; y++) {
    for (var x = 0; x < N; x++) {
      var sx = Math.floor(x / scale), sy = Math.floor(y / scale);
      if (sx >= imgData.width || sy >= imgData.height) continue;
      var i = (sy * imgData.width + sx) * 4;
      var rgb = { r: imgData.data[i], g: imgData.data[i+1], b: imgData.data[i+2] };
      if (imgData.data[i+3] < 128) continue;
      var id = mapToPalette(rgb);
      if (id) { grid[y][x] = id; counts[id] = (counts[id] || 0) + 1; }
    }
  }
  return { grid: grid, totalBeads: Object.values(counts).reduce(function(a,b){return a+b;},0), colorCount: Object.keys(counts).length };
}
module.exports = {
  PALETTE: PALETTE, PALETTE_BY_ID: PALETTE_BY_ID, PALETTE_LAB: PALETTE_LAB, LAB_BY_ID: LAB_BY_ID,
  BRAND_LABEL: BRAND_LABEL, state: state,
  hexToRgb: hexToRgb, rgbToOklab: rgbToOklab, oklabDist: oklabDist,
  mapToPalette: mapToPalette, reduceColors: reduceColors,
  buildBrightenMap: buildBrightenMap, updateBgIds: updateBgIds,
  processImageMini: processImageMini
};