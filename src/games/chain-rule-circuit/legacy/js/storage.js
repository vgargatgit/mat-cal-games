import { createDefaultState, SCHEMA_VERSION, GAME_KEY } from './state.js';

export const STORAGE_KEY='arcade.legacy.chain-rule-circuit.v1';

export function validateState(value){
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  if(value.schemaVersion!==SCHEMA_VERSION)return false;
  const learner=value.learner; const game=learner?.games?.[GAME_KEY];
  return Boolean(learner&&typeof learner.settings==='object'&&game&&typeof game.progress==='object'&&Array.isArray(game.progress.completedLevels)&&typeof game.mastery==='object'&&typeof game.misconceptions==='object');
}

function defaultStorage(){try{return globalThis.localStorage;}catch{return null;}}

export function loadState(storage=defaultStorage()){
  try{const raw=storage?.getItem(STORAGE_KEY);if(!raw)return createDefaultState();const parsed=JSON.parse(raw);return validateState(parsed)?parsed:createDefaultState();}catch{return createDefaultState();}
}
export function saveState(state,storage=defaultStorage()){if(!validateState(state))throw new TypeError('Refusing to save invalid progress.');storage?.setItem(STORAGE_KEY,JSON.stringify(state));return state;}
export function resetState(storage=defaultStorage()){const state=createDefaultState();saveState(state,storage);return state;}
export function exportState(state){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='chain-rule-circuit-progress.json';link.click();URL.revokeObjectURL(link.href);}
export async function importState(file){const parsed=JSON.parse(await file.text());if(!validateState(parsed))throw new TypeError('This file is not valid Chain Rule Circuit progress.');saveState(parsed);return parsed;}
