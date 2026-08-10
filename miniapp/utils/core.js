// 狐狸爱拼豆 小程序核心算法包 — 由 build.js 自动生成（单内核，与网页版共用 src/core/pipeline-core.js）
// 版本: 143

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
// ⑥ 多色板切换：PALETTE / PALETTE_BY_ID / PALETTE_LAB / LAB_BY_ID 改为可变，
// setActivePalette() 可整体切换为其他品牌色板（MARD_PALETTE 本身永不被改动，满足铁律 C4）。
var PALETTE = MARD_PALETTE;
var PALETTE_BY_ID = fromEntries(PALETTE.map(c => [c.id, c]));
const MARD_PALETTE_BY_ID = PALETTE_BY_ID; // 冻结的 Mard 映射，豆仓库存/补货始终按 Mard 实物统计
var PALETTE_LAB = PALETTE.map(function(c) { var o = { id: c.id, name: c.name, hex: c.hex }; o.lab = rgbToOklab(hexToRgb(c.hex)); return o; });
var LAB_BY_ID = fromEntries(PALETTE_LAB.map(c => [c.id, c.lab])); // v123: 描边边缘检测用，避免逐格 find
// 切换活动色板：list 为 [{id,name,hex}]，重建所有索引并刷新背景色号
function setActivePalette(list) {
  PALETTE = list;
  PALETTE_BY_ID = fromEntries(list.map(function (c) { return [c.id, c]; }));
  PALETTE_LAB = list.map(function (c) { var o = { id: c.id, name: c.name, hex: c.hex }; o.lab = rgbToOklab(hexToRgb(c.hex)); return o; });
  LAB_BY_ID = fromEntries(PALETTE_LAB.map(function (c) { return [c.id, c.lab]; }));
  updateBgIds();
}
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
  outline: { on: false, strength: 50, colorId: 'H7', thickness: 1 }, // v123: 像素描边（后处理）：在颜色边界描轮廓线，呈现像素插画线条感。默认关。thickness=描边宽度(格数)。
  paletteView: 'grid',   // 右侧色板清单视图：'grid' 紧凑色块 / 'list' 行列表
  showCoords: true,      // 画布预览是否显示坐标数字（左侧/底部轴）
  excluded: new Set(),   // 用户排除的颜色
  maxColors: 24,         // 最终图纸颜色数量上限（4~64），与默认真实模式一致；切模式时按预设自动调整为 8/24
  bgMask: null,          // 二维布尔数组：true=该格为背景填充（导出不画色号、不计入用料）
  bgStatus: '',           // 去背景状态反馈：''=未开启 / 'ok'=成功 / 'no_bg'=未检测到背景 / 'small'=板子太小跳过 / 'full'=主体占满
  _manualBgRGB: null,     // v140: 手动取样背景色（{r,g,b}），设置后 removeBackground 跳过自动检测直接用此色
  // v100: 编辑模式
  editMode: false,       // 编辑模式开关
  editSel: null,         // 选中的显示格子 [{gx,gy},...]（displayRect 坐标）
  editTool: 'select',    // 编辑工具：'select' 选格换色 / 'paint' 手绘刷色
  selectedColor: 'H7',   // 手绘画笔色 / 当前选中色（默认白色系）
  // 图片处理模块（通用预处理）
  originalImage: null,   // 上传原图（首次载入时记录，用于重置预处理）
  prep: { rotate: 0, flipH: false, flipV: false, brightness: 0, contrast: 0, saturation: 0 }, // 待烘焙的预处理参数
  prepBase: null,        // 图片处理面板打开时的基准图（用于取消/重置，不修改则回退到此）
  userCrop: null,        // 预处理裁切框 {sx,sy,sw,sh}（基于旋转/翻转后的预览坐标，烘焙后清空）
  // 豆仓库存（图片处理模块同级能力）：按色号记录手头豆数，对比当前图纸用量算缺口
  inventory: {},         // {colorId: stockCount} 豆仓库存，持久化 localStorage
  inventoryOpen: false,  // 豆仓弹窗是否打开
  inventoryView: 'used', // 'used' 仅列当前图纸用到的色 / 'all' 列全部 221 色
};

/* ---------- image-prep.js：图片预处理纯函数（零 DOM，web / 小程序共用） ---------- */
/* 仅做像素级亮度/对比度/饱和度调整。旋转/翻转/裁剪的栅格化在网页端 pipeline.js（canvas）完成，
   不进入小程序构建（小程序由 build.js §7 仅打包纯模块）。本文件不含任何 document/window/canvas 引用。
   兼容旧移动端：不使用 ?. / Object.fromEntries / spread。 */

function clamp255(v) { return v < 0 ? 0 : (v > 255 ? 255 : v); }

