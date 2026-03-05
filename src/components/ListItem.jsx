import { StyleSheet, Text, View } from 'react-native';

const ListItem = ({ children, index }) => {
  return (
    <View style={styles.container}>
      <View style={styles.bullet} />
      <Text style={styles.text}>{children}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#000',
    marginTop: 7,
    marginRight: 8,
  },
  text: {
    flex: 1,
    fontSize: 14,
    color: '#000',
    lineHeight: 20,
  },
});

export default ListItem;
