const fs = require('fs');
const vm = require('vm');
const assert = require('assert/strict');
const babel = require('@babel/core');
function harness(file, draft) {
 let values=[],cursor=0,effects=[],deps=[],saves=[];
 const react={useState(initial){const i=cursor++;if(!(i in values)) values[i]=typeof initial==='function'?initial():initial;return[values[i],v=>{values[i]=typeof v==='function'?v(values[i]):v;}];},useRef(initial){const i=cursor++;return values[i]||=( {current:initial});},useCallback(fn){cursor++;return fn;},useEffect(fn,next){const i=cursor++;if(!deps[i]||next.some((v,j)=>v!==deps[i][j])){effects.push(fn);deps[i]=next;}},useMemo(fn){cursor++;return fn();}};
 const jsx=(type,props)=>({type,props:props||{}});
 const save=async updates=>{saves.push(updates);draft={...draft,...updates};return true;};
 const rn={TextInput:'TextInput',View:'View',Text:'Text',Pressable:'Pressable',ScrollView:'ScrollView',Platform:{OS:'web'},Dimensions:{get:()=>({width:390,height:844})},StyleSheet:{create:v=>v}};
 const output={};
 const code=babel.transformSync(fs.readFileSync(file,'utf8') + (file.includes('property-details') ? '\nexport const testTitleOptions = TITLE_TYPE_OPTIONS;' : ''),{configFile:false,babelrc:false,plugins:[require('@babel/plugin-transform-modules-commonjs'),[require('@babel/plugin-transform-react-jsx'),{runtime:'automatic'}]]}).code;
 vm.runInNewContext(code,{exports:output,console:{log(){},warn(){},error(){}},setTimeout,clearTimeout,require(name){if(name.includes('constants/styles'))return Object.fromEntries(['baseStyles','footerStyles','headerStyles','infoBoxStyles','progressStyles','scrollStyles','textStyles','toggleStyles'].map(key=>[key,{}]));if(name.includes('constants/theme'))return {COLORS:{}};if(name.includes('appConfig'))return {APP_CONFIG:{GOOGLE_MAPS_API_KEY:''}};if(name==='react')return react;if(name==='react/jsx-runtime')return{jsx,jsxs:jsx};if(name==='react-native')return rn;if(name==='expo-router')return{useRouter:()=>({}),useLocalSearchParams:()=>({draftId:'test'})};if(name.includes('useDraftListing'))return{__esModule:true,default:()=>({draftData:draft,saveDraftData:save,draftId:'test'}),useDraftListing:()=>({draftData:draft,saveDraftData:save,draftId:'test'})};return{__esModule:true,default:{subscribe:()=>()=>{},generateDraftId:()=> 'test'},...rn};}});
 const render=()=>{cursor=0;effects=[];const tree=output.default();effects.forEach(fn=>fn());return tree;};
 const find=(tree,predicate)=>{const found=[];const visit=node=>{if(!node||typeof node!=='object')return;if(predicate(node))found.push(node);const children=node.props?.children;for(const child of Array.isArray(children)?children:[children]){if(Array.isArray(child))child.forEach(visit);else visit(child);}};visit(tree);return found;};
 return{render,find,saves,titleOptions:output.testTitleOptions};
}
const details=harness('app/create-listing/property-details.jsx',{draftId:'test',propertyTitle:'Original',rentalPurpose:'Residential',roomSizes:['10x12'],propertyHighlight:'Original description'});
details.render();let tree=details.render();
for(const placeholder of ['E.g 2 Bedroom Apartment in Lekki','E.g 10x12, 12x14 (comma separated)','Write a full description here...']){
 for(const value of ['New text','New','', 'Replacement']){
  const input=details.find(tree,n=>n.type==='TextInput'&&n.props.placeholder===placeholder)[0];assert.ok(input,placeholder);input.props.onChangeText(value);tree=details.render();tree=details.render();assert.equal(details.find(tree,n=>n.type==='TextInput'&&n.props.placeholder===placeholder)[0].props.value,value);
 }
}
const pricing=harness('app/create-listing/pricing.jsx',{draftId:'test',intent:'rent',acceptRefund:null});pricing.render();tree=pricing.render();
let radios=pricing.find(tree,n=>n.props.accessibilityRole==='radio');assert.equal(radios.length,2);assert.ok(radios.every(n=>n.props.accessibilityState.checked===false));
for(const index of [1,0,1]){radios[index].props.onPress();tree=pricing.render();radios=pricing.find(tree,n=>n.props.accessibilityRole==='radio');assert.equal(radios[index].props.accessibilityState.checked,true);assert.equal(radios[1-index].props.accessibilityState.checked,false);}
for(const value of ['123456','123','', '5000']){const input=pricing.find(tree,n=>n.type==='TextInput')[0];input.props.onChangeText(value);tree=pricing.render();tree=pricing.render();assert.equal(pricing.find(tree,n=>n.type==='TextInput')[0].props.value,value);}
const location=harness('app/create-listing/location.jsx',{draftId:'test',city:'Lagos',postalCode:'100001',landmarks:['Near mall']});
location.render();tree=location.render();
for(const placeholder of ['e.g. Lagos','Optional','Landmark 1']) {
 for(const value of ['New text','New','','Replacement']) {
  const input=location.find(tree,n=>n.type==='TextInput'&&n.props.placeholder===placeholder)[0];assert.ok(input,placeholder);input.props.onChangeText(value);tree=location.render();tree=location.render();assert.equal(location.find(tree,n=>n.type==='TextInput'&&n.props.placeholder===placeholder)[0].props.value,value);
 }
}
console.log('PASS: property title, room sizes, description, price typing/deletion and mutually exclusive refund selections survive rerenders.');

