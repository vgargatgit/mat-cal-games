import {test,equal,ok} from './test-utils.js';
import {createDefaultState} from '../js/state.js';
import {saveState,loadState,validateState,STORAGE_KEY} from '../js/storage.js';
function memoryStorage(){const values=new Map();return{getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),values};}
test('progress round-trips through versioned storage',()=>{const storage=memoryStorage();const state=createDefaultState();state.learner.games.chainRuleCircuit.progress.score=42;saveState(state,storage);equal(loadState(storage).learner.games.chainRuleCircuit.progress.score,42);ok(storage.values.has(STORAGE_KEY));});
test('corrupted storage recovers safely',()=>{const storage=memoryStorage();storage.setItem(STORAGE_KEY,'{broken');equal(loadState(storage).schemaVersion,1);});
test('import validator rejects unrelated objects',()=>equal(validateState({hello:'world'}),false));
