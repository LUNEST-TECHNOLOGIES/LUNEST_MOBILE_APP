const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),babel=require('@babel/core');
const exportsObject={};let user={id:'account-A'},offline=false,failures=0,calls=0,cleared=0,mode='timeout';const stored=new Map([['token','saved-access-token'],['refresh','saved-refresh-token']]);
const secure={getSecureItem:async key=>stored.get(key),removeSecureItem:async key=>stored.delete(key),setSecureItem:async(k,v)=>stored.set(k,v)};
const source=babel.transformSync(fs.readFileSync('src/services/authService.js','utf8'),{configFile:false,babelrc:false,plugins:[require('@babel/plugin-transform-modules-commonjs')]}).code;
vm.runInNewContext(source,{exports:exportsObject,process:{env:{}},Date,AbortController,FormData,console:{log(){},warn(){},error(){}},setTimeout:fn=>setTimeout(fn,5),clearTimeout,
 fetch:async(_url,options)=>{calls++;if(mode==='rejected')return{ok:false,status:401,json:async()=>({message:'Refresh rejected'})};return new Promise((_,reject)=>options.signal.addEventListener('abort',()=>reject(Object.assign(new Error('timeout'),{name:'AbortError'}))));},
 require(name){if(name.includes('connectionService'))return{isDeviceOffline:()=>offline,reportNetworkFailure:()=>failures++,reportNetworkSuccess(){}};if(name.includes('storageKeys'))return{SECURE_KEYS:{AUTH_TOKEN:'token',REFRESH_TOKEN:'refresh',TOKEN_EXPIRY:'expiry',SESSION_ID:'session'},STORAGE_KEYS:{USER_DATA:'userData'}};if(name.includes('secureStorageService'))return{__esModule:true,default:secure};if(name.includes('userDataService'))return{getUserData:async()=>user,setUserData:async next=>{user=next;}};if(name.includes('offlineQueries'))return{clearOfflineQueries:async()=>cleared++};if(name==='react-native')return{Platform:{OS:'web'}};return{__esModule:true,default:{destroy(){},getBaseURL:async()=> 'https://api.example.invalid'}};}
});
(async()=>{
 const auth=exportsObject.default;auth._validateTokenFormat=()=>true;auth._isTokenExpired=async()=>true;
 assert.equal(await auth.hasLocalSession(),true);assert.equal(calls,0,'Opening local session never calls the network');
 offline=true;assert.equal(await auth.isLoggedIn(),true);assert.equal(await auth.getToken(),null);assert.equal(calls,0);
 offline=false;assert.equal(await auth.isLoggedIn(),true);assert.equal(stored.has('token'),true);assert.ok(failures>0);
 mode='rejected';assert.equal(await auth.isLoggedIn(),false);assert.equal(stored.has('token'),false);assert.equal(user,null);
 user={id:'account-A'};stored.set('token','saved-access-token');mode='timeout';const result=await auth.logout();assert.equal(result.success,true);assert.equal(stored.has('token'),false);assert.equal(user,null);assert.equal(cleared,1);
 console.log('PASS: saved startup does not await network; outages preserve local session; expired tokens cannot authorize offline calls; explicit rejection and logout clear identity/cache.');
})().catch(error=>{console.error(error);process.exitCode=1;});
