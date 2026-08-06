/* ---------- 4. DOM ---------- */
const $ = id => document.getElementById(id);
const canvas = $('bead-canvas');
const ctx = canvas.getContext('2d');

function updateBrandUI() {
  const tag = document.getElementById('brand-tag'); if (tag) tag.textContent = 'Mard';
}

function syncMirrorUI() {
  const btn = document.getElementById('btn-mirror');
  if (btn) btn.classList.toggle('active', !!state.mirror);
}