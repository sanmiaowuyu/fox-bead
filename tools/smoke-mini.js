/* 纯 Node 环境冒烟测试：验证小程序内核在无 document / window / canvas 下可完整跑通
   用法: node tools/smoke-mini.js                                    */
var path = require('path');
var core = require(path.join(__dirname, '..', 'miniapp', 'utils', 'core.js'));

var failed = 0;
function ok(name, cond, extra) {
  console.log((cond ? 'PASS  ' : 'FAIL  ') + name + (extra ? '  -> ' + extra : ''));
  if (!cond) failed++;
}

console.log('--- 1. 调色板完整性 ---');
ok('PALETTE 为数组', Array.isArray(core.PALETTE), 'len=' + (core.PALETTE ? core.PALETTE.length : 'n/a'));
ok('PALETTE 数量 221', core.PALETTE.length === 221, String(core.PALETTE.length));
ok('PALETTE_BY_ID 索引完整', Object.keys(core.PALETTE_BY_ID).length === core.PALETTE.length);
ok('PALETTE_LAB 预算完整', core.PALETTE_LAB.length === core.PALETTE.length);

console.log('--- 2. 关键导出 ---');
var need = ['hexToRgb', 'rgbToOklab', 'oklabDist', 'mapToPalette', 'mapCell', 'reduceColors',
            'applyFloydSteinberg', 'cleanupNoise', 'removeBackground', 'applyOutline',
            'applyBrighten', 'computeMaxRegion', 'processImageMini', 'state'];
var missing = [];
for (var k = 0; k < need.length; k++) {
  if (typeof core[need[k]] === 'undefined') missing.push(need[k]);
}
ok('全部关键导出存在 (' + need.length + ' 项)', missing.length === 0, missing.join(','));

console.log('--- 3. 色彩换算自检 ---');
var rgb = core.hexToRgb('#FF0000');
ok('hexToRgb(#FF0000) -> {r,g,b}', rgb.r === 255 && rgb.g === 0 && rgb.b === 0, JSON.stringify(rgb));
var lab = core.rgbToOklab(rgb);
ok('rgbToOklab 返回 {L,a,b}',
   typeof lab.L === 'number' && typeof lab.a === 'number' && typeof lab.b === 'number',
   'L=' + lab.L.toFixed(4) + ' a=' + lab.a.toFixed(4) + ' b=' + lab.b.toFixed(4));
ok('纯红 Oklab a 分量为正(偏暖)', lab.a > 0, lab.a.toFixed(4));
ok('oklabDist 自距为 0', core.oklabDist(lab, lab) < 1e-9);
var nearRed = core.mapToPalette({ r: 254, g: 2, b: 2 });
ok('mapToPalette 返回合法色号', !!core.PALETTE_BY_ID[nearRed],
   nearRed + ' = ' + (core.PALETTE_BY_ID[nearRed] ? core.PALETTE_BY_ID[nearRed].hex : '?'));

console.log('--- 4. 采样器一致性 ---');
// sampleCellRGB 必须返回原始 RGB 对象；mapCell 必须返回色号字符串。
// 二者混用会导致「双重映射」——历史上真出过这个 bug，此断言用于永久防回归。
var W = 64, H = 64;
function makeImage(painter) {
  var d = new Uint8ClampedArray(W * H * 4);
  for (var y = 0; y < H; y++) {
    for (var x = 0; x < W; x++) {
      var c = painter(x, y), i = (y * W + x) * 4;
      d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
    }
  }
  return { width: W, height: H, data: d };
}
// 白底 + 居中红色圆盘（真实素材形态：主体不贴边，可被背景去除正确处理）
var CX = 32, CY = 32, R = 20;
var circleImg = makeImage(function (x, y) {
  var dx = x - CX, dy = y - CY;
  return (dx * dx + dy * dy <= R * R) ? [220, 30, 30] : [250, 250, 250];
});

var rawRGB = core.sampleCellRGB(circleImg, 30, 30, 34, 34, 'average');
ok('sampleCellRGB 返回原始 {r,g,b}',
   rawRGB && typeof rawRGB.r === 'number' && typeof rawRGB.g === 'number' && typeof rawRGB.b === 'number',
   JSON.stringify(rawRGB));
