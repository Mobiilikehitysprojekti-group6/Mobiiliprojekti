// app/_layout.tsx
import { Stack } from "expo-router";
import { ShopVMProvider } from "../src/viewmodels/ShopVMContext";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ShopVMProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="shoplist" />
          <Stack.Screen name="graphics" />
        </Stack>
      </ShopVMProvider>
    </GestureHandlerRootView>
  )
}
