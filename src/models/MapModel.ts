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