// 对 ImageData 的 data（Uint8ClampedArray）做亮度/对比度/饱和度调整，原地修改并返回。
// opt: { brightness:-100..100, contrast:-100..100, saturation:-100..100 }，0 为不变。
function adjustImageData(data, w, h, opt) {
  var brightness = opt && opt.brightness ? opt.brightness : 0;
  var contrast = opt && opt.contrast ? opt.contrast : 0;
  var saturation = opt && opt.saturation ? opt.saturation : 0;
  var b = brightness * 2.55;          // -255..255
  var c = (contrast + 100) / 100;     // 0..2（1=不变）
  var s = (saturation + 100) / 100;   // 0..2（1=不变）
  for (var i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;  // 跳过透明像素
    var r = data[i], g = data[i + 1], bl = data[i + 2];
    // 亮度
    r += b; g += b; bl += b;
    // 对比度（围绕 128）
    r = (r - 128) * c + 128;
    g = (g - 128) * c + 128;
    bl = (bl - 128) * c + 128;
    // 饱和度（围绕亮度）
    var lum = 0.299 * r + 0.587 * g + 0.114 * bl;
    r = lum + (r - lum) * s;
    g = lum + (g - lum) * s;
    bl = lum + (bl - lum) * s;
  data[i] = clamp255(r);
  data[i + 1] = clamp255(g);
  data[i + 2] = clamp255(bl);
  }
  return data;
}

/* 局部 Oklab 中位数（不依赖 pipeline-core 的 medianLab 加载顺序，避免跨文件顺序耦合） */
function _segMedianLab(labs) {
  if (!labs || !labs.length) return null;
  var n = labs.length;
  var Ls = labs.map(function (l) { return l.L; }).sort(function (a, b) { return a - b; });
  var as = labs.map(function (l) { return l.a; }).sort(function (a, b) { return a - b; });
  var bs = labs.map(function (l) { return l.b; }).sort(function (a, b) { return a - b; });
  var mid = Math.floor(n / 2);
  var pick = function (arr) { return n % 2 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2; };
  return { L: pick(Ls), a: pick(as), b: pick(bs) };
}

// 边缘羽化（抗锯齿软边）：对主体前景边缘像素按相邻背景数降低 alpha，消除硬锯齿/白边。
// 纯函数、零 DOM、兼容旧移动端（无 ?./spread）。返回同一 data（原地修改）。
function featherAlpha(data, w, h, strength) {
  if (strength == null) strength = 0.5;   // 默认=原固定强度（向后兼容）
  if (strength <= 0) return data;         // 0 = 不羽化（硬边）
  var k = strength * 2;                   // 0..2（1=标准 0.7/0.45/0.25，2=强，<1 更硬）
  var has = new Uint8Array(w * h);
  for (var i = 0; i < w * h; i++) has[i] = data[i * 4 + 3] >= 128 ? 1 : 0;
  for (var y = 0; y < h; y++) {
    for (var x = 0; x < w; x++) {
      var p = y * w + x;
      if (has[p] !== 1) continue;
      var nBg = 0;
      if (x > 0 && !has[p - 1]) nBg++;
      if (x < w - 1 && !has[p + 1]) nBg++;
      if (y > 0 && !has[p - w]) nBg++;
      if (y < h - 1 && !has[p + w]) nBg++;
      if (nBg > 0) {
        var base = nBg === 1 ? 0.7 : (nBg === 2 ? 0.45 : 0.25);
        var r = Math.pow(base, k);        // k=1→标准；k>1 更软；k<1 更硬
        data[p * 4 + 3] = Math.round(data[p * 4 + 3] * r);
      }
    }
  }
  return data;
}

// 给透明底主体图四周加透明 padding 并居中（拼豆时不贴边）。纯函数、零 DOM、兼容旧移动端。
// 返回 { data: Uint8ClampedArray, w, h }。pad<=0 原样返回。
function padAlphaImage(data, w, h, pad) {
  if (!pad || pad < 0) return { data: data, w: w, h: h };
  var nw = w + pad * 2, nh = h + pad * 2;
  var nd = new Uint8ClampedArray(nw * nh * 4);
  for (var y = 0; y < h; y++) {
    for (var x = 0; x < w; x++) {
      var si = (y * w + x) * 4;
      var di = ((y + pad) * nw + (x + pad)) * 4;
      nd[di] = data[si]; nd[di + 1] = data[si + 1]; nd[di + 2] = data[si + 2]; nd[di + 3] = data[si + 3];
    }
  }
  return { data: nd, w: nw, h: nh };
}

