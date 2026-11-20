import { useRouter } from 'expo-router';
import { ArrowRight, Check, ShieldCheck, X } from 'lucide-react-native';
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useProductTour } from '../../context/ProductTourContext';

export const PostTourKycModal = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { showPostTourKycModal, dismissKycModal, isForbiddenRoute } = useProductTour();
  if (!showPostTourKycModal || isForbiddenRoute) return null;
  const close = () => dismissKycModal();
  const verify = () => { dismissKycModal(); router.push('/kyc-verification'); };
  return <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={close}>
    <View style={[styles.overlay, { paddingTop: Math.max(insets.top, 20), paddingBottom: Math.max(insets.bottom, 20) }]}>
      <View style={[styles.card, { maxHeight: height - Math.max(insets.top, 20) - Math.max(insets.bottom, 20) }]} accessibilityViewIsModal>
        <View style={styles.header}>
          <Text style={styles.brand}>LUNEST</Text>
          <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Close verification prompt" style={styles.close}><X size={20} color="#596174" /></Pressable>
        </View>
        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
          <View style={styles.icon}><ShieldCheck size={34} color="#286DE5" strokeWidth={1.8} /></View>
          <Text style={styles.eyebrow}>IDENTITY VERIFICATION</Text>
          <Text style={styles.title}>A trusted profile starts with you</Text>
          <Text style={styles.description}>Verify your identity to access bookings and help keep the LUNEST community secure.</Text>
          <View style={styles.benefits}>
            <View style={styles.benefit}><Check size={18} color="#286DE5" /><Text style={styles.benefitText}>Build trust with hosts and guests</Text></View>
            <View style={styles.benefit}><Check size={18} color="#286DE5" /><Text style={styles.benefitText}>Complete the checks required for booking</Text></View>
          </View>
          <Text style={styles.note}>Have your identity document ready. You can follow the verification steps at your own pace.</Text>
        </ScrollView>
        <View style={styles.actions}>
          <Pressable onPress={verify} accessibilityRole="button" style={({ pressed }) => [styles.primary, pressed && styles.pressed]}><Text style={styles.primaryText}>Verify my identity</Text><ArrowRight size={18} color="#FFFFFF" /></Pressable>
          <Pressable onPress={close} accessibilityRole="button" style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}><Text style={styles.secondaryText}>Maybe later</Text></Pressable>
        </View>
      </View>
    </View>
  </Modal>;
};
const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, backgroundColor: 'rgba(1,1,53,0.42)' },
  card: { width: '100%', maxWidth: 440, backgroundColor: '#FFFFFF', borderRadius: 28, overflow: 'hidden', shadowColor: '#010135', shadowOpacity: 0.16, shadowRadius: 32, shadowOffset: { width: 0, height: 16 }, elevation: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 26, paddingRight: 14, paddingTop: 14 },
  brand: { color: '#010135', fontSize: 13, letterSpacing: 3, fontWeight: '800' },
  close: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  body: { flexShrink: 1 },
  bodyContent: { paddingHorizontal: 26, paddingTop: 10, paddingBottom: 22 },
  icon: { width: 68, height: 68, borderRadius: 22, backgroundColor: '#EEF4FF', alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
  eyebrow: { color: '#286DE5', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 10 },
  title: { color: '#010135', fontSize: 27, lineHeight: 34, fontWeight: '700', marginBottom: 12 },
  description: { color: '#596174', fontSize: 14, lineHeight: 22 },
  benefits: { gap: 14, marginTop: 24, paddingVertical: 20, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#EDF0F5' },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  benefitText: { flex: 1, color: '#26304A', fontSize: 13, lineHeight: 19 },
  note: { color: '#6B7280', fontSize: 12, lineHeight: 19, marginTop: 18 },
  actions: { paddingHorizontal: 26, paddingBottom: 18, gap: 6, backgroundColor: '#FFFFFF' },
  primary: { minHeight: 52, borderRadius: 16, backgroundColor: '#010135', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, gap: 12 },
  primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  secondary: { minHeight: 46, justifyContent: 'center', alignItems: 'center' },
  secondaryText: { color: '#596174', fontSize: 14, fontWeight: '500' },
  pressed: { opacity: 0.8 },
});
export default PostTourKycModal;
