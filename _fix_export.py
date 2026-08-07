import re
p='src/web/exporter.js'
s=open(p,encoding='utf-8').read()
lines=s.split('\n')

# 1) buildExportCanvas 派生布局块加总高度钳制（用包含匹配，避开尾随空格差异）
si=[i for i,l in enumerate(lines) if 'const k = cell / 24' in l][0]
ei=[i for i in range(si,len(lines)) if 'const H = titleH + patternH + gap + palH' in l][0]
new_block='''  // ===== 统计色号（跳过背景填充格，不依赖 cell，先算）=====
  const counts = {};
  let totalBeads = 0;
  var sub = state.subject || state.effective;
  var syS = sub && sub.cols > 0 ? sub.minY : 0;
  var syE = sub && sub.cols > 0 ? sub.maxY : N - 1;
  var sxS = sub && sub.cols > 0 ? sub.minX : 0;
  var sxE = sub && sub.cols > 0 ? sub.maxX : N - 1;
  for (let y = syS; y <= syE; y++) for (let x = sxS; x <= sxE; x++) {
    const id = state.grid[y][x];
    if (id && !(state.bgMask && state.bgMask[y][x])) { counts[id] = (counts[id] || 0) + 1; totalBeads++; }
  }
  const sorted = Object.entries(counts).sort((a, b) => {
    const ma = a[0].match(/^([A-Za-z]+)(\\d+)$/);
    const mb = b[0].match(/^([A-Za-z]+)(\\d+)$/);
    if (!ma || !mb) return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
    if (ma[1] !== mb[1]) return ma[1] < mb[1] ? -1 : 1;
    return parseInt(ma[2], 10) - parseInt(mb[2], 10);
  });

  // ===== 派生尺寸 + 总高度钳制（关键修复：旧逻辑只钳宽度，色板区高使 H 超 16384
  //       浏览器 canvas 上限 -> toBlob 静默失败 -> 弹"生成失败"。现按 H 比例缩 cell 重算）=====
  const showStats = opts.stats !== false;
  const palPad = 14;
  const sortedLen = sorted.length;
  let k, pad, titleH, labelH, patternW, patternH, W, palEntryW, palCellH, palCols, palRows, palH, H;
  const gap = 1;
  function _recalcLayout() {
    k = cell / 24;
    pad = Math.round(20 * k);
    titleH = Math.round(300 * k);
    labelH = Math.round(80 * k);
    patternW = pad * 2 + M * cell;
    patternH = pad * 2 + M * cell;
    W = patternW;
    palEntryW = Math.round(280 * k);
    palCellH = Math.round(120 * k);
    palCols = showStats ? Math.max(1, Math.floor((W - palPad * 2) / palEntryW)) : 0;
    palRows = showStats ? Math.ceil(sortedLen / palCols) : 0;
    palH = showStats ? (labelH + palPad + palRows * palCellH + palPad) : 0;
    H = titleH + patternH + gap + palH;
  }
  _recalcLayout();
  let _guard = 0;
  while (H > MAX_CANVAS && cell > 10 && _guard < 40) {
    cell = Math.max(10, Math.floor(cell * (MAX_CANVAS - gap) / H));
    _recalcLayout();
    _guard++;
  }'''
lines[si:ei+1]=new_block.split('\n')
s='\n'.join(lines)

# 2) PALETTE_BY_ID[tid] 越界保护（_pngGetCell 两处）
old_p="return { id: tid, bg: tbg, hex: (tid && !tbg) ? PALETTE_BY_ID[tid].hex : '#FFFFFF' };"
new_p="var _pp = (tid && !tbg && PALETTE_BY_ID[tid]) ? PALETTE_BY_ID[tid] : null; return { id: tid, bg: tbg, hex: _pp ? _pp.hex : '#FFFFFF' };"
cnt=s.count(old_p)
s=s.replace(old_p,new_p)
print('PALETTE guard replacements:', cnt)

# 3) buildExportCanvas 入口空保护
s2=re.sub(r'(function buildExportCanvas\(opts\) \{\n  const N = state\.N;\n)',
          r'\1  if (!state.displayRect || !state.grid) return null;\n', s, count=1)
print('entry guard added:', s2!=s)

open(p,'w',encoding='utf-8').write(s2)
import os
os.remove('_fix_export.py')
print('DONE')