// 原图级多主体抠图（零 DOM，web / 小程序共用）：去背景 + 连通分量分离多个主体。
// imgData: { data: Uint8ClampedArray, width, height }（ImageData 形状）
// 返回 [{ data: Uint8ClampedArray, x, y, w, h, area }]，每张为透明背景的独立主体图（按面积降序）。
// 无模型：背景用边界 Oklab 中位数估计，前景用 4-连通分量分离；多主体 = 多个大连通分量。
// opts: { bgT?: number（背景距离阈值覆盖）, minAreaRatio?: number（最小主体占前景比例，默认 0.015） }
function segmentSubjects(imgData, opts) {
  opts = opts || {};
  var w = imgData.width, h = imgData.height;
  var data = imgData.data;
  // 1) 边界像素估计背景色（Oklab 中位数，稳健于渐变/浅水印）
  var edge = [];
  function pushEdge(px, py) {
    if (px < 0 || py < 0 || px >= w || py >= h) return;
    var i = (py * w + px) * 4;
    if (data[i + 3] < 128) return;
    edge.push(rgbToOklab({ r: data[i], g: data[i + 1], b: data[i + 2] }));
  }
  for (var x = 0; x < w; x++) { pushEdge(x, 0); pushEdge(x, h - 1); }
  for (var y = 0; y < h; y++) { pushEdge(0, y); pushEdge(w - 1, y); }
  if (!edge.length) return [];
  var bgLab = _segMedianLab(edge);
  // 背景亮度方差：纯色背景收紧阈值，杂色背景放宽
  var mL = 0; for (var k = 0; k < edge.length; k++) mL += edge[k].L; mL /= edge.length;
  var vL = 0; for (var k2 = 0; k2 < edge.length; k2++) vL += (edge[k2].L - mL) * (edge[k2].L - mL); vL = Math.sqrt(vL / edge.length);
  var BG_T;
  if (bgLab.L > 0.88 || bgLab.L < 0.18) BG_T = vL < 0.05 ? 0.07 : 0.06;
  else if (vL < 0.05) BG_T = 0.13;
  else if (vL < 0.10) BG_T = 0.11;
  else BG_T = 0.09;
  if (opts.bgT) BG_T = opts.bgT;
  // 2) 逐像素前景/背景判定（背景 → 透明）
  var isFg = new Uint8Array(w * h);
  var fgCount = 0;
  for (var yy = 0; yy < h; yy++) {
    for (var xx = 0; xx < w; xx++) {
      var idx = (yy * w + xx) * 4;
      if (data[idx + 3] < 128) { isFg[yy * w + xx] = 0; continue; }
      // ④ 保护笔刷：用户标记为强制前景的像素，自动抠图绝不误删（解决白猫脸/白衣物被当背景）
      if (opts.protect && opts.protect[yy * w + xx]) { isFg[yy * w + xx] = 1; fgCount++; continue; }
      var lab = rgbToOklab({ r: data[idx], g: data[idx + 1], b: data[idx + 2] });
      if (oklabDist(lab, bgLab) < BG_T) isFg[yy * w + xx] = 0;
      else { isFg[yy * w + xx] = 1; fgCount++; }
    }
  }
  if (fgCount === 0) return [];
  // 3) 4-连通分量（每个大连通分量 = 一个主体）
  var label = new Int32Array(w * h); label.fill(-1);
  var comps = [];
  var stack = [];
  var curLabel = 0;
  function tryNb(nb) {
    if (isFg[nb] === 1 && label[nb] === -1) { label[nb] = curLabel; stack.push(nb); }
  }
  for (var p = 0; p < w * h; p++) {
    if (isFg[p] !== 1 || label[p] !== -1) continue;
    var comp = { pixels: [], minX: w, minY: h, maxX: -1, maxY: -1, area: 0 };
    stack.length = 0; stack.push(p); label[p] = curLabel;
    while (stack.length) {
      var cur = stack.pop();
      var cy = (cur / w) | 0, cx = cur % w;
      comp.pixels.push(cur);
      if (cx < comp.minX) comp.minX = cx;
      if (cx > comp.maxX) comp.maxX = cx;
      if (cy < comp.minY) comp.minY = cy;
      if (cy > comp.maxY) comp.maxY = cy;
      if (cx > 0) tryNb(cur - 1);
      if (cx < w - 1) tryNb(cur + 1);
      if (cy > 0) tryNb(cur - w);
      if (cy < h - 1) tryNb(cur + w);
    }
    comp.area = comp.pixels.length;
    comps.push(comp);
    curLabel++;
  }
  // 4) 过滤小噪点（面积 < 前景比例阈值视为杂色）
  var minArea = Math.max(64, Math.round(fgCount * 0.015));
  if (opts.minAreaRatio) minArea = Math.max(1, Math.round(fgCount * opts.minAreaRatio));
  var keep = [];
  for (var ci = 0; ci < comps.length; ci++) if (comps[ci].area >= minArea) keep.push(comps[ci]);
  if (!keep.length && comps.length) {
    var minC = comps[0];
    for (var cj = 1; cj < comps.length; cj++) if (comps[cj].area < minC.area) minC = comps[cj];
    minArea = minC.area;
    for (var ck = 0; ck < comps.length; ck++) if (comps[ck].area >= minArea) keep.push(comps[ck]);
  }
  keep.sort(function (a, b) { return b.area - a.area; });
  // 5) 输出每张主体图（透明背景）
  var out = [];
  for (var ki = 0; ki < keep.length; ki++) {
    var c = keep[ki];
    var cw = c.maxX - c.minX + 1, ch = c.maxY - c.minY + 1;
    var cdata = new Uint8ClampedArray(cw * ch * 4);
    for (var pi = 0; pi < c.pixels.length; pi++) {
      var pp = c.pixels[pi];
      var py = (pp / w) | 0, px = pp % w;
      var si = pp * 4;
      var di = ((py - c.minY) * cw + (px - c.minX)) * 4;
      cdata[di] = data[si]; cdata[di + 1] = data[si + 1]; cdata[di + 2] = data[si + 2]; cdata[di + 3] = data[si + 3];
    }
    featherAlpha(cdata, cw, ch, opts.feather); // 边缘羽化（强度可调），消除硬锯齿/白边
    out.push({ data: cdata, x: c.minX, y: c.minY, w: cw, h: ch, area: c.area });
  }
  return out;
}
/* ---------- 5. 图片处理管线（纯算法内核，零 DOM 依赖，web / 小程序共用） ---------- */
/* 本文件不含任何 document / window / canvas 引用，可由 build.js 同时打入网页版与小程序版。
   平台相关的像素获取在 web 端由 src/web 的 canvas 完成，小程序端由 processImageMini 直接消费 ImageData。 */

