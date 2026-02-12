import { useEffect, useMemo, useState } from "react"
import * as Location from "expo-location"
import { Alert } from "react-native"
import { Store } from "../models/MapModel"

export function useMapViewModel() {
    const [userLocation, setUserLocation] = useState<Location.LocationObjectCoords | null>(null)
    const [stores, setStores] = useState<Store[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchStores = async (lat: number, lon: number) => {
  try {
    const radius = 10000 // 10 km

    const query = `
        [out:json];
        (
        node["shop"](around:${radius},${lat},${lon});
        way["shop"](around:${radius},${lat},${lon});
        );
        out center tags;
        `

    const res = await fetch(
      "https://overpass-api.de/api/interpreter",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "data=" + encodeURIComponent(query),
      }
    )

    const data = await res.json()

    if (!Array.isArray(data.elements)) {
      console.error("Overpass ei palauttanut elements-arrayta", data)
      setStores([])
      setError("Kauppojen haku epäonnistui")
      return
    }

    const mapped: Store[] = data.elements
      .map((el: any): Store | null => {
        const lat = el.lat ?? el.center?.lat
        const lon = el.lon ?? el.center?.lon

        if (!lat || !lon) return null

        return {
          id: el.id.toString(),
          name: el.tags?.name ?? "Tuntematon kauppa",
          street: el.tags?.["addr:street"] ?? "",
          housenumber: el.tags?.["addr:housenumber"] ?? "",
          postcode: el.tags?.["addr:postcode"] ?? "",
          city: el.tags?.["addr:city"] ?? "",
          brand: el.tags?.brand,
          branch: el.tags?.branch ?? "",
          coordinates: {
            latitude: lat,
            longitude: lon,
          },
        }
      })
      .filter(Boolean) as Store[]

    setStores(mapped)
  } catch (e) {
    console.error(e)
    setError("Kauppojen haku epäonnistui")
  } finally {
    setLoading(false)
  }
  }

    const filteredStores = useMemo(() => {
      if (!searchQuery.trim()) {
        return stores
      }

      const query = searchQuery.toLowerCase()

      return stores.filter(store => {
        const name = (store.name || "").toLowerCase()
        const brand = (store.brand || "").toLowerCase()
        
        return name.includes(query) || brand.includes(query)
    })
    }, [stores, searchQuery])


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

    const refresh = async () => {
      setLoading(true)
      setError(null)
      await init()
    }

    return {
        userLocation,
        stores,
        searchQuery,
        setSearchQuery,
        filteredStores,
        loading,
        error,
        init,
        refresh,
    }
}