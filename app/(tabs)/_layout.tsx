import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TabsLayout() {
    // Yhdistetään AuthViewModel myöhemmin
    const isPremium = false;

    return (
        <Tabs screenOptions={{ tabBarActiveTintColor: "#7ed957", headerShown: true}}>
            <Tabs.Screen 
                name="index"
                options={{
                    title: "Koti",
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