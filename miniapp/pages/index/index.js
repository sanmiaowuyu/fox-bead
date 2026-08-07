var core = require('../../utils/core');

Page({
  data: {
    boardSizes: ['48', '52', '78', '104', '130'],
    boardIdx: 3,  // default 104
    boardN: 104,
    hasImage: false,
    canvasSize: 300,
    beadCount: 0,
    colorCount: 0,
    // 管线开关（与网页端 processImage 同一套内核参数，透传给 processImageMini）
    modeNames: ['真实', '卡通'],
    modeIdx: 0,          // 0=真实(average) / 1=卡通(cartoon)，默认真实
    removeBg: false,     // 去背景
    dither: false,       // Floyd-Steinberg 抖动
    brighten: false,     // 提亮一档
    maxColors: 24,       // 减色上限
    outlineOn: false,    // 像素描边
    outlineStrength: 50  // 描边强度
  },

  onLoad: function() {
    // Init core palette
    core.updateBgIds();
    core.buildBrightenMap();
  },

  onBoardChange: function(e) {
    var idx = parseInt(e.detail.value);
    var N = parseInt(this.data.boardSizes[idx]);
    this.setData({ boardIdx: idx, boardN: N });
    if (this._sourceImage) this._process();
  },

  chooseImage: function() {
    var that = this;
    wx.chooseImage({
      count: 1,
      sizeType: ['original'],
      sourceType: ['album', 'camera'],
      success: function(res) {
        that._loadImage(res.tempFilePaths[0]);
      }
    });
  },

  useSample: function() {
    // Use built-in sample or generate a simple pattern
    wx.showToast({ title: '请选择图片', icon: 'none' });
  },

  _loadImage: function(path) {
    var that = this;
    wx.getImageInfo({
      src: path,
      success: function(info) {
        that._sourceImage = { path: path, width: info.width, height: info.height };
        that.setData({ hasImage: true });
        that._process();
      },
      fail: function() {
        wx.showToast({ title: '图片加载失败', icon: 'none' });
      }
    });
  },

  _process: function() {
    var that = this;
    var N = this.data.boardN;
    var img = this._sourceImage;
    if (!img) return;

    // Create offscreen canvas to get pixel data
    var query = wx.createSelectorQuery();
    query.select('#hiddenCanvas').fields({ node: true, size: true }).exec(function(res) {
      if (!res || !res[0]) { that._processFallback(); return; }
      var canvas = res[0].node;
      var ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      var image = canvas.createImage();
      image.onload = function() {
        ctx.drawImage(image, 0, 0);
        var imgData = ctx.getImageData(0, 0, img.width, img.height);
        that._imgData = imgData;   // 缓存，开关切换时无需重新读图
        that._imgInfo = img;
        that._runPipeline(imgData, img);
      };
      image.src = img.path;
    });
  },

  // 开关切换：直接复用缓存的 imgData 重跑管线（不同步重新读文件）
  _reprocess: function() {
    if (this._imgData) this._runPipeline(this._imgData, this._imgInfo);
  },

  _processFallback: function() {
    // Simplified: use canvas API directly
    var that = this;
    var ctx = wx.createCanvasContext('beadCanvas', this);
    // For now just show that the pipeline would run
    this.setData({ beadCount: 0, colorCount: 0 });
    ctx.draw();
  },

  _runPipeline: function(imgData, imgInfo) {
    var N = this.data.boardN;
    core.state.N = N;
    core.state.sourceImage = { width: imgInfo.width, height: imgInfo.height };

    // processImageMini 与网页版 processImage 共用 src/core 同一套算法内核
    // （取色 / 抖动 / 降噪 / 去背景 / 减色 / 提亮 / 描边），非简化版。
    // 把页面开关全部透传为 opts，手机端即可用上完整管线。
    var d = this.data;
    var opts = {
      mode: d.modeIdx === 0 ? 'average' : 'cartoon',
      dither: d.dither,
      removeBg: d.removeBg,
      brighten: d.brighten,
      maxColors: d.maxColors,
      outline: { on: d.outlineOn, strength: d.outlineStrength, colorId: 'H7', thickness: 1 }
    };
    var result = core.processImageMini(imgData, N, opts);

    if (result) {
      this._grid = result.grid;
      this.setData({
        beadCount: result.totalBeads,
        colorCount: result.colorCount,
        canvasSize: Math.min(350, wx.getSystemInfoSync().windowWidth - 40)
      });
      this._renderCanvas();
    }
  },

  // ---- 管线开关处理器 ----
  onModeChange: function(e) {
    this.setData({ modeIdx: parseInt(e.detail.value) });
    this._reprocess();
  },
  onRemoveBg: function(e) {
    this.setData({ removeBg: e.detail.value });
    this._reprocess();
  },
  onDither: function(e) {
    this.setData({ dither: e.detail.value });
    this._reprocess();
  },
  onBrighten: function(e) {
    this.setData({ brighten: e.detail.value });
    this._reprocess();
  },
  onMaxColors: function(e) {
    this.setData({ maxColors: e.detail.value });
    this._reprocess();
  },
  onOutline: function(e) {
    this.setData({ outlineOn: e.detail.value });
    this._reprocess();
  },
  onOutlineStrength: function(e) {
    this.setData({ outlineStrength: e.detail.value });
    this._reprocess();
  },

  _renderCanvas: function() {
    if (!this._grid) return;
    var N = this.data.boardN;
    var size = this.data.canvasSize;
    var ctx = wx.createCanvasContext('beadCanvas', this);
    var cell = Math.floor(size / (N - 4));

    ctx.setFillStyle('#FFFFFF');
    ctx.fillRect(0, 0, size, size);

    var grid = this._grid;
    for (var y = 0; y < N; y++) {
      for (var x = 0; x < N; x++) {
        var id = grid[y] && grid[y][x];
        if (!id) continue;
        var hex = (core.PALETTE_BY_ID[id] && core.PALETTE_BY_ID[id].hex) || '#CCCCCC';
        ctx.setFillStyle(hex);
        ctx.fillRect(x * cell, y * cell, cell, cell);
      }
    }
    ctx.draw();
  },

  exportImage: function() {
    var that = this;
    wx.canvasToTempFilePath({
      canvasId: 'beadCanvas',
      success: function(res) {
        wx.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: function() {
            wx.showToast({ title: '已保存到相册', icon: 'success' });
          },
          fail: function() {
            wx.showToast({ title: '保存失败，请重试', icon: 'none' });
          }
        });
      }
    }, this);
  }
});
