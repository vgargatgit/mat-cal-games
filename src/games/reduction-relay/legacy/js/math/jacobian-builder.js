export function diagonal(values){return values.map((v,i)=>values.map((_,j)=>i===j?v:0))}
export function row(values){return [values]}
export function multiplyRowByDiagonal(r,d){return d[0].map((_,j)=>r.reduce((a,v,i)=>a+v*d[i][j],0))}