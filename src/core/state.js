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
  outline: { on: false, strength: 50, colorId: 'H7', thickness: 1 }, // v123: 像素描边（后处理）：在颜色边界描轮廓线，呈现像素插画线条感。默认关。thickness=描边宽度(格数)。
  paletteView: 'grid',   // 右侧色板清单视图：'grid' 紧凑色块 / 'list' 行列表
  showCoords: true,      // 画布预览是否显示坐标数字（左侧/底部轴）
  excluded: new Set(),   // 用户排除的颜色
  maxColors: 24,         // 最终图纸颜色数量上限（4~64），与默认真实模式一致；切模式时按预设自动调整为 8/24
  bgMask: null,          // 二维布尔数组：true=该格为背景填充（导出不画色号、不计入用料）
  bgStatus: '',           // 去背景状态反馈：''=未开启 / 'ok'=成功 / 'no_bg'=未检测到背景 / 'small'=板子太小跳过 / 'full'=主体占满
  _manualBgRGB: null,     // v140: 手动取样背景色（{r,g,b}），设置后 removeBackground 跳过自动检测直接用此色
  // v100: 编辑模式
  editMode: false,       // 编辑模式开关
  editSel: null,         // 选中的显示格子 [{gx,gy},...]（displayRect 坐标）
  editTool: 'select',    // 编辑工具：'select' 选格换色 / 'paint' 手绘刷色
  selectedColor: 'H7',   // 手绘画笔色 / 当前选中色（默认白色系）
  // 图片处理模块（通用预处理）
  originalImage: null,   // 上传原图（首次载入时记录，用于重置预处理）
  prep: { rotate: 0, flipH: false, flipV: false, brightness: 0, contrast: 0, saturation: 0 }, // 待烘焙的预处理参数
  prepBase: null,        // 图片处理面板打开时的基准图（用于取消/重置，不修改则回退到此）
  userCrop: null,        // 预处理裁切框 {sx,sy,sw,sh}（基于旋转/翻转后的预览坐标，烘焙后清空）
  // 豆仓库存（图片处理模块同级能力）：按色号记录手头豆数，对比当前图纸用量算缺口
  inventory: {},         // {colorId: stockCount} 豆仓库存，持久化 localStorage
  inventoryOpen: false,  // 豆仓弹窗是否打开
  inventoryView: 'used', // 'used' 仅列当前图纸用到的色 / 'all' 列全部 221 色
};

