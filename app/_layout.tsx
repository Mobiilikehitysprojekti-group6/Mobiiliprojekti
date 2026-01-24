// app/_layout.tsx
import { Stack } from "expo-router"
import { ShopVMProvider } from "../src/viewmodels/ShopVMContext"

export default function RootLayout() {

  return (
    <ShopVMProvider>
      <Stack screenOptions={{ headerShown: false }}>
        {/* Määritellään sovelluksen eri screenit jotka ovat (tabs) kansiossa */}
        <Stack.Screen name="(tabs)" />

        {/* Muita stack-ruutuja app-kansion juuressa */}
        <Stack.Screen name="shoplist" />
        <Stack.Screen name="graphics" />

      </Stack>
    </ShopVMProvider>
  )
}
