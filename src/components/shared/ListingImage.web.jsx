import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';

export default function ListingImage({ style, ...props }) {
  const frame = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!frame.current || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: '160px' });
    observer.observe(frame.current);
    return () => observer.disconnect();
  }, []);
  return <View ref={frame} style={style}>{visible && <Image {...props} style={StyleSheet.absoluteFill} />}</View>;
}
