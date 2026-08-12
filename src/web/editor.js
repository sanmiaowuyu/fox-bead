/* ---------- v103: 编辑模式——按草图布局，左色板+右大图+右下角确认；无放大预览窗、无缩放控件 ---------- */
var renderGeom = null; // 兼容旧引用（renderCanvas 仍写，但编辑交互已迁到独立大图画板）
var editCell = 18;     // 编辑大图每格像素（固定18px；v103 去掉缩放）
var editSelSet = null; // Set("gx,gy") 选中格（显示坐标，已镜像反转后）
var editHover = null;  // {gx,gy} 当前悬停格
var editCanvas = null, editOctx = null, editOvCanvas = null, editOvCtx = null, editGeom = null, editBound = false;
var editZoom = 1, editPanX = 0, editPanY = 0, editViewEl = null, editStageEl = null, editSpaceDown = false, editPanning = false, editPanStart = null, editPinch = null;
var editOrigGrid = null, editOrigBg = null; // v120: 打开编辑时的原始网格/背景掩码快照，供"清除"还原选格原色
var touchStartPt = null, touchMoved = false;  // v113: 触摸点记录，用于区分 轻点(选单格) vs 拖动(平移)
var editPainting = false, editPaintSet = null, paintCells = null; // v(本版): 手绘工具拖动状态

// 屏幕坐标→编辑大图格子坐标（已镜像反转，等价于 renderCanvas 显示列→源列映射）
function screenToEditGrid(clientX, clientY) {
  if (!editGeom) return null;
  var rect = editCanvas.getBoundingClientRect();
  var scaleX = editCanvas.width / rect.width;
  var scaleY = editCanvas.height / rect.height;
  var px = (clientX - rect.left) * scaleX;
  var py = (clientY - rect.top) * scaleY;
  var g = editGeom;
  var dispX = Math.floor((px - g.ox) / g.cell);
  var dispY = Math.floor((py - g.oy) / g.cell);
  if (dispX < 0 || dispX >= g.M || dispY < 0 || dispY >= g.M) return null;
  var gx = state.mirror ? (g.M - 1 - dispX) : dispX;
  return { gx: gx, gy: dispY };
}

// 显示格子→grid 源坐标（映射到原始 grid；背景填充区返回 null 不可编辑）
function dispToSrc(gx, gy) {
  var dr = state.displayRect;
  if (!dr) return null;
  if (gx >= dr.offX && gx < dr.offX + dr.drawCols && gy >= dr.offY && gy < dr.offY + dr.drawRows) {
    return { x: dr.srcMinX + (gx - dr.offX), y: dr.srcMinY + (gy - dr.offY) };
  }
  return null;
}

