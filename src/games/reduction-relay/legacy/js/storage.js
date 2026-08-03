const KEY='arcade.legacy.reduction-relay.v1',MAX_IMPORT_BYTES=250_000;
export const EMPTY_STATE={schemaVersion:1,learner:{games:{reductionRelay:{progress:{currentLevel:1,completedLevels:[],score:0,bestStreak:0,streak:0},mastery:{},misconceptions:{},currentRound:null,tutorialComplete:false,conceptDiscoveries:[]}},settings:{reducedMotion:false,fontScale:1}}};
const fresh=()=>structuredClone(EMPTY_STATE);
const safeObject=v=>v&&typeof v==='object'&&!Array.isArray(v);
function unsafeKeys(value){if(!safeObject(value))return false;for(const [k,v] of Object.entries(value)){if(['__proto__','prototype','constructor'].includes(k)||unsafeKeys(v))return true;}return false;}
export function migrateState(value){if(value?.schemaVersion===1)return value;if(value?.progress){const s=fresh();Object.assign(s.learner.games.reductionRelay.progress,value.progress);return s;}throw new Error('Unsupported progress schema');}
export function validateImportedState(value){
 if(unsafeKeys(value))throw new Error('Progress file contains unsafe keys');const s=migrateState(value),g=s?.learner?.games?.reductionRelay,p=g?.progress;
 if(!safeObject(g)||!safeObject(p)||!Number.isInteger(p.currentLevel)||p.currentLevel<1||p.currentLevel>20||!Array.isArray(p.completedLevels)||p.completedLevels.some(n=>!Number.isInteger(n)||n<1||n>20)||!Number.isFinite(p.score)||!safeObject(g.mastery)||!safeObject(g.misconceptions)||Object.values(g.misconceptions).some(v=>!Number.isInteger(v)||v<0)||Object.values(g.mastery).some(v=>!safeObject(v)||!Number.isInteger(v.attempts)||!Array.isArray(v.recentResults)))throw new Error('Progress file has invalid fields');
 const settings=s.learner.settings;if(!safeObject(settings)||!Number.isFinite(settings.fontScale)||settings.fontScale<0.8||settings.fontScale>2||typeof settings.reducedMotion!=='boolean')throw new Error('Progress file has invalid settings');
 const round=g.currentRound;if(round!==null&&round!==undefined){if(!safeObject(round)||!Number.isFinite(round.seed)&&round.seed!==null)throw new Error('Progress file has invalid round');const session=round.session;if(session!==undefined){const allowed=new Set(['ewAdd','ewMultiply','square','scale','sum','mean','weightedSum','max','noReduction']);if(!safeObject(session)||!Array.isArray(session.stages)||session.stages.some(x=>!allowed.has(x))||!Array.isArray(session.shapes)||!Array.isArray(session.intermediates))throw new Error('Progress file has invalid round state');}}
 return structuredClone(s);
}
export function loadState(){try{const raw=localStorage.getItem(KEY);if(!raw)return fresh();return validateImportedState(JSON.parse(raw));}catch{localStorage.removeItem(KEY);return fresh();}}
export function saveState(s){try{localStorage.setItem(KEY,JSON.stringify(validateImportedState(s)));return true;}catch(error){console.warn('Progress could not be saved',error);return false;}}
export function resetState(){localStorage.removeItem(KEY);return fresh();}
export function exportState(s){return new Blob([JSON.stringify(validateImportedState(s),null,2)],{type:'application/json'});}
export async function importState(file){if(!file||file.size>MAX_IMPORT_BYTES)throw new Error('Progress file is missing or larger than 250 KB');let parsed;try{parsed=JSON.parse(await file.text());}catch{throw new Error('Progress file is not valid JSON');}const safe=validateImportedState(parsed);saveState(safe);return safe;}
