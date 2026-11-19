const fs = require('fs');
const vm = require('vm');
const assert = require('assert/strict');
const babel = require('@babel/core');
function load(path, dependencies) {
  const output = {};
  const code = babel.transformSync(fs.readFileSync(path, 'utf8'), {configFile:false,babelrc:false,plugins:[require('@babel/plugin-transform-modules-commonjs')]}).code;
  vm.runInNewContext(code, {exports:output, module:{exports:output}, console:{log(){},warn(){},error(){}},setTimeout,clearTimeout,require(name) { const value=dependencies[name] || {}; return {__esModule:true,default:value,...value}; }});
  return output.default;
}
(async () => {
 let payload;
 const api = {post:async (_url,data)=>{payload=data;return {body:{_id:'server-id'}};}};
 const auth = {getToken:async()=> 'token',getUserData:async()=> ({id:'host'})};
 const listing = load('src/services/listingService.js', {'react-native':{Platform:{OS:'web'}},'./authService':auth,'./apiClient':api,'../utils/amenityUtils':{formatAmenitiesList:()=>[]}});
 for (const policy of [null,false,true]) {
  const result=await listing.saveDraftToDatabase({draftId:'draft-test',propertyTitle:'Edited title',propertyHighlight:'Edited description',price:'125,000',pricingPeriod:'month',securityDeposit:'',cautionFee:'',propertyPrice:{securityDeposit:5000},acceptRefund:policy});
  assert.equal(result.success,true,result.message);
  assert.equal(payload.propertyName,'Edited title');
  assert.equal(payload.description,'Edited description');
  assert.equal(payload.price,125000);
  assert.equal(payload.propertyPrice.frequency,'per month');
  assert.equal(payload.securityDeposit,0);
  assert.equal(payload.acceptRefund,policy);
 }
 let stored=[];
 const storage={getItem:async()=>structuredClone(stored),setItem:async(_key,value)=>{await new Promise(resolve=>setTimeout(resolve,5));stored=structuredClone(value);}};
 const drafts=load('src/services/draftListingService.js',{'./authService':auth,'./storageService':storage,'./logService':{logInfo(){},logError(){}}});
 drafts.scheduleDatabaseSync=async()=>{};
 const first=drafts.saveDraft({draftId:'test',propertyTitle:'Typing',city:'Lagos'});
 const second=drafts.saveDraft({draftId:'test',propertyTitle:'',roomSizes:[],acceptRefund:false});
 const third=drafts.saveDraft({draftId:'another',propertyTitle:'Second listing'});
 assert.equal(drafts.getDraftSync('test').propertyTitle,'');
 await Promise.all([first,second,third]);
 assert.equal(stored.length,2);
 const draft=stored.find(item=>item.draftId==='test');
 assert.equal(draft.propertyTitle,'');assert.equal(draft.city,'Lagos');assert.equal(draft.acceptRefund,false);
 console.log('PASS: pricing/title/description API mapping, all refund states, cleared fees, immediate cache, serialized multi-draft persistence.');
})().catch(error=>{console.error(error);process.exitCode=1;});