assert.ok(details.titleOptions.includes('Power of Attorney'));
for (const purpose of ['Residential', 'Commercial']) {
 const form=harness('app/create-listing/property-details.jsx',{draftId:'test',rentalPurpose:purpose});
 form.render();let current=form.render();
 const counters=form.find(current,node=>typeof node.type==='function' && node.type.name==='Counter');
 for(const initial of counters) {
  // Multiple taps before React rerenders must each count.
  initial.props.onIncrement();initial.props.onIncrement();
  current=form.render();
  let counter=form.find(current,node=>node.type===initial.type && node.props.label===initial.props.label)[0];
  assert.equal(counter.props.value,2,counter.props.label);
  for(let i=0;i<25;i++)counter.props.onIncrement();
  current=form.render();counter=form.find(current,node=>node.type===initial.type && node.props.label===initial.props.label)[0];
  assert.equal(counter.props.value,20);
  let controls=form.find(counter.type(counter.props),node=>node.type==='Pressable');
  assert.equal(controls[1].props.disabled,true);
  for(let i=0;i<25;i++)counter.props.onDecrement();
  current=form.render();counter=form.find(current,node=>node.type===initial.type && node.props.label===initial.props.label)[0];
  assert.equal(counter.props.value,0);
  controls=form.find(counter.type(counter.props),node=>node.type==='Pressable');
  assert.equal(controls[0].props.disabled,true);
 }
}
console.log('PASS: Power of Attorney option, all six counters, repeated taps, 0–20 bounds and disabled controls.');

const commercial=harness('app/create-listing/property-details.jsx',{draftId:'test',rentalPurpose:'Commercial'});
commercial.render();tree=commercial.render();
for(const placeholder of ['E.g 5000 sq ft','E.g Retail, Factory, Farming']) {
 for(const value of ['New text','New','','Replacement']) {
  commercial.find(tree,n=>n.type==='TextInput'&&n.props.placeholder===placeholder)[0].props.onChangeText(value);
  tree=commercial.render();tree=commercial.render();assert.equal(commercial.find(tree,n=>n.type==='TextInput'&&n.props.placeholder===placeholder)[0].props.value,value);
 }
}
for(let index=0;index<pricing.find(tree=pricing.render(),n=>n.type==='TextInput').length;index++) {
 for(const value of ['125000','125','','500']) {
  pricing.find(tree,n=>n.type==='TextInput')[index].props.onChangeText(value);
  tree=pricing.render();tree=pricing.render();assert.equal(pricing.find(tree,n=>n.type==='TextInput')[index].props.value,value);
 }
}
const availability=harness('app/create-listing/availability.jsx',{draftId:'test',additionalRules:'Original rules'});
availability.render();tree=availability.render();
for(const value of ['Updated rules','Updated','','New rules']) {
 availability.find(tree,n=>n.type==='TextInput')[0].props.onChangeText(value);
 tree=availability.render();tree=availability.render();assert.equal(availability.find(tree,n=>n.type==='TextInput')[0].props.value,value);
}
console.log('PASS: business fields, all pricing/deposit/service-charge fields and additional-rule typing/deletion.');

const longDescription=harness('app/create-listing/property-details.jsx',{draftId:'test',propertyHighlight:'a'.repeat(700)});
longDescription.render();tree=longDescription.render();
longDescription.find(tree,n=>n.type==='TextInput'&&n.props.multiline)[0].props.onChangeText('a'.repeat(699));
tree=longDescription.render();assert.equal(longDescription.find(tree,n=>n.type==='TextInput'&&n.props.multiline)[0].props.value.length,699);
console.log('PASS: existing overlong descriptions can be shortened without blocking deletion.');
