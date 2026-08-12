/* ---------- 9. 下载 / 导出（专业图纸格式） ---------- */
function isMobileDevice() {
  return /iPhone|iPad|iPod|Android|HarmonyOS|Mobile|MicroMessenger/i.test(navigator.userAgent);
}
function isWeixin() {
  return /MicroMessenger/i.test(navigator.userAgent);
}

/* 旋转动画样式（仅注入一次） */
function ensureFoxSpinStyle() {
  if (document.getElementById('fox-spin-style')) return;
  const s = document.createElement('style');
  s.id = 'fox-spin-style';
  s.textContent = '@keyframes fox-spin{to{transform:rotate(360deg)}}';
  document.head.appendChild(s);
}

/* 生成中遮罩：点击下载后先明确反馈「生成中」，避免大图渲染时疑似卡死 */
function showGeneratingOverlay(text) {
  ensureFoxSpinStyle();
  const mask = document.createElement('div');
  mask.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.85);display:flex;flex-direction:column;align-items:center;justify-content:center;';
  const sp = document.createElement('div');
  sp.style.cssText = 'width:42px;height:42px;border:4px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:fox-spin .8s linear infinite;';
  const tip = document.createElement('div');
  tip.textContent = text || '正在生成图纸…';
  tip.style.cssText = 'color:#fff;font-size:15px;margin-top:16px;';
  mask.appendChild(sp); mask.appendChild(tip);
  document.body.appendChild(mask);
  return { close: () => mask.remove() };
}

/* 生成 PNG 源：优先 toBlob（体积小、加载快），失败或超时回退 toDataURL。
   关键：回调【一定】会被调用，避免手机浏览器对大图 toBlob 静默失败导致「点了没反应」。 */
function genPNGSource(cv, cb) {
  if (typeof cv.toBlob === 'function') {
    try {
      let done = false;
      const timer = setTimeout(() => {
        if (done) return; done = true;
        try { cb(cv.toDataURL('image/png')); } catch (e2) { cb(null); }
      }, 5000); // 5 秒超时兜底
      cv.toBlob(blob => {
        if (done) return; done = true; clearTimeout(timer);
        if (blob && blob.size > 0) cb(blob);
        else { try { cb(cv.toDataURL('image/png')); } catch (e2) { cb(null); } }
      }, 'image/png');
      return;
    } catch (e) { /* 落到下面的 dataURL */ }
  }
  try { cb(cv.toDataURL('image/png')); } catch (e) { cb(null); }
}

/* 手机端：a.download 常被浏览器拦截，改为弹出图片让用户「长按保存到相册」。
   src 可以是 Blob 或 URL/dataURL 字符串；Blob 会转成 blob URL。
   额外提供「在新窗口打开」按钮作为备份（部分浏览器长按无菜单时可用）。 */
function showMobileSaveOverlay(src, failMsg) {
  let url = src;
  let blob = null;
  if (src instanceof Blob) {
    blob = src;
    url = URL.createObjectURL(blob);
  }
  const mask = document.createElement('div');
  mask.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.92);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:18px;box-sizing:border-box;overflow:auto;';
  const cleanup = () => {
    if (blob && url) URL.revokeObjectURL(url);
    mask.remove();
  };
  if (!src) {
    const t = document.createElement('div');
    t.textContent = failMsg || '生成失败，请重试';
    t.style.cssText = 'color:#fff;font-size:15px;text-align:center;';
    const b = document.createElement('button');
    b.textContent = '关闭';
    b.style.cssText = 'margin-top:16px;padding:10px 34px;border:none;border-radius:22px;background:#fff;color:#333;font-size:15px;';
    b.onclick = cleanup;
    mask.appendChild(t); mask.appendChild(b);
    document.body.appendChild(mask);
    return;
  }
  const title = document.createElement('div');
  const sub = document.createElement('div');
  if (isMobileDevice()) {
    title.textContent = '长按图片 → 保存到相册';
    sub.textContent = '（若长按没出现菜单，点下方「在新窗口打开」再保存）';
  } else {
    title.textContent = '右键图片 → 选择「图片另存为」';
    sub.textContent = '（或点下方「在新窗口打开」后保存）';
  }
  title.style.cssText = 'color:#fff;font-size:17px;line-height:1.4;margin-bottom:6px;text-align:center;font-weight:600;';
  sub.style.cssText = 'color:#bbb;font-size:13px;margin-bottom:12px;text-align:center;';
  const img = document.createElement('img');
  img.src = url;
  img.alt = '拼豆图纸';
  img.style.cssText = 'max-width:100%;max-height:56vh;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,.4);object-fit:contain;background:#fff;';
  const openBtn = document.createElement('button');
  openBtn.textContent = '在新窗口打开';
  openBtn.style.cssText = 'display:none;margin-top:14px;padding:9px 28px;border:none;border-radius:22px;background:rgba(255,255,255,.15);color:#fff;font-size:14px;border:1px solid rgba(255,255,255,.35);';
  openBtn.onclick = () => { try { const w = window.open(url, '_blank'); if (!w) location.href = url; } catch (e) { location.href = url; } };
  img.onerror = () => { img.style.display = 'none'; openBtn.style.display = 'block'; };
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '关闭';
  closeBtn.style.cssText = 'margin-top:10px;padding:8px 30px;border:none;border-radius:22px;background:transparent;color:#fff;font-size:14px;border:1px solid rgba(255,255,255,.35);';
  closeBtn.onclick = cleanup;
  mask.appendChild(title); mask.appendChild(sub); mask.appendChild(img); mask.appendChild(openBtn); mask.appendChild(closeBtn);
  document.body.appendChild(mask);
}

function downloadCanvasPNG(cv, name) {
  genPNGSource(cv, function (src) {
    if (!src) { alert('生成失败，请重试'); return; }
    // 顶层页面：直接触发下载（普通浏览器/已部署站点）
    var inIframe = (window.self !== window.top);
    if (!inIframe) {
      try {
        var a = document.createElement('a');
        if (src instanceof Blob) a.href = URL.createObjectURL(src); else a.href = src;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { document.body.removeChild(a); if (src instanceof Blob) URL.revokeObjectURL(a.href); }, 1500);
        return;
      } catch (e) { /* 落到下方弹窗兜底 */ }
    }
    // iframe 内（预览面板 / 部分托管沙箱）或下载被拦截：弹窗让用户右键/长按保存
    showMobileSaveOverlay(src);
  });
}

