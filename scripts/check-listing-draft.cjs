const fs = require('fs');
const vm = require('vm');
const assert = require('assert/strict');
const babel = require(process.cwd() + '/node_modules/@babel/core');
let slots = [], cursor = 0, pending = [];
const react = {
 useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
 useRef(initial) { const i = cursor++; return slots[i] ||= {current: initial}; },
 useCallback(fn) { cursor++; return fn; }, useEffect() { cursor++; }
};
let cache = {draftId:'test', city:'Lagos'};
const service = { getDraftSync: () => cache, saveDraft: updates => { cache = {...cache,...updates}; const draft=cache; return new Promise(resolve => pending.push(() => resolve(draft))); } };
const code = babel.transformSync(fs.readFileSync('src/hooks/useDraftListing.js', 'utf8'), {configFile:false, babelrc:false, plugins:[require(process.cwd() + '/node_modules/@babel/plugin-transform-modules-commonjs')]}).code;
const hookExports = {};
vm.runInNewContext(code, {exports:hookExports, console:{log(){},warn(){},error(){}}, require(name) { if(name==='react') return react; if(name==='react-native') return {AppState:{currentState:'active'}}; if(name==='expo-router') return {useLocalSearchParams:()=>({draftId:'test'})}; return {__esModule:true,default:service}; }});
const render = () => { cursor=0; return hookExports.useDraftListing(); };
(async () => {
 let hook=render();
 const first=hook.saveDraftData({propertyTitle:'Old title'}, {background:true});
 await first; hook=render();
 await hook.saveDraftData({propertyTitle:'',roomSizes:[]}, {background:true});
 hook=render();
 assert.equal(hook.draftData.propertyTitle,'');
 pending[1](); await Promise.resolve();
 pending[0](); await Promise.resolve();
 hook=render();
 assert.equal(hook.draftData.propertyTitle,'');
 assert.deepEqual(Array.from(hook.draftData.roomSizes),[]);
 assert.equal(hook.draftData.city,'Lagos');
 console.log('PASS: deletion stays empty after out-of-order saves; unrelated draft fields survive.');
})();
