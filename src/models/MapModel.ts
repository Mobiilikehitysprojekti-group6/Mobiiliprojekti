export type Coordinates = {
  latitude: number
  longitude: number
}

export type Store = {
  id: string
  name: string
  street: string
  housenumber: string
  postcode: string
  city: string
  brand: string
  branch: string
  coordinates: Coordinates
}

// getDistance funktiota käytetään kartassa focus-toiminnossa (etsitään lähin kauppa ja keskitetään)
export function getDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const R = 6371 // Maapallon säde kilometreinä
  const dLat = (lat2 - lat1) * Math.PI / 180 // muutetaan asteet radiaaneiksi
  const dLon = (lon2 - lon1) * Math.PI / 180 // muutetaan asteet radiaaneiksi

  const a = // Haversine-kaava
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) // lasketaan kulma kahden pisteen välillä (maapallon keskipisteestä katsottuna)
  return R * c //palautetaan etäisyys kilometreinä
}

export const lightDarkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#2C2C2C" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#BBBBBB" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#2C2C2C" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#CCCCCC" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#7ED957" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#2A4A2A" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#3A3A3A" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#2C2C2C" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#404040" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#1A2A3A" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6A7A8A" }],
  },
]
