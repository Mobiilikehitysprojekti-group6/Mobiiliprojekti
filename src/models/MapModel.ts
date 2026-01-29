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
  coordinates: Coordinates
}
