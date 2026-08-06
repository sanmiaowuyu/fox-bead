/* ---------- 7. 渲染 ---------- */
function renderAll() {
  renderCanvas();
  // 布局稳定后再补一帧重绘，避免导入瞬间容器尺寸未就绪导致预览「展示不全」（下载用独立 canvas 不受影响）
  requestAnimationFrame(renderCanvas);
  renderPalette();
  renderStats();
  // v139: 处理完成，移除指示器
  var cw = document.getElementById('canvas-wrap');
  if (cw) cw.classList.remove('processing');
  // v140: 去背景状态反馈
  updateBgHint();
}
/** 给每颗豆子画极淡的间隔线，确保白色/浅色豆在白底上也能看出边界 */
function drawBeadBorders(c, ox, oy, cols, rows, cell, color) {
  c.strokeStyle = color;
  c.lineWidth = Math.max(1, Math.round(cell * 0.03));
  c.beginPath();
  for (let i = 1; i < cols; i++) {
    const p = ox + i * cell;
    c.moveTo(p, oy); c.lineTo(p, oy + rows * cell);
  }
  for (let i = 1; i < rows; i++) {
    c.moveTo(ox, oy + i * cell); c.lineTo(ox + cols * cell, oy + i * cell);
  }
  c.stroke();
}

/** 白底模式下，极浅色豆（如 A1/H1/H2）和白底同色会看不见。
 *  这里不改变色号，只把渲染填充色稍微加深为 #F5F5F5，确保电子版图纸可见。
 *  实际拼豆仍按原色号（色板/清单/导出色号）统计，不受影响。 */
function getVisibleFill(id) {
  if (!id || state.bgMode !== 'white') return PALETTE_BY_ID[id].hex;
  const lab = LAB_BY_ID[id];
  if (!lab) return PALETTE_BY_ID[id].hex;
  // L 接近 1.0 的极浅色在白底上会消失，渲染时统一用浅灰显示
  if (lab.L > 0.92) return '#F5F5F5';
  return PALETTE_BY_ID[id].hex;
}

// v128: 透明背景指示——画浅灰棋盘格表示「无豆/背景格」，与实色豆、白底明显区分。
// 拼豆时一眼看出哪格不用放豆；导出时背景格不绘制(即透明底)。
function drawEmptyCell(ctx, px, py, cell) {
  const h = Math.max(1, Math.floor(cell / 2));
  ctx.fillStyle = '#E4E4EA';
  ctx.fillRect(px, py, cell, cell);
  ctx.fillStyle = '#D2D2DA';
  ctx.fillRect(px, py, h, h);
  ctx.fillRect(px + h, py + h, h, h);
}
// 某格是否为背景(透明/无豆)
function isBgCell(y, x) {
  return !!(state.bgMask && state.bgMask[y] && state.bgMask[y][x]);
}