// 构建左侧常驻色号区（221色，按字母+数字排序）
function buildEditColors() {
  var gridEl = $('edit-colors-grid');
  gridEl.innerHTML = '';
  var sorted = PALETTE.slice().sort(function (a, b) {
    var ma = a.id.match(/^([A-Za-z]+)(\d+)$/);
    var mb = b.id.match(/^([A-Za-z]+)(\d+)$/);
    if (!ma || !mb) return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    if (ma[1] !== mb[1]) return ma[1] < mb[1] ? -1 : 1;
    return parseInt(ma[2], 10) - parseInt(mb[2], 10);
  });
  for (var i = 0; i < sorted.length; i++) {
    (function (c) {
      // 按背景亮度自动选黑/白文字，保证色块内色号可读
      var h = c.hex.replace('#', '');
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      var r = parseInt(h.substr(0, 2), 16) / 255, g = parseInt(h.substr(2, 2), 16) / 255, b = parseInt(h.substr(4, 2), 16) / 255;
      var f = function (x) { return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
      var lum = 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      var txt = lum > 0.55 ? '#000000' : '#FFFFFF';
      var el = document.createElement('div');
      el.className = 'edit-color-item';
      el.title = c.id;
      el.innerHTML = '<div class="ec-sw" style="background:' + c.hex + '"><span class="ec-id" style="color:' + txt + '">' + c.id + '</span></div>';
      el.addEventListener('click', function () { state.selectedColor = c.id; updatePaintColorLabel(); applyEditColor(c.id); });
      gridEl.appendChild(el);
    })(sorted[i]);
  }
}

// v126: 色号一键替换——不依赖选区，把整张图里某个色号全部换成另一个色号（适合批量换色/点眼睛高光）
function buildEditReplaceOptions() {
  if (!state.grid) return;
  var counts = {};
  var N = state.grid.length;
  for (var y = 0; y < N; y++) {
    var row = state.grid[y];
    for (var x = 0; x < N; x++) {
      var id = row[x];
      if (id != null) counts[id] = (counts[id] || 0) + 1;
    }
  }
  var present = Object.keys(counts).sort(function (a, b) {
    var ma = a.match(/^([A-Za-z]+)(\d+)$/), mb = b.match(/^([A-Za-z]+)(\d+)$/);
    if (!ma || !mb) return a < b ? -1 : 1;
    if (ma[1] !== mb[1]) return ma[1] < mb[1] ? -1 : 1;
    return parseInt(ma[2], 10) - parseInt(mb[2], 10);
  });
  var fromSel = $('edit-replace-from'), toSel = $('edit-replace-to');
  fromSel.innerHTML = ''; toSel.innerHTML = '';
  for (var i = 0; i < present.length; i++) {
    var id = present[i];
    var hex = (PALETTE_BY_ID[id] && PALETTE_BY_ID[id].hex) ? PALETTE_BY_ID[id].hex : '';
    var opt = document.createElement('option');
    opt.value = id;
    opt.textContent = id + (hex ? ' ' + hex.toUpperCase() : '');
    fromSel.appendChild(opt);
  }
  var all = PALETTE.slice().sort(function (a, b) {
    var ma = a.id.match(/^([A-Za-z]+)(\d+)$/), mb = b.id.match(/^([A-Za-z]+)(\d+)$/);
    if (!ma || !mb) return a.id < b.id ? -1 : 1;
    if (ma[1] !== mb[1]) return ma[1] < mb[1] ? -1 : 1;
    return parseInt(ma[2], 10) - parseInt(mb[2], 10);
  });
  for (var j = 0; j < all.length; j++) {
    var o2 = document.createElement('option');
    o2.value = all[j].id;
    o2.textContent = all[j].id + ' ' + all[j].hex.toUpperCase();
    toSel.appendChild(o2);
  }
  if (PALETTE_BY_ID['H2']) toSel.value = 'H2'; // 默认目标选白色，方便点眼睛高光
  updateReplaceInfo();
}

function updateReplaceInfo() {
  var fromSel = $('edit-replace-from');
  if (!fromSel || !fromSel.options.length) {
    $('edit-replace-info').textContent = '当前图无可替换色';
    $('edit-replace-btn').textContent = '一键替换';
    return;
  }
  var fromId = fromSel.value;
  var N = state.grid.length, c = 0;
  for (var y = 0; y < N; y++) {
    var row = state.grid[y];
    for (var x = 0; x < N; x++) if (row[x] === fromId) c++;
  }
  $('edit-replace-info').textContent = fromId + ' 共 ' + c + ' 格';
  $('edit-replace-btn').textContent = '一键替换（' + c + ' 格）';
}

function replaceColorById() {
  _pushUndo();
  var fromSel = $('edit-replace-from'), toSel = $('edit-replace-to');
  if (!fromSel || !fromSel.options.length) return;
  var fromId = fromSel.value, toId = toSel.value;
  if (!fromId || !toId || fromId === toId) return;
  var N = state.grid.length, c = 0;
  for (var y = 0; y < N; y++) {
    var row = state.grid[y];
    for (var x = 0; x < N; x++) {
      if (row[x] === fromId) {
        row[x] = toId;
        if (state.bgMask && state.bgMask[y]) state.bgMask[y][x] = false;
        c++;
      }
    }
  }
  renderEditCanvas(); renderCanvas(); renderStats();
  buildEditReplaceOptions(); // 刷新可替换列表（源色可能已消失）
}

// 渲染编辑大图（底层 base canvas）：完整图案，每格 editCell 像素，可滚动
function renderEditCanvas() {
  if (!editCanvas || !state.grid || !state.displayRect) return;
  var dr = state.displayRect;
  var M = dr.M;
  var cell = editCell;
  var margin = state.showCoords ? Math.round(cell * 2.5) : 0;
  var size = M * cell + margin;
  editCanvas.width = size; editCanvas.height = size;
  editOvCanvas.width = size; editOvCanvas.height = size;
  var ctx = editOctx;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = state.bgMode === 'black' ? '#000000' : '#FFFFFF';
  ctx.fillRect(0, 0, size, size);
  editGeom = { M: M, ox: margin, oy: 0, cell: cell };
  for (var gy = 0; gy < M; gy++) {
    for (var gx = 0; gx < M; gx++) {
      var id = null;
      if (gx >= dr.offX && gx < dr.offX + dr.drawCols && gy >= dr.offY && gy < dr.offY + dr.drawRows) {
        id = state.grid[dr.srcMinY + (gy - dr.offY)][dr.srcMinX + (gx - dr.offX)];
      }
      var dispX = state.mirror ? (M - 1 - gx) : gx;
      var px = editGeom.ox + dispX * cell;
      var py = editGeom.oy + gy * cell;
      // v128: 背景格画透明棋盘格，与实色豆区分
      if (id == null || isBgCell(dr.srcMinY + (gy - dr.offY), dr.srcMinX + (gx - dr.offX))) {
        drawEmptyCell(ctx, px, py, cell);
      } else {
        ctx.fillStyle = (PALETTE_BY_ID[id] || {}).hex || '#cccccc';
        ctx.fillRect(px, py, cell, cell);
      }
    }
  }
  drawBeadBorders(ctx, editGeom.ox, editGeom.oy, M, M, cell, state.bgMode === 'black' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)');
  if (state.showGrid) {
    var interval = 10;
    for (var i = 1; i < M; i++) {
      var major = (i % interval === 0);
      var p = editGeom.ox + i * cell;
      ctx.strokeStyle = major ? 'rgba(30,30,30,0.65)' : 'rgba(150,150,150,0.35)';
      ctx.lineWidth = major ? Math.max(2, Math.round(cell * 0.15)) : Math.max(1, Math.round(cell * 0.05));
      ctx.setLineDash(major ? [] : [Math.max(2, Math.round(cell * 0.35)), Math.max(2, Math.round(cell * 0.35))]);
      ctx.beginPath(); ctx.moveTo(p, editGeom.oy); ctx.lineTo(p, editGeom.oy + M * cell); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(editGeom.ox, p); ctx.lineTo(editGeom.ox + M * cell, p); ctx.stroke();
    }
    ctx.setLineDash([]);
  }
  if (state.showCoords) {
    var fs = Math.max(9, Math.round(cell * 0.5));
    ctx.fillStyle = '#6B6675';
    ctx.font = fs + 'px monospace';
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (var k = 0; k < M; k += interval) ctx.fillText(k.toString(), editGeom.ox - Math.max(3, Math.round(fs * 0.18)), editGeom.oy + k * cell + cell / 2);
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (var k2 = 0; k2 < M; k2 += interval) ctx.fillText(k2.toString(), editGeom.ox + k2 * cell + cell / 2, editGeom.oy + M * cell + Math.max(3, Math.round(fs * 0.18)));
  }
  drawEditOverlayCanvas();
  if (editStageEl) { editStageEl.style.width = size + 'px'; editStageEl.style.height = size + 'px'; }
}

// 在 overlay canvas 上画 悬停 + 选区 高亮（不重绘底层图案，性能好）
function drawEditOverlayCanvas() {
  if (!editOvCtx || !editGeom) return;
  var g = editGeom;
  editOvCtx.clearRect(0, 0, editOvCanvas.width, editOvCanvas.height);
  if (state.editSel && state.editSel.length) {
    // v120: 主题紫半透明填充（黑/白底豆子都可见，跟随品牌色 --accent-ink）
    editOvCtx.fillStyle = 'rgba(106,76,147,0.20)';
    var lw = Math.max(2, Math.round(g.cell * 0.12));
    for (var i = 0; i < state.editSel.length; i++) {
      var s = state.editSel[i];
      var dispX = state.mirror ? (g.M - 1 - s.gx) : s.gx;
      var px = g.ox + dispX * g.cell, py = g.oy + s.gy * g.cell;
      editOvCtx.fillRect(px, py, g.cell, g.cell);
      // 白色外圈（黑底豆子也清晰）+ 主题紫内圈（白底豆子也清晰），双圈保证任意底色可见
      editOvCtx.lineWidth = lw + 2;
      editOvCtx.strokeStyle = '#FFFFFF';
      editOvCtx.strokeRect(px + 1, py + 1, g.cell - 2, g.cell - 2);
      editOvCtx.lineWidth = lw;
      editOvCtx.strokeStyle = '#6A4C93';
      editOvCtx.strokeRect(px + 1, py + 1, g.cell - 2, g.cell - 2);
    }
  }
  if (editHover) {
    var hdispX = state.mirror ? (g.M - 1 - editHover.gx) : editHover.gx;
    var hpx = g.ox + hdispX * g.cell, hpy = g.oy + editHover.gy * g.cell;
    // v120: hover 同样白外圈+紫内圈，黑底豆子也可见
    var hlw = Math.max(2, Math.round(g.cell * 0.14));
    editOvCtx.lineWidth = hlw + 2;
    editOvCtx.strokeStyle = '#FFFFFF';
    editOvCtx.strokeRect(hpx + 1, hpy + 1, g.cell - 2, g.cell - 2);
    editOvCtx.lineWidth = hlw;
    editOvCtx.strokeStyle = '#6A4C93';
    editOvCtx.strokeRect(hpx + 1, hpy + 1, g.cell - 2, g.cell - 2);
  }
}

// 选色后替换选中格子（选区保留，可继续点别的色）
function setEditSel(list) {
  state.editSel = list;
  editSelSet = {};
  for (var i = 0; i < list.length; i++) editSelSet[list[i].gx + ',' + list[i].gy] = true;
  $('edit-selinfo').textContent = list.length ? ('已选 ' + list.length + ' 格') : '未选中';
}

// v120: 「清除」=把选中格还原为打开编辑时的原色（撤销改色）+取消选中
function clearEditSelColor() {
  _pushUndo();
  if (state.editSel && state.editSel.length && editOrigGrid) {
    for (var i = 0; i < state.editSel.length; i++) {
      var s = state.editSel[i];
      var src = dispToSrc(s.gx, s.gy);
      if (src && editOrigGrid[src.y] && editOrigGrid[src.y][src.x] !== undefined) {
        state.grid[src.y][src.x] = editOrigGrid[src.y][src.x];
        if (state.bgMask && editOrigBg && editOrigBg[src.y]) state.bgMask[src.y][src.x] = editOrigBg[src.y][src.x];
        _patchEditCell(s.gx, s.gy, state.grid[src.y][src.x]);
        patchMainCell(s.gy, s.gx, state.grid[src.y][src.x]);
      }
    }
    renderStats();
  }
  setEditSel([]);
  drawEditOverlayCanvas();
}

// v140: 增量重绘单格（不重建整张编辑画布）
function _patchEditCell(gx, gy, colorId) {
  if (!editOctx || !editGeom) return;
  var g = editGeom;
  var dispX = state.mirror ? (g.M - 1 - gx) : gx;
  var px = g.ox + dispX * g.cell;
  var py = g.oy + gy * g.cell;
  var cell = g.cell;
  if (colorId == null) {
    drawEmptyCell(editOctx, px, py, cell);
  } else {
    editOctx.fillStyle = (PALETTE_BY_ID[colorId] || {}).hex || '#cccccc';
    editOctx.fillRect(px, py, cell, cell);
  }
  // 补画豆子间隔线（四周像素边界）
  editOctx.strokeStyle = state.bgMode === 'black' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)';
  editOctx.lineWidth = Math.max(1, Math.round(cell * 0.03));
  editOctx.strokeRect(px, py, cell, cell);
}
// v140: 编辑撤销/重做
var _undoStack = [], _redoStack = [], _maxUndo = 30;
function _pushUndo() {
  if (!state.grid) return;
  var snap = { grid: state.grid.map(function(r) { return r.slice(); }), bgMask: state.bgMask ? state.bgMask.map(function(r) { return r.slice(); }) : null };
  _undoStack.push(snap);
  if (_undoStack.length > _maxUndo) _undoStack.shift();
  _redoStack = [];
}
function undoEdit() {
  if (!_undoStack.length || !state.grid) return;
  _redoStack.push({ grid: state.grid.map(function(r) { return r.slice(); }), bgMask: state.bgMask ? state.bgMask.map(function(r) { return r.slice(); }) : null });
  var snap = _undoStack.pop();
  state.grid = snap.grid;
  state.bgMask = snap.bgMask;
  renderEditCanvas(); renderCanvas(); renderStats();
}
function clearUndoHistory() { _undoStack = []; _redoStack = []; }
function redoEdit() {
  if (!_redoStack.length || !state.grid) return;
  _undoStack.push({ grid: state.grid.map(function(r) { return r.slice(); }), bgMask: state.bgMask ? state.bgMask.map(function(r) { return r.slice(); }) : null });
  var snap = _redoStack.pop();
  state.grid = snap.grid;
  state.bgMask = snap.bgMask;
  renderEditCanvas(); renderCanvas(); renderStats();
}
// 选色后替换选中格子（选区保留，可继续点别的色）
function applyEditColor(colorId) {
  if (!state.editSel || state.editSel.length === 0) return;
  _pushUndo();
  if (!state.editSel || state.editSel.length === 0) return;
  var patched = {};
  for (var i = 0; i < state.editSel.length; i++) {
    var s = state.editSel[i];
    var src = dispToSrc(s.gx, s.gy);
    if (src && state.grid[src.y] && state.grid[src.y][src.x] !== undefined) {
      state.grid[src.y][src.x] = colorId;
      if (state.bgMask && state.bgMask[src.y]) state.bgMask[src.y][src.x] = false;
      _patchEditCell(s.gx, s.gy, colorId);
      patchMainCell(s.gy, s.gx, colorId);
      patched[s.gx + ',' + s.gy] = true;
    }
  }
  drawEditOverlayCanvas();
  renderStats();
}

