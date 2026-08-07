/* ---------- 11. 事件绑定 ---------- */
function bindEvents() {
  // 上传
  const fileInput = $('file-input');
  const uz = $('upload-zone');
  // 显式点击触发文件选择框（v133 修复）：不再依赖 <label for> 原生关联——
  // 在艾可秀等把页面包进 iframe 的托管平台下，原生关联偶尔失效导致点击无反应。
  // 改为 JS 直接 fileInput.click()，并加 try/catch 兜底，确保一定能弹框。
  uz.addEventListener('click', e => {
    e.preventDefault();
    try { fileInput.click(); }
    catch (err) { console.error('[上传] 文件选择框打开失败', err); setUploadError('无法打开文件选择，请刷新页面或用「载入示例图片」'); }
  });
  // 上传提示：错误时变红，正常时恢复
  function setUploadError(msg) {
    const hint = $('upload-hint');
    if (hint) { hint.textContent = msg; hint.style.color = '#C0392B'; }
  }
  function clearUploadError() {
    const hint = $('upload-hint');
    if (hint) { hint.textContent = '支持 JPG / PNG / WebP · 建议 ≥ 480×480 像素 · 也可 Ctrl+V 粘贴'; hint.style.color = ''; }
  }
  fileInput.addEventListener('change', e => {
    const f = e.target.files[0]; if (!f) return;
    if (!f.type || !f.type.startsWith('image/')) { setUploadError('请选择图片文件（JPG / PNG / WebP）'); return; }
    const reader = new FileReader();
    reader.onerror = () => setUploadError('文件读取失败，请换张图重试');
    reader.onload = ev => {
      const img = new Image();
      img.onerror = () => setUploadError('图片解析失败，请换张图重试');
      img.onload = () => { resetMainPan(); state.originalImage = img; state.sourceImage = img; clearUserMask(); processImage(); clearUploadError(); };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(f);
  });
  // 拖拽
  ['dragover', 'dragenter'].forEach(ev => uz.addEventListener(ev, e => { e.preventDefault(); uz.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach(ev => uz.addEventListener(ev, e => { e.preventDefault(); uz.classList.remove('drag'); }));
  uz.addEventListener('drop', e => {
    const f = e.dataTransfer.files[0]; if (!f || !f.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = ev => { const img = new Image(); img.onload = () => { resetMainPan(); state.originalImage = img; state.sourceImage = img; clearUserMask(); processImage(); }; img.src = ev.target.result; };
    reader.readAsDataURL(f);
  });
  // 兜底：粘贴图片也能上传（v133 新增）。某些托管平台把页面包进 iframe 且沙箱禁止文件选择框时，
  // 复制一张图后直接 Ctrl+V / Cmd+V 粘进来即可，避免「点上传完全没反应」的死局。
  window.addEventListener('paste', e => {
    const items = (e.clipboardData && e.clipboardData.items) || [];
    for (const it of items) {
      if (it.type && it.type.startsWith('image/')) {
        const f = it.getAsFile(); if (!f) continue;
        const reader = new FileReader();
        reader.onload = ev => { const img = new Image(); img.onload = () => { resetMainPan(); state.originalImage = img; state.sourceImage = img; clearUserMask(); processImage(); clearUploadError(); }; img.src = ev.target.result; };
        reader.readAsDataURL(f);
        e.preventDefault();
        return;
      }
    }
  });

  // 网格尺寸
  $('grid-size').addEventListener('input', e => {
    state.N = +e.target.value;
    $('grid-size-val').textContent = `${state.N} × ${state.N}`;
    document.querySelectorAll('#board-pills .board-card').forEach(p => p.classList.remove('active')); // 手动滑动视为自定义
    clearUserMask(); // 手动遮罩按当前 N 构建，改 N 需清空重画
    updateUploadHint();
    debounceProcessImage();
  });
  // 拼豆板规格：按 2.6mm 小豆主流板子快速选择 N
  $('board-pills').addEventListener('click', e => {
    const b = e.target.closest('.board-card'); if (!b) return;
    const val = +b.dataset.board;
    if (val > 0) {
      state.N = val;
      const slider = $('grid-size');
      slider.value = val;
      slider.max = Math.max(slider.max, val);
      $('grid-size-val').textContent = `${val} × ${val}`;
      document.querySelectorAll('#board-pills .board-card').forEach(p => p.classList.remove('active'));
      b.classList.add('active');
      applyModePreset(); // v117: 切板子时按新板子大小重新推荐颜色数（真实模式）
      updateUploadHint();
      processImage();
    }
  });
  // 裁剪 / 网格线 / 坐标数字
  $('toggle-crop').addEventListener('change', e => { state.crop = e.target.checked; processImage(); });
  $('toggle-gridlines').addEventListener('change', e => { state.showGrid = e.target.checked; renderCanvas(); });
  $('toggle-coords').addEventListener('change', e => { state.showCoords = e.target.checked; renderCanvas(); });
  // 镜像翻转
  $('btn-mirror').addEventListener('click', () => { state.mirror = !state.mirror; syncMirrorUI(); renderCanvas(); });
  // v100: 编辑模式
  $('btn-edit').addEventListener('click', toggleEditMode);
  bindEditCanvas();
  // v102: 编辑大图面板按钮
  // v103: 编辑大图面板按钮（v102 缩放控件已移除）
  $('edit-exit').addEventListener('click', closeEditor);
  $('edit-clear').addEventListener('click', clearEditSelColor);
  $('edit-undo').addEventListener('click', undoEdit);
  $('edit-redo').addEventListener('click', redoEdit);
  // v126: 色号一键替换
  $('edit-replace-from').addEventListener('change', updateReplaceInfo);
  $('edit-replace-btn').addEventListener('click', replaceColorById);
  // v(本版): 编辑工具切换（选择 / 手绘）
  var toolSeg = $('edit-tool-seg');
  if (toolSeg) toolSeg.addEventListener('click', function (e) {
    var b = e.target.closest('.seg-item'); if (!b) return;
    document.querySelectorAll('#edit-tool-seg .seg-item').forEach(function (s) { s.classList.remove('active'); });
    b.classList.add('active');
    state.editTool = b.dataset.tool;
    updateEditHint();
    updatePaintColorLabel();
  });
  // 放大预览暂缓：按钮和弹窗已移除，避免误触发，但函数保留在下方以便下周恢复
  // $('btn-preview').addEventListener('click', openPreview);
  // 示例（载入用户真实小猫照片）
  $('btn-sample').addEventListener('click', loadSamplePhoto);

  // v101: 品牌切换已下线（只做 Mard），brand-pills UI 与监听一并移除
  // 处理模式
  $('mode-seg').addEventListener('click', e => {
    const b = e.target.closest('.seg-item'); if (!b) return;
    document.querySelectorAll('#mode-seg .seg-item').forEach(s => s.classList.remove('active'));
    b.classList.add('active');
    state.mode = b.dataset.mode;
    applyModePreset();   // 切模式时自动设置对应的抖动/色数预设
    updateModeDesc();
    processImage();
  });
  // 杂色清理
  $('cleanup').addEventListener('input', e => {
    state.cleanup = +e.target.value;
    $('cleanup-val').textContent = state.cleanup;
    debounceProcessImage();
  });
  // 颜色数量上限
  $('max-colors').addEventListener('input', e => {
    state.maxColors = +e.target.value;
    $('max-colors-val').textContent = state.maxColors;
    debounceProcessImage();
  });
  // 背景（一键切换黑底/白底，始终可见）
  $('bg-seg').addEventListener('click', e => {
    const b = e.target.closest('.seg-item'); if (!b) return;
    document.querySelectorAll('#bg-seg .seg-item').forEach(s => s.classList.remove('active'));
    b.classList.add('active');
    state.bgMode = b.dataset.bg;
    processImage();
  });
  // 自动去背景开关（默认关，见 state.removeBg）
  const rb = $('toggle-removebg');
  if (rb) rb.addEventListener('change', e => { state.removeBg = e.target.checked; processImage(); });
  // 提亮一档开关（默认关，见 state.brighten）
  const bt = $('toggle-brighten');
  if (bt) bt.addEventListener('change', function(e) { state.brighten = e.target.checked; processImage(); });
  // v140: Floyd-Steinberg 抖动开关
  const dt = $('toggle-dither');
  if (dt) dt.addEventListener('change', function(e) { state.dither = e.target.checked; processImage(); });
  // v140: 手动取样背景色
  var _samplingBg = false;
  var sampleBtn = $('btn-sample-bg');
  if (sampleBtn) sampleBtn.addEventListener('click', function() {
    if (!state.grid) return;
    _samplingBg = !_samplingBg;
    sampleBtn.classList.toggle('active', _samplingBg);
    sampleBtn.textContent = _samplingBg ? '请在画布背景区域点一下...' : '手动取样背景色';
    canvas.style.cursor = _samplingBg ? 'crosshair' : 'default';
  });
  canvas.addEventListener('click', function(e) {
    if (!_samplingBg || !state.srcRGB || !renderGeom) return;
    var rect = canvas.getBoundingClientRect();
    var dr = state.displayRect;
    var M = dr ? dr.M : state.N;
    var scaleX = M / (rect.width / renderGeom.cell);
    // Actually compute grid position from click
    var gx = Math.floor((e.clientX - rect.left) / rect.width * M);
    var gy = Math.floor((e.clientY - rect.top) / rect.height * M);
    if (gx < 0 || gx >= M || gy < 0 || gy >= M) return;
    // Translate display coords to grid coords
    var srcX = gx, srcY = gy;
    if (dr && gx >= dr.offX && gx < dr.offX + dr.drawCols && gy >= dr.offY && gy < dr.offY + dr.drawRows) {
      srcX = dr.srcMinX + (gx - dr.offX);
      srcY = dr.srcMinY + (gy - dr.offY);
    }
    if (state.mirror) srcX = M - 1 - srcX;
    if (state.srcRGB[srcY] && state.srcRGB[srcY][srcX]) {
      state._manualBgRGB = state.srcRGB[srcY][srcX];
      state.removeBg = true;
      var rb2 = $('toggle-removebg');
      if (rb2) rb2.checked = true;
      processImage();
    }
    _samplingBg = false;
    sampleBtn.classList.remove('active');
    sampleBtn.textContent = '手动取样背景色';
    canvas.style.cursor = 'default';
  });
  // 移动端：主预览画布触屏（双指缩放到 state.zoom；单指轻点取样，消除 iOS 300ms 延迟）
  // v140+: 单指拖拽平移（CSS transform，仅在画布溢出容器时可平移；不侵入 render.js 重绘模型）
  var _pan = { x: 0, y: 0, sx: 0, sy: 0, bx: 0, by: 0, can: false };
  function clampMainPan() {
    var wrap = canvas.parentElement;
    if (!wrap) return;
    var cw = canvas.clientWidth || canvas.offsetWidth;
    var ch = canvas.clientHeight || canvas.offsetHeight;
    var availW = wrap.clientWidth, availH = wrap.clientHeight;
    var maxX = cw > availW ? (cw - availW) / 2 : 0;
    var maxY = ch > availH ? (ch - availH) / 2 : 0;
    if (_pan.x > maxX) _pan.x = maxX; else if (_pan.x < -maxX) _pan.x = -maxX;
    if (_pan.y > maxY) _pan.y = maxY; else if (_pan.y < -maxY) _pan.y = -maxY;
  }
  function applyMainPan() {
    clampMainPan();
    canvas.style.transform = 'translate(' + _pan.x + 'px,' + _pan.y + 'px)';
  }
  function resetMainPan() { _pan.x = 0; _pan.y = 0; if (canvas) canvas.style.transform = ''; }
  var _pinch = { mode: 0, dist: 0, curDist: 0, zoom: 1, moved: false, sx: 0, sy: 0, raf: 0 };
  function _doPinchZoom() {
    _pinch.raf = 0;
    if (_pinch.dist > 0) {
      var nz = Math.max(0.3, Math.min(3, _pinch.zoom * (_pinch.curDist / _pinch.dist)));
      state.zoom = nz;
      var zv = $('zoom-val'); if (zv) zv.textContent = Math.round(nz * 100) + '%';
      applyZoom();
    }
  }
  canvas.addEventListener('touchstart', function (e) {
    if (e.target.closest && e.target.closest('button')) return; // v117: 不拦截按钮
    if (e.touches.length >= 2) {
      _pinch.mode = 2;
      var dx = e.touches[0].clientX - e.touches[1].clientX;
      var dy = e.touches[0].clientY - e.touches[1].clientY;
      _pinch.dist = Math.sqrt(dx * dx + dy * dy);
      _pinch.curDist = _pinch.dist;
      _pinch.zoom = state.zoom;
      e.preventDefault();
    } else if (e.touches.length === 1) {
      _pinch.mode = 1; _pinch.moved = false;
      _pinch.sx = e.touches[0].clientX; _pinch.sy = e.touches[0].clientY;
      _pan.sx = _pinch.sx; _pan.sy = _pinch.sy;
      _pan.bx = _pan.x; _pan.by = _pan.y;
      var _pw = canvas.parentElement;
      _pan.can = !!(_pw && (canvas.clientWidth > _pw.clientWidth || canvas.clientHeight > _pw.clientHeight));
    }
  }, { passive: false });
  canvas.addEventListener('touchmove', function (e) {
    if (_pinch.mode === 2 && e.touches.length >= 2) {
      var dx = e.touches[0].clientX - e.touches[1].clientX;
      var dy = e.touches[0].clientY - e.touches[1].clientY;
      _pinch.curDist = Math.sqrt(dx * dx + dy * dy);
      if (!_pinch.raf) _pinch.raf = requestAnimationFrame(_doPinchZoom); // v112: rAF 节流防重绘卡顿
      e.preventDefault();
    } else if (_pinch.mode === 1 && e.touches.length === 1) {
      var t = e.touches[0];
      var _tdx = t.clientX - _pinch.sx, _tdy = t.clientY - _pinch.sy;
      if (Math.abs(_tdx) > 8 || Math.abs(_tdy) > 8) {
        _pinch.moved = true;
        if (_pan.can) {
          _pan.x = _pan.bx + (t.clientX - _pan.sx);
          _pan.y = _pan.by + (t.clientY - _pan.sy);
          applyMainPan();
          e.preventDefault();
        }
      }
    }
  }, { passive: false });
  canvas.addEventListener('touchend', function (e) {
    if (_pinch.mode === 1 && !_pinch.moved && _samplingBg && renderGeom) {
      var t = (e.changedTouches && e.changedTouches[0]) || null;
      if (t) {
        var rect = canvas.getBoundingClientRect();
        var dr = state.displayRect;
        var M = dr ? dr.M : state.N;
        var gx = Math.floor((t.clientX - rect.left) / rect.width * M);
        var gy = Math.floor((t.clientY - rect.top) / rect.height * M);
        if (gx >= 0 && gx < M && gy >= 0 && gy < M) {
          var srcX = gx, srcY = gy;
          if (dr && gx >= dr.offX && gx < dr.offX + dr.drawCols && gy >= dr.offY && gy < dr.offY + dr.drawRows) {
            srcX = dr.srcMinX + (gx - dr.offX); srcY = dr.srcMinY + (gy - dr.offY);
          }
          if (state.mirror) srcX = M - 1 - srcX;
          if (state.srcRGB[srcY] && state.srcRGB[srcY][srcX]) {
            state._manualBgRGB = state.srcRGB[srcY][srcX];
            state.removeBg = true;
            var rb2 = $('toggle-removebg'); if (rb2) rb2.checked = true;
            processImage();
          }
          _samplingBg = false;
          if (sampleBtn) { sampleBtn.classList.remove('active'); sampleBtn.textContent = '手动取样背景色'; }
          canvas.style.cursor = 'default';
        }
      }
    }
    if (_pinch.raf) { cancelAnimationFrame(_pinch.raf); _pinch.raf = 0; _doPinchZoom(); }
    clampMainPan(); // 缩放后重新夹取平移边界，避免拖飞
    _pinch.mode = 0;
  }, { passive: false });
  // v123: 像素描边（后处理）——开关/强度/颜色均触发重算管线
  const ot = $('toggle-outline');
  if (ot) ot.addEventListener('change', function(e) { state.outline.on = e.target.checked; processImage(); });
  const os = $('outline-strength');
  if (os) os.addEventListener('input', e => { state.outline.strength = +e.target.value; const osv = $('outline-strength-val'); if (osv) osv.textContent = state.outline.strength; debounceProcessImage(); });
  const oc = $('outline-color');
  if (oc) oc.addEventListener('change', e => { state.outline.colorId = e.target.value; processImage(); });
  const otk = $('outline-thickness');
  if (otk) otk.addEventListener('input', e => { state.outline.thickness = +e.target.value; const otkv = $('outline-thickness-val'); if (otkv) otkv.textContent = state.outline.thickness; debounceProcessImage(); });

  // 视图切换
  $('view-seg').addEventListener('click', e => {
    const b = e.target.closest('.seg-item'); if (!b) return;
    document.querySelectorAll('#view-seg .seg-item').forEach(s => s.classList.remove('active'));
    b.classList.add('active');
    state.view = b.dataset.view;
    renderCanvas();
  });

  // 右侧色板清单视图切换（色块 / 列表）
  $('palette-view-seg').addEventListener('click', e => {
    const b = e.target.closest('.seg-item'); if (!b) return;
    document.querySelectorAll('#palette-view-seg .seg-item').forEach(s => s.classList.remove('active'));
    b.classList.add('active');
    state.paletteView = b.dataset.view;
    renderPalette();
  });

  // [品牌色卡弹窗已下线：白块 bug 待修，下周再开放]
  // 缩放
  $('zoom-in').addEventListener('click', () => { state.zoom = Math.min(3, state.zoom + 0.1); $('zoom-val').textContent = Math.round(state.zoom * 100) + '%'; applyZoom(); clampMainPan(); });
  $('zoom-out').addEventListener('click', () => { state.zoom = Math.max(0.3, state.zoom - 0.1); $('zoom-val').textContent = Math.round(state.zoom * 100) + '%'; applyZoom(); clampMainPan(); });

  // 下载：手机端一键直达（跳过设置弹窗），桌面端走设置弹窗
  const onDownloadClick = () => {
    if (isMobileDevice()) mobileQuickExport();
    else openModal();
  };
  $('btn-download-top').addEventListener('click', onDownloadClick);
  $('btn-download').addEventListener('click', onDownloadClick);

  // 分享效果图（淡紫海报，独立导出，不影响白底工作图纸）
  $('btn-share').addEventListener('click', async () => {
    if (!state.grid) { $('canvas-hint').textContent = '请先上传图片或载入示例，再下载分享图'; return; }
    const cv = await buildShareCanvas();
    downloadCanvasPNG(cv, `狐狸爱拼豆_i喵绘工坊_分享图_${state.N}x${state.N}.png`);
  });

  // 弹窗
  $('modal-close').addEventListener('click', closeModal);
  $('m-cancel').addEventListener('click', closeModal);
  $('modal-backdrop').addEventListener('click', e => { if (e.target === $('modal-backdrop')) closeModal(); });

  $('m-gridlines').addEventListener('change', e => { $('m-grid-sub').style.display = e.target.checked ? 'flex' : 'none'; });
  $('m-interval').addEventListener('input', e => { $('m-interval-val').textContent = e.target.value; });
  $('format-seg').addEventListener('click', e => {
    const b = e.target.closest('.seg-item'); if (!b) return;
    document.querySelectorAll('#format-seg .seg-item').forEach(s => s.classList.remove('active'));
    b.classList.add('active');
  });
  $('m-confirm').addEventListener('click', async () => {
    const opts = {
      gridlines: $('m-gridlines').checked,
      interval: +$('m-interval').value,
      coords: $('m-coords').checked,
      showcode: $('m-showcode').checked,
      stats: $('m-stats').checked,
      bom: $('m-bom') ? $('m-bom').checked : true,
    };
    if (!state.grid) { closeModal(); return; }
    const base = `狐狸爱拼豆_i喵绘工坊_${state.N}x${state.N}_${'MARD'}`;
    if (isMobileDevice()) {
      // 手机端：先明确「生成中」，再显示图片长按保存（避免大图渲染时疑似卡死）
      closeModal();
      const loading = showGeneratingOverlay('正在生成图纸…');
      setTimeout(() => {
        try {
          const cv = buildExportCanvas(opts);
          genPNGSource(cv, src => { loading.close(); showMobileSaveOverlay(src); });
        } catch (e) {
          loading.close();
          showMobileSaveOverlay(null, '生成失败，请重试');
        }
      }, 30);
      return;
    }
    const activeFmt = document.querySelector('#format-seg .seg-item.active');
    const fmt = (activeFmt && activeFmt.dataset.format) || 'png';
    if (fmt === 'svg') {
      downloadSVG(buildExportSVG(opts), base + '.svg');
    } else {
      downloadCanvasPNG(buildExportCanvas(opts), base + '.png');
    }
    closeModal();
  });

  // 重置
  $('btn-reset').addEventListener('click', () => {
    state.sourceImage = null; state.grid = null; state.excluded.clear();
    $('palette-list').innerHTML = ''; $('excluded').hidden = true;
    renderAll();
    $('canvas-hint').textContent = '预览：请上传图片或载入示例，图片将自动映射到 Mard 官方色板';
  });

  // 左侧边栏折叠/展开
  document.querySelectorAll('.block.collapsible .block-label').forEach(label => {
    label.addEventListener('click', () => {
      label.closest('.block').classList.toggle('collapsed');
    });
  });

  // 窗口大小变化时重绘主 canvas，确保移动端适配/旋转后比例正确
  window.addEventListener('resize', () => {
    if (state.grid) renderCanvas();
  });

  // v108: 在界面顶部显示版本号，让用户一眼确认当前是否为最新版本
  // v112: 线上环境（艾可秀/沙箱域名）不显示版本号（正式环境不需要）；本地/沙箱自测仍显示以便确认更新
  var vb = document.getElementById('ver-badge');
  var isOnline = /axureshow\.com|agentos-app\.net/i.test(location.hostname || '');
  if (vb) {
    if (isOnline) {
      vb.style.display = 'none';
    } else {
      vb.textContent = 'v' + APP_VERSION;
      vb.style.display = 'inline-block';
    }
  }
  document.title = isOnline
    ? '狐狸爱拼豆 ｜ i 喵绘工坊 · 一键生成拼豆图纸'
    : '狐狸爱拼豆 v' + APP_VERSION + ' ｜ i 喵绘工坊 · 一键生成拼豆图纸';

  // 图片处理模块
  bindPrepModal();
}

/* ========== 图片处理模块：面板交互 ========== */
var prepTool = 'brush';          // 'brush' 去背景笔刷 / 'crop' 裁剪
var prepScale = 1;               // 预览显示缩放（源像素 → 显示像素）
var prepW = 0, prepH = 0;        // 当前预处理画布（旋转/翻转后，未裁切）尺寸
var prepPainting = false;
var prepLast = null;             // 笔刷上一显示点
var prepCropStart = null;        // 裁剪起点（显示坐标）
var prepCropDraft = null;        // 裁剪临时框（显示坐标）

function openPrepModal() {
  if (!state.sourceImage) return;
  state.prepBase = state.sourceImage;
  state.prep = { rotate: 0, flipH: false, flipV: false, brightness: 0, contrast: 0, saturation: 0 };
  state.userCrop = null;
  prepTool = 'brush';
  var bd = $('prep-backdrop');
  if (bd) bd.hidden = false;
  // 同步控件
  var rb = $('prep-removebg'); if (rb) rb.checked = !!state.removeBg;
  var br = $('prep-brush-erase'); if (br) br.classList.add('active');
  var bk = $('prep-brush-keep'); if (bk) bk.classList.remove('active');
  var ts = $('prep-tool-seg'); if (ts) {
    ts.querySelectorAll('.seg-item').forEach(function (s) { s.classList.toggle('active', s.dataset.tool === 'brush'); });
  }
  syncPrepSliders();
  renderPrepPreview();
}
function closePrepModal() { var bd = $('prep-backdrop'); if (bd) bd.hidden = true; }

function syncPrepSliders() {
  var b = $('prep-bright'); if (b) b.value = state.prep.brightness;
  var bv = $('prep-bright-val'); if (bv) bv.textContent = state.prep.brightness;
  var c = $('prep-contrast'); if (c) c.value = state.prep.contrast;
  var cv = $('prep-contrast-val'); if (cv) cv.textContent = state.prep.contrast;
  var s = $('prep-sat'); if (s) s.value = state.prep.saturation;
  var sv = $('prep-sat-val'); if (sv) sv.textContent = state.prep.saturation;
}

// 渲染预览（显示旋转/翻转/调色后的全图，叠加裁切框与笔刷遮罩）
function renderPrepPreview() {
  var canvas = $('prep-canvas'), overlay = $('prep-overlay'), wrap = $('prep-preview-wrap');
  if (!canvas || !overlay || !wrap) return;
  var base = state.prepBase || state.sourceImage;
  var prepCanvas = computePrepCanvas(base, state.prep, null); // 不过滤裁切，方便调整
  if (!prepCanvas) return;
  prepW = prepCanvas.width; prepH = prepCanvas.height;
  var maxW = wrap.clientWidth || 360, maxH = wrap.clientHeight || 360;
  var scale = Math.min(maxW / prepW, maxH / prepH);
  if (scale > 1) scale = 1; // 不放大，避免模糊
  var dw = Math.max(1, Math.round(prepW * scale)), dh = Math.max(1, Math.round(prepH * scale));
  prepScale = dw / prepW;
  canvas.width = dw; canvas.height = dh;
  canvas.getContext('2d').drawImage(prepCanvas, 0, 0, dw, dh);
  overlay.width = dw; overlay.height = dh;
  rebuildPrepOverlay();
}

// 重绘叠加层（裁切框 + 笔刷遮罩）
function rebuildPrepOverlay() {
  var overlay = $('prep-overlay'); if (!overlay) return;
  var octx = overlay.getContext('2d');
  octx.clearRect(0, 0, overlay.width, overlay.height);
  // 裁切框
  if (state.userCrop && state.userCrop.sw > 0 && state.userCrop.sh > 0) {
    var x = state.userCrop.sx * prepScale, y = state.userCrop.sy * prepScale;
    var w = state.userCrop.sw * prepScale, h = state.userCrop.sh * prepScale;
    octx.strokeStyle = '#6A4C93'; octx.lineWidth = 2; octx.setLineDash([6, 4]);
    octx.strokeRect(x, y, w, h);
    octx.setLineDash([]);
  }
  // 笔刷遮罩（从 N×N userMask 反推显示坐标）
  if (state.userMask) {
    var N = state.N, cell = prepScale * (prepW / N);
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
      var t = state.userMask[y][x];
      if (!t) continue;
      octx.fillStyle = t === 'erase' ? 'rgba(192,57,43,0.45)' : 'rgba(46,139,87,0.45)';
      octx.fillRect((x + 0.5) * cell - cell / 2, (y + 0.5) * cell - cell / 2, cell, cell);
    }
  }
}

// 几何变换后清空笔刷遮罩（坐标系已变，旧遮罩不再对齐）
function prepGeomChanged() { clearUserMask(); renderPrepPreview(); }

// 在显示坐标 (dx,dy) 处落一笔，写入 userMask 并增量绘制
function prepPaintAt(dx, dy) {
  if (!state.userMask) {
    var N = state.N;
    state.userMask = Array.from({ length: N }, function () { return new Array(N).fill(null); });
  }
  // 显示坐标 → 源像素 → 格子
  var sx = dx / prepScale, sy = dy / prepScale;
  var cellX = Math.floor(sx * state.N / prepW), cellY = Math.floor(sy * state.N / prepH);
  var radius = Math.max(1, Math.round(state.brushSize / prepW * state.N));
  var type = state.brushMode;
  for (var y = cellY - radius; y <= cellY + radius; y++) {
    for (var x = cellX - radius; x <= cellX + radius; x++) {
      if (x < 0 || x >= state.N || y < 0 || y >= state.N) continue;
      var ddx = x - cellX, ddy = y - cellY;
      if (ddx * ddx + ddy * ddy > radius * radius) continue;
      state.userMask[y][x] = type;
    }
  }
  // 增量绘制当前点
  var overlay = $('prep-overlay'); if (overlay) {
    var octx = overlay.getContext('2d');
    octx.fillStyle = type === 'erase' ? 'rgba(192,57,43,0.45)' : 'rgba(46,139,87,0.45)';
    var r = state.brushSize * prepScale;
    octx.beginPath(); octx.arc(dx, dy, r, 0, Math.PI * 2); octx.fill();
  }
}

function prepOverlayPoint(e) {
  var overlay = $('prep-overlay'); if (!overlay) return null;
  var rect = overlay.getBoundingClientRect();
  var cx = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
  var cy = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
  return { x: cx, y: cy };
}

function bindPrepModal() {
  var btn = $('btn-prep'); if (btn) btn.addEventListener('click', openPrepModal);
  var close = $('prep-close'); if (close) close.addEventListener('click', closePrepModal);
  var cancel = $('prep-cancel'); if (cancel) cancel.addEventListener('click', closePrepModal);
  var bd = $('prep-backdrop'); if (bd) bd.addEventListener('click', function (e) { if (e.target === bd) closePrepModal(); });
  var apply = $('prep-apply'); if (apply) apply.addEventListener('click', function () {
    // 去背景开关同步到主状态
    var rb = $('prep-removebg'); if (rb) state.removeBg = rb.checked;
    bakePrep();
    closePrepModal();
  });
  var reset = $('prep-reset'); if (reset) reset.addEventListener('click', function () {
    state.prep = { rotate: 0, flipH: false, flipV: false, brightness: 0, contrast: 0, saturation: 0 };
    state.userCrop = null;
    if (state.prepBase) state.sourceImage = state.prepBase; // 回退到打开时的图
    clearUserMask();
    syncPrepSliders();
    renderPrepPreview();
  });

  // 旋转 / 翻转
  var rl = $('prep-rotL'); if (rl) rl.addEventListener('click', function () { state.prep.rotate = (state.prep.rotate + 270) % 360; prepGeomChanged(); });
  var rr = $('prep-rotR'); if (rr) rr.addEventListener('click', function () { state.prep.rotate = (state.prep.rotate + 90) % 360; prepGeomChanged(); });
  var fh = $('prep-flipH'); if (fh) fh.addEventListener('click', function () { state.prep.flipH = !state.prep.flipH; prepGeomChanged(); });
  var fv = $('prep-flipV'); if (fv) fv.addEventListener('click', function () { state.prep.flipV = !state.prep.flipV; prepGeomChanged(); });

  // 调色滑块
  var bindSlider = function (id, key, valId) {
    var el = $(id), v = $(valId);
    if (!el) return;
    el.addEventListener('input', function () {
      state.prep[key] = +el.value;
      if (v) v.textContent = el.value;
      renderPrepPreview();
    });
  };
  bindSlider('prep-bright', 'brightness', 'prep-bright-val');
  bindSlider('prep-contrast', 'contrast', 'prep-contrast-val');
  bindSlider('prep-sat', 'saturation', 'prep-sat-val');

  // 去背景笔刷模式
  var be = $('prep-brush-erase'); if (be) be.addEventListener('click', function () { state.brushMode = 'erase'; be.classList.add('active'); var bk2 = $('prep-brush-keep'); if (bk2) bk2.classList.remove('active'); });
  var bk = $('prep-brush-keep'); if (bk) bk.addEventListener('click', function () { state.brushMode = 'keep'; bk.classList.add('active'); if (be) be.classList.remove('active'); });
  var bc = $('prep-brush-clear'); if (bc) bc.addEventListener('click', function () { clearUserMask(); rebuildPrepOverlay(); });
  var bs = $('prep-brush-size'); if (bs) bs.addEventListener('input', function () { state.brushSize = +bs.value; var bsv = $('prep-brush-val'); if (bsv) bsv.textContent = bs.value; });

  // 工具切换（笔刷 / 裁剪）
  var tseg = $('prep-tool-seg'); if (tseg) tseg.addEventListener('click', function (e) {
    var b = e.target.closest('.seg-item'); if (!b) return;
    tseg.querySelectorAll('.seg-item').forEach(function (s) { s.classList.remove('active'); });
    b.classList.add('active');
    prepTool = b.dataset.tool;
    var ov = $('prep-overlay'); if (ov) ov.style.cursor = prepTool === 'crop' ? 'crosshair' : 'crosshair';
  });

  // 预览画布交互（笔刷 / 裁剪）
  var overlay = $('prep-overlay');
  if (overlay) {
    var startHandler = function (e) {
      e.preventDefault();
      var p = prepOverlayPoint(e); if (!p) return;
      if (prepTool === 'brush') {
        // 落笔即自动开启去背景，避免遮罩被忽略
        if (!state.removeBg) { state.removeBg = true; var rb2 = $('prep-removebg'); if (rb2) rb2.checked = true; }
        prepPainting = true; prepLast = p; prepPaintAt(p.x, p.y);
      } else {
        prepCropStart = p; prepCropDraft = { x: p.x, y: p.y, w: 0, h: 0 };
      }
    };
    var moveHandler = function (e) {
      if (!prepPainting && !prepCropDraft) return;
      e.preventDefault();
      var p = prepOverlayPoint(e); if (!p) return;
      if (prepTool === 'brush' && prepPainting) {
        // 连线补足，避免快速拖动断点
        if (prepLast) {
          var steps = Math.max(1, Math.round(Math.hypot(p.x - prepLast.x, p.y - prepLast.y) / 4));
          for (var i = 1; i <= steps; i++) {
            var t = i / steps;
            prepPaintAt(prepLast.x + (p.x - prepLast.x) * t, prepLast.y + (p.y - prepLast.y) * t);
          }
        }
        prepLast = p;
      } else if (prepTool === 'crop' && prepCropDraft) {
        prepCropDraft.w = p.x - prepCropStart.x; prepCropDraft.h = p.y - prepCropStart.y;
        drawCropDraft();
      }
    };
    var endHandler = function (e) {
      if (prepTool === 'brush') { prepPainting = false; prepLast = null; }
      else if (prepCropDraft) {
        // 提交裁切框（显示坐标 → 源坐标）
        var x0 = Math.min(prepCropStart.x, prepCropStart.x + prepCropDraft.w);
        var y0 = Math.min(prepCropStart.y, prepCropStart.y + prepCropDraft.h);
        var w = Math.abs(prepCropDraft.w), h = Math.abs(prepCropDraft.h);
        if (w > 6 && h > 6) {
          state.userCrop = {
            sx: Math.round(x0 / prepScale), sy: Math.round(y0 / prepScale),
            sw: Math.round(w / prepScale), sh: Math.round(h / prepScale)
          };
          clearUserMask(); // 几何变化清空旧遮罩
        }
        prepCropDraft = null;
        rebuildPrepOverlay();
      }
    };
    overlay.addEventListener('mousedown', startHandler);
    overlay.addEventListener('mousemove', moveHandler);
    window.addEventListener('mouseup', endHandler);
    overlay.addEventListener('touchstart', startHandler, { passive: false });
    overlay.addEventListener('touchmove', moveHandler, { passive: false });
    overlay.addEventListener('touchend', endHandler);
  }
}

function drawCropDraft() {
  var overlay = $('prep-overlay'); if (!overlay || !prepCropDraft || !prepCropStart) return;
  rebuildPrepOverlay(); // 先重绘底层（含已有遮罩/旧框）
  var octx = overlay.getContext('2d');
  var x = Math.min(prepCropStart.x, prepCropStart.x + prepCropDraft.w);
  var y = Math.min(prepCropStart.y, prepCropStart.y + prepCropDraft.h);
  octx.strokeStyle = '#6A4C93'; octx.lineWidth = 2; octx.setLineDash([6, 4]);
  octx.strokeRect(x, y, Math.abs(prepCropDraft.w), Math.abs(prepCropDraft.h));
  octx.setLineDash([]);
}
/* 手机端一键导出：跳过设置弹窗，直接生成并弹出保存浮层（避免二次点击误以为没反应） */
function mobileQuickExport() {
  if (!state.grid) { alert('请先上传图片或载入示例，再下载图纸'); return; }
  const opts = {
    gridlines: $('m-gridlines').checked,
    interval: +$('m-interval').value,
    coords: $('m-coords').checked,
    showcode: $('m-showcode').checked,
    stats: $('m-stats').checked,
    bom: $('m-bom') ? $('m-bom').checked : true,
  };
  const loading = showGeneratingOverlay('正在生成图纸…');
  setTimeout(() => {
    try {
      const cv = buildExportCanvas(opts);
      genPNGSource(cv, src => { loading.close(); showMobileSaveOverlay(src); });
    } catch (e) {
      loading.close();
      showMobileSaveOverlay(null, '生成失败，请重试');
    }
  }, 30);
}

function openModal() { if (!state.grid) { alert('请先上传图片或载入示例'); return; } $('modal-backdrop').hidden = false; }
function closeModal() { $('modal-backdrop').hidden = true; }

/* 载入示例图：固定为手捧白猫 sample.jpg（用户已确认不再更换）。
 * v133修复：部分托管平台(如艾可秀)的CSP策略会拦截 data:image URI 的 <img> 加载，
 *         导致示例图空白。改用 Blob+ObjectURL 方式绕过——先把 base64 解码为二进制 Blob，
 *         再用 URL.createObjectURL 生成 blob: URI 赋给 img.src，避开 data: 协议限制。 */
function loadSamplePhoto() {
  try {
    // 将 data URI 解码为 Blob
    const parts = SAMPLE_DATA_URI.split(',');
    const mime = parts[0].match(/:(.*?);/)[1];
    const b64 = parts[1];
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    const blob = new Blob([arr], { type: mime });
    const url = URL.createObjectURL(blob);

    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resetMainPan(); state.originalImage = img; state.sourceImage = img; clearUserMask(); processImage(); };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      // Blob 方式也失败 → 回退到直接 data URI（部分环境支持）
      const fallback = new Image();
      fallback.onload = () => { resetMainPan(); state.originalImage = fallback; state.sourceImage = fallback; clearUserMask(); processImage(); };
      fallback.onerror = () => {
        const hint = document.getElementById('canvas-hint');
        if (hint) { hint.textContent = '示例图加载失败，请点击上传图片或 Ctrl+V 粘贴'; hint.style.display = 'block'; }
      };
      fallback.src = SAMPLE_DATA_URI;
    };
    img.src = url;
  } catch(e) {
    // atob/Blob 不支持的极端环境 → 直接 data URI
    const fb = new Image();
    fb.onload = () => { resetMainPan(); state.originalImage = fb; state.sourceImage = fb; clearUserMask(); processImage(); };
    fb.src = SAMPLE_DATA_URI;
  }
}

/* 同步 UI 控件到当前 state，避免 HTML 硬编码默认值与 state 不一致 */
function syncUI() {
  // 效果模式
  document.querySelectorAll('#mode-seg .seg-item').forEach(s => s.classList.toggle('active', s.dataset.mode === state.mode));
  // 背景黑/白
  document.querySelectorAll('#bg-seg .seg-item').forEach(s => s.classList.toggle('active', s.dataset.bg === state.bgMode));
  // 自动去背景开关状态
  const rb = $('toggle-removebg');
  if (rb) rb.checked = !!state.removeBg;
  // 提亮一档开关状态
  const bt = $('toggle-brighten');
  if (bt) bt.checked = !!state.brighten;
  // v123: 像素描边开关/强度/颜色同步
  const ot = $('toggle-outline');
  if (ot) ot.checked = !!state.outline.on;
  const osv = $('outline-strength');
  if (osv) osv.value = state.outline.strength;
  const osvt = $('outline-strength-val');
  if (osvt) osvt.textContent = state.outline.strength;
  const ocs = $('outline-color');
  if (ocs) ocs.value = state.outline.colorId;
  const otk = $('outline-thickness');
  if (otk) otk.value = state.outline.thickness;
  const otkv = $('outline-thickness-val');
  if (otkv) otkv.textContent = state.outline.thickness;
  // 拼豆板规格
  document.querySelectorAll('#board-pills .board-card').forEach(p => p.classList.toggle('active', +p.dataset.board === state.N));
  // 网格尺寸 slider 与显示值
  const gs = $('grid-size');
  if (gs) {
    gs.value = state.N;
    gs.max = Math.max(gs.max, state.N);
  }
  const gsv = $('grid-size-val');
  if (gsv) gsv.textContent = `${state.N} × ${state.N}`;
  // 颜色数量上限
  const mc = $('max-colors');
  if (mc) mc.value = state.maxColors;
  const mcv = $('max-colors-val');
  if (mcv) mcv.textContent = state.maxColors;
}