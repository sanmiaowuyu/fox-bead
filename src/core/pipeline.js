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

/* ---------- 图片处理模块：预处理栅格化（web 专属，canvas） ---------- */
/* 基于 originalImage 应用 prep（旋转/翻转/裁剪/调色），返回 canvas（可当 Image 用：有 width/height，drawImage 兼容）。
   注意：本文件含 document/canvas，仅浏览器侧加载，不会进入小程序构建（build.js §7 仅打包纯模块）。 */

// 计算预览/烘焙用的预处理画布（不修改 state）。baseImg 为编辑会话的基准图（打开面板时的 sourceImage）
function computePrepCanvas(baseImg, prep, userCrop) {
  var img = baseImg || state.sourceImage;
  if (!img) return null;
  var natW = img.width, natH = img.height;
  var rot = ((prep.rotate % 360) + 360) % 360;
  var swap = (rot === 90 || rot === 270);
  var w = swap ? natH : natW;
  var h = swap ? natW : natH;
  var cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  var c = cv.getContext('2d');
  c.save();
  c.translate(w / 2, h / 2);
  c.rotate(rot * Math.PI / 180);
  c.scale(prep.flipH ? -1 : 1, prep.flipV ? -1 : 1);
  c.drawImage(img, -natW / 2, -natH / 2, natW, natH);
  c.restore();
  // 裁剪（userCrop 基于旋转/翻转后的预览坐标）
  var cx0 = 0, cy0 = 0, cw2 = w, ch2 = h;
  if (userCrop && userCrop.sw > 0 && userCrop.sh > 0) {
    cx0 = Math.max(0, Math.min(w - 1, userCrop.sx));
    cy0 = Math.max(0, Math.min(h - 1, userCrop.sy));
    cw2 = Math.max(1, Math.min(w - cx0, userCrop.sw));
    ch2 = Math.max(1, Math.min(h - cy0, userCrop.sh));
  }
  var cv2 = document.createElement('canvas');
  cv2.width = cw2; cv2.height = ch2;
  var c2 = cv2.getContext('2d');
  c2.drawImage(cv, cx0, cy0, cw2, ch2, 0, 0, cw2, ch2);
  // 调色
  if (prep.brightness || prep.contrast || prep.saturation) {
    var id = c2.getImageData(0, 0, cw2, ch2);
    adjustImageData(id.data, cw2, ch2, prep);
    c2.putImageData(id, 0, 0);
  }
  return cv2;
}

// 应用预处理：烘焙成一个新的 sourceImage（canvas），原图保留在 originalImage 以便重置
function bakePrep() {
  if (!state.sourceImage) return;
  var cv = computePrepCanvas(state.prepBase || state.sourceImage, state.prep, state.userCrop);
  if (!cv) return;
  state.sourceImage = cv;       // canvas 可当 Image 用
  state.crop = false;           // 已烘焙，避免重复居中裁切
  var tc = document.getElementById('toggle-crop'); if (tc) tc.checked = false; // 同步主界面裁剪开关
  state.prep = { rotate: 0, flipH: false, flipV: false, brightness: 0, contrast: 0, saturation: 0 };
  state.userCrop = null;
  // 手动遮罩仍按当前 N 保留（烘焙后映射一致）；N 改变时由 grid-size 监听清空
  processImage();
}

// 重置预处理：恢复原图，清空 prep/裁切/遮罩
function resetPrep() {
  if (state.originalImage) state.sourceImage = state.originalImage;
  state.prep = { rotate: 0, flipH: false, flipV: false, brightness: 0, contrast: 0, saturation: 0 };
  state.userCrop = null;
  clearUserMask();
  processImage();
}

// 清空手动去背景遮罩
function clearUserMask() {
  state.userMask = null;
}
