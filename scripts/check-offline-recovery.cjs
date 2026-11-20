const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const listeners={},entries=new Map(),names=['lunest-pwa-oldest','lunest-pwa-previous','lunest-pwa-v8','lunest-pwa-v9'],deleted=[];
const key=r=>new URL(typeof r==='string'?r:r.url,'https://home.lunest.app').href;
const cache={match:async(r,o={})=>{const k=key(r);const value=entries.get(k)||o.ignoreSearch&&[...entries].find(([u])=>u.split('?')[0]===k.split('?')[0])?.[1];return value?.clone();},put:async(r,v)=>entries.set(key(r),v.clone()),delete:async r=>entries.delete(key(r))};
let networkCalls=0,claims=0,network=async()=>new Response('network',{headers:{'content-type':'application/javascript'}});
const caches={keys:async()=>names,open:async()=>cache,delete:async n=>deleted.push(n)};
vm.runInNewContext(fs.readFileSync('public/sw.js','utf8').replace("'<!-- LUNEST_OFFLINE_HTML -->'",JSON.stringify(fs.readFileSync('public/offline.html','utf8'))),{self:{location:{origin:'https://home.lunest.app'},addEventListener:(n,f)=>listeners[n]=f,skipWaiting:async()=>{},clients:{claim:async()=>claims++}},caches,URL,Request,Response,AbortController,fetch:async(...args)=>{networkCalls++;return network(...args);},setTimeout:fn=>setTimeout(fn,2),clearTimeout});
async function request(path,mode='cors'){let result;const waits=[];listeners.fetch({request:{url:new URL(path,'https://home.lunest.app').href,method:'GET',mode},respondWith:p=>result=p,waitUntil:p=>waits.push(p)});if(!result)return null;return result;}
(async()=>{
 entries.set('https://home.lunest.app/__lunest_release_ready__',new Response('ready'));
 let activation;listeners.activate({waitUntil:p=>activation=p});await activation;assert.deepEqual(deleted,['lunest-pwa-oldest']);assert.equal(claims,1);
 entries.set('https://home.lunest.app/_expo/main.js',new Response('saved script',{headers:{'content-type':'application/javascript'}}));
 assert.equal(await(await request('/_expo/main.js')).text(),'saved script');assert.equal(networkCalls,0);
 entries.set('https://home.lunest.app/',new Response('saved shell',{headers:{'content-type':'text/html'}}));
 network=(_r,o)=>new Promise((_,reject)=>o.signal.addEventListener('abort',()=>reject(new Error('timeout'))));
 assert.equal(await(await request('/','navigate')).text(),'saved shell');
 assert.equal(await(await request('/profile','navigate')).text(),'saved shell');
 assert.equal(await(await request('/?__lunest_recover=1','navigate')).text(),'saved shell');
 assert.equal((await request('/_expo/missing.js')).status,503);
 entries.clear();const offline=await request('/new','navigate');assert.equal(offline.status,503);assert.match(await offline.text(),/Try again/);
 network=async()=>new Response('<html>wrong</html>',{headers:{'content-type':'text/html'}});assert.equal((await request('/_expo/bad.js')).status,503);
 const originalOpen=caches.open;caches.open=()=>new Promise(()=>{});network=async()=>new Response('works');assert.equal(await(await request('/asset.txt')).text(),'works');caches.open=originalOpen;
 assert.equal(await request('/v1/users/profile'),null);assert.equal(await request('https://api.lunest.app/v1/users/profile'),null);
 const html=fs.readFileSync('app/+html.jsx','utf8'),recovery=html.split('const bootRecovery = `')[1].split('`;')[0];
 const button={addEventListener(_,fn){this.click=fn;}},message={};let replacement;
 vm.runInNewContext(recovery,{document:{getElementById:id=>id==='lunest-boot-retry'?button:message},window:{addEventListener(){}},location:{href:'https://home.lunest.app/profile',replace:url=>replacement=url},URL,Date,setTimeout:()=>0});await button.click();assert.match(replacement,/profile\?__lunest_recover=/);assert.ok(!recovery.includes('caches.delete'));
 console.log('PASS: warm shell/assets open offline; prior releases survive updates; reload preserves caches; missing JS never becomes HTML; cache locks cannot block; branded retry works.');
})().catch(error=>{console.error(error);process.exitCode=1;});