function getCropRect(w, h) {
  if (!state.crop) return { sx: 0, sy: 0, sw: w, sh: h };
  var side = Math.min(w, h);
  return { sx: (w - side) / 2, sy: (h - side) / 2, sw: side, sh: side };
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

// 真实模式专用：饱和度加权均值（区域权重识别法，v81）
const REAL_SAT_ALPHA = 15.0; // 饱和度权重强度
const REAL_LUM_THRESHOLD = 0.9; // 亮度保护阈值
function satWeightedAverage(data, w, x0, y0, x1, y1, alpha) {
  let r = 0, g = 0, b = 0, wsum = 0;
  for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) {
    const i = (yy * w + xx) * 4;
    if (data[i + 3] < 128) continue; // 跳过透明
    const cr = data[i], cg = data[i + 1], cb = data[i + 2];
    const max = Math.max(cr, cg, cb), min = Math.min(cr, cg, cb);
    const sat = max === 0 ? 0 : (max - min) / max; // 0~1 纯度
    let wt = 1 + alpha * sat;
    wt = wt * wt; // 非线性平方，让小面积高饱和特征更突出
    const lum = (0.299 * cr + 0.587 * cg + 0.114 * cb) / 255;
    if (lum > REAL_LUM_THRESHOLD) wt += alpha * (lum - REAL_LUM_THRESHOLD) * 10;
    r += cr * wt; g += cg * wt; b += cb * wt; wsum += wt;
  }
  if (wsum === 0) return null;
  return { r: Math.round(r / wsum), g: Math.round(g / wsum), b: Math.round(b / wsum) };
}

// 单个格子原始取色：根据模式用众数(卡通)或饱和均值(真实)，返回 {r,g,b} 或 null
// 网页端 _processChunk 与小程序端 processImageMini 共用此采样器，保证双端取色完全一致
function sampleCellRGB(sd, x0, y0, x1, y1, mode) {
  return (mode === 'average')
    ? satWeightedAverage(sd.data, sd.width, x0, y0, x1, y1, REAL_SAT_ALPHA)
    : dominantColor(sd.data, sd.width, sd.height, x0, y0, x1, y1, true);
}

