#!/usr/bin/env node
/**
 * build.js — 将 src/ 源文件 + assets/ 资源 构建为单文件 dist/index.html
 * 用法: node build.js [--bump]
 *   --bump  构建前自动递增 APP_VERSION
 * 输出: dist/index.html
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
var SRC = path.join(ROOT, 'src');
var CORE = path.join(SRC, 'core');
var WEB = path.join(SRC, 'web');
var ASSETS = path.join(ROOT, 'assets');
var DIST = path.join(ROOT, 'dist');

// JS 模块加载顺序（core/ 纯算法先加载，web/ 平台绑定后加载）
var JS_MODULES = [
  { dir: CORE, file: 'init.js' },
  { dir: CORE, file: 'palette.js' },
  { dir: CORE, file: 'color.js' },
  { dir: CORE, file: 'state.js' },
  { dir: CORE, file: 'presets.js' },
  { dir: CORE, file: 'pipeline.js' },
  { dir: CORE, file: 'colors.js' },
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
  // 去掉多行注释（保留的不去：/*! ... */ 这类 license 注释本项目没有）
  code = code.replace(/\/\*[\s\S]*?\*\//g, '');
  // 去掉单行注释（整行以 // 开头的）
  code = code.replace(/^\s*\/\/.*$/gm, '');
  // 去掉多余空行（连续空行合并为一行）
  code = code.replace(/\n{3,}/g, '\n\n');
  // 去掉行尾空格
  code = code.replace(/[ \t]+$/gm, '');
  // 去掉行首空格（保留缩进结构不做处理，安全性优先）
  return code.trim();
}

function minifyCSS(code) {
  // 去掉多行注释
  code = code.replace(/\/\*[\s\S]*?\*\//g, '');
  // 去掉单行注释
  code = code.replace(/\/\/.*$/gm, '');
  // 去掉多余空行
  code = code.replace(/\n{3,}/g, '\n\n');
  // 去掉行尾空格
  code = code.replace(/[ \t]+$/gm, '');
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

// ========== 7. 构建小程序核心算法包 ==========
var MINIAPP = path.join(ROOT, 'miniapp');
var MINIAPP_CORE = path.join(MINIAPP, 'utils', 'core.js');
if (fs.existsSync(MINIAPP)) {
  var mpModules = ['color.js', 'palette.js', 'state.js', 'presets.js', 'pipeline.js', 'colors.js'];
  var mpParts = ['// 狐狸爱拼豆 小程序核心算法包 — 由 build.js 自动生成\n// 版本: ' + (verMatch ? newVer : 'N/A') + '\n'];
  for (var mi = 0; mi < mpModules.length; mi++) {
    mpParts.push(readTrim(path.join(CORE, mpModules[mi])));
  }
  // Add mini-program adapter: export functions for require()
  mpParts.push('\n// 小程序适配层');
  mpParts.push('function processImageMini(imgData, N) {');
  mpParts.push('  // MVP: 简化管线 — 仅做颜色映射');
  mpParts.push('  var grid = Array.from({ length: N }, function() { return new Array(N).fill(null); });');
  mpParts.push('  var scale = Math.min(N / imgData.width, N / imgData.height);');
  mpParts.push('  var counts = {};');
  mpParts.push('  for (var y = 0; y < N; y++) {');
  mpParts.push('    for (var x = 0; x < N; x++) {');
  mpParts.push('      var sx = Math.floor(x / scale), sy = Math.floor(y / scale);');
  mpParts.push('      if (sx >= imgData.width || sy >= imgData.height) continue;');
  mpParts.push('      var i = (sy * imgData.width + sx) * 4;');
  mpParts.push('      var rgb = { r: imgData.data[i], g: imgData.data[i+1], b: imgData.data[i+2] };');
  mpParts.push('      if (imgData.data[i+3] < 128) continue;');
  mpParts.push('      var id = mapToPalette(rgb);');
  mpParts.push('      if (id) { grid[y][x] = id; counts[id] = (counts[id] || 0) + 1; }');
  mpParts.push('    }');
  mpParts.push('  }');
  mpParts.push('  return { grid: grid, totalBeads: Object.values(counts).reduce(function(a,b){return a+b;},0), colorCount: Object.keys(counts).length };');
  mpParts.push('}');
  mpParts.push('module.exports = {');
  mpParts.push('  PALETTE: PALETTE, PALETTE_BY_ID: PALETTE_BY_ID, PALETTE_LAB: PALETTE_LAB, LAB_BY_ID: LAB_BY_ID,');
  mpParts.push('  BRAND_LABEL: BRAND_LABEL, state: state,');
  mpParts.push('  hexToRgb: hexToRgb, rgbToOklab: rgbToOklab, oklabDist: oklabDist,');
  mpParts.push('  mapToPalette: mapToPalette, reduceColors: reduceColors,');
  mpParts.push('  buildBrightenMap: buildBrightenMap, updateBgIds: updateBgIds,');
  mpParts.push('  processImageMini: processImageMini');
  mpParts.push('};');
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
