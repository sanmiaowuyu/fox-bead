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
  // 提亮一档
  applyBrighten(grid);
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
function applyOutline(grid, strength, colorId) {
  if (!colorId || !LAB_BY_ID[colorId]) return;
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
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (edge[y * N + x]) grid[y][x] = colorId;
  }
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
  const bgLab = rgbToOklab({ r: mid.r, g: mid.g, b: mid.b });
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
function applyBrighten(grid) {
  if (!state.brighten) return;
  var N = grid.length;
  for (var y = 0; y < N; y++) {
    for (var x = 0; x < N; x++) {
      var id = grid[y][x];
      if (!id) continue;
      if (state.bgMask && state.bgMask[y][x]) continue;
      var brighter = BRIGHTEN_MAP[id];
      if (brighter && brighter !== id && !state.excluded.has(brighter)) {
        grid[y][x] = brighter;
      }
    }
  }
}