// v(本版): 手绘工具——把拖动经过的格子刷成当前画笔色(state.selectedColor)
function updatePaintColorLabel() {
  var lbl = $('edit-paint-color');
  if (lbl) lbl.textContent = '画笔：' + (state.selectedColor || '—');
}
function paintCell(gx, gy) {
  if (!state.selectedColor) return false;
  var src = dispToSrc(gx, gy);
  if (!src || !state.grid[src.y] || state.grid[src.y][src.x] === undefined) return false;
  state.grid[src.y][src.x] = state.selectedColor;
  if (state.bgMask && state.bgMask[src.y]) state.bgMask[src.y][src.x] = false;
  _patchEditCell(gx, gy, state.selectedColor);
  patchMainCell(gy, gx, state.selectedColor);
  return true;
}
function startPaint(gx, gy) {
  _pushUndo();
  paintCells = []; editPaintSet = {};
  doPaint(gx, gy);
}
function doPaint(gx, gy) {
  if (!paintCells) return;
  var key = gx + ',' + gy;
  if (editPaintSet[key]) return;
  if (paintCell(gx, gy)) {
    paintCells.push({ gx: gx, gy: gy });
    editPaintSet[key] = true;
    setEditSel(paintCells.slice()); // 实时高亮已刷格子
  }
}
function endPaint() {
  if (paintCells) { setEditSel(paintCells); renderStats(); }
  paintCells = null; editPaintSet = null;
}

