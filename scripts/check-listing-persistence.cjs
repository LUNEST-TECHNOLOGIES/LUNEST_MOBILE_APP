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
  const result=await listing.saveDraftToDatabase({draftId:'draft-test',propertyTitle:'Edited title',propertyHighlight:'Edited description',price:'125,000',pricingPeriod:'month',securityDeposit:'',cautionFee:'',propertyPrice:{securityDeposit:5000},acceptRefund:policy,guestCapacity:0,guests:4});
  assert.equal(result.success,true,result.message);
  assert.equal(payload.propertyName,'Edited title');
  assert.equal(payload.description,'Edited description');
  assert.equal(payload.price,125000);
  assert.equal(payload.propertyPrice.frequency,'per month');
  assert.equal(payload.securityDeposit,0);
  assert.equal(payload.acceptRefund,policy);
  assert.equal(payload.guests,0);
 }
 let stored=[];
 const storage={getItem:async()=>structuredClone(stored),setItem:async(_key,value)=>{await new Promise(resolve=>setTimeout(resolve,5));stored=structuredClone(value);}};
 let allowDelete=false;
 const sentDeletes=[];
 const draftApi={deleteDraftFromDatabase:async id=>{sentDeletes.push(id);return {success:allowDelete,message:'Could not reach listing service'};}};
 const drafts=load('src/services/draftListingService.js',{'./listingService':draftApi,'./authService':auth,'./storageService':storage,'./logService':{logInfo(){},logError(){}}});
 drafts.scheduleDatabaseSync=async()=>{};
 const first=drafts.saveDraft({draftId:'test',propertyTitle:'Typing',city:'Lagos'});
 const second=drafts.saveDraft({draftId:'test',propertyTitle:'',roomSizes:[],acceptRefund:false});
 const third=drafts.saveDraft({draftId:'another',propertyTitle:'Second listing'});
 assert.equal(drafts.getDraftSync('test').propertyTitle,'');
 await Promise.all([first,second,third]);
 assert.equal(stored.length,2);
 const draft=stored.find(item=>item.draftId==='test');
 assert.equal(draft.propertyTitle,'');assert.equal(draft.city,'Lagos');assert.equal(draft.acceptRefund,false);
 const serverId='123456789012345678901234';
 stored[0]._id=serverId;
 await assert.rejects(drafts.deleteDraft(serverId),/Could not reach/);
 assert.equal(stored.length,2,'Failed deletion keeps the draft');
 allowDelete=true;
 await drafts.deleteDraft(serverId);
 assert.deepEqual(sentDeletes,[serverId,serverId]);
 assert.equal(stored.length,1);
 await drafts.deleteDraft(stored[0].draftId);
 assert.equal(stored.length,0);
 assert.equal(sentDeletes.length,2,'Local-only deletion avoids the network');
 console.log('PASS: pricing/title/description API mapping, all refund states, cleared fees, immediate cache, serialized multi-draft persistence.');
})().catch(error=>{console.error(error);process.exitCode=1;});
