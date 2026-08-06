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
      img.onload = () => { state.sourceImage = img; processImage(); clearUploadError(); };
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
    reader.onload = ev => { const img = new Image(); img.onload = () => { state.sourceImage = img; processImage(); }; img.src = ev.target.result; };
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
        reader.onload = ev => { const img = new Image(); img.onload = () => { state.sourceImage = img; processImage(); clearUploadError(); }; img.src = ev.target.result; };
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
  // v123: 像素描边（后处理）——开关/强度/颜色均触发重算管线
  const ot = $('toggle-outline');
  if (ot) ot.addEventListener('change', function(e) { state.outline.on = e.target.checked; processImage(); });
  const os = $('outline-strength');
  if (os) os.addEventListener('input', e => { state.outline.strength = +e.target.value; const osv = $('outline-strength-val'); if (osv) osv.textContent = state.outline.strength; debounceProcessImage(); });
  const oc = $('outline-color');
  if (oc) oc.addEventListener('change', e => { state.outline.colorId = e.target.value; processImage(); });

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
  $('zoom-in').addEventListener('click', () => { state.zoom = Math.min(3, state.zoom + 0.1); $('zoom-val').textContent = Math.round(state.zoom * 100) + '%'; applyZoom(); });
  $('zoom-out').addEventListener('click', () => { state.zoom = Math.max(0.3, state.zoom - 0.1); $('zoom-val').textContent = Math.round(state.zoom * 100) + '%'; applyZoom(); });

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
    img.onload = () => { URL.revokeObjectURL(url); state.sourceImage = img; processImage(); };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      // Blob 方式也失败 → 回退到直接 data URI（部分环境支持）
      const fallback = new Image();
      fallback.onload = () => { state.sourceImage = fallback; processImage(); };
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
    fb.onload = () => { state.sourceImage = fb; processImage(); };
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