// 打开 / 关闭 编辑大图面板
function openEditor() {
  if (!state.grid) { alert('请先上传或载入一张图片再编辑'); return; }
  editCanvas = $('edit-canvas');
  editOctx = editCanvas.getContext('2d');
  editOvCanvas = $('edit-overlay-canvas');
  editOvCtx = editOvCanvas.getContext('2d');
  editViewEl = $('edit-canvas-viewport');
  editStageEl = $('edit-canvas-stage');
  state.editMode = true;
  state.editSel = [];
  $('btn-edit').classList.add('active');
  buildEditColors();
  buildEditReplaceOptions(); // v126: 填充色号替换下拉（基于当前图实际出现的色）
  $('edit-overlay').hidden = false;
  renderEditCanvas();
  // v120: 快照原始网格+背景掩码，供"清除"把选格还原为原色
  editOrigGrid = state.grid.map(function (r) { return r.slice(); });
  editOrigBg = state.bgMask ? state.bgMask.map(function (r) { return r.slice(); }) : null;
  // 同步工具切换 UI 与画笔色显示
  var tseg = $('edit-tool-seg');
  if (tseg) tseg.querySelectorAll('.seg-item').forEach(function (s) {
    s.classList.toggle('active', s.dataset.tool === state.editTool);
  });
  updatePaintColorLabel();
  fitEditView();
}
function closeEditor() {
  state.editMode = false;
  state.editSel = [];
  editHover = null;
  $('btn-edit').classList.remove('active');
  $('edit-overlay').hidden = true;
  renderCanvas();
  renderStats();
}
function toggleEditMode() {
  if (state.editMode) closeEditor(); else openEditor();
}

