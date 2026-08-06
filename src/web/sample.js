/* v139: 防抖工具——滑块拖动时不每帧触发 processImage，等拖完 200ms 再算 */
var _debounceTimer = null;
function debounceProcessImage(delay) {
  delay = delay || 200;
  if (_debounceTimer) clearTimeout(_debounceTimer);
  _debounceTimer = setTimeout(function() {
    _debounceTimer = null;
    processImage();
  }, delay);
}