var mappedId = core.mapCell(circleImg, 30, 30, 34, 34, 'average');
ok('mapCell 返回色号字符串', typeof mappedId === 'string' && !!core.PALETTE_BY_ID[mappedId], String(mappedId));
ok('mapCell 结果 == mapToPalette(sampleCellRGB)', mappedId === core.mapToPalette(rawRGB));

console.log('--- 5. 完整流水线 (白底居中圆 64x64 -> 32x32) ---');
core.state.sourceImage = { width: W, height: H };

function runCase(label, opts, expect, N) {
  N = N || 32;
  var t0 = Date.now();
  var r = core.processImageMini(circleImg, N, opts);
  var dt = Date.now() - t0;
  ok(label + ' 有返回', !!r);
  if (!r) return null;
  ok(label + ' grid ' + N + 'x' + N, r.grid.length === N && r.grid[0].length === N,
     r.grid.length + 'x' + r.grid[0].length);
  ok(label + ' 珠数 > 0', r.totalBeads > 0, 'beads=' + r.totalBeads);
  ok(label + ' 用色 1~221', r.colorCount >= 1 && r.colorCount <= 221, 'colors=' + r.colorCount);
  var bad = 0, sample = '';
  for (var yy = 0; yy < N; yy++) for (var xx = 0; xx < N; xx++) {
    var id = r.grid[yy][xx];
    if (id === null || id === undefined) continue;
    if (!core.PALETTE_BY_ID[id]) { bad++; if (!sample) sample = String(id); }
  }
  ok(label + ' 色号全合法', bad === 0, bad ? ('非法=' + bad + ' 示例=' + sample) : '');
  if (expect) expect(r);
  console.log('      ' + label + ': ' + dt + 'ms, 珠数 ' + r.totalBeads + ', 用色 ' + r.colorCount);
  return r;
}

var base = runCase('默认', {});
runCase('抖动', { dither: true });
runCase('减色到4', { maxColors: 4 }, function (r) {
  ok('减色生效 colorCount<=4', r.colorCount <= 4, 'colors=' + r.colorCount);
});
runCase('描边', { outline: { on: true, strength: 50, colorId: 'H7' } });
runCase('提亮', { brighten: true });

// 去背景：算法设计上仅在 N > 52 时真正剔除背景（N<=52 走 'small' 分支保留背景），故用 N=64 验证
var base64 = runCase('N64默认', {}, null, 64);
runCase('N64去背景', { removeBg: true }, function (r) {
  ok('  去背景后珠数显著减少', base64 && r.totalBeads < base64.totalBeads * 0.9,
     (base64 ? base64.totalBeads : '?') + ' -> ' + r.totalBeads);
  ok('  去背景后仍保留主体(>500珠)', r.totalBeads > 500, 'beads=' + r.totalBeads);
  ok('  bgStatus 为 ok', core.state.bgStatus === 'ok', String(core.state.bgStatus));
}, 64);
runCase('N32去背景(设计上跳过)', { removeBg: true }, function (r) {
  ok('  N<=52 走 small 分支保留背景', core.state.bgStatus === 'small', String(core.state.bgStatus));
}, 32);

runCase('全开', { dither: true, removeBg: true, brighten: true, maxColors: 12,
                  outline: { on: true, strength: 60, colorId: 'H7' } }, null, 64);

console.log('--- 7. 去背景增强回归 (黑底识别 / 浅主体保护) ---');
// 7a. 黑底居中红圆：验证纯黑底也能正确识别并去除（改动 A）
var blackBg = makeImage(function (x, y) {
  var dx = x - CX, dy = y - CY;
  return (dx * dx + dy * dy <= R * R) ? [220, 30, 30] : [12, 12, 12];
});
core.state.sourceImage = { width: W, height: H };
var rb = core.processImageMini(blackBg, 64, { removeBg: true });
ok('黑底图去背景 bgStatus=ok', core.state.bgStatus === 'ok', String(core.state.bgStatus));
ok('黑底图去背景生效(珠数<全图90%)', rb.totalBeads < 64 * 64 * 0.9, 'beads=' + rb.totalBeads);
ok('黑底图去背景保留主体(>500珠)', rb.totalBeads > 500, 'beads=' + rb.totalBeads);