// 视图：缩放 / 平移（画布式交互，无滚动条）
var editViewRaf = false;
function applyEditView() {
  if (!editStageEl) return;
  if (editViewRaf) return;
  editViewRaf = true;
  requestAnimationFrame(function () {
    editViewRaf = false;
    clampEditPan();  // v115: 边界约束——画布比 viewport 大时只能在范围内滑；比 viewport 小时居中；防止滑出去后下方只剩棋盘格
    editStageEl.style.transform = 'translate(' + editPanX + 'px,' + editPanY + 'px) scale(' + editZoom + ')';
    updateEditHint();
  });
}
// v115: 画布边界约束。手机端 viewport 较小，画布 30% 缩放后仍可能比 viewport 高，单指随便一滑就把画布顶推出可视区、下方露出 viewport 紫色棋盘格背景，看着像"画布只剩上面一小块"。这里把 pan 锁在合理范围：
// - 画布显示尺寸 > viewport：可滑，约束 panX ∈ [vw-dw, 0]（panY 同理）。区间两端恰好让画布左/右(上/下)边缘贴住 viewport 边，既能滑到每一寸、又绝不会把画布完全推出可视区（不会露棋盘格）。注意：不要额外再减可见量，否则会留下够不到的"死区"。
// - 画布显示尺寸 ≤ viewport：画布居中
// v116: 修正 v115 公式多减一项 (vw - minVisW) 导致最远 0.75 视口宽度的"死区"（PC/手机放大后都滑不到边角）。去掉多余项，区间收紧为 [vw-dw, 0]。
function clampEditPan() {
  if (!editViewEl || !editCanvas) return;
  var vw = editViewEl.clientWidth, vh = editViewEl.clientHeight;
  if (!vw || !vh) return;
  var dw = editCanvas.width * editZoom, dh = editCanvas.height * editZoom;
  if (dw > vw) {
    editPanX = Math.min(0, Math.max(vw - dw, editPanX));
  } else {
    editPanX = (vw - dw) / 2;
  }
  if (dh > vh) {
    editPanY = Math.min(0, Math.max(vh - dh, editPanY));
  } else {
    editPanY = (vh - dh) / 2;
  }
}
// 编辑视图提示文字——根据 设备(触屏/鼠标) 动态生成（框选模式已移除：单格用双击/轻点，整片换色用"色号一键替换"）
function updateEditHint() {
  var hint = $('edit-view-hint');
  if (!hint) return;
  var touch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  var base = Math.round(editZoom * 100) + '%';
  var tool = state.editTool === 'paint' ? '手绘：拖动刷色' : '选择：轻点/双击选格';
  hint.textContent = base + ' · ' + tool + ' · ' + (touch
    ? (state.editTool === 'paint' ? '单指拖动刷色 · 双指缩放' : '单指拖拽平移 · 轻点选单格 · 双指缩放')
    : (state.editTool === 'paint' ? '左键拖动刷色 · 滚轮缩放' : '左键拖拽平移 · 双击选单格 · 滚轮缩放'));
}
function fitEditView() {
  if (!editViewEl || !editCanvas || !editGeom) return;
  var vw = editViewEl.clientWidth, vh = editViewEl.clientHeight;
  var size = editCanvas.width;
  if (!size || !vw || !vh) return;
  var z = Math.min(vw / size, vh / size) * 0.92;
  editZoom = Math.max(0.1, Math.min(1, z));
  editPanX = (vw - size * editZoom) / 2;
  editPanY = (vh - size * editZoom) / 2;
  applyEditView();
}
function resetEditView() { fitEditView(); }