// 单个格子取色并映射：返回调色板色号或 null
function mapCell(sd, x0, y0, x1, y1, mode) {
  const rgb = sampleCellRGB(sd, x0, y0, x1, y1, mode);
  return rgb ? mapToPalette(rgb) : null;
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
    var rgb = sampleCellRGB(sd, x0, y0, x1, y1, state.mode);
    grid[y][x] = rgb ? mapToPalette(rgb) : null;
  }
  if (endIdx < N * N) {
    setTimeout(function() { _processChunk(N, grid, sd, cr, dx, dy, dw, dh, cw, ch, endIdx, onDone); }, 0);
  } else {
    onDone();
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

function _finishPipeline(grid, N, onDone) {
  // v140: Floyd-Steinberg 抖动（在降噪之前，利用原图 RGB 信息）
  if (state.dither) {
    if (N <= 78) {
      applyFloydSteinberg(grid, state.srcRGB, N);
      _finishAfter(grid, N);
      if (onDone) onDone();
    } else {
      applyFloydSteinbergAsync(grid, state.srcRGB, N, function() {
        _finishAfter(grid, N);
        if (onDone) onDone();
      });
      return; // async, _finishAfter 稍后调用
    }
  }
  _finishAfter(grid, N);
  if (onDone) onDone();
}
function _finishAfter(grid, N) {
  // 清理去噪：清理强度随板子自动调低——小板每格覆盖更大图区、细节更珍贵，
  // 设天花板防止过度清理吃掉细节；大板可稍激进（仅当用户设值高于天花板时才生效）
  var cleanupCap = N <= 40 ? 30 : (N <= 80 ? 55 : 80);
  cleanupNoise(grid, Math.min(state.cleanup, cleanupCap));
  // 去背景：默认关闭。关掉时整张图都参与拼豆，白色主体也正常标色号；
  // 只有用户明确要抠纯色背景时才在 UI 打开「自动去背景」。
  if (state.removeBg) {
    state.bgStatus = 'ok'; // will be overwritten if a gate fails
    removeBackground(grid);
  } else {
    state.bgMask = Array.from({ length: N }, () => new Array(N).fill(false));
    state.bgStatus = '';
  }
  // 颜色数量上限：合并肉眼难分的相近色
  reduceColors(grid, state.maxColors);
  // v123: 像素描边（后处理）
  if (state.outline.on) applyOutline(grid, state.outline.strength, state.outline.colorId);
  state.grid = grid;
  // 图片实际覆盖的有效格子数
  let eminX = N, eminY = N, emaxX = -1, emaxY = -1;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const id = grid[y][x];
      if (id == null) continue;
      if (state.bgMask && state.bgMask[y][x]) continue;
      if (x < eminX) eminX = x;
      if (x > emaxX) emaxX = x;
      if (y < eminY) eminY = y;
      if (y > emaxY) emaxY = y;
    }
  }
  state.effective = emaxX < 0 ? { cols: 0, rows: 0, minX: 0, minY: 0, maxX: 0, maxY: 0 } : { cols: emaxX - eminX + 1, rows: emaxY - eminY + 1, minX: eminX, minY: eminY, maxX: emaxX, maxY: emaxY };
  // v98: 软裁——计算主体边界 subject
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
    if (bgMax < 3) return state.effective;
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
    var sArea = (sMaxX - sMinX + 1) * (sMaxY - sMinY + 1);
    var eArea = (emaxX - eminX + 1) * (emaxY - eminY + 1);
    if (sArea < eArea * 0.5) return state.effective;
    return { cols: sMaxX - sMinX + 1, rows: sMaxY - sMinY + 1, minX: sMinX, minY: sMinY, maxX: sMaxX, maxY: sMaxY };
  })();
  // v128: 始终把「四周留白」标记为背景
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
  // v100: 固定裁剪布局——导出图/预览统一为 (N-4)×(N-4) 正方形
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
// v123: 像素描边（后处理）
function applyOutline(grid, strength, colorId, thickness) {
  if (!colorId || !LAB_BY_ID[colorId]) return;
  if (!thickness || thickness < 1) thickness = 1;
  const N = grid.length;
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
        if (!nlab) { isEdge = true; break; }
        if (oklabDist(cur, nlab) > thr) { isEdge = true; break; }
      }
      if (isEdge) edge[y * N + x] = 1;
    }
  }
  // 描边粗细：在边缘像素基础上膨胀 (thickness-1) 圈，使轮廓更宽更醒目（thickness=1 等同原单格描边）
  let curEdge = edge;
  for (let t = 1; t < thickness; t++) {
    const next = new Uint8Array(N * N);
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        if (curEdge[y * N + x]) { next[y * N + x] = 1; continue; }
        let hit = false;
        const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        for (let k = 0; k < 4; k++) {
          const nx = x + nb[k][0], ny = y + nb[k][1];
          if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
          if (curEdge[ny * N + nx]) { hit = true; break; }
        }
        if (hit) next[y * N + x] = 1;
      }
    }
    curEdge = next;
  }
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (curEdge[y * N + x]) grid[y][x] = colorId;
  }
}
// v(本版): 取一组 Oklab 各通道中位数（对离群边缘像素稳健，适合估计背景主色）
function medianLab(labs) {
  if (!labs || !labs.length) return null;
  var n = labs.length;
  var Ls = labs.map(function (l) { return l.L; }).sort(function (a, b) { return a - b; });
  var as = labs.map(function (l) { return l.a; }).sort(function (a, b) { return a - b; });
  var bs = labs.map(function (l) { return l.b; }).sort(function (a, b) { return a - b; });
  var mid = Math.floor(n / 2);
  var pick = function (arr) { return n % 2 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2; };
  return { L: pick(Ls), a: pick(as), b: pick(bs) };
}