// 7b. 逆极性取样：图是黑底但用户误取白底 —— 必须回退自动识别，不能清不掉（改动 A 核心回归）
core.state._manualBgRGB = { r: 250, g: 250, b: 250 };
var rb2 = core.processImageMini(blackBg, 64, { removeBg: true });
ok('逆极性取样仍回退识别黑底 bgStatus=ok', core.state.bgStatus === 'ok', String(core.state.bgStatus));
ok('逆极性取样去背景仍生效(珠数<全图90%)', rb2.totalBeads < 64 * 64 * 0.9, 'beads=' + rb2.totalBeads);

// 7c. 白底 + 浅灰主体：验证浅主体不被当背景全删（改动 C 收紧阈值）
var lightSubj = makeImage(function (x, y) {
  var dx = x - CX, dy = y - CY;
  return (dx * dx + dy * dy <= R * R) ? [210, 210, 210] : [250, 250, 250];
});
core.state._manualBgRGB = null;
var rl = core.processImageMini(lightSubj, 64, { removeBg: true });
ok('白底+浅灰主体去背景后保留主体(>500珠)', rl.totalBeads > 500, 'beads=' + rl.totalBeads);
ok('白底+浅灰主体 bgStatus=ok', core.state.bgStatus === 'ok', String(core.state.bgStatus));

// 7d. 渐变背景：水平渐变(255→228) + 中心深红圆，验证中位数背景估计比 RGB 中点更鲁棒
var gradBg = makeImage(function (x, y) {
  var dx = x - CX, dy = y - CY;
  if (dx * dx + dy * dy <= R * R) return [200, 30, 30];
  var t = x / (W - 1);
  var v = Math.round(255 - t * 27); // 255→228 浅灰渐变（非纯色背景）
  return [v, v, v];
});
var rg = core.processImageMini(gradBg, 64, { removeBg: true });
ok('渐变背景去背景 bgStatus=ok', core.state.bgStatus === 'ok', String(core.state.bgStatus));
ok('渐变背景去背景生效(珠数<全图90%)', rg.totalBeads < 64 * 64 * 0.9, 'beads=' + rg.totalBeads);
ok('渐变背景去背景保留主体(>500珠)', rg.totalBeads > 500, 'beads=' + rg.totalBeads);

console.log('--- 6. 不同尺寸 ---');
[16, 48, 64].forEach(function (n) {
  var r = core.processImageMini(circleImg, n, {});
  ok('N=' + n + ' 输出 ' + n + 'x' + n, r.grid.length === n && r.grid[0].length === n,
     'beads=' + r.totalBeads);
});

console.log('--- 8. 描边粗细 (thickness) ---');
function countColor(grid, id) {
  var n = 0;
  for (var y = 0; y < grid.length; y++) for (var x = 0; x < grid[y].length; x++) if (grid[y][x] === id) n++;
  return n;
}
core.state.sourceImage = { width: W, height: H };
var o1 = core.processImageMini(circleImg, 64, { outline: { on: true, strength: 50, colorId: 'H7', thickness: 1 } });
var o4 = core.processImageMini(circleImg, 64, { outline: { on: true, strength: 50, colorId: 'H7', thickness: 4 } });
var c1 = countColor(o1.grid, 'H7');
var c4 = countColor(o4.grid, 'H7');
ok('描边 thickness=1 产生描边格', c1 > 0, 'c1=' + c1);
ok('描边 thickness=4 格数 > thickness=1', c4 > c1, 'c1=' + c1 + ' c4=' + c4);
ok('thickness=4 描边约为1的1.5倍以上', c4 >= c1 * 1.5, 'c1=' + c1 + ' c4=' + c4);

console.log('');
console.log(failed === 0 ? '>>> 全部通过' : '>>> 失败 ' + failed + ' 项');
process.exit(failed === 0 ? 0 : 1);