// 绑定编辑大图画布事件（缩放/平移，鼠标 + 触摸）
function bindEditCanvas() {
  if (editBound) return;
  editCanvas = $('edit-canvas');
  editOvCanvas = $('edit-overlay-canvas');
  editViewEl = $('edit-canvas-viewport');
  editStageEl = $('edit-canvas-stage');
  if (!editCanvas || !editOvCanvas || !editViewEl || !editStageEl) return;
  editOctx = editCanvas.getContext('2d');
  editOvCtx = editOvCanvas.getContext('2d');

  function getPos(e) { if (e.touches && e.touches.length) return { x: e.touches[0].clientX, y: e.touches[0].clientY }; return { x: e.clientX, y: e.clientY }; }
  // ---- 平移（左键直接拖即移动画面；另支持右键/中键/空格+左键）----
  function isPanEvent(e) { return e.button === 2 || e.button === 1 || (e.button === 0 && !e.shiftKey); }
  editViewEl.addEventListener('mousedown', function (e) {
    if (!state.editMode) return;
    if (e.button === 0 && state.editTool === 'paint') {
      // 手绘工具：左键拖动=刷色
      editPainting = true;
      var mg = screenToEditGrid(e.clientX, e.clientY);
      if (mg) startPaint(mg.gx, mg.gy);
      e.preventDefault(); e.stopPropagation();
    } else if (isPanEvent(e)) {
      editPanning = true; editPanStart = { x: e.clientX, y: e.clientY, px: editPanX, py: editPanY };
      editViewEl.classList.add('panning');
      e.preventDefault(); e.stopPropagation();
    }
  });
  window.addEventListener('mousemove', function (e) {
    if (editPainting) {
      var pg = screenToEditGrid(e.clientX, e.clientY);
      if (pg) doPaint(pg.gx, pg.gy);
      return;
    }
    if (!editPanning) return;
    editPanX = editPanStart.px + (e.clientX - editPanStart.x);
    editPanY = editPanStart.py + (e.clientY - editPanStart.y);
    applyEditView();
  });
  window.addEventListener('mouseup', function () {
    if (editPainting) { editPainting = false; endPaint(); }
    else if (editPanning) { editPanning = false; editViewEl.classList.remove('panning'); }
  });

  // ---- 鼠标悬停高亮当前格 + 双击精确选中单格（区域框选已移除：整片换色用"色号一键替换"，单格换色用双击/轻点）----
  editStageEl.addEventListener('mousemove', function (e) {
    if (!state.editMode || editPanning || editPainting) return;
    var hg = screenToEditGrid(e.clientX, e.clientY); editHover = hg; drawEditOverlayCanvas();
  });
  editStageEl.addEventListener('mouseleave', function () { if (!editPanning) { editHover = null; drawEditOverlayCanvas(); } });
  editStageEl.addEventListener('dblclick', function (e) {
    if (!state.editMode) return;
    if (e.button !== 0) return;
    var g = screenToEditGrid(e.clientX, e.clientY);
    if (g) setEditSel([g]);   // 双击精确选中单格
    e.preventDefault();
  });

  // ---- 滚轮缩放（围绕视图中心，画面稳定居中，不随光标偏移）----
  editViewEl.addEventListener('wheel', function (e) {
    if (!state.editMode) return;
    e.preventDefault();
    var vw = editViewEl.clientWidth, vh = editViewEl.clientHeight;
    var factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    var nz = Math.max(0.1, Math.min(4, editZoom * factor)); // v117: 下限 0.3→0.1，确保能缩回到原始适应(fit)
    var fx = vw / 2, fy = vh / 2;   // 缩放焦点 = 视图中心
    editPanX = fx - (fx - editPanX) * (nz / editZoom);
    editPanY = fy - (fy - editPanY) * (nz / editZoom);
    editZoom = nz;
    applyEditView();
  }, { passive: false });

  // ---- 复位视图按钮（双击已改作选中单格，复位移到独立按钮）----
  var resetBtn = document.getElementById('edit-reset-btn');
  if (resetBtn) resetBtn.addEventListener('click', function () { resetEditView(); });

  // ---- 屏蔽右键菜单 ----
  editViewEl.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  // ---- 触摸交互：单指拖=平移 / 轻点=选单格 / 双指=缩放 ----
  editViewEl.addEventListener('touchstart', function (e) {
    if (e.target.closest('button')) return; // v117: 点编辑面板内按钮(确认/清除/复位)时放行，不接管手势、不吞原生click(手机修复)
    if (!state.editMode) return;
    e.preventDefault();
    if (e.touches.length === 1) {
      var p = getPos(e);
      touchStartPt = p; touchMoved = false;
      if (state.editTool === 'paint') {
        // 手绘工具：单指拖动=刷色（不进入平移）
        var pg0 = screenToEditGrid(p.x, p.y);
        if (pg0) startPaint(pg0.gx, pg0.gy);
        editPanning = false;
      } else {
        // 单指拖动=平移画面；轻点(无移动)在 touchend 时选单格
        editPanning = true;
        editPanStart = { x: p.x, y: p.y, px: editPanX, py: editPanY };
      }
    } else if (e.touches.length === 2) {
      editPanning = false;
      var dx = e.touches[0].clientX - e.touches[1].clientX, dy = e.touches[0].clientY - e.touches[1].clientY;
      var dist = Math.sqrt(dx * dx + dy * dy);
      editPinch = { dist: dist, zoom: editZoom, panX: editPanX, panY: editPanY };
    }
  }, { passive: false });
  editViewEl.addEventListener('touchmove', function (e) {
    if (e.target.closest('button')) return; // v117: 按钮触摸序列不接管
    if (!state.editMode) return;
    e.preventDefault();
    if (e.touches.length === 1) {
      var p = getPos(e);
      if (state.editTool === 'paint' && paintCells) {
        var pg = screenToEditGrid(p.x, p.y);
        if (pg) doPaint(pg.gx, pg.gy);
      } else if (editPanning) {
        var ddx = p.x - editPanStart.x, ddy = p.y - editPanStart.y;
        if (Math.abs(ddx) > 5 || Math.abs(ddy) > 5) touchMoved = true;
        editPanX = editPanStart.px + ddx;
        editPanY = editPanStart.py + ddy;
        applyEditView();
      }
    } else if (e.touches.length === 2 && editPinch) {
      var dx2 = e.touches[0].clientX - e.touches[1].clientX, dy2 = e.touches[0].clientY - e.touches[1].clientY;
      var dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
      var nz = Math.max(0.1, Math.min(4, editPinch.zoom * (dist2 / editPinch.dist))); // v117: 下限 0.3→0.1
      // 缩放围绕视图中心（与 PC 滚轮一致），避免围绕手指中点导致的漂移/抖动
      var vw = editViewEl.clientWidth, vh = editViewEl.clientHeight;
      var fx = vw / 2, fy = vh / 2;
      editPanX = fx - (fx - editPinch.panX) * (nz / editPinch.zoom);
      editPanY = fy - (fy - editPinch.panY) * (nz / editPinch.zoom);
      editZoom = nz;
      applyEditView();
    }
  }, { passive: false });
  editViewEl.addEventListener('touchend', function (e) {
    if (e.target.closest('button')) return; // v117: 按钮触摸序列不接管
    if (e.touches.length === 0) {
      if (paintCells) {
        endPaint();
      } else if (!touchMoved && touchStartPt) {
        // 若本次触摸未移动(轻点)则选中单格
        var g = screenToEditGrid(touchStartPt.x, touchStartPt.y);
        if (g) setEditSel([g]);
      }
      editHover = null; drawEditOverlayCanvas();
      editPanning = false; editPinch = null; touchStartPt = null;
    } else if (e.touches.length === 1) {
      // 双指中抬起一根：结束缩放，保留另一根手指位置
      editPinch = null;
    }
  });

  // ---- 空格键切换平移光标 ----
  window.addEventListener('keydown', function (e) {
    if (e.code === 'Space' && state.editMode && !editSpaceDown) { editSpaceDown = true; editViewEl.classList.add('pan-mode'); e.preventDefault(); }
  });
  window.addEventListener('keyup', function (e) {
    if (e.code === 'Space') { editSpaceDown = false; editViewEl.classList.remove('pan-mode'); }
  });

  editBound = true;
}

