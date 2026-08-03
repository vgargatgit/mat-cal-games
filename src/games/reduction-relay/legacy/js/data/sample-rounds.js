export const SAMPLE_ROUNDS=[
{id:'sample-1',level:1,family:'sum',x:[2,-1,4],stages:['sum'],target:'x',prompt:'Compute the vector sum.',answer:5},
{id:'sample-2',level:2,family:'sum',x:[2,-1,4],stages:['sum'],target:'x',prompt:'Build the gradient of the sum.',gradient:[1,1,1]},
{id:'sample-3',level:4,family:'mean',x:[2,4,6],stages:['mean'],target:'x',prompt:'Build the gradient of the mean.',gradient:[1/3,1/3,1/3]},
{id:'sample-4',level:6,family:'weighted-sum',x:[1,1,1],w:[2,-3,4],stages:['weightedSum'],target:'x',prompt:'Build the weighted-sum gradient.',gradient:[2,-3,4]},
{id:'sample-5',level:7,family:'dot',x:[2,-1,3],y:[4,5,-2],stages:['ewMultiply','sum'],target:'x',prompt:'Compute the product vector and scalar finish.',products:[8,-5,-6],answer:-3},
{id:'sample-6',level:8,family:'dot',x:[2,-1,3],y:[4,5,-2],stages:['ewMultiply','sum'],target:'x',prompt:'Differentiate the dot product with respect to x.',gradient:[4,5,-2]},
{id:'sample-7',level:9,family:'dot',x:[2,-1,3],y:[4,5,-2],stages:['ewMultiply','sum'],target:'y',prompt:'Differentiate the dot product with respect to y.',gradient:[2,-1,3]},
{id:'sample-8',level:10,family:'dot',x:[2,-1,3],y:[4,5,-2],stages:['ewMultiply','sum'],target:'x',prompt:'Compare element-wise multiplication with a dot product.',elementwiseJacobian:[[4,0,0],[0,5,0],[0,0,-2]],sumJacobian:[1,1,1],gradient:[4,5,-2]},
{id:'sample-9',level:11,family:'sum-squares',x:[2,-1,3],stages:['square','sum'],target:'x',prompt:'Build the sum-of-squares gradient.',gradient:[4,-2,6]},
{id:'sample-10',level:12,family:'weighted-sum-squares',x:[2,-1,3],w:[2,3,-1],stages:['square','weightedSum'],target:'x',prompt:'Build the weighted sum-of-squares gradient.',gradient:[8,-6,-6]},
{id:'sample-11',level:13,family:'sum',x:[1,2,3,4],stages:['sum'],target:'losses',prompt:'Differentiate a sum of four losses.',gradient:[1,1,1,1]},
{id:'sample-12',level:14,family:'mean',x:[1,2,3,4],stages:['mean'],target:'losses',prompt:'Differentiate a mean of four losses.',gradient:[.25,.25,.25,.25]},
{id:'sample-13',level:15,family:'sum-squares',x:[1,-2,3],stages:['square','sum'],target:'e',prompt:'Differentiate sum of squared errors.',gradient:[2,-4,6]},
{id:'sample-14',level:15,family:'mse',x:[1,-2,3],stages:['square','mean'],target:'e',prompt:'Differentiate mean squared error.',gradient:[2/3,-4/3,2]},
{id:'sample-15',level:16,family:'sum',x:[2,3,4],stages:['sum'],target:'x',upstream:4,prompt:'Send upstream gradient 4 through a sum.',gradient:[4,4,4]},
{id:'sample-16',level:16,family:'dot',x:[2,-1,3],y:[4,5,-2],stages:['ewMultiply','sum'],target:'x',upstream:3,prompt:'Send an upstream gradient through a dot product.',symbolicUpstream:'g',symbolicGradient:['4g','5g','-2g'],symbolicExpression:'g yᵀ',gradient:[12,15,-6]}
];
