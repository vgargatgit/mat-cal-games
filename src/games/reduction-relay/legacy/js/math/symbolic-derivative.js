export function gradientFor(question){const n=question.x?.length||question.losses?.length||3;switch(question.family){
 case 'sum':case 'sum-loss':return {values:Array(n).fill(1),latex:`\\begin{bmatrix}${Array(n).fill('1').join('&')}\\end{bmatrix}`};
 case 'mean':case 'mean-loss':return {values:Array(n).fill(1/n),latex:`\\begin{bmatrix}${Array(n).fill(`1/${n}`).join('&')}\\end{bmatrix}`};
 case 'weighted-sum':return {values:[...question.w],latex:`\\begin{bmatrix}${question.w.join('&')}\\end{bmatrix}`};
 case 'dot':{const v=question.target==='y'?question.x:question.y;return {values:[...v],latex:`\\begin{bmatrix}${v.join('&')}\\end{bmatrix}`}}
 case 'sum-squares':return {values:question.x.map(v=>2*v),latex:`\\begin{bmatrix}${question.x.map((_,i)=>`2x_${i+1}`).join('&')}\\end{bmatrix}`};
 case 'weighted-sum-squares':return {values:question.x.map((v,i)=>2*question.w[i]*v),latex:`\\begin{bmatrix}${question.w.map((w,i)=>`${2*w}x_${i+1}`).join('&')}\\end{bmatrix}`};
 case 'mean-squares':case 'mse':return {values:question.x.map(v=>2*v/n),latex:`\\frac{2}{${n}}\\begin{bmatrix}${question.x.map((_,i)=>`e_${i+1}`).join('&')}\\end{bmatrix}`};
 case 'max':{const maximum=Math.max(...question.x),count=question.x.filter(v=>v===maximum).length;if(count!==1)throw new Error('Maximum derivative is not unique at a tie');return {values:question.x.map(v=>v===maximum?1:0),latex:`\\begin{bmatrix}${question.x.map(v=>v===maximum?'1':'0').join('&')}\\end{bmatrix}`};}
 default:throw new Error('Unsupported derivative family')}}
