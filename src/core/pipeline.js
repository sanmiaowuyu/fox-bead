/* ---------- 5. 图片处理管线（web 端平台绑定：canvas 取像素 + 编排） ---------- */
/* 纯算法已抽到 pipeline-core.js（web / 小程序共用）。本文件只负责浏览器侧的像素获取与流程编排。
   注意：getSourceData / pixelateToGrid / buildSrcRGB 使用 document.createElement('canvas')，仅浏览器可用，
   不会进入小程序构建（小程序由 build.js §7 生成 miniapp/utils/core.js，仅包含 pipeline-core.js 等纯模块）。 */

function getSourceData(img) {
  // 取裁剪后的全分辨率像素，供逐格主导色统计
  const cr = getCropRect(img.width, img.height);
  const off = document.createElement('canvas');
  off.width = cr.sw; off.height = cr.sh;
  const octx = off.getContext('2d');
  octx.drawImage(img, cr.sx, cr.sy, cr.sw, cr.sh, 0, 0, cr.sw, cr.sh);
  return octx.getImageData(0, 0, cr.sw, cr.sh);
}
function pixelateToGrid(img, N) {
  const cr = getCropRect(img.width, img.height);
  const off = document.createElement('canvas');
  off.width = N; off.height = N;
  const octx = off.getContext('2d');
  octx.imageSmoothingEnabled = false; // 最近邻：每格取一个真实像素，避免均值糊成脏色
  const scale = Math.min(N / cr.sw, N / cr.sh);
  const dw = Math.max(1, Math.round(cr.sw * scale));
  const dh = Math.max(1, Math.round(cr.sh * scale));
  const dx = Math.floor((N - dw) / 2);
  const dy = Math.floor((N - dh) / 2);
  octx.clearRect(0, 0, N, N); // 透明底，四周留白
  octx.drawImage(img, cr.sx, cr.sy, cr.sw, cr.sh, dx, dy, dw, dh);
  return octx.getImageData(0, 0, N, N);
}
function buildSrcRGB(img, N) {
  // 最近邻重采样原图到 N×N，记录每格原始 RGB（去背景时据此判断背景）
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
function processImage() {
  if (!state.sourceImage) return;
  var _wrapEl = document.getElementById('canvas-wrap');
  if (_wrapEl) _wrapEl.classList.add('processing');
  var N = state.N;
  state.srcRGB = buildSrcRGB(state.sourceImage, N);
  var cr = getCropRect(state.sourceImage.width, state.sourceImage.height);
  var sd = getSourceData(state.sourceImage);
  var scale = Math.min(N / cr.sw, N / cr.sh);
  var dw = Math.max(1, Math.round(cr.sw * scale));
  var dh = Math.max(1, Math.round(cr.sh * scale));
  var dx = Math.floor((N - dw) / 2);
  var dy = Math.floor((N - dh) / 2);
  var cw = cr.sw / dw, ch = cr.sh / dh;
  var grid = Array.from({ length: N }, function() { return new Array(N).fill(null); });

  // v140: 分帧处理（小板子一步完成，大板子分批异步）
  var onFinish = function() { _finishPipeline(grid, N, function() { renderAll(); }); };
  if (N <= 78) {
    _processChunk(N, grid, sd, cr, dx, dy, dw, dh, cw, ch, 0, onFinish);
  } else {
    setTimeout(function() {
      _processChunk(N, grid, sd, cr, dx, dy, dw, dh, cw, ch, 0, onFinish);
    }, 0);
  }
}
