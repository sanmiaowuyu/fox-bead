/* ---------- 12. 启动 ---------- */
bindEvents();
applyModePreset(); // 初始化模式预设（抖动/色数与默认模式一致）
updateModeDesc(); // 初始化效果模式说明
syncUI();          // 将 HTML 控件同步到 state 默认值，避免初始状态不一致
updateBrandUI();  // 初始化品牌色板说明（默认 Mard）
syncMirrorUI();   // 初始化镜像按钮状态
updateUploadHint(); // 初始化上传建议尺寸
// 放大预览暂缓：不绑定事件，避免隐藏弹窗被触发
// bindPreviewEvents();
