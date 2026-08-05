/* ---------- 10. 示例图（程序生成卡通猫） ---------- */
function generateSample() {
  const s = 400;
  const cv = document.createElement('canvas');
  cv.width = s; cv.height = s;
  const c = cv.getContext('2d');
  c.fillStyle = '#FFF8E7'; c.fillRect(0, 0, s, s);
  // 脸
  c.fillStyle = '#FFB347';
  c.beginPath(); c.ellipse(200, 220, 130, 120, 0, 0, Math.PI * 2); c.fill();
  // 耳朵
  c.beginPath(); c.moveTo(95, 130); c.lineTo(70, 40); c.lineTo(165, 100); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(305, 130); c.lineTo(330, 40); c.lineTo(235, 100); c.closePath(); c.fill();
  // 内耳
  c.fillStyle = '#FF7EC0';
  c.beginPath(); c.moveTo(100, 120); c.lineTo(88, 65); c.lineTo(150, 100); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(300, 120); c.lineTo(312, 65); c.lineTo(250, 100); c.closePath(); c.fill();
  // 眼睛
  c.fillStyle = '#2B2B33';
  c.beginPath(); c.arc(155, 210, 18, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(245, 210, 18, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#FFFFFF';
  c.beginPath(); c.arc(161, 204, 6, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(251, 204, 6, 0, Math.PI * 2); c.fill();
  // 鼻子
  c.fillStyle = '#FF69B4';
  c.beginPath(); c.moveTo(200, 245); c.lineTo(185, 232); c.lineTo(215, 232); c.closePath(); c.fill();
  // 嘴
  c.strokeStyle = '#2B2B33'; c.lineWidth = 3;
  c.beginPath(); c.arc(185, 250, 14, 0.1, Math.PI - 0.1); c.stroke();
  c.beginPath(); c.arc(215, 250, 14, Math.PI + 0.1, Math.PI * 2 - 0.1); c.stroke();
  // 腮红
  c.fillStyle = 'rgba(255,126,192,0.6)';
  c.beginPath(); c.arc(125, 250, 18, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(275, 250, 18, 0, Math.PI * 2); c.fill();
  // 胡须
  c.strokeStyle = '#2B2B33'; c.lineWidth = 2;
  [[120,245,60,235],[120,255,60,258],[280,245,340,235],[280,255,340,258]].forEach(([x1,y1,x2,y2])=>{
    c.beginPath(); c.moveTo(x1,y1); c.lineTo(x2,y2); c.stroke();
  });
  const img = new Image();
  img.onload = () => { state.sourceImage = img; processImage(); };
  img.src = cv.toDataURL();
}

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

