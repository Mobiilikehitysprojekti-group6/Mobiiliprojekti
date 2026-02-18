// getDistance funktiota käytetään kartassa focus-toiminnossa (etsitään lähin kauppa ja keskitetään)
export function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371 // Maapallon säde kilometreinä
  const dLat = ((lat2 - lat1) * Math.PI) / 180 // muutetaan asteet radiaaneiksi
  const dLon = ((lon2 - lon1) * Math.PI) / 180 // muutetaan asteet radiaaneiksi

  // Haversine-kaava
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) // kulma kahden pisteen välillä
  return R * c // etäisyys kilometreinä
}