function renderCanvas() {
  const N = state.N;
  const dpr = window.devicePixelRatio || 1;
  const zoom = state.zoom;
  // v100: 预览显示 M×M（和导出一致），M=N-4 固定裁剪尺寸
  const dr = state.displayRect;
  const M = dr ? dr.M : N;
  const base = M * CELL;
  const cssSize = Math.round(base * zoom);

  const showCoords = state.showCoords;
  // 坐标轴字号（CSS px）：随格子大小自适应，限制在合理范围，避免手机上过大/过小
  const cellCss0 = cssSize / M;
  const fsCss = showCoords ? Math.max(10, Math.min(22, Math.round(cellCss0 * 0.42))) : 0;
  // 左边距：按「最大位数的数字宽度」预留，避免多位数(如 110)在手机高 dpr 下被左边缘裁切
  const maxDigits = (M - 1).toString().length;
  const marginSide = showCoords ? Math.round(fsCss * maxDigits * 0.62 + 8) : 0;
  const marginLeft = marginSide, marginBottom = marginSide;

  // backing store：按 DPR 放大，确保每格至少 1 物理像素
  const px = Math.max(M, Math.round(cssSize * dpr));
  const marginLeftPx = Math.round(marginLeft * dpr);
  const marginBottomPx = Math.round(marginBottom * dpr);

  canvas.width = px + marginLeftPx;
  canvas.height = px + marginBottomPx;
  // CSS 显示尺寸：在父容器内等比缩放，宽高用同一比例（canvas 为正方形 + 对称边距，比例天然 1:1），
  // 否则 CSS 的 max-width/max-height 会各自独立压缩宽和高，把画布拉扁。
  const rawW = canvas.width / dpr;
  const rawH = canvas.height / dpr;
  const wrap = canvas.parentElement;   // .canvas-wrap 有确定尺寸(flex:1 / min-height)，不受 canvas 撑大
  // 关键修复：导入瞬间容器尺寸可能未就绪(clientWidth/Height=0)，不能兜底为「画布自身尺寸」(rawW/rawH)，
  // 否则 fit=1、canvas 画得比容器大被 CSS 裁切 → 导入图片「展示不全」。兜底层用窗口安全尺寸，保证缩小完整显示。
  const availW = wrap.clientWidth || Math.min(window.innerWidth, 900);
  const availH = wrap.clientHeight || Math.min(window.innerHeight, 700);
  const fit = Math.min(1, availW / rawW, availH / rawH);
  canvas.style.width = Math.round(rawW * fit) + 'px';
  canvas.style.height = Math.round(rawH * fit) + 'px';

  // 坐标文字字号（物理像素）与边距内留白，统一用物理像素，避免高 dpr 下被裁
  const fs = Math.max(9, Math.round(fsCss * dpr));
  const coordPad = Math.max(3, Math.round(fs * 0.18));

  // 每格物理像素尺寸（整数，杜绝亚像素）
  const cell = Math.floor(px / M);
  // 居中偏移（处理整除余数），坐标轴边距放在左侧和底部
  const ox = marginLeftPx + Math.floor((px - cell * M) / 2);
  const oy = Math.floor((px - cell * M) / 2);

  ctx.imageSmoothingEnabled = false;   // 全局关闭平滑

  // 底色（跟随 bgMode）
  ctx.fillStyle = state.bgMode === 'black' ? '#000000' : '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // v92: canvas 元素 CSS 背景也跟随 bgMode（避免 CSS 硬编码 #fff 导致黑底圆角/边距露白）
  canvas.style.backgroundColor = state.bgMode === 'black' ? '#000000' : '#FFFFFF';

  if (state.view === 'original' && state.sourceImage) {
    ctx.imageSmoothingEnabled = true;
    if (state.mirror) { ctx.save(); ctx.translate(px + marginLeftPx, 0); ctx.scale(-1, 1); }  // 镜像水平翻转原图
    const cr = getCropRect(state.sourceImage);
    // letterbox：在正方形画布内按比例居中显示，四周白底，不裁不拉
    const scale = Math.min(px / cr.sw, px / cr.sh);
    const dw = Math.round(cr.sw * scale), dh = Math.round(cr.sh * scale);
    const dx = Math.floor((px - dw) / 2) + marginLeftPx, dy = Math.floor((px - dh) / 2);
    ctx.drawImage(state.sourceImage, cr.sx, cr.sy, cr.sw, cr.sh, dx, dy, dw, dh);
    if (state.mirror) ctx.restore();
    return;
  }
  if (!state.grid) return;

  // ===== v100: 遍历 M×M 显示格，映射到 grid 源坐标（内容居中，四周填背景色），和导出完全一致 =====
  for (let gy = 0; gy < M; gy++) {
    for (let gx = 0; gx < M; gx++) {
      let id = null;
      let bgY = gy, bgX = gx;   // 背景判定坐标，默认显示坐标；isBgCell(y, x) 顺序
      if (dr && gx >= dr.offX && gx < dr.offX + dr.drawCols && gy >= dr.offY && gy < dr.offY + dr.drawRows) {
        const sx = dr.srcMinX + (gx - dr.offX);
        const sy = dr.srcMinY + (gy - dr.offY);
        id = state.grid[sy][sx];
        bgY = sy; bgX = sx;     // 在显示区域内 → 用源坐标判定背景
      }
      const dispX = state.mirror ? (M - 1 - gx) : gx;   // 镜像：水平翻转列
      const pxX = ox + dispX * cell;     // 整数 ✓
      const pyY = oy + gy * cell;        // 整数 ✓
      // v128: 背景格(四周留白)画透明棋盘格，与实色豆区分；主体内白豆正常显示
      const isBg = isBgCell(bgY, bgX);
      if (id == null || isBg) {
        drawEmptyCell(ctx, pxX, pyY, cell);
      } else {
        ctx.fillStyle = PALETTE_BY_ID[id].hex;
        ctx.fillRect(pxX, pyY, cell, cell);  // 整数尺寸 ✓ 零间隙 ✓
      }
    }
  }

  // 豆子间隔线：让浅色豆在白底/黑底上都有边界可辨
  drawBeadBorders(ctx, ox, oy, M, M, cell, state.bgMode === 'black' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)');

  // 网格线：每 1 格虚线(浅色辅助) + 每 10 格实线(深色计数)，与导出图纸风格一致
  if (state.showGrid) {
    const interval = 10;
    for (let i = 1; i < M; i++) {
      const major = (i % interval === 0);
      const p = ox + i * cell;
      if (major) {
        ctx.strokeStyle = 'rgba(30,30,30,0.65)';
        ctx.lineWidth = Math.max(2, Math.round(cell * 0.15));
        ctx.setLineDash([]);
      } else {
        ctx.strokeStyle = 'rgba(150,150,150,0.35)';
        ctx.lineWidth = Math.max(1, Math.round(cell * 0.05));
        const dash = Math.max(2, Math.round(cell * 0.35));
        ctx.setLineDash([dash, dash]);
      }
      ctx.beginPath(); ctx.moveTo(p, oy); ctx.lineTo(p, oy + M * cell); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ox, p); ctx.lineTo(ox + M * cell, p); ctx.stroke();
    }
    ctx.setLineDash([]); // 恢复实线，避免影响后续绘制
  }

  // 坐标数字：左侧纵轴 / 底部横轴，每 10 格标注，方便对照图纸
  if (showCoords) {
    const interval = 10;
    ctx.fillStyle = '#6B6675';
    ctx.font = `${fs}px monospace`;
    // 左侧纵轴（右对齐到左边距内，留白 coordPad，确保多位数不被裁切）
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let i = 0; i < M; i += interval) {
      ctx.fillText(i.toString(), marginLeftPx - coordPad, oy + i * cell + cell / 2);
    }
    // 底部横轴
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (let i = 0; i < M; i += interval) {
      ctx.fillText(i.toString(), ox + i * cell + cell / 2, oy + M * cell + coordPad);
    }
  }
  // v100: 存渲染几何供编辑交互用（主预览不再画编辑高亮，编辑交互改在独立大图画板 v102）
  renderGeom = { M: M, ox: ox, oy: oy, cell: cell };
}
function applyZoom() { renderCanvas(); }
// v140: 增量重绘主预览单格（编辑器改色后只重绘被改格，不重建全图）
function patchMainCell(gy, gx, colorId) {
  if (!renderGeom || !state.grid) return;
  var g = renderGeom;
  var dr = state.displayRect;
  var M = g.M;
  if (gx < 0 || gx >= M || gy < 0 || gy >= M) return;
  var dispX = state.mirror ? (M - 1 - gx) : gx;
  var px = g.ox + dispX * g.cell;
  var py = g.oy + gy * g.cell;
  // 判定是否背景格
  var bgY = gy, bgX = gx;
  if (dr && gx >= dr.offX && gx < dr.offX + dr.drawCols && gy >= dr.offY && gy < dr.offY + dr.drawRows) {
    bgY = dr.srcMinY + (gy - dr.offY);
    bgX = dr.srcMinX + (gx - dr.offX);
  }
  var isBg = isBgCell(bgY, bgX);
  if (colorId == null || isBg) {
    drawEmptyCell(ctx, px, py, g.cell);
  } else {
    ctx.fillStyle = PALETTE_BY_ID[colorId].hex;
    ctx.fillRect(px, py, g.cell, g.cell);
  }
  // 补豆子间隔线
  ctx.strokeStyle = state.bgMode === 'black' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)';
  ctx.lineWidth = Math.max(1, Math.round(g.cell * 0.03));
  ctx.strokeRect(px, py, g.cell, g.cell);
}
function updateBgHint() {
  var hint = document.getElementById('canvas-hint');
  if (!hint) return;
  var msg = {
    'no_bg': '去背景：未检测到纯色背景，图片已保留完整。建议用豆包生成纯色底图后再上传。',
    'small': '去背景：板子≤52格，自动跳过以防止小图主体被误删。',
    'full': '去背景：背景区域过大，为防止误删主体已跳过。可尝试手动排除背景色。'
  }[state.bgStatus];
  if (msg) {
    hint.textContent = msg;
    hint.style.color = '#C0392B';
  }
}