/**
 * 构建专业拼豆图纸 canvas（参考 Zippland / 七卡瓦 格式）
 * 布局：
 *   ┌──────────────────────────────┐
 *   │  MARD 色号          共 NNNN颗│  ← 标题栏
 *   ├──────────────────────────────┤
 *   │                              │
 *   │       拼豆图案区域            │  ← N×N 网格
 *   │       （带可选网格线/坐标）    │
 *   │                              │
 *   ├──────────────────────────────┤
 *   │ 用料详情                     │
 *   │ ┌────┬────┬────┬────┐       │
 *   │ │色块│色号│数量│色块│...     │  ← 多列色号统计面板
 *   │ │ H07│622 │ D03│ 82 │       │    每格=色块+色号+数量
 *   │ └────┴────┴────┴────┘       │
 *   └──────────────────────────────┘
 */
/**
 * 加载同源图片（分享海报的 logo），失败 reject 由调用方兜底
 */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * 构建「分享效果图」海报 canvas（方案 A：竖版 3:4，淡紫主题背景，用于小红书等）
 * 与 buildExportCanvas 完全独立——工作图纸保持白底干净，这里只是展示用海报。
 */
async function buildShareCanvas() {
  const N = state.N;
  const W = 1080, H = 1440;                 // 3:4，小红书最佳比例
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d');

  // 1) 背景：极淡紫柔和渐变（与主题呼应、不喧宾夺主）
  const bg = c.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#FBF7FE');
  bg.addColorStop(1, '#ECE2FB');
  c.fillStyle = bg;
  c.fillRect(0, 0, W, H);

  // 2) 顶部：logo + 品牌名 + 副标题
  const pad = 64;
  const logoR = 34;
  try {
    const img = await loadImage(LOGO_DATA_URI);
    c.save();
    c.beginPath(); c.arc(pad + logoR, pad + logoR, logoR, 0, Math.PI * 2); c.closePath(); c.clip();
    c.drawImage(img, pad, pad, logoR * 2, logoR * 2);
    c.restore();
  } catch (e) {
    c.fillStyle = '#C9B6E6';
    c.beginPath(); c.arc(pad + logoR, pad + logoR, logoR, 0, Math.PI * 2); c.fill();
  }
  const font = '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif';
  c.fillStyle = '#3A2D4F';
  c.font = `bold 56px ${font}`;
  c.textAlign = 'left'; c.textBaseline = 'middle';
  c.fillText('狐狸爱拼豆 ｜ i 喵绘工坊', pad + logoR * 2 + 22, pad + logoR - 12);
  c.fillStyle = '#6B6675';
  c.font = `36px ${font}`;
  c.fillText('图片一键生成拼豆图纸 · Mard 官方色库', pad + logoR * 2 + 22, pad + logoR + 28);
  // 规格 / 总豆数 / 总色卡
  // v98: 色号统计按 subject（主体边界，排除四周背景留白豆子）
  const shareCounts = {};
  let shareBeads = 0;
  var sub = state.subject || state.effective;
  var syS = sub && sub.cols > 0 ? sub.minY : 0;
  var syE = sub && sub.cols > 0 ? sub.maxY : N - 1;
  var sxS = sub && sub.cols > 0 ? sub.minX : 0;
  var sxE = sub && sub.cols > 0 ? sub.maxX : N - 1;
  for (let y = syS; y <= syE; y++) for (let x = sxS; x <= sxE; x++) {
    const id = state.grid[y][x];
    if (id && !(state.bgMask && state.bgMask[y][x])) { shareCounts[id] = (shareCounts[id] || 0) + 1; shareBeads++; }
  }
  const shareColors = Object.keys(shareCounts).length;
  c.font = `bold 48px ${font}`;
  c.fillText(`规格：${sub && sub.cols > 0 ? sub.cols : N}×${sub && sub.cols > 0 ? sub.rows : N}  模式：${state.mode === 'cartoon' ? '卡通' : '真实'}  总豆数：${shareBeads.toLocaleString()}颗  总色卡：${shareColors}`, pad + logoR * 2 + 22, pad + logoR + 72);

  // 3) 作品白色卡片（装裱，四周留白，主体仍是彩色豆子）
  const cardX = pad;
  const cardY = pad + logoR * 2 + 92;
  const cardW = W - pad * 2;
  const cardH = Math.min(cardW, H - cardY - 150);
  c.save();
  c.shadowColor = 'rgba(106, 76, 147, 0.18)';
  c.shadowBlur = 30; c.shadowOffsetY = 10;
  c.fillStyle = state.bgMode === 'black' ? '#000000' : '#FFFFFF';
  roundRect(c, cardX, cardY, cardW, cardH, 28); c.fill();
  c.restore();

  // 4) 卡片内拼豆图案（镜像同步、无格内色号、无网格线，干净展示）
  const inner = 30;
  const artX = cardX + inner, artY = cardY + inner;
  const artSize = Math.min(cardW - inner * 2, cardH - inner * 2);
  const cell = artSize / N;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const id = state.grid[y][x];
    if (!id) continue;
    const dx = state.mirror ? N - 1 - x : x;       // 镜像：水平翻转列，与工作图纸一致
    const px = Math.round(artX + dx * cell);
    const py = Math.round(artY + y * cell);
    c.fillStyle = PALETTE_BY_ID[id].hex;
    c.fillRect(px, py, Math.ceil(cell), Math.ceil(cell));
  }

  // 5) 底部标语
  c.fillStyle = '#6A4C93';
  c.font = `bold 26px ${font}`;
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(`${BRAND_LABEL} ${N}×${N} 拼豆还原 · 一键生成`, W / 2, H - 70);

  // 水印：斜向平铺，覆盖整图，加深可见但不喧宾夺主
  c.save();
  c.globalAlpha = 0.28;
  c.fillStyle = '#7A7A7A';
  c.font = `italic bold 42px ${font}`;
  c.textAlign = 'center'; c.textBaseline = 'middle';
  const sStepX = 360;
  const sStepY = 240;
  const sRows = Math.ceil((H + sStepY) / sStepY);
  for (let row = 0; row < sRows; row++) {
    const y = row * sStepY;
    const xOffset = (row % 2) * (sStepX / 2);
    for (let x = -sStepX; x < W + sStepX; x += sStepX) {
      c.save();
      c.translate(x + xOffset, y);
      c.rotate(-45 * Math.PI / 180);
      c.fillText('mxm', 0, 0);
      c.restore();
    }
  }
  c.restore();

  return cv;
}

