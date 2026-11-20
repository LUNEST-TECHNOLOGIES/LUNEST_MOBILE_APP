const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),babel=require('@babel/core');
let stored={id:'user',fullName:'Test User'},sent=[],reply={success:true,status:'VERIFIED',phone:'2348012345678'},status=200;
const output={};
const code=babel.transformSync(fs.readFileSync('src/services/authService.js','utf8'),{configFile:false,babelrc:false,plugins:[require('@babel/plugin-transform-modules-commonjs')]}).code;
vm.runInNewContext(code,{exports:output,process:{env:{}},AbortController,Date,console:{log(){},warn(){},error(){}},setTimeout:fn=>setTimeout(fn,5),clearTimeout,
 fetch:async(url,options)=>{sent.push(JSON.parse(options.body));return{ok:status===200,status,headers:{get:()=>null},json:async()=>reply};},
 require(name){if(name.includes('userDataService'))return{getUserData:async()=>stored,setUserData:async data=>{stored=data;return true;}};if(name==='react-native')return{Platform:{OS:'web'}};return{__esModule:true,default:{}};},
});
(async()=>{
 const service=output.default;service.getToken=async()=> 'unit-test-token';
 let result=await service.sendPhoneOTP({phone:'+2348012345678',countryCode:'+234',resend:true});
 assert.equal(result.success,true);assert.equal(sent[0].resend,true);assert.equal(sent[0].phone,'+2348012345678');
 const before=sent.length;result=await service.verifyPhoneOTP('+2348012345678','1234');assert.equal(result.success,false);assert.equal(sent.length,before);
 result=await service.verifyPhoneOTP('+2348012345678','654321');assert.equal(result.success,true);assert.equal(stored.phoneVerified,true);assert.equal(stored.phoneNumber,'2348012345678');assert.equal(stored.fullName,'Test User');
 stored={id:'user',phoneVerified:false};status=400;reply={success:false,message:'Invalid code'};
 result=await service.verifyPhoneOTP('+2348012345678','654321');assert.equal(result.success,false);assert.equal(stored.phoneVerified,false);
 let resolveToken;service.getToken=()=>new Promise(resolve=>{resolveToken=resolve;});const count=sent.length;
 result=await service.sendPhoneOTP('+2348012345678');assert.equal(result.success,false);resolveToken('late-token');await Promise.resolve();await Promise.resolve();assert.equal(sent.length,count);
 console.log('PASS: resend payload, full-code validation, canonical verified-profile persistence, failed verification and no late SMS request after timeout.');
})().catch(error=>{console.error(error);process.exitCode=1;});
