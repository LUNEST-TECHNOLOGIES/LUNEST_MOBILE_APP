import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { requestPlaces } from '../services/placesService';

export const GooglePlacesAutocomplete = forwardRef(function AddressAutocomplete(props, ref) {
  const [query,setQuery] = useState(props.textInputProps?.value || '');
  const [predictions,setPredictions] = useState([]);
  const [loading,setLoading] = useState(false);
  const [open,setOpen] = useState(false);
  const [active,setActive] = useState(-1);
  const [error,setError] = useState('');
  const session = useRef(null);
  const sessionToken = () => session.current ||= 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const n=Math.random()*16|0;return(c==='x'?n:(n&3|8)).toString(16);});
  const version = useRef(0), debounce = useRef(null), blur = useRef(null), controller = useRef(null), selecting = useRef(false), queryRef = useRef(query);
  queryRef.current=query;
  const cancelSearch = () => {version.current++;clearTimeout(debounce.current);controller.current?.abort();};
  useEffect(()=>()=>{version.current++;clearTimeout(debounce.current);clearTimeout(blur.current);controller.current?.abort();},[]);
  useEffect(()=>{
    const value=props.textInputProps?.value;
    if(value!==undefined && value!==queryRef.current) setQuery(value);
  },[props.textInputProps?.value]);
  useImperativeHandle(ref,()=>({setAddressText(text){cancelSearch();setQuery(text||'');setPredictions([]);setOpen(false);setLoading(false);},getAddressText:()=>queryRef.current}));
  const onChange = text => {
    selecting.current=false;
    cancelSearch();setQuery(text);setActive(-1);setError('');setPredictions([]);setOpen(false);setLoading(false);
    props.textInputProps?.onChangeText?.(text);
    if(text.trim().length<3)return;
    const requestVersion=version.current;
    debounce.current=setTimeout(async()=>{
      controller.current=new AbortController();setLoading(true);
      try {
        const data=await requestPlaces('autocomplete',{input:text,components:props.query?.components,sessiontoken:sessionToken()},controller.current.signal);
        if(version.current!==requestVersion)return;
        const results=Array.isArray(data.predictions)?data.predictions.slice(0,6):[];
        setPredictions(results);setOpen(results.length>0);
      }catch(failure){if(version.current===requestVersion && failure.name!=='AbortError')setError('Search unavailable. Enter your address manually.');}
      finally{if(version.current===requestVersion)setLoading(false);}
    },350);
  };
  const select = async prediction => {
    cancelSearch();clearTimeout(blur.current);selecting.current=true;
    const requestVersion=version.current;
    setQuery(prediction.description);setOpen(false);setPredictions([]);setLoading(true);setError('');
    // Save the selected text immediately, even when fetching its map details fails.
    props.textInputProps?.onChangeText?.(prediction.description);
    let details=null;
    const token=session.current;session.current=null;
    controller.current=new AbortController();
    try {
      if(props.fetchDetails!==false){const data=await requestPlaces('details',{place_id:prediction.place_id,sessiontoken:token},controller.current.signal);details=data.result || null;}
    }catch{if(version.current===requestVersion)setError('Address selected. Confirm the state, LGA and city below.');}
    finally{
      if(version.current===requestVersion){props.onPress?.(prediction,details);setLoading(false);}
      selecting.current=false;
    }
  };
  return <View style={[props.styles?.container,{position:'relative',zIndex:1000}]}>
    <TextInput {...props.textInputProps} value={query} onChangeText={onChange}
      accessibilityLabel={props.textInputProps?.accessibilityLabel || 'Search property address'} placeholder={props.placeholder || 'Search for your address...'}
      autoComplete="off" autoCorrect={false} style={[{height:50,borderWidth:1,borderColor:'#E5E5E5',borderRadius:12,paddingHorizontal:16,backgroundColor:'#FAFAFA'},props.styles?.textInput,props.textInputProps?.style]}
      onFocus={()=>{clearTimeout(blur.current);if(predictions.length)setOpen(true);props.textInputProps?.onFocus?.();}}
      onBlur={()=>{blur.current=setTimeout(()=>{if(!selecting.current)setOpen(false);},300);props.textInputProps?.onBlur?.();}}
      onKeyPress={event=>{const key=event.nativeEvent.key;if(key==='ArrowDown'){setActive(index=>Math.min(index+1,predictions.length-1));setOpen(true);}if(key==='ArrowUp')setActive(index=>Math.max(index-1,0));if(key==='Escape')setOpen(false);}}
      onSubmitEditing={()=>{if(open&&active>=0&&predictions[active])select(predictions[active]);}} />
    {loading&&<ActivityIndicator color="#276EE4" size="small" style={{position:'absolute',right:14,top:16}} accessibilityLabel="Searching address" />}
    {!!error&&<Text accessibilityRole="alert" style={{fontSize:12,color:'#566078',marginTop:8,lineHeight:18}}>{error}</Text>}
    {open&&predictions.length>0&&<View style={[props.styles?.listView,{position:'relative',top:0,marginTop:8,maxHeight:280,borderWidth:1,borderColor:'#E5E5E5',borderRadius:12,backgroundColor:'#FFFFFF',overflow:'hidden'}]}>
      <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="always">
        {predictions.map((prediction,index)=><Pressable key={prediction.place_id || prediction.description} accessibilityRole="button" accessibilityLabel={`Select ${prediction.description}`}
          onPressIn={()=>{selecting.current=true;clearTimeout(blur.current);}} onPress={()=>select(prediction)}
          style={{minHeight:56,paddingVertical:14,paddingHorizontal:16,borderBottomWidth:index<predictions.length-1?1:0,borderBottomColor:'#EEF1F6',backgroundColor:active===index?'#EDF3FF':'#FFFFFF'}}>
          <Text style={{fontSize:14,color:'#010135',lineHeight:20}}>{prediction.structured_formatting?.main_text || prediction.description}</Text>
          {!!prediction.structured_formatting?.secondary_text&&<Text style={{fontSize:12,color:'#667085',lineHeight:18,marginTop:3}}>{prediction.structured_formatting.secondary_text}</Text>}
        </Pressable>)}
      </ScrollView>
      <View style={{paddingHorizontal:12,paddingVertical:8,alignItems:'flex-end',borderTopWidth:1,borderTopColor:'#EEF1F6'}}><Text style={{fontSize:12,color:'#5E5E5E',fontWeight:'400'}} accessibilityLabel="Google Maps">Google Maps</Text></View>
    </View>}
  </View>;
});
