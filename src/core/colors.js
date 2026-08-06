/* ---------- 6. 颜色排除 / 恢复 ---------- */
function nearestAvailable(id) {
  const src = PALETTE_BY_ID[id];
  if (!src) return null;
  const sLab = LAB_BY_ID[id];
  let best = null, bestD = Infinity;
  for (const c of PALETTE_LAB) {
    if (state.excluded.has(c.id) || c.id === id) continue;
    const d = oklabDist(sLab, c.lab);
    if (d < bestD) { bestD = d; best = c.id; }
  }
  return best;
}
function excludeColor(id) {
  if (state.excluded.has(id)) return;
  state.excluded.add(id);
  if (state.grid) {
    for (let y = 0; y < state.N; y++)
      for (let x = 0; x < state.N; x++)
        if (state.grid[y][x] === id) state.grid[y][x] = nearestAvailable(id);
  }
  renderAll();
}
function restoreColor(id) {
  if (!state.excluded.has(id)) return;
  state.excluded.delete(id);
  renderAll();
}

