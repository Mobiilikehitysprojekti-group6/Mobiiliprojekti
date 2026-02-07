import { View, Text } from 'react-native';
import { StyleSheet } from 'react-native';
import { useTheme } from '../src/viewmodels/ThemeContext';

export default function SavedScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Saved Screen</Text>
    </View>
  );
}

const createStyles = (colors: { background: string; text: string; secondaryText: string; accent: string }) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
    },
    text: {
      color: colors.text,
    },
  });