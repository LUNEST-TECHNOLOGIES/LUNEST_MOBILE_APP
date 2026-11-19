const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const babel = require('@babel/core');
const listeners = {};
const entries = new Map();
const deleted = [];
let networkCalls = 0;
let network = async () => new Response('fresh', {headers:{'content-type':'application/javascript'}});
const key = request => new URL(typeof request === 'string' ? request : request.url, 'https://home.lunest.app').href;
const cache = {
 async match(request, options = {}) {
  let entry = entries.get(key(request));
  if (!entry && options.ignoreSearch) entry = [...entries].find(([url])=>url.split('?')[0]===key(request).split('?')[0])?.[1];
  return entry?.clone();
 },
 async put(request,response) { entries.set(key(request),response.clone()); },
 async delete(request) { return entries.delete(key(request)); },
};
const cacheNames=['lunest-pwa-v7','lunest-pwa-v8','unrelated-cache'];
vm.runInNewContext(fs.readFileSync('public/sw.js','utf8'),{
 self:{location:{origin:'https://home.lunest.app'},addEventListener:(event,fn)=>{listeners[event]=fn;},skipWaiting:async()=>{},clients:{claim:async()=>{}}},
 caches:{keys:async()=>cacheNames,delete:async name=>deleted.push(name),open:async()=>cache},
 fetch:async(...args)=>{networkCalls++;return network(...args);},URL,Response,AbortController,
 setTimeout:fn=>setTimeout(fn,2),clearTimeout,
});
async function request(path,mode='cors') {
 let response;
 const waits=[];
 listeners.fetch({request:{method:'GET',url:new URL(path,'https://home.lunest.app').href,mode},respondWith:promise=>{response=promise;},waitUntil:promise=>waits.push(promise)});
 if (!response) return null;
 const result=await response;await Promise.all(waits);return result;
}
(async()=>{
 let activation;listeners.activate({waitUntil:promise=>{activation=promise;}});await activation;
 assert.deepEqual(deleted,['lunest-pwa-v7']);
 entries.set('https://home.lunest.app/_expo/entry-hash.js',new Response('cached bundle',{headers:{'content-type':'application/javascript'}}));
 assert.equal(await (await request('/_expo/entry-hash.js')).text(),'cached bundle');assert.equal(networkCalls,0);
 assert.equal(await request('/v1/users/profile'),null);assert.equal(await request('https://maps.googleapis.com/test'),null);
 entries.set('https://home.lunest.app/',new Response('cached home',{headers:{'content-type':'text/html'}}));
 network=(_request,options)=>new Promise((_,reject)=>options.signal.addEventListener('abort',()=>reject(new Error('timeout'))));
 assert.equal(await (await request('/','navigate')).text(),'cached home');
 assert.equal(await (await request('/new-route','navigate')).text(),'cached home');
 const missing=await request('/_expo/missing.js');assert.equal(missing.status,503);assert.ok(!(await missing.text()).includes('cached home'));
 network=async()=>new Response('<html>wrong fallback</html>',{headers:{'content-type':'text/html'}});
 assert.equal((await request('/_expo/wrong.js')).status,503);assert.equal(entries.has('https://home.lunest.app/_expo/wrong.js'),false);
 entries.set('https://home.lunest.app/_expo/bad-cached.js',new Response('<html>stale</html>',{headers:{'content-type':'text/html'}}));
 assert.equal((await request('/_expo/bad-cached.js')).status,503);assert.equal(entries.has('https://home.lunest.app/_expo/bad-cached.js'),false);
 const output={};vm.runInNewContext(babel.transformSync(fs.readFileSync('src/utils/startup.js','utf8'),{configFile:false,babelrc:false,plugins:[require('@babel/plugin-transform-modules-commonjs')]}).code,{exports:output,Promise,setTimeout,clearTimeout,Error});
 assert.equal(await output.withStartupTimeout(Promise.resolve('ready'),10),'ready');
 await assert.rejects(output.withStartupTimeout(new Promise(()=>{}),5),/taking longer/);
 const html=fs.readFileSync('app/+html.jsx','utf8');
 const recovery=html.split('const bootRecovery = `')[1].split('`;')[0];
 const button={hidden:true,addEventListener(_name,fn){this.click=fn;}};
 const message={};let reloads=0;const purged=[];const unregistered=[];
 vm.runInNewContext(recovery,{
 document:{getElementById:id=>id==='lunest-boot-retry'?button:message},window:{caches:{},addEventListener(){}},
 caches:{keys:async()=>['lunest-pwa-old','other-app'],delete:async name=>purged.push(name)},
 navigator:{serviceWorker:{getRegistrations:async()=>[{scope:'https://home.lunest.app/',unregister:async()=>unregistered.push('root')},{scope:'https://home.lunest.app/other/',unregister:async()=>unregistered.push('other')}]}},
 location:{origin:'https://home.lunest.app',reload:()=>reloads++},setTimeout:fn=>fn(),Promise,
 });
 assert.equal(button.hidden,false);await button.click();
 assert.deepEqual(purged,['lunest-pwa-old']);assert.deepEqual(unregistered,['root']);assert.equal(reloads,1);
 console.log('PASS: warm asset cache bypasses network; stale caches clear selectively; stalled/offline navigation recovers; HTML cannot poison script cache; startup/recovery is bounded and preserves app data.');
})().catch(error=>{console.error(error);process.exitCode=1;});