function removeBackground(grid = state.grid) {
  if (!grid || !state.srcRGB) return;
  const N = grid.length;
  const srcRGB = state.srcRGB;
  // v139: 中位数亮度自动判断背景亮/暗；用户可用 bgMode 覆盖。
  state.bgMask = Array.from({ length: N }, () => new Array(N).fill(false));
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
  if (maxX < 0) return;
  const boundary = [];
  const acc = (x, y) => { const s = srcRGB[y][x]; if (s) boundary.push(s); };
  for (let x = minX; x <= maxX; x++) { acc(x, minY); acc(x, maxY); }
  for (let y = minY; y <= maxY; y++) { acc(minX, y); acc(maxX, y); }
  if (!boundary.length) return;
  const sorted = boundary.slice().sort((a, b) => (a.r + a.g + a.b) - (b.r + b.g + b.b));
  const mid = sorted[Math.floor(sorted.length / 2)];
  // v(本版): 边界 Oklab 各通道中位数 作为背景色估计——比"RGB 中点"更鲁棒：
  // 渐变/浅水印/轻微杂色背景下，中位数≈代表性背景色，不受个别离群边缘像素干扰；
  // 同时与下方 flood/edge-contrast 门逻辑解耦，不动种子/安全逻辑。
  const topLabs = boundary.map(s => rgbToOklab(s));
  const bgLab = medianLab(topLabs);
  // 自动判断背景极性（基于边界中位数亮度），除非用户取样色与边界极性一致才尊重取样
  var autoDark = bgLab.L <= 0.5;
  var manualBg = state._manualBgRGB;
  if (manualBg) {
    var manualLab = rgbToOklab(manualBg);
    var manualDark = manualLab.L <= 0.5;
    // 取样色与边界极性一致 → 用取样精确色（尊重用户）；极性相反(如取白但图是黑底) → 回退自动，避免清不掉
    if (manualDark === autoDark) {
      bgColorId = mapToPalette(manualBg);
    } else {
      bgColorId = autoDark ? BG_BLACK_ID : BG_WHITE_ID;
    }
    state._manualBgRGB = null;
  } else {
    bgColorId = autoDark ? BG_BLACK_ID : BG_WHITE_ID;
  }
  if (bgColorId == null) return;
  const topLab = topLabs;
  let mL = 0;
  for (var ti = 0; ti < topLab.length; ti++) mL += topLab[ti].L;
  mL /= topLab.length;
  let vL = 0;
  for (var tj = 0; tj < topLab.length; tj++) vL += (topLab[tj].L - mL) * (topLab[tj].L - mL);
  vL = Math.sqrt(vL / topLab.length);
  var midL = bgLab.L;
  var mainGate = ((mL > 0.86 || mL < 0.35) && vL < 0.15) ||
                 ((midL > 0.88 || midL < 0.30) && vL < 0.18);
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
      cornerGate = ((cmL > 0.90 || cmL < 0.22) && cvL < 0.08);
      if (cornerGate) {
        var bestCornerL = cmL > 0.5 ? 0 : 1;
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
  if (!mainGate && !cornerGate && !manualBg) {
    state.bgStatus = 'no_bg';
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (grid[y][x] == null) grid[y][x] = bgColorId;
      }
    }
    return;
  }
  if (N <= 52) {
    state.bgStatus = 'small';
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (grid[y][x] == null) grid[y][x] = bgColorId;
      }
    }
    return;
  }
  // 背景距离阈值：白底/黑底时浅色主体(白猫脸/黑衣物)易被误删，收紧阈值只清真正接近背景的像素；
  // 中性灰底或背景带杂色时保持较宽松阈值以清除更多背景
  var BG_T;
  if (bgLab.L > 0.88 || bgLab.L < 0.18) {
    BG_T = vL < 0.05 ? 0.06 : 0.05;
  } else if (vL < 0.05) BG_T = 0.12;
  else if (vL < 0.10) BG_T = 0.10;
  else BG_T = 0.08;
  const isBg = (x, y) => {
    if (grid[y][x] == null) return false;
    const s = srcRGB[y][x];
    if (!s) return false;
    return oklabDist(rgbToOklab(s), bgLab) < BG_T;
  };
  const DILATE_R = 2;
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
        cover[y][x] = true;
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
  const EDGE_T = 42;
  const edgeBetween = (x1, y1, x2, y2) => {
    const a = srcRGB[y1] && srcRGB[y1][x1], b = srcRGB[y2] && srcRGB[y2][x2];
    if (!a || !b) return 0;
    const dr = a.r - b.r, dg = a.g - b.g, db = a.b - b.b;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  };
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
    if (edgeBetween(fx, fy, x, y) > EDGE_T) return;
    visited[y][x] = true; queue.push([x, y]);
  };
  for (let x = 0; x < N; x++) { seed(x, 0); seed(x, N - 1); }
  for (let y = 0; y < N; y++) { seed(0, y); seed(N - 1, y); }
  while (queue.length) {
    const [x, y] = queue.pop();
    toFill.push([x, y]);
    step(x, y, x - 1, y); step(x, y, x + 1, y);
    step(x, y, x, y - 1); step(x, y, x, y + 1);
  }
  var gateConfident = (mL > 0.95 && vL < 0.05) || (mL < 0.08 && vL < 0.05) ||
                      (midL > 0.95 && vL < 0.06) || (midL < 0.06 && vL < 0.06);
  var safetyLimit = gateConfident ? 0.98 : 0.85;
  if (nonNull && toFill.length / nonNull > safetyLimit) { state.bgStatus = 'full'; return; }
  for (const [x, y] of toFill) { grid[y][x] = bgColorId; state.bgMask[y][x] = true; }
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
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (grid[y][x] == null) grid[y][x] = bgColorId;
    }
  }
  fillEnclosedHoles(grid);
}
function fillEnclosedHoles(grid) {
  if (!grid || !state.bgMask) return;
  const N = grid.length;
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
      if (touchesBorder) continue;
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
      if (fillId == null) continue;
      for (const [cx, cy] of cells) {
        grid[cy][cx] = fillId;
        state.bgMask[cy][cx] = false;
      }
    }
  }
}
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
  const counts = {};
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const id = grid[y][x];
      if (id == null) continue;
      if (state.bgMask && state.bgMask[y][x]) continue;
      counts[id] = (counts[id] || 0) + 1;
    }
  }
  let ids = Object.keys(counts);
  if (ids.length <= maxColors) return;
  const mapping = {};
  for (const id of ids) mapping[id] = id;
  const labOf = id => LAB_BY_ID[id] || null;
  const labCache = {};
  const meta = {};
  for (const id of ids) {
    const lab = labOf(id);
    labCache[id] = lab;
    if (lab) meta[id] = { L: lab.L, C: Math.sqrt(lab.a * lab.a + lab.b * lab.b) };
  }
  const lightest = new Set(ids.slice().sort((a, b) => ((meta[b] && meta[b].L) || 0) - ((meta[a] && meta[a].L) || 0)).slice(0, Math.max(3, Math.ceil(ids.length * 0.15))));
  const CONTRAST_THRESHOLD = 0.12;
  const contrastProtected = new Set();
  const regionSize = computeMaxRegion(grid, state.bgMask);
  const MIN_FEATURE = 2;
  for (const id of ids) {
    if ((regionSize[id] || 0) >= MIN_FEATURE) contrastProtected.add(id);
  }
  const featScore = (id) => counts[id] * (1 + 4 * Math.min(1, (meta[id] && meta[id].C) || 0) / 0.1);
  if (contrastProtected.size > maxColors) {
    var ranked = Array.from(contrastProtected).sort(function(a, b) { return featScore(b) - featScore(a); }).slice(0, maxColors);
    contrastProtected.clear();
    for (const id of ranked) contrastProtected.add(id);
  }
  const OUTLINE_L = 0.30;
  const outlineCandidates = ids.filter(id => { const m = meta[id]; return m && m.L < OUTLINE_L; })
    .sort((a, b) => (meta[a].L - meta[b].L));
  const outlineProtected = new Set(outlineCandidates.slice(0, 3));
  while (ids.length > maxColors) {
    let lowId = null;
    for (const id of ids) {
      if (contrastProtected.has(id) || outlineProtected.has(id)) continue;
      if (!lowId || counts[id] < counts[lowId]) lowId = id;
    }
    let forceMerge = false;
    if (!lowId) {
      contrastProtected.clear();
      lowId = null;
      for (const id of ids) {
        if (outlineProtected.has(id)) continue;
        if (!lowId || counts[id] < counts[lowId]) lowId = id;
      }
      if (!lowId) {
        outlineProtected.clear();
        lowId = ids[0];
        for (const id of ids) if (counts[id] < counts[lowId]) lowId = id;
      }
      forceMerge = true;
    }
    let bestId = null, bestD = Infinity;
    for (const id of ids) {
      if (id === lowId) continue;
      if (counts[id] < counts[lowId]) continue;
      const la = labCache[lowId], lb = labCache[id];
      if (!la || !lb) continue;
      if (lightest.has(id) && !lightest.has(lowId) && meta[lowId] && meta[id] && meta[lowId].C > meta[id].C * 1.5) continue;
      const d = oklabDist(la, lb);
      if (d < bestD) { bestD = d; bestId = id; }
    }
    if (!bestId) {
      for (const id of ids) {
        if (id === lowId) continue;
        const d = oklabDist(labCache[lowId], labCache[id]);
        if (d < bestD) { bestD = d; bestId = id; }
      }
    }
    if (!bestId) break;
    const lowC = meta[lowId] ? meta[lowId].C : 0;
    const bestC = meta[bestId] ? meta[bestId].C : 0;
    const effectiveThreshold = (lowC > 0.07 && bestC < Math.max(0.03, lowC * 0.3))
      ? CONTRAST_THRESHOLD * 0.6
      : CONTRAST_THRESHOLD;
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
    }
    for (const key in mapping) {
      if (mapping[key] === lowId) mapping[key] = bestId;
    }
    counts[bestId] += counts[lowId];
    delete counts[lowId];
    delete labCache[lowId];
    delete meta[lowId];
    ids = ids.filter(id => id !== lowId);
  }
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const id = grid[y][x];
      if (id && mapping[id] !== id) {
        if (state.bgMask && state.bgMask[y][x]) continue;
        grid[y][x] = mapping[id];
      }
    }
  }
}

