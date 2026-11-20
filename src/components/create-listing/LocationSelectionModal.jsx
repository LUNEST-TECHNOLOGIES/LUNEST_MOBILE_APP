import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
export default function LocationSelectionModal({visible,title,options,value,onSelect,onClose}) {
  const [search,setSearch]=useState('');
  useEffect(()=>{if(visible)setSearch('');},[visible]);
  const results=options.filter(option=>option.toLowerCase().includes(search.toLowerCase().trim()));
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <Pressable onPress={onClose} style={{flex:1,backgroundColor:'rgba(1,1,53,.45)',justifyContent:'center',alignItems:'center',padding:20}}>
      <Pressable onPress={event=>event.stopPropagation()} style={{width:'100%',maxWidth:480,maxHeight:'75%',backgroundColor:'#FFFFFF',borderRadius:20,padding:20}}>
        <View style={{flexDirection:'row',alignItems:'center',marginBottom:16}}><Text style={{fontSize:18,fontWeight:'700',color:'#010135',flex:1}}>{title}</Text><Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={`Close ${title}`} style={{width:44,height:44,alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:24,color:'#010135'}}>×</Text></Pressable></View>
        <TextInput accessibilityLabel={`Search ${title.toLowerCase()}`} placeholder="Search…" value={search} onChangeText={setSearch} style={{height:48,borderWidth:1,borderColor:'#DCE2EC',borderRadius:12,paddingHorizontal:14,marginBottom:12,color:'#010135'}} />
        <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled>
          {results.map(option=><Pressable key={option} accessibilityRole="button" accessibilityState={{selected:value===option}} onPress={()=>onSelect(option)} style={{minHeight:48,paddingHorizontal:12,paddingVertical:14,borderRadius:10,backgroundColor:value===option?'#EDF3FF':'#FFFFFF'}}><Text style={{fontSize:15,color:'#010135',fontWeight:value===option?'700':'400'}}>{option}{value===option?'  ✓':''}</Text></Pressable>)}
          {!results.length&&<Text style={{padding:16,color:'#667085'}}>No matching locations.</Text>}
        </ScrollView>
      </Pressable>
    </Pressable>
  </Modal>;
}
