import { StyleSheet, View } from 'react-native';

const OrderedList = ({ children, style }) => {
  return <View style={[styles.container, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    gap: 8,
  },
});

export default OrderedList;
