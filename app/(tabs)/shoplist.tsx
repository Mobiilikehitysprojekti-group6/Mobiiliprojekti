import { View, Text } from 'react-native';
import { StyleSheet } from 'react-native';

export default function ShopListScreen() {
  return (
    <View style={styles.container}>
      <Text>Shop List Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    }
});