// ========== 小程序适配层 ==========
function computeCropRect(w, h) {
  if (!state.crop) return { sx: 0, sy: 0, sw: w, sh: h };
  var side = Math.min(w, h);
  return { sx: (w - side) / 2, sy: (h - side) / 2, sw: side, sh: side };
}
function processImageMini(imgData, N, opts) {
  opts = opts || {};
  state.N = N;
  state.mode = opts.mode || 'average';
  state.dither = !!opts.dither;
  state.cleanup = (opts.cleanup != null) ? opts.cleanup : 5;
  state.maxColors = (opts.maxColors != null) ? opts.maxColors : 24;
  state.removeBg = !!opts.removeBg;
  state.outline = opts.outline || { on: false, strength: 50, colorId: 'H7', thickness: 1 };
  state.excluded = opts.excluded || new Set();
  var cr = computeCropRect(imgData.width, imgData.height);
  var scale = Math.min(N / cr.sw, N / cr.sh);
  var dw = Math.max(1, Math.round(cr.sw * scale));
  var dh = Math.max(1, Math.round(cr.sh * scale));
  var dx = Math.floor((N - dw) / 2), dy = Math.floor((N - dh) / 2);
  var cw = cr.sw / dw, ch = cr.sh / dh;
  var grid = Array.from({ length: N }, function () { return new Array(N).fill(null); });
  var srcRGB = Array.from({ length: N }, function () { return new Array(N).fill(null); });
  for (var idx = 0; idx < N * N; idx++) {
    var y = Math.floor(idx / N), x = idx % N;
    if (x < dx || x >= dx + dw || y < dy || y >= dy + dh) continue;
    var mx = x - dx, my = y - dy;
    var x0 = Math.floor(mx * cw), y0 = Math.floor(my * ch);
    var x1 = Math.max(x0 + 1, Math.floor((mx + 1) * cw));
    var y1 = Math.max(y0 + 1, Math.floor((my + 1) * ch));
    // 注意：必须用 sampleCellRGB 取原始 RGB，不能用 mapCell（它已经映射成色号了，再映射会得到 null）
    var rgb = sampleCellRGB(imgData, x0, y0, x1, y1, state.mode);
    if (rgb) { grid[y][x] = mapToPalette(rgb); srcRGB[y][x] = rgb; }
  }
  state.srcRGB = srcRGB;
  // 同步执行完整管线（小程序端直接返回结果，不依赖 setTimeout 分帧）
  if (state.dither) applyFloydSteinberg(grid, srcRGB, N);
  cleanupNoise(grid, state.cleanup);
  if (state.removeBg) { state.bgStatus = 'ok'; removeBackground(grid); }
  else { state.bgMask = Array.from({ length: N }, function () { return new Array(N).fill(false); }); state.bgStatus = ''; }
  reduceColors(grid, state.maxColors);
  if (state.outline.on) applyOutline(grid, state.outline.strength, state.outline.colorId, state.outline.thickness);
  state.grid = grid;
  var counts = {}; var total = 0;
  for (var yy = 0; yy < N; yy++) for (var xx = 0; xx < N; xx++) {
    var id = grid[yy][xx];
    if (id != null && !(state.bgMask && state.bgMask[yy][xx])) { counts[id] = (counts[id] || 0) + 1; total++; }
  }
  return { grid: grid, totalBeads: total, colorCount: Object.keys(counts).length };
}
module.exports = {
  PALETTE: PALETTE, PALETTE_BY_ID: PALETTE_BY_ID, PALETTE_LAB: PALETTE_LAB, LAB_BY_ID: LAB_BY_ID,
  BRAND_LABEL: BRAND_LABEL, state: state, BRIGHTEN_MAP: BRIGHTEN_MAP, BG_WHITE_ID: BG_WHITE_ID, BG_BLACK_ID: BG_BLACK_ID,
  hexToRgb: hexToRgb, rgbToOklab: rgbToOklab, oklabDist: oklabDist,
  mapToPalette: mapToPalette, mapCell: mapCell, sampleCellRGB: sampleCellRGB, reduceColors: reduceColors,
  buildBrightenMap: buildBrightenMap, updateBgIds: updateBgIds,
  applyFloydSteinberg: applyFloydSteinberg, cleanupNoise: cleanupNoise,
  removeBackground: removeBackground, applyOutline: applyOutline,
  computeMaxRegion: computeMaxRegion, processImageMini: processImageMini
};