function buildExportCanvas(opts) {
  const N = state.N;
  // v100: 导出固定 (N-4)×(N-4) 正方形，内容居中、四周填背景色（适配电子拼豆板导入）
  const dr = state.displayRect;
  const M = dr.M;
  // v91: 导出超高清尺寸，每格 140 像素（桌面），放大后色号仍清晰
  const MAX_CANVAS = 16384;        // 浏览器画布单边上限
  const CANVAS_RESERVE = 2000;     // 标题栏+色号卡预留空间，确保总 canvas 不超限
  const MAX_MOBILE = 4096;         // 手机端导出单边上限
  const MAX_WEIXIN = 4096;         // 微信端导出单边上限
  let cell = 140;                  // 桌面超高清 140px/格（v91: 80→140，放大空间+75%）
  if (isWeixin()) cell = 90;       // 微信 90px/格
  else if (isMobileDevice()) cell = 60;   // 其他手机 60px/格
  if (N * cell + CANVAS_RESERVE > MAX_CANVAS) cell = Math.floor((MAX_CANVAS - CANVAS_RESERVE) / N);
  if (isMobileDevice() && N * cell > MAX_MOBILE) cell = Math.floor(MAX_MOBILE / N);
  if (isWeixin() && N * cell > MAX_WEIXIN) cell = Math.floor(MAX_WEIXIN / N);
  cell = Math.max(10, cell);
  const k = cell / 24;
  const pad = Math.round(20 * k);                    // 图案区内边距
  const titleH = Math.round(300 * k);                 // 标题栏高度（两行信息，v138 放大3倍字体）
  const gap = 1;                     // 图案与色板间距线
  const labelH = Math.round(80 * k);                 // "用料详情"标签高度（v138 放大3倍）

  // ===== 统计色号（跳过背景填充格）=====
  // v98: 按 subject（主体边界）统计，排除四周背景留白豆子
  const counts = {};
  let totalBeads = 0;
  var sub = state.subject || state.effective;
  var syS = sub && sub.cols > 0 ? sub.minY : 0;
  var syE = sub && sub.cols > 0 ? sub.maxY : N - 1;
  var sxS = sub && sub.cols > 0 ? sub.minX : 0;
  var sxE = sub && sub.cols > 0 ? sub.maxX : N - 1;
  for (let y = syS; y <= syE; y++) for (let x = sxS; x <= sxE; x++) {
    const id = state.grid[y][x];
    if (id && !(state.bgMask && state.bgMask[y][x])) { counts[id] = (counts[id] || 0) + 1; totalBeads++; }
  }
  const sorted = Object.entries(counts).sort((a, b) => {
    // v90: 按色号字母+数字升序排序，方便拼豆时按字母系一次性找完
    const ma = a[0].match(/^([A-Za-z]+)(\d+)$/);
    const mb = b[0].match(/^([A-Za-z]+)(\d+)$/);
    if (!ma || !mb) return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
    if (ma[1] !== mb[1]) return ma[1] < mb[1] ? -1 : 1;
    return parseInt(ma[2], 10) - parseInt(mb[2], 10);
  });

  // ===== 色板区布局计算 =====
  const showStats = opts.stats !== false;  // 默认显示
  const palPad = 14;                        // 色板区内边距
  const palEntryW = Math.round(280 * k);    // 每个色号条目宽度 — v138 放大3倍(100→280)
  const palCellH = Math.round(120 * k);      // 每个色号条目高度 — v138 放大3倍

  // ===== 总画布尺寸 =====（v100: 图案区固定 M×M 正方形）
  const patternW = pad * 2 + M * cell;
  const patternH = pad * 2 + M * cell;
  const W = patternW;   // 整图宽度以图案区为准，用料详情横向铺满此宽度
  // 关键修复：按可用宽度自动计算列数，横向填满后自动换行（不再固定 8 列挤在左侧）
  const palCols = showStats ? Math.max(1, Math.floor((W - palPad * 2) / palEntryW)) : 0;
  const palRows = showStats ? Math.ceil(sorted.length / palCols) : 0;
  const palH = showStats ? (labelH + palPad + palRows * palCellH + palPad) : 0;
  const H = titleH + patternH + gap + palH;

  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  c.imageSmoothingEnabled = false;

  // v136: 恢复白底（v128 透明底在手机查看器中显示为黑色，导致四周黑框+文字看不清）
  c.fillStyle = '#FFFFFF';
  c.fillRect(0, 0, W, H);

  // ===== 标题栏 =====
  // 第一行：品牌名
  c.fillStyle = '#211E2B';
  c.font = `bold ${Math.round(144 * k)}px sans-serif`;   // v138 品牌名放大3倍(48→144)
  c.textAlign = 'left'; c.textBaseline = 'top';
  const brandY = Math.round(35 * k);                // v138 品牌名Y位置(适配3倍字号)
  c.fillText('狐狸爱拼豆 | i 喵绘工坊', pad, brandY);

  // 第二行：豆板 / 模式 / 规格 / 总豆数 / 总色卡
  const metaY = Math.round(175 * k);                // v138 规格信息Y位置(适配3倍字号)
  c.fillStyle = '#6B6675';
  c.font = `bold ${Math.round(108 * k)}px sans-serif`;   // v138 规格信息放大3倍(36→108)
  const specText = `${sub && sub.cols > 0 ? sub.cols : M}×${sub && sub.cols > 0 ? sub.rows : M}`;
  const metaParts = [`豆板：${state.N}×${state.N}`, `模式：${state.mode === 'cartoon' ? '卡通' : '真实'}`, `规格：${specText}`, `总豆数：${totalBeads.toLocaleString()}颗`, `总色卡：${sorted.length}色`];
  c.fillText(metaParts.join('  '), pad, metaY);

  // 分隔线
  c.strokeStyle = '#ECE6E0';
  c.lineWidth = Math.max(1, k);
  c.beginPath(); c.moveTo(0, titleH); c.lineTo(W, titleH); c.stroke();

  // ===== 图案区 =====（v100: 固定 M×M，内容居中、四周填背景色）
  const patOX = Math.floor((W - M * cell) / 2);   // 图案水平居中
  const patOY = titleH + pad;

  // v140: 绘制图案网格 — 同行相邻同色格合并为宽矩形（减少 fillRect 调用）
  var _pngGetCell = function(gx, gy) {
    if (gx >= dr.offX && gx < dr.offX + dr.drawCols && gy >= dr.offY && gy < dr.offY + dr.drawRows) {
      var sx = dr.srcMinX + (gx - dr.offX);
      var sy = dr.srcMinY + (gy - dr.offY);
      var tid = state.grid[sy][sx];
      var tbg = state.bgMask && state.bgMask[sy][sx];
      return { id: tid, bg: tbg, hex: (tid && !tbg) ? PALETTE_BY_ID[tid].hex : '#FFFFFF' };
    }
    return { id: null, bg: false, hex: '#FFFFFF' };
  };
  for (var gy = 0; gy < M; gy++) {
    var runStart = 0;
    var runHex = '#FFFFFF', runId = null, runBg = false;
    for (var gx = 0; gx < M; gx++) {
      var info = _pngGetCell(gx, gy);
      var isBg = !info.id || info.bg;
      if (gx === runStart) { runId = info.id; runBg = isBg; runHex = info.hex; continue; }
      if ((!isBg && !runBg && info.id === runId) || (isBg && runBg)) continue;
      // Flush run
      var rw = (gx - runStart) * cell;
      var rpx = state.mirror ? patOX + (M - gx) * cell : patOX + runStart * cell;
      c.fillStyle = runHex;
      c.fillRect(rpx, patOY + gy * cell, rw, cell);
      runStart = gx; runId = info.id; runBg = isBg; runHex = info.hex;
    }
    // Flush final run
    var rw2 = (M - runStart) * cell;
    var rpx2 = state.mirror ? patOX + (M - M) * cell : patOX + runStart * cell;
    c.fillStyle = runHex;
    c.fillRect(rpx2, patOY + gy * cell, rw2, cell);
    // Color codes: per-cell (text positions are unique)
    if (opts.showcode && cell >= 6) {
      for (var tx = 0; tx < M; tx++) {
        var tinfo2 = _pngGetCell(tx, gy);
        if (tinfo2.id && !tinfo2.bg) {
          var tpx = patOX + (state.mirror ? (M - 1 - tx) : tx) * cell;
          var tfs = Math.max(6, Math.floor(Math.min(cell * 0.5, (cell * 0.82) / (String(tinfo2.id).length * 0.6))));
          c.fillStyle = isLight(tinfo2.hex) ? '#333' : '#fff';
          c.font = tfs + 'px monospace';
          c.textAlign = 'center'; c.textBaseline = 'middle';
          c.fillText(tinfo2.id, tpx + cell / 2, patOY + gy * cell + cell / 2);
        }
      }
    }
  }

  // 豆子间隔线（始终显示，极淡）：让白色/浅色豆在白底上也有边界
  drawBeadBorders(c, patOX, patOY, M, M, cell, '#F0F0F0');

  // 网格线：每 1 格细线(极浅，作辅助参考) + 每 10 格计数线(深色加粗，作分组标识，醒目清晰)
  if (opts.gridlines) {
    const interval = opts.interval || 10;
    // 竖线
    for (let i = 0; i <= M; i++) {
      const major = (i % interval === 0);
      const gx = Math.round(patOX + i * cell) + 0.5;
      if (major) { c.strokeStyle = 'rgba(30,30,30,0.65)'; c.lineWidth = Math.max(2, k * 1.5); }
      else { c.strokeStyle = '#EAEAEA'; c.lineWidth = Math.max(1, k * 0.5); }
      c.beginPath(); c.moveTo(gx, patOY); c.lineTo(gx, patOY + M * cell); c.stroke();
    }
    // 横线
    for (let i = 0; i <= M; i++) {
      const major = (i % interval === 0);
      const gy = Math.round(patOY + i * cell) + 0.5;
      if (major) { c.strokeStyle = 'rgba(30,30,30,0.65)'; c.lineWidth = Math.max(2, k * 1.5); }
      else { c.strokeStyle = '#EAEAEA'; c.lineWidth = Math.max(1, k * 0.5); }
      c.beginPath(); c.moveTo(patOX, gy); c.lineTo(patOX + M * cell, gy); c.stroke();
    }
  }

  // 坐标数字
  if (opts.coords) {
    c.fillStyle = '#999'; c.font = `${Math.max(7, cell * 0.35)}px monospace`;
    c.textAlign = 'center'; c.textBaseline = 'top';
    for (let i = 0; i < M; i++) c.fillText(i.toString(), patOX + i * cell + cell / 2, patOY + M * cell + 2);
    c.textAlign = 'right'; c.textBaseline = 'middle';
    for (let i = 0; i < M; i++) c.fillText(i.toString(), patOX - 3, patOY + i * cell + cell / 2);
  }

  // ===== 色板统计区 =====
  if (showStats && sorted.length > 0) {
    const palTop = titleH + patternH + gap;

    // 分隔线
    c.strokeStyle = '#ECE6E0'; c.lineWidth = Math.max(1, k);
    c.beginPath(); c.moveTo(0, palTop); c.lineTo(W, palTop); c.stroke();

    // "用料详情" 标签 — v90 放大
    c.fillStyle = '#211E2B'; c.font = `bold ${Math.round(18 * k)}px sans-serif`;
    c.textAlign = 'left'; c.textBaseline = 'top';
    c.fillText('用料详情', palPad, palTop + 4);

    // 多列色号网格
    const gridStartY = palTop + labelH;
    for (let idx = 0; idx < sorted.length; idx++) {
      const [id, cnt] = sorted[idx];
      const col = idx % palCols;
      const row = Math.floor(idx / palCols);
      const gx = palPad + col * palEntryW;
      const gy = gridStartY + palPad + row * palCellH;

      // 色块（圆角方块）— v90 放大
      const swatchSize = Math.round(28 * k);
      const sx = gx + 2;
      const sy = gy + (palCellH - swatchSize) / 2;
      c.fillStyle = PALETTE_BY_ID[id].hex;
      roundRect(c, sx, sy, swatchSize, swatchSize, Math.max(3, 3 * k));
      c.fill();

      // 色号（粗体、加大）— v90 放大
      c.fillStyle = '#211E2B'; c.font = `bold ${Math.round(20 * k)}px sans-serif`;
      c.textAlign = 'left'; c.textBaseline = 'middle';
      c.fillText(id, sx + swatchSize + 6, sy + swatchSize / 2 - 8 * k);

      // 数量 — v90 放大
      c.fillStyle = '#6B6675'; c.font = `${Math.round(16 * k)}px sans-serif`;
      c.fillText(cnt.toString(), sx + swatchSize + 6, sy + swatchSize / 2 + 9 * k);
    }
  }

  // ===== 采购清单（按色系分组）=====
  if (showStats && sorted.length > 0 && opts.bom !== false) {
    const seriesNames = { A:'黄橙系', B:'绿色系', C:'蓝青系', D:'蓝紫系', E:'粉玫系', F:'红色系', G:'棕肤系', H:'黑白系', M:'大地系' };
    const bySeries = {};
    for (const [id, cnt] of sorted) {
      const m = id.match(/^([A-Za-z]+)/);
      if (!m) continue;
      const s = m[1];
      if (!bySeries[s]) bySeries[s] = { name: seriesNames[s] || s+'系', items: [], subtotal: 0 };
      bySeries[s].items.push({ id, cnt });
      bySeries[s].subtotal += cnt;
    }
    const seriesOrder = Object.keys(bySeries).sort();
    const listTitleH = Math.round(72 * k);
    const listLineH = Math.round(40 * k);
    const listSeriesGap = Math.round(28 * k);
    const listColW = Math.floor((W - palPad * 3) / 2);
    const listFontSize = Math.round(26 * k);
    const listSmallSize = Math.round(20 * k);
    const listPad = Math.round(22 * k);

    let listTotalH = listTitleH + palPad;
    for (const s of seriesOrder) {
      listTotalH += listSeriesGap + Math.ceil(bySeries[s].items.length / 2) * listLineH;
    }
    listTotalH += listPad * 3;

    const listTop = titleH + patternH + gap + palH;
    const finalH = listTop + listTotalH;

    // Redraw on taller canvas
    const oldCv = cv;
    cv = document.createElement('canvas');
    cv.width = W; cv.height = finalH;
    const ctx2 = cv.getContext('2d');
    ctx2.imageSmoothingEnabled = false;
    ctx2.drawImage(oldCv, 0, 0);

    // Divider
    ctx2.strokeStyle = '#ECE6E0'; ctx2.lineWidth = Math.max(1, k);
    ctx2.beginPath(); ctx2.moveTo(0, listTop); ctx2.lineTo(W, listTop); ctx2.stroke();

    // Title
    ctx2.fillStyle = '#211E2B';
    ctx2.font = 'bold ' + Math.round(54 * k) + 'px sans-serif';
    ctx2.textAlign = 'left'; ctx2.textBaseline = 'top';
    ctx2.fillText('采购清单', palPad, listTop + palPad);

    let yPos = listTop + listTitleH + palPad;
    for (const s of seriesOrder) {
      const block = bySeries[s];
      ctx2.fillStyle = '#F6F1FB';
      ctx2.fillRect(palPad, yPos, W - palPad * 2, listLineH);
      ctx2.fillStyle = '#6A4C93';
      ctx2.font = 'bold ' + listFontSize + 'px sans-serif';
      ctx2.textAlign = 'left'; ctx2.textBaseline = 'middle';
      ctx2.fillText(s + '系（' + block.name + '）— 小计 ' + block.subtotal.toLocaleString() + ' 颗', palPad + 10, yPos + listLineH / 2);
      yPos += listLineH + 4;

      const items = block.items;
      for (let i = 0; i < items.length; i += 2) {
        for (let col = 0; col < 2; col++) {
          const idx = i + col;
          if (idx >= items.length) break;
          const item = items[idx];
          const cx = col === 0 ? palPad + 6 : palPad + listColW + 6;
          const sw = Math.round(20 * k);
          ctx2.fillStyle = PALETTE_BY_ID[item.id].hex;
          ctx2.fillRect(cx, yPos + (listLineH - sw) / 2, sw, sw);
          ctx2.strokeStyle = '#E2D8F2'; ctx2.lineWidth = 0.5;
          ctx2.strokeRect(cx, yPos + (listLineH - sw) / 2, sw, sw);
          ctx2.fillStyle = '#211E2B';
          ctx2.font = 'bold ' + listSmallSize + 'px monospace';
          ctx2.textAlign = 'left'; ctx2.textBaseline = 'middle';
          ctx2.fillText(item.id, cx + sw + 6, yPos + listLineH / 2);
          ctx2.fillStyle = '#6B6675';
          ctx2.font = listSmallSize + 'px sans-serif';
          ctx2.fillText(item.cnt.toLocaleString() + ' 颗', cx + sw + 56, yPos + listLineH / 2);
        }
        yPos += listLineH;
      }
      yPos += listSeriesGap;
    }

    // Grand total
    ctx2.fillStyle = '#ECE6E0';
    ctx2.fillRect(palPad, yPos, W - palPad * 2, 1);
    yPos += 12;
    ctx2.fillStyle = '#211E2B';
    ctx2.font = 'bold ' + Math.round(32 * k) + 'px sans-serif';
    ctx2.textAlign = 'right';
    ctx2.fillText('总计：' + totalBeads.toLocaleString() + ' 颗，' + sorted.length + ' 色', W - palPad, yPos + listLineH / 2);

    // Watermark on new canvas
    ctx2.save();
    ctx2.globalAlpha = 0.28;
    ctx2.fillStyle = '#7A7A7A';
    ctx2.font = 'italic bold ' + Math.round(36 * k) + 'px sans-serif';
    ctx2.textAlign = 'center'; ctx2.textBaseline = 'middle';
    var wRows2 = Math.ceil((finalH + 240 * k) / (240 * k));
    for (var wr2 = 0; wr2 < wRows2; wr2++) {
      var wy = wr2 * 240 * k;
      var xOff = (wr2 % 2) * (360 * k / 2);
      for (var x = -360 * k; x < W + 360 * k; x += 360 * k) {
        ctx2.save();
        ctx2.translate(x + xOff, wy);
        ctx2.rotate(-45 * Math.PI / 180);
        ctx2.fillText('mxm', 0, 0);
        ctx2.restore();
      }
    }
    ctx2.restore();
  }

  return cv;
}

