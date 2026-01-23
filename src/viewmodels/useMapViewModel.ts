import { useEffect, useState } from "react"
import * as Location from "expo-location"
import { Alert } from "react-native"
import { Store } from "../models/MapModel"

export function useMapViewModel() {
    const [userLocation, setUserLocation] = useState<Location.LocationObjectCoords | null>(null)
    const [stores, setStores] = useState<Store[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const ApiKey = process.env.EXPO_PUBLIC_GEOAPIFY_KEY

    const fetchStores = async (lat: number, lon: number) => {
        try {
            const radius = 10000 // 10 km
            const url = `https://api.geoapify.com/v2/places?categories=commercial.supermarket&filter=circle:${lon},${lat},10000&limit=20&apiKey=${ApiKey}`

            const res = await fetch(url)
            const data = await res.json()

            if(!data.features || !Array.isArray(data.features)) {
                console.error("Geoapify API ei palauttanut features-arrayta", data)
                setStores([])
                setError("Kauppojen haku epäonnistui")
                setLoading(false)
                return
            }

            const mapped: Store[] = data.features.map((f: any) => ({
                id: f.properties.place_id,
                name: f.properties.name ?? "Tuntematon kauppa",
                coordinates: {
                    latitude: f.geometry.coordinates[1],
                    longitude: f.geometry.coordinates[0],
                },
            }))
            setStores(mapped)
        } catch (e) {
            console.error(e)
            setError("Kauppojen haku epäonnistui")
        } finally {
            setLoading(false)
        }
    }

    const requestLocation = async () => {
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status !== "granted") {
            Alert.alert("Sijaintilupa vaaditaan")
            throw new Error("Permission denied")
        }

        const location = await Location.getCurrentPositionAsync({})
        setUserLocation(location.coords)

        await fetchStores(location.coords.latitude, location.coords.longitude)

    }

    const init = async () => {
        try {
            await requestLocation()
        } catch (e) {
            setError("Sijaintia ei saatu")
            setLoading(false)
        }
    }

    useEffect(() => {
        init()
    }, [])

    return {
        userLocation,
        stores,
        loading,
        error,
        refresh: init,
    }
}