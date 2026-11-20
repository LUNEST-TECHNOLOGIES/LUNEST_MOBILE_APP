const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),babel=require('@babel/core');
let user={id:'A'},callback=null,nextTimer=null,clears=0;const storage=new Map(),queries=new Map(),out={};const key=k=>JSON.stringify(k);
const client={cancelQueries:async()=>{},clear(){queries.clear();clears++;},setQueryData(k,data,options={}){queries.set(key(k),{queryKey:k,state:{data,dataUpdatedAt:options.updatedAt||Date.now()}});callback?.();},getQueryCache:()=>({getAll:()=>[...queries.values()],subscribe:fn=>{callback=fn;return()=>callback=null;}})};
const store={getItem:async k=>storage.get(k),setItem:async(k,v)=>storage.set(k,v),removeItem:async k=>storage.delete(k)};
vm.runInNewContext(babel.transformSync(fs.readFileSync('src/lib/offlineQueries.js','utf8'),{configFile:false,babelrc:false,plugins:[require('@babel/plugin-transform-modules-commonjs')]}).code,{exports:out,Date,Set,Promise,JSON,setTimeout:fn=>{nextTimer=fn;return 1;},clearTimeout:()=>{nextTimer=null;},require:name=>name.includes('queryClient')?{queryClient:client}:name.includes('userDataService')?{getUserData:async()=>user}:{__esModule:true,default:store}});
(async()=>{
 storage.set('@lunest_saved_screens_v1:A',{owner:'A',savedAt:Date.now(),queries:[{key:['hostListings'],data:[{id:'A-property'}],updatedAt:Date.now()}]});
 await out.restoreOfflineQueries();assert.equal(queries.get('["hostListings"]').state.data[0].id,'A-property');
 client.setQueryData(['userProfile'],{id:'A',fullName:'Host',password:'secret',nin:'private',kycData:{private:true}});
 client.setQueryData(['walletInfo'],{balance:1000});await nextTimer();
 const saved=storage.get('@lunest_saved_screens_v1:A');assert.ok(!JSON.stringify(saved).includes('secret'));assert.ok(!JSON.stringify(saved).includes('walletInfo'));assert.ok(!JSON.stringify(saved).includes('kycData'));
 user={id:'B'};await out.restoreOfflineQueries();assert.equal(queries.size,0);assert.ok(clears>0);
 client.setQueryData(['hostListings'],[{id:'B-property'}]);await nextTimer();await out.clearOfflineQueries();assert.equal(queries.size,0);assert.equal(storage.has('@lunest_saved_screens_v1:B'),false);
 console.log('PASS: cached pages restore for the same account; account changes clear memory; sensitive credentials and wallet queries are excluded; logout removes saved account pages.');
})().catch(e=>{console.error(e);process.exitCode=1;});
