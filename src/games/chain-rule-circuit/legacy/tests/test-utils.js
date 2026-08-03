export const tests=[];
export function test(name,fn){tests.push({name,fn});}
export function equal(actual,expected,message=''){if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error(message||`Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}.`);}
export function ok(value,message='Expected a truthy value.'){if(!value)throw new Error(message);}
export function near(actual,expected,tolerance=1e-6){if(Math.abs(actual-expected)>tolerance)throw new Error(`Expected ${actual} to be within ${tolerance} of ${expected}.`);}
export async function run(){const results=[];for(const item of tests){try{await item.fn();results.push({name:item.name,passed:true});}catch(error){results.push({name:item.name,passed:false,error:error.message});}}return results;}