function buildExportSVG(opts) {
  const N = state.N;
  // v100: 导出固定 (N-4)×(N-4) 正方形
  const dr = state.displayRect;
  const M = dr.M;
  const C = 24;                       // 图案每格 SVG 单位（矢量，仅决定初始比例）
  const pad = 28;
  const titleH = 140;                  // 标题栏高度（两行信息）
  const gap = 16;
  const labelH = 30;

  // v98: 按 subject（主体边界）统计，排除四周背景留白豆子
  const counts = {};
  let totalBeads = 0;
  var sub = state.subject || state.effective;
  var syS = sub && sub.cols > 0 ? sub.minY : 0;
  var syE = sub && sub.cols > 0 ? sub.maxY : N - 1;
  var sxS = sub && sub.cols > 0 ? sub.minX : 0;
  var sxE = sub && sub.cols > 0 ? sub.maxX : N - 1;
  for (let y = syS; y <= syE; y++) for (let x = sxS; x <= sxE; x++) {
    const id = state.grid[y][x];
    if (id && !(state.bgMask && state.bgMask[y][x])) { counts[id] = (counts[id] || 0) + 1; totalBeads++; }
  }
  const sorted = Object.entries(counts).sort((a, b) => {
    // v90: 按色号字母+数字升序排序，方便拼豆时按字母系一次性找完
    const ma = a[0].match(/^([A-Za-z]+)(\d+)$/);
    const mb = b[0].match(/^([A-Za-z]+)(\d+)$/);
    if (!ma || !mb) return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
    if (ma[1] !== mb[1]) return ma[1] < mb[1] ? -1 : 1;
    return parseInt(ma[2], 10) - parseInt(mb[2], 10);
  });

  const patternW = pad * 2 + M * C;
  const patternH = pad * 2 + M * C;

  const showStats = opts.stats !== false;
  const palPad = 16;
  const entryW = 180;                 // 每个色号条目宽度（横向流式填满）— v90 放大
  const entryH = 120;                  // v138 色号条目高度3倍(44→120)
  const palCols = showStats ? Math.max(1, Math.floor((patternW - palPad * 2) / entryW)) : 0;
  const palRows = showStats ? Math.ceil(sorted.length / palCols) : 0;
  const palH = showStats ? (labelH + palPad + palRows * entryH + palPad) : 0;

  const W = patternW;
  const H = titleH + patternH + gap + palH;

  const patOX = Math.floor((W - M * C) / 2);
  const patOY = titleH + pad;

  const p = [];
  p.push('<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" font-family="Noto Sans SC, PingFang SC, Microsoft YaHei, sans-serif">');
  p.push('<style>@import url("https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600;700&amp;family=Ma+Shan+Zheng&amp;display=swap");</style>');
  // v136: 白底背景矩形（v128 透明底在手机/部分查看器中显示为黑色）
  p.push('<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="#FFFFFF"/>');
  // 标题栏：品牌名 + 豆板/模式/规格/总豆数/总色卡
  p.push('<text x="' + pad + '" y="100" font-size="180" font-weight="700" fill="#211E2B" dominant-baseline="middle">狐狸爱拼豆 | i 喵绘工坊</text>');   // v138 品牌名3倍(60→180)
  const specTextSVG = (sub && sub.cols > 0 ? sub.cols : M) + '×' + (sub && sub.cols > 0 ? sub.rows : M);
  const metaText = '豆板：' + state.N + '×' + state.N + '  模式：' + (state.mode === 'cartoon' ? '卡通' : '真实') + '  规格：' + specTextSVG + '  总豆数：' + totalBeads.toLocaleString() + '颗  总色卡：' + sorted.length + '色';
  p.push('<text x="' + pad + '" y="260" font-size="132" font-weight="700" fill="#6B6675" dominant-baseline="middle">' + escapeXml(metaText) + '</text>');   // v138 规格3倍(44→132)
  p.push('<line x1="0" y1="' + titleH + '" x2="' + W + '" y2="' + titleH + '" stroke="#ECE6E0" stroke-width="1"/>');

  const showcode = opts.showcode;
  const codeFont = Math.max(7, Math.floor(C * 0.5));
  // v140: Run-length 合并 — 同行相邻同色格合成一个宽矩形，大幅减少 SVG 元素
  for (let gy = 0; gy < M; gy++) {
    var runStart = 0;
    var runId = null, runBg = false, runHex = '#FFFFFF';
    var _getCell = function(gx) {
      if (gx >= dr.offX && gx < dr.offX + dr.drawCols && gy >= dr.offY && gy < dr.offY + dr.drawRows) {
        var sx = dr.srcMinX + (gx - dr.offX);
        var sy = dr.srcMinY + (gy - dr.offY);
        var tid = state.grid[sy][sx];
        var tbg = state.bgMask && state.bgMask[sy][sx];
        return { id: tid, bg: tbg, hex: (tid && !tbg) ? PALETTE_BY_ID[tid].hex : '#FFFFFF' };
      }
      return { id: null, bg: false, hex: '#FFFFFF' };
    };
    var _flushRun = function(endGx) {
      var w = (endGx - runStart) * C;
      if (w <= 0) return;
      // Mirror: run appears reversed, leftmost display position = M-endGx
      var rpx = state.mirror ? patOX + (M - endGx) * C : patOX + runStart * C;
      p.push('<rect x="' + rpx + '" y="' + (patOY + gy * C) + '" width="' + w + '" height="' + C + '" fill="' + runHex + '"/>');
      // Color codes: still emit per-cell (text positions are unique)
      if (showcode && runId && !runBg) {
        for (var tx = runStart; tx < endGx; tx++) {
          var tinfo = _getCell(tx);
          if (tinfo.id && !tinfo.bg) {
            var tpx = patOX + (state.mirror ? (M - 1 - tx) : tx) * C;
            var tfill = isLight(tinfo.hex) ? '#333333' : '#FFFFFF';
            p.push('<text x="' + (tpx + C / 2) + '" y="' + (patOY + gy * C + C / 2) + '" font-size="' + codeFont + '" font-family="monospace" text-anchor="middle" dominant-baseline="central" fill="' + tfill + '">' + tinfo.id + '</text>');
          }
        }
      }
    };
    for (var gx = 0; gx < M; gx++) {
      var info = _getCell(gx);
      var key = info.id || 'bg', isBg = !info.id || info.bg;
      if (gx === runStart) { runId = info.id; runBg = isBg; runHex = info.hex; continue; }
      if ((!isBg && !runBg && info.id === runId) || (isBg && runBg)) {
        // same run, continue
        continue;
      }
      _flushRun(gx);
      runStart = gx; runId = info.id; runBg = isBg; runHex = info.hex;
    }
    _flushRun(M);
  }

  // 豆子间隔线（始终显示，极淡）：让白色/浅色豆在白底上也能看出边界
  p.push('<g stroke="#F0F0F0" stroke-width="0.5">');
  for (let i = 1; i < M; i++) {
    const gx = patOX + i * C;
    p.push('<line x1="' + gx + '" y1="' + patOY + '" x2="' + gx + '" y2="' + (patOY + M * C) + '"/>');
  }
  for (let i = 1; i < M; i++) {
    const gy = patOY + i * C;
    p.push('<line x1="' + patOX + '" y1="' + gy + '" x2="' + (patOX + M * C) + '" y2="' + gy + '"/>');
  }
  p.push('</g>');

  if (opts.gridlines) {
    const interval = opts.interval || 10;
    // 竖线
    for (let i = 0; i <= M; i++) {
      const major = (i % interval === 0);
      const color = major ? 'rgba(30,30,30,0.65)' : '#EAEAEA';
      const lw = major ? 1.6 : 0.5;
      const gx = patOX + i * C + 0.5;
      p.push('<line x1="' + gx + '" y1="' + patOY + '" x2="' + gx + '" y2="' + (patOY + M * C) + '" stroke="' + color + '" stroke-width="' + lw + '"/>');
    }
    // 横线
    for (let i = 0; i <= M; i++) {
      const major = (i % interval === 0);
      const color = major ? 'rgba(30,30,30,0.65)' : '#EAEAEA';
      const lw = major ? 1.6 : 0.5;
      const gy = patOY + i * C + 0.5;
      p.push('<line x1="' + patOX + '" y1="' + gy + '" x2="' + (patOX + M * C) + '" y2="' + gy + '" stroke="' + color + '" stroke-width="' + lw + '"/>');
    }
  }

  if (opts.coords) {
    const cf = Math.max(9, C * 0.42);
    for (let i = 0; i < M; i++) {
      p.push('<text x="' + (patOX + i * C + C / 2) + '" y="' + (patOY + M * C + 4) + '" font-size="' + cf + '" fill="#999999" text-anchor="middle">' + i + '</text>');
    }
    for (let i = 0; i < M; i++) {
      p.push('<text x="' + (patOX - 4) + '" y="' + (patOY + i * C + C / 2) + '" font-size="' + cf + '" fill="#999999" text-anchor="end" dominant-baseline="central">' + i + '</text>');
    }
  }

  if (showStats && sorted.length > 0) {
    const palTop = titleH + patternH + gap;
    p.push('<line x1="0" y1="' + palTop + '" x2="' + W + '" y2="' + palTop + '" stroke="#ECE6E0" stroke-width="1"/>');
    p.push('<text x="' + palPad + '" y="' + (palTop + labelH / 2) + '" font-size="60" font-weight="700" fill="#211E2B" dominant-baseline="middle">用料详情</text>');   // v138 3倍(20→60)
    const gridStartY = palTop + labelH;
    for (let idx = 0; idx < sorted.length; idx++) {
      const id = sorted[idx][0], cnt = sorted[idx][1];
      const col = idx % palCols;
      const row = Math.floor(idx / palCols);
      const gx = palPad + col * entryW;
      const gy = gridStartY + palPad + row * entryH;
      const sw = 78;                   // v138 色块大小3倍(26→78)
      const sx = gx, sy = gy + (entryH - sw) / 2;
      p.push('<rect x="' + sx + '" y="' + sy + '" width="' + sw + '" height="' + sw + '" rx="3" fill="' + PALETTE_BY_ID[id].hex + '" stroke="#E2D8F2" stroke-width="0.5"/>');
      const tx = sx + sw + 7;
      p.push('<text x="' + tx + '" y="' + (gy + entryH / 2 - 14) + '" font-size="54" font-weight="700" fill="#211E2B" dominant-baseline="middle">' + id + '</text>');   // v138 色号3倍(18→54)
      p.push('<text x="' + tx + '" y="' + (gy + entryH / 2 + 26) + '" font-size="45" fill="#6B6675" dominant-baseline="middle">' + cnt + '</text>');   // v138 数量3倍(15→45)
    }
  }

  // ===== SVG 采购清单（按色系分组）=====
  if (showStats && sorted.length > 0 && opts.bom !== false) {
    const seriesNames = { A:'黄橙系', B:'绿色系', C:'蓝青系', D:'蓝紫系', E:'粉玫系', F:'红色系', G:'棕肤系', H:'黑白系', M:'大地系' };
    const bySeries = {};
    for (const [id2, cnt2] of sorted) {
      const mm = id2.match(/^([A-Za-z]+)/);
      if (!mm) continue;
      const ss = mm[1];
      if (!bySeries[ss]) bySeries[ss] = { name: seriesNames[ss] || ss+'系', items: [], subtotal: 0 };
      bySeries[ss].items.push({ id: id2, cnt: cnt2 });
      bySeries[ss].subtotal += cnt2;
    }
    const svgSeriesOrder = Object.keys(bySeries).sort();
    const svgListH = 30, svgLineH = 52, svgSeriesGap = 20;
    let svgExtra = 0;
    for (const s2 of svgSeriesOrder) svgExtra += svgSeriesGap + Math.ceil(bySeries[s2].items.length / 2) * svgLineH;
    svgExtra += svgListH + palPad * 2 + 60;

    const svgListTop = parseFloat(H) + (showStats && sorted.length > 0 ? 0 : 0); // already included in H? No - H was fixed.
    // Actually H was calculated earlier and doesn't include the采购清单. We need to add it.
    // Let's calculate newH and update the svg element
    var svgNewH = parseFloat(H) + svgExtra;

    // Divider
    p.push('<line x1="0" y1="' + H + '" x2="' + W + '" y2="' + H + '" stroke="#ECE6E0" stroke-width="1"/>');
    // Title
    p.push('<text x="' + palPad + '" y="' + (parseFloat(H) + svgListH + palPad) + '" font-size="60" font-weight="700" fill="#211E2B" dominant-baseline="middle">采购清单</text>');

    let syPos = parseFloat(H) + svgListH + palPad * 2;
    for (const s2 of svgSeriesOrder) {
      const block = bySeries[s2];
      p.push('<rect x="' + palPad + '" y="' + syPos + '" width="' + (W - palPad * 2) + '" height="' + svgLineH + '" fill="#F6F1FB"/>');
      p.push('<text x="' + (palPad + 10) + '" y="' + (syPos + svgLineH / 2) + '" font-size="30" font-weight="700" fill="#6A4C93" dominant-baseline="middle">' + s2 + '系（' + block.name + '）— 小计 ' + block.subtotal.toLocaleString() + ' 颗</text>');
      syPos += svgLineH + 4;

      const items = block.items;
      const svgColW = Math.floor((W - palPad * 3) / 2);
      for (let i2 = 0; i2 < items.length; i2 += 2) {
        for (let col = 0; col < 2; col++) {
          const idx = i2 + col;
          if (idx >= items.length) break;
          const item = items[idx];
          const cx = col === 0 ? palPad + 6 : palPad + svgColW + 6;
          p.push('<rect x="' + cx + '" y="' + (syPos + (svgLineH - 24) / 2) + '" width="24" height="24" fill="' + PALETTE_BY_ID[item.id].hex + '" stroke="#E2D8F2" stroke-width="0.5"/>');
          p.push('<text x="' + (cx + 34) + '" y="' + (syPos + svgLineH / 2) + '" font-size="24" font-weight="700" font-family="monospace" fill="#211E2B" dominant-baseline="middle">' + item.id + '</text>');
          p.push('<text x="' + (cx + 90) + '" y="' + (syPos + svgLineH / 2) + '" font-size="24" fill="#6B6675" dominant-baseline="middle">' + item.cnt.toLocaleString() + ' 颗</text>');
        }
        syPos += svgLineH;
      }
      syPos += svgSeriesGap;
    }
    // Grand total
    p.push('<line x1="' + palPad + '" y1="' + syPos + '" x2="' + (W - palPad) + '" y2="' + syPos + '" stroke="#ECE6E0" stroke-width="1"/>');
    syPos += 16;
    p.push('<text x="' + (W - palPad) + '" y="' + (syPos + 24) + '" font-size="36" font-weight="700" fill="#211E2B" text-anchor="end" dominant-baseline="middle">总计：' + totalBeads.toLocaleString() + ' 颗，' + sorted.length + ' 色</text>');

    // Update H to svgNewH for watermark rect
    // Since p is already built, we need to update the opening svg tag height and the closing watermark rect
    // The opening svg tag is at p[0] - let's update it
    p[0] = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + svgNewH + '" viewBox="0 0 ' + W + ' ' + svgNewH + '" font-family="Noto Sans SC, PingFang SC, Microsoft YaHei, sans-serif">';
    // Update white background rect
    p[2] = '<rect x="0" y="0" width="' + W + '" height="' + svgNewH + '" fill="#FFFFFF"/>';
    // The watermark is at the end, we'll replace it
    // Remove the old watermark lines (last 5 elements)
    var wmIdx = p.length;
    while (wmIdx > 0 && p[wmIdx - 1].indexOf('url(#wm)') < 0) wmIdx--;
    if (wmIdx > 0) {
      // Keep p[0..wmIdx-1], replace the rest with updated watermark
      p.length = wmIdx;
    }
    p.push('<rect x="0" y="0" width="' + W + '" height="' + svgNewH + '" fill="url(#wm)"/>');
    p.push('</svg>');
  }

  // Remove old standalone </svg> and watermark if they exist (they were already handled above)
  // The original code after this had: p.push('</svg>'); return '<?xml...'
  // But if we already added </svg> above, we need to skip the original one.
  // For simplicity, let's not touch the remaining code and handle it in the original flow.

  // 水印：斜向平铺 SVG pattern
  // If采购清单 was already added, it handled watermark + </svg> + return
  var _hasList = (showStats && sorted.length > 0);
  if (_hasList) {
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + p.join('');
  }
  p.push('<defs>');
  p.push('<pattern id="wm" x="0" y="0" width="360" height="240" patternUnits="userSpaceOnUse" patternTransform="rotate(-45 180 120)">');
  p.push('<text x="180" y="120" font-size="42" font-style="italic" font-weight="700" fill="#7A7A7A" opacity="0.28" text-anchor="middle" dominant-baseline="central">mxm</text>');
  p.push('</pattern>');
  p.push('</defs>');
  p.push('<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="url(#wm)"/>');

  p.push('</svg>');
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + p.join('');
}

function downloadSVG(svgStr, name) {
  if (isMobileDevice()) {
    // 移动端统一渲染为 PNG 位图，确保长按可保存（SVG 长按时浏览器常无菜单）
    const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const im = new Image();
    im.onload = () => {
      const c = document.createElement('canvas');
      // v91: 4x 渲染 SVG→PNG，确保移动端导出图放大后色号仍清晰（SVG 是矢量，渲染分辨率越高越锐利）
      const SCALE = 4;
      c.width = (im.naturalWidth || 1000) * SCALE;
      c.height = (im.naturalHeight || 1000) * SCALE;
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      genPNGSource(c, src => showMobileSaveOverlay(src));
    };
    im.onerror = () => {
      URL.revokeObjectURL(url);
      showMobileSaveOverlay(null, '生成失败，请重试');
    };
    im.src = url;
    return;
  }
  const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** 圆角矩形辅助 */
function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function escapeXml(s) {
  return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[m]));
}
function isLight(hex) {
  const { r, g, b } = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) > 150;
}

