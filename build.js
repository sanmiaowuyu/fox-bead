#!/usr/bin/env node
/**
 * build.js — 将 src/ 源文件 + assets/ 资源 构建为单文件 dist/index.html
 * 用法: node build.js [--bump]
 *   --bump  构建前自动递增 APP_VERSION
 * 输出: docs/index.html
 */
var fs = require('fs');
var path = require('path');

var ROOT = __dirname;

// 版本号自增
if (process.argv.indexOf('--bump') >= 0) {
  var initPath = path.join(ROOT, 'src', 'core', 'init.js');
  var initContent = fs.readFileSync(initPath, 'utf8');
  var verMatch = initContent.match(/const APP_VERSION = '(\d+)'/);
  if (verMatch) {
    var newVer = parseInt(verMatch[1], 10) + 1;
    initContent = initContent.replace(/const APP_VERSION = '\d+'/, "const APP_VERSION = '" + newVer + "'");
    fs.writeFileSync(initPath, initContent, 'utf8');
    console.log('Version bumped: ' + verMatch[1] + ' → ' + newVer);
  }
}
// 读取当前 APP_VERSION（无论是否 bump，都注入到产物，避免小程序核心包显示 N/A）
function getAppVersion() {
  try {
    var ic = fs.readFileSync(path.join(CORE, 'init.js'), 'utf8');
    var m = ic.match(/const APP_VERSION = '(\d+)'/);
    if (m) return m[1];
  } catch (e) {}
  return 'N/A';
}
var SRC = path.join(ROOT, 'src');
var CORE = path.join(SRC, 'core');
var WEB = path.join(SRC, 'web');
var ASSETS = path.join(ROOT, 'assets');
var DIST = path.join(ROOT, 'docs');
// 读取当前 APP_VERSION（无论是否 bump，都注入产物，避免小程序核心包显示 N/A）—— 须在 CORE 定义后调用
var APP_VER = getAppVersion();

// JS 模块加载顺序（core/ 纯算法先加载，web/ 平台绑定后加载）
var JS_MODULES = [
  { dir: CORE, file: 'init.js' },
  { dir: CORE, file: 'palette.js' },
  { dir: CORE, file: 'color.js' },
  { dir: CORE, file: 'state.js' },
  { dir: CORE, file: 'image-prep.js' },
  { dir: CORE, file: 'presets.js' },
  { dir: CORE, file: 'pipeline-core.js' },
  { dir: CORE, file: 'colors.js' },
  { dir: CORE, file: 'pipeline.js' },
  { dir: WEB,  file: 'dom.js' },
  { dir: WEB,  file: 'render.js' },
  { dir: WEB,  file: 'editor.js' },
  { dir: WEB,  file: 'exporter.js' },
  { dir: WEB,  file: 'sample.js' },
  { dir: WEB,  file: 'events.js' },
  { dir: WEB,  file: 'main.js' }
];

// 需要内联为 data URI 的资源文件 → 对应的 JS 变量名
var ASSET_MAP = {
  'sample.jpg': 'SAMPLE_DATA_URI',
  'logo.jpg': 'LOGO_DATA_URI'
};

// HTML 中的占位符 → 对应资源文件
var HTML_ASSET_MAP = {
  '<!-- BUILD:FAVICON_ICO -->': 'favicon.ico',
  '<!-- BUILD:FAVICON_PNG -->': 'favicon.png',
  '<!-- BUILD:BRAND_LOGO -->': 'brand-logo.jpg'
};

function readTrim(file) {
  var content = fs.readFileSync(file, 'utf8');
  return content.replace(/\n+$/, '');
}

// ========== 1. 读取资源文件并生成 data URI ==========
function assetToDataURI(filePath) {
  var ext = path.extname(filePath).toLowerCase();
  var mime;
  if (ext === '.jpg' || ext === '.jpeg') mime = 'image/jpeg';
  else if (ext === '.png') mime = 'image/png';
  else if (ext === '.ico') mime = 'image/x-icon';
  else mime = 'application/octet-stream';
  var data = fs.readFileSync(filePath);
  return 'data:' + mime + ';base64,' + data.toString('base64');
}

var assetDeclarations = [];
for (var assetFile in ASSET_MAP) {
  var varName = ASSET_MAP[assetFile];
  var uri = assetToDataURI(path.join(ASSETS, assetFile));
  assetDeclarations.push('const ' + varName + " = '" + uri + "';");
}
var assetBlock = '/* ---------- 0. 内联资源（构建时自动生成） ---------- */\n' + assetDeclarations.join('\n') + '\n';

// ========== 2. 读取 CSS ==========
var cssContent = readTrim(path.join(WEB, 'css', 'style.css'));

// ========== 3. 拼接 JS ==========
var JS_HEADER = '/* =========================================================================\n' +
  ' * 拼豆模板生成器 · 前端逻辑\n' +
  ' * 算法参考 Zippland/perler-beads：主导色提取 + Oklab 感知距离映射 +\n' +
  ' * 区域合并(杂色清理) + 边界背景移除 + 颜色排除重映射\n' +
  ' * ========================================================================= */\n\n';

