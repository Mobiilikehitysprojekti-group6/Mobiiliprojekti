// app/_layout.tsx
import { Stack } from "expo-router";
import { ShopVMProvider } from "../src/viewmodels/ShopVMContext";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ThemeProvider } from "../src/viewmodels/ThemeContext";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <ShopVMProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="shoplist" />
            <Stack.Screen name="graphics" />
          </Stack>
        </ShopVMProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  )
}
