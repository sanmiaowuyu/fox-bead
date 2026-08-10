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
