def calc(N, sl):
    MAX=16384; RES=2000
    cell=140
    if N*cell+RES>MAX: cell=(MAX-RES)//N
    cell=max(10,cell)
    M=N-4
    gap=1; palPad=14
    def recalc():
        nonlocal k,pad,titleH,labelH,patternW,patternH,W,palEntryW,palCellH,palCols,palRows,palH,H
        k=cell/24; pad=round(20*k); titleH=round(300*k); labelH=round(80*k)
        patternW=pad*2+M*cell; patternH=pad*2+M*cell; W=patternW
        palEntryW=round(280*k); palCellH=round(120*k)
        palCols=max(1,(W-palPad*2)//palEntryW); palRows=(sl+palCols-1)//palCols
        palH=labelH+palPad+palRows*palCellH+palPad; H=titleH+patternH+gap+palH
    k=pad=titleH=labelH=patternW=patternH=W=palEntryW=palCellH=palCols=palRows=palH=H=0
    recalc()
    g=0
    while H>MAX and cell>10 and g<40:
        cell=max(10,(cell*(MAX-gap))//H); recalc(); g+=1
    return H,cell
bad=0
for sl in (30,60):
    for N in (40,60,80,100,120,140,160,180,200,221):
        H,cell=calc(N,sl)
        flag='' if H<=16384 else '  >>> 仍超限!'
        if H>16384: bad+=1
        print(f'  色卡={sl} N={N} cell={cell} H={H}{flag}')
print('超限数量:',bad)
