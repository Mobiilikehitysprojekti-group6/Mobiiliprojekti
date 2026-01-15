import { Stack } from "expo-router";
import { useEffect } from "react";

export default function RootLayout() {
    //Logiikka autentikointia varten lisätään tähän (esim redirectaus login-sivulle tms.)

    return (
        <Stack screenOptions={{ headerShown: false}}>
            {/* Määritellään sovelluksen eri screenit jotka ovat (tabs) kansiossa */}
            <Stack.Screen name="(tabs)" />

            {/*Autentikaatio screenit (login/register), Lisätään myöhemmin */}
        </Stack>
    )
}