var jsParts = [JS_HEADER, assetBlock];
for (var i = 0; i < JS_MODULES.length; i++) {
  var mod = JS_MODULES[i];
  var jsContent = readTrim(path.join(mod.dir, mod.file));
  jsParts.push(jsContent);
}
var jsContent = jsParts.join('\n\n');

// ========== 4. 基础压缩 ==========
function minifyJS(code) {
  code = code.replace(/\/\*[\s\S]*?\*\//g, '');
  code = code.replace(/^\s*\/\/.*$/gm, '');
  code = code.replace(/[ \t]+$/gm, '');
  code = code.replace(/^[ \t]+/gm, '');  // 去行首缩进（JS 语义无关）
  code = code.replace(/\n{3,}/g, '\n');
  return code.trim();
}

function minifyCSS(code) {
  code = code.replace(/\/\*[\s\S]*?\*\//g, '');
  code = code.replace(/[ \t]+$/gm, '');
  code = code.replace(/^[ \t]+/gm, '');  // 去行首缩进
  code = code.replace(/\n{3,}/g, '\n');
  // 合并 { 前和 } 后的空格
  code = code.replace(/\s*\{\s*/g, '{');
  code = code.replace(/\s*\}\s*/g, '}');
  code = code.replace(/;\s*/g, ';');
  code = code.replace(/:\s*/g, ':');
  code = code.replace(/,\s*/g, ',');
  return code.trim();
}

var cssMin = minifyCSS(cssContent);
var jsMin = minifyJS(jsContent);

// ========== 5. 读取模板并替换占位符 ==========
var template = fs.readFileSync(path.join(WEB, 'template.html'), 'utf8');

// 替换 CSS 和 JS 占位符
var output = template
  .replace('/* BUILD:CSS */', cssMin)
  .replace('/* BUILD:JS */', jsMin);

// 替换 HTML 资源占位符
for (var placeholder in HTML_ASSET_MAP) {
  var assetFilePath = path.join(ASSETS, HTML_ASSET_MAP[placeholder]);
  if (fs.existsSync(assetFilePath)) {
    var dataUri = assetToDataURI(assetFilePath);
    output = output.split(placeholder).join(dataUri);
  } else {
    console.warn('WARNING: Asset not found: ' + assetFilePath);
  }
}

// ========== 6. 写入 dist/index.html ==========
if (!fs.existsSync(DIST)) fs.mkdirSync(DIST, { recursive: true });
var outPath = path.join(DIST, 'index.html');
fs.writeFileSync(outPath, output, 'utf8');

// ========== 7. 构建小程序核心算法包（单内核：直接复用 src/core/pipeline-core.js） ==========
var MINIAPP = path.join(ROOT, 'miniapp');
var MINIAPP_CORE = path.join(MINIAPP, 'utils', 'core.js');
if (fs.existsSync(MINIAPP)) {
  // 仅打包纯模块（零 document / 零 $ / 零 canvas）：算法内核与网页版完全一致 = 单内核来源（解决 P0）
  var mpModules = ['color.js', 'palette.js', 'state.js', 'image-prep.js', 'pipeline-core.js'];
  var mpParts = ['// 狐狸爱拼豆 小程序核心算法包 — 由 build.js 自动生成（单内核，与网页版共用 src/core/pipeline-core.js）\n// 版本: ' + APP_VER + '\n'];
  for (var mi = 0; mi < mpModules.length; mi++) {
    mpParts.push(readTrim(path.join(CORE, mpModules[mi])));
  }
  // 小程序适配层：processImageMini 复用同一套取色/抖动/降噪/减色/去背景算法（解决 P1），无 document 依赖（解决 P2）
  var miniAdapter = [
    '',
    '// ========== 小程序适配层 ==========',
    'function computeCropRect(w, h) {',
    '  if (!state.crop) return { sx: 0, sy: 0, sw: w, sh: h };',
    '  var side = Math.min(w, h);',
    '  return { sx: (w - side) / 2, sy: (h - side) / 2, sw: side, sh: side };',
    '}',
    'function processImageMini(imgData, N, opts) {',
    '  opts = opts || {};',
    '  state.N = N;',
    '  state.mode = opts.mode || \'average\';',
    '  state.dither = !!opts.dither;',
    '  state.cleanup = (opts.cleanup != null) ? opts.cleanup : 5;',
    '  state.maxColors = (opts.maxColors != null) ? opts.maxColors : 24;',
    '  state.removeBg = !!opts.removeBg;',
    '  state.outline = opts.outline || { on: false, strength: 50, colorId: \'H7\', thickness: 1 };',
    '  state.excluded = opts.excluded || new Set();',
    '  var cr = computeCropRect(imgData.width, imgData.height);',
    '  var scale = Math.min(N / cr.sw, N / cr.sh);',
    '  var dw = Math.max(1, Math.round(cr.sw * scale));',
    '  var dh = Math.max(1, Math.round(cr.sh * scale));',
    '  var dx = Math.floor((N - dw) / 2), dy = Math.floor((N - dh) / 2);',
    '  var cw = cr.sw / dw, ch = cr.sh / dh;',
    '  var grid = Array.from({ length: N }, function () { return new Array(N).fill(null); });',
    '  var srcRGB = Array.from({ length: N }, function () { return new Array(N).fill(null); });',
    '  for (var idx = 0; idx < N * N; idx++) {',
    '    var y = Math.floor(idx / N), x = idx % N;',
    '    if (x < dx || x >= dx + dw || y < dy || y >= dy + dh) continue;',
    '    var mx = x - dx, my = y - dy;',
    '    var x0 = Math.floor(mx * cw), y0 = Math.floor(my * ch);',
    '    var x1 = Math.max(x0 + 1, Math.floor((mx + 1) * cw));',
    '    var y1 = Math.max(y0 + 1, Math.floor((my + 1) * ch));',
    '    // 注意：必须用 sampleCellRGB 取原始 RGB，不能用 mapCell（它已经映射成色号了，再映射会得到 null）',
    '    var rgb = sampleCellRGB(imgData, x0, y0, x1, y1, state.mode);',
    '    if (rgb) { grid[y][x] = mapToPalette(rgb); srcRGB[y][x] = rgb; }',
    '  }',
    '  state.srcRGB = srcRGB;',
    '  // 同步执行完整管线（小程序端直接返回结果，不依赖 setTimeout 分帧）',
    '  if (state.dither) applyFloydSteinberg(grid, srcRGB, N);',
    '  cleanupNoise(grid, state.cleanup);',
    '  if (state.removeBg) { state.bgStatus = \'ok\'; removeBackground(grid); }',
    '  else { state.bgMask = Array.from({ length: N }, function () { return new Array(N).fill(false); }); state.bgStatus = \'\'; }',
    '  reduceColors(grid, state.maxColors);',
    '  if (state.outline.on) applyOutline(grid, state.outline.strength, state.outline.colorId, state.outline.thickness);',
    '  state.grid = grid;',
    '  var counts = {}; var total = 0;',
    '  for (var yy = 0; yy < N; yy++) for (var xx = 0; xx < N; xx++) {',
    '    var id = grid[yy][xx];',
    '    if (id != null && !(state.bgMask && state.bgMask[yy][xx])) { counts[id] = (counts[id] || 0) + 1; total++; }',
    '  }',
    '  return { grid: grid, totalBeads: total, colorCount: Object.keys(counts).length };',
    '}',
    'module.exports = {',
    '  PALETTE: PALETTE, PALETTE_BY_ID: PALETTE_BY_ID, PALETTE_LAB: PALETTE_LAB, LAB_BY_ID: LAB_BY_ID,',
    '  BRAND_LABEL: BRAND_LABEL, state: state, BRIGHTEN_MAP: BRIGHTEN_MAP, BG_WHITE_ID: BG_WHITE_ID, BG_BLACK_ID: BG_BLACK_ID,',
    '  hexToRgb: hexToRgb, rgbToOklab: rgbToOklab, oklabDist: oklabDist,',
    '  mapToPalette: mapToPalette, mapCell: mapCell, sampleCellRGB: sampleCellRGB, reduceColors: reduceColors,',
    '  buildBrightenMap: buildBrightenMap, updateBgIds: updateBgIds,',
    '  applyFloydSteinberg: applyFloydSteinberg, cleanupNoise: cleanupNoise,',
    '  removeBackground: removeBackground, applyOutline: applyOutline,',
    '  computeMaxRegion: computeMaxRegion, processImageMini: processImageMini',
    '};'
  ];
  mpParts.push(miniAdapter.join('\n'));
  fs.writeFileSync(MINIAPP_CORE, mpParts.join('\n'), 'utf8');
  console.log('Mini-app core: ' + MINIAPP_CORE + ' (' + Math.round(Buffer.byteLength(mpParts.join('\n'), 'utf8') / 1024) + ' KB)');
}

// ========== 8. 统计 ==========
var lines = output.split('\n').length;
var sizeKB = Math.round(Buffer.byteLength(output, 'utf8') / 1024);
var cssLines = cssMin.split('\n').length;
var jsLines = jsMin.split('\n').length;
console.log('Build complete: ' + outPath);
console.log('  Lines: ' + lines + ' (was ~' + (template.split('\n').length + jsContent.split('\n').length + cssContent.split('\n').length) + ' before minify)');
console.log('  Size:  ' + sizeKB + ' KB');
console.log('  CSS:   ' + cssLines + ' lines (was ' + cssContent.split('\n').length + ')');
console.log('  JS:    ' + jsLines + ' lines (was ' + jsContent.split('\n').length + ', ' + JS_MODULES.length + ' modules: ' + (JS_MODULES.filter(function(m){return m.dir===CORE}).length) + ' core + ' + (JS_MODULES.filter(function(m){return m.dir===WEB}).length) + ' web)');
console.log('  Assets: ' + Object.keys(ASSET_MAP).length + ' JS inlined, ' + Object.keys(HTML_ASSET_MAP).length + ' HTML inlined');
