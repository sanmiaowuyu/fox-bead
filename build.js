#!/usr/bin/env node
/**
 * build.js — 将 src/ 下的模块化源文件合并为单文件 index.html
 * 用法: node build.js
 * 输出: index.html (与 v139 功能一致的单文件)
 */
var fs = require('fs');
var path = require('path');

var ROOT = __dirname;
var SRC = path.join(ROOT, 'src');

// JS 模块加载顺序（严格按依赖顺序）
var JS_MODULES = [
  'init.js',
  'palette.js',
  'color.js',
  'state.js',
  'dom.js',
  'pipeline.js',
  'colors.js',
  'render.js',
  'editor.js',
  'exporter.js',
  'sample.js',
  'events.js',
  'main.js'
];

// JS 头部注释
var JS_HEADER = '/* =========================================================================\n' +
  ' * 拼豆模板生成器 · 前端逻辑\n' +
  ' * 算法参考 Zippland/perler-beads：主导色提取 + Oklab 感知距离映射 +\n' +
  ' * 区域合并(杂色清理) + 边界背景移除 + 颜色排除重映射\n' +
  ' * ========================================================================= */\n\n';

function readTrim(file) {
  var content = fs.readFileSync(file, 'utf8');
  // 去掉文件末尾多余空行，保留中间格式
  return content.replace(/\n+$/, '');
}

// 1. 读取模板
var templatePath = path.join(SRC, 'template.html');
var template = fs.readFileSync(templatePath, 'utf8');

// 2. 读取 CSS
var cssPath = path.join(SRC, 'css', 'style.css');
var cssContent = readTrim(cssPath);

// 3. 拼接 JS（按顺序）
var jsParts = [JS_HEADER];
for (var i = 0; i < JS_MODULES.length; i++) {
  var jsPath = path.join(SRC, 'js', JS_MODULES[i]);
  var jsContent = readTrim(jsPath);
  jsParts.push(jsContent);
}
var jsContent = jsParts.join('\n\n');

// 4. 替换占位符
var output = template
  .replace('/* BUILD:CSS */', cssContent)
  .replace('/* BUILD:JS */', jsContent);

// 5. 写入 index.html
var outPath = path.join(ROOT, 'index.html');
fs.writeFileSync(outPath, output, 'utf8');

// 6. 统计
var lines = output.split('\n').length;
var sizeKB = Math.round(Buffer.byteLength(output, 'utf8') / 1024);
console.log('Build complete: ' + outPath);
console.log('  Lines: ' + lines);
console.log('  Size:  ' + sizeKB + ' KB');
console.log('  CSS:   ' + cssContent.split('\n').length + ' lines');
console.log('  JS:    ' + jsContent.split('\n').length + ' lines (' + JS_MODULES.length + ' modules)');
