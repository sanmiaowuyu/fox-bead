/* ---------- 3. 状态 ---------- */
const CELL = 28; // 画布内每格像素
const state = {
  sourceImage: null,     // 原图 Image
  grid: null,            // grid[y][x] = colorId | null
  N: 104,                // 默认 104×104（2.6mm 小豆超大板 28×28cm）
  view: 'template',      // 'template' | 'original'
  zoom: 1,
  mode: 'average',       // 'cartoon' | 'average'（卡通 / 真实，默认真实模式）
  dither: false,         // 抖动已随模式固化，当前各模式均关闭抖动，由采样方式决定风格
  cleanup: 5,
  crop: false,           // 默认不裁剪：原图按比例居中(letterbox)显示，四周留白，不裁不拉
  mirror: false,         // 镜像翻转（左右）：预览 / 图纸 / 采购清单同步翻转
  showGrid: true,
  bgMode: 'white',       // 一键切换背景：'black' 黑底 / 'white' 白底（默认白底）
  removeBg: false,        // 自动去背景：默认关，整张图都参与拼豆（白色主体正常标色号）；纯色背景图才手动开
  brighten: false,        // 提亮一档：默认关，开后每个色号替换成同系列更亮一档的真实色号
  outline: { on: false, strength: 50, colorId: 'H7' }, // v123: 像素描边（后处理）：在颜色边界描轮廓线，呈现像素插画线条感。默认关。
  paletteView: 'grid',   // 右侧色板清单视图：'grid' 紧凑色块 / 'list' 行列表
  showCoords: true,      // 画布预览是否显示坐标数字（左侧/底部轴）
  excluded: new Set(),   // 用户排除的颜色
  maxColors: 24,         // 最终图纸颜色数量上限（4~64），与默认真实模式一致；切模式时按预设自动调整为 8/24
  bgMask: null,          // 二维布尔数组：true=该格为背景填充（导出不画色号、不计入用料）
  bgStatus: '',           // 去背景状态反馈：''=未开启 / 'ok'=成功 / 'no_bg'=未检测到背景 / 'small'=板子太小跳过 / 'full'=主体占满
  // v100: 编辑模式
  editMode: false,       // 编辑模式开关
  editSel: null,         // 选中的显示格子 [{gx,gy},...]（displayRect 坐标）
};

