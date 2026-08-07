function calc(N, sortedLen, isMobile){
  const MAX_CANVAS=16384, CANVAS_RESERVE=2000, MAX_MOBILE=4096;
  let cell=140;
  if(isMobile) cell=60;
  if(N*cell+CANVAS_RESERVE>MAX_CANVAS) cell=Math.floor((MAX_CANVAS-CANVAS_RESERVE)/N);
  if(isMobile && N*cell>MAX_MOBILE) cell=Math.floor(MAX_MOBILE/N);
  cell=Math.max(10,cell);
  const k=cell/24;
  const pad=Math.round(20*k), titleH=Math.round(300*k), gap=1, labelH=Math.round(80*k);
  const M=N-4;
  const patternW=pad*2+M*cell, patternH=pad*2+M*cell, W=patternW;
  const palPad=14, palEntryW=Math.round(280*k), palCellH=Math.round(120*k);
  const palCols=Math.max(1,Math.floor((W-palPad*2)/palEntryW));
  const palRows=Math.ceil(sortedLen/palCols);
  const palH=labelH+palPad+palRows*palCellH+palPad;
  const H=titleH+patternH+gap+palH;
  return {H, W, cell, palRows};
}
console.log('桌面端(色卡数=30):');
[40,60,80,90,100,110,120,140,160,180,200,221].forEach(N=>{
  const r=calc(N,30,false);
  console.log('  N='+N, 'cell='+r.cell, 'W='+r.W, 'H='+r.H, r.H>16384?'  >>> 超限!':'  OK');
});
console.log('桌面端(色卡数=60):');
[100,120,140,160,180,200,221].forEach(N=>{
  const r=calc(N,60,false);
  console.log('  N='+N, 'cell='+r.cell, 'W='+r.W, 'H='+r.H, r.H>16384?'  >>> 超限!':'  OK');
});
