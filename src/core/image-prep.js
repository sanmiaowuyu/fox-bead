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
