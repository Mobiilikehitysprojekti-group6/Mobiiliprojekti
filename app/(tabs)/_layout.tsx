import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../src/viewmodels/ThemeContext";

export default function TabsLayout() {
    const { colors } = useTheme();
   
    const isPremium = false;

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: colors.accent,
                tabBarInactiveTintColor: colors.secondaryText,
                tabBarStyle: { backgroundColor: colors.background },
                headerStyle: { backgroundColor: colors.background },
                headerTitleStyle: { color: colors.text },
                headerShown: true,
            }}
        >
            <Tabs.Screen 
                name="index"
                options={{
                    title: "KauppaLappu",
                    tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color}/>,
                }} 
            />
            <Tabs.Screen
                name="map"
                options={{
                    title: "Kartta",
                    tabBarIcon: ({ color }) => <Ionicons name="map" size={24} color={color}/>,
                }}
            />
            <Tabs.Screen 
                name="profile"
                options={{
                    title: "Profiili",
                    tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color={color}/>,
                }}
            />
        </Tabs>
    )
}