function textColorFor(hex) {
  const r = parseInt(hex.slice(1, 3), 16) || 0;
  const g = parseInt(hex.slice(3, 5), 16) || 0;
  const b = parseInt(hex.slice(5, 7), 16) || 0;
  const y = (0.299 * r + 0.587 * g + 0.114 * b);
  return y > 160 ? '#2a2233' : '#ffffff';
}
function renderPalette() {
  const list = $('palette-list');
  list.innerHTML = '';
  list.className = 'palette-list' + (state.paletteView === 'grid' ? ' grid' : '');
  if (!state.grid) { $('palette-badge').textContent = '0 / 0 种'; return; }
  const counts = {};
  let total = 0;
  for (let y = 0; y < state.N; y++)
    for (let x = 0; x < state.N; x++) {
      const id = state.grid[y][x];
      if (id == null || state.excluded.has(id)) continue;
      if (state.bgMask && state.bgMask[y][x]) continue; // 背景填充格不计入
      counts[id] = (counts[id] || 0) + 1; total++;
    }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  $('palette-badge').textContent = `${sorted.length} / ${PALETTE.length} 种`;
  const max = sorted.length ? sorted[0][1] : 1;

  if (state.paletteView === 'grid') {
    for (const [id, cnt] of sorted) {
      const c = PALETTE_BY_ID[id]; if (!c) continue;
      const chip = document.createElement('div');
      chip.className = 'palette-chip' + (state.selectedColor === id ? ' selected' : '');
      chip.title = `${c.id} ${c.name} · ${cnt} 颗`;
      const tc = textColorFor(c.hex);
      chip.innerHTML = `
        <button class="pcx" title="排除此色">×</button>
        <span class="swatch" style="background:${c.hex};color:${tc}">${c.id}</span>`;
      chip.addEventListener('click', e => {
        if (e.target.classList.contains('pcx')) { excludeColor(id); return; }
        state.selectedColor = id; renderPalette();
      });
      list.appendChild(chip);
    }
  } else {
    for (const [id, cnt] of sorted) {
      const c = PALETTE_BY_ID[id]; if (!c) continue;
      const row = document.createElement('div');
      row.className = 'color-row' + (state.selectedColor === id ? ' selected' : '');
      row.innerHTML = `
        <div class="cr-left">
          <span class="swatch" style="background:${c.hex}"></span>
          <span class="cr-name" title="${c.id} ${c.name}">${c.id} ${c.name}</span>
        </div>
        <div class="cr-right">
          <button class="cr-exclude" title="排除此色">×</button>
        </div>`;
      row.addEventListener('click', e => {
        if (e.target.classList.contains('cr-exclude')) { excludeColor(id); return; }
        state.selectedColor = id; renderPalette();
      });
      list.appendChild(row);
    }
  }
  renderExcluded();
}
function renderExcluded() {
  const box = $('excluded');
  if (state.excluded.size === 0) { box.hidden = true; return; }
  box.hidden = false;
  $('ex-count').textContent = state.excluded.size;
  const exList = $('ex-list');
  exList.innerHTML = '';
  for (const id of state.excluded) {
    const c = PALETTE_BY_ID[id];
    const row = document.createElement('div');
    row.className = 'ex-row';
    row.innerHTML = `
      <div class="ex-left"><span class="swatch" style="background:${c.hex}"></span>
      <span class="ex-name">${c.id} ${c.name}</span></div>
      <button class="ex-restore">恢复</button>`;
    row.querySelector('.ex-restore').addEventListener('click', () => restoreColor(id));
    exList.appendChild(row);
  }
}
function updateUploadHint() {
  const rec = state.N * 4; // 建议原图为网格尺寸的 4 倍，颜色采样更准
  const hint = $('upload-hint');
  if (hint) hint.textContent = `支持 JPG / PNG / WebP · 建议 ≥ ${rec}×${rec} 像素`;
}

function renderStats() {
  if (!state.grid) {
    ['stat-grid', 'stat-beads', 'stat-colors'].forEach(k => $(k).textContent = '—');
    return;
  }
  const counts = {};
  let beads = 0;
  // v98: 色号统计按 subject（主体边界，排除四周背景留白豆子）
  var sub = state.subject || state.effective;
  var yS = sub && sub.cols > 0 ? sub.minY : 0;
  var yE = sub && sub.cols > 0 ? sub.maxY : state.N - 1;
  var xS = sub && sub.cols > 0 ? sub.minX : 0;
  var xE = sub && sub.cols > 0 ? sub.maxX : state.N - 1;
  for (let y = yS; y <= yE; y++)
    for (let x = xS; x <= xE; x++) {
      const id = state.grid[y][x];
      if (id == null) continue;
      if (state.bgMask && state.bgMask[y][x]) continue; // 背景填充格不计入
      beads++; counts[id] = (counts[id] || 0) + 1;
    }
  $('stat-grid').textContent = `${sub && sub.cols > 0 ? sub.cols : state.N} × ${sub && sub.cols > 0 ? sub.rows : state.N}`;
  $('stat-beads').textContent = beads;
  $('stat-colors').textContent = Object.keys(counts).length;
}