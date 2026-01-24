import MapView, { Marker } from 'react-native-maps'
import { ActivityIndicator, View, Text } from 'react-native'
import { useMapViewModel } from '../../src/viewmodels/useMapViewModel'

export default function MapScreen() {
  const { userLocation, stores, loading, error } = useMapViewModel()

  if(loading) return <ActivityIndicator style={{ flex: 1 }}/>
  if(error) return <Text>{error}</Text>
  if(!userLocation) return null

  return (
    <MapView
    style={{ flex: 1 }}
    initialRegion={{
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      latitudeDelta: 0.15,
      longitudeDelta: 0.15,
    }}
    >
      <Marker
        coordinate={{
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
        }}
        title="Oma sijainti"
        pinColor="blue"
      />

      {(stores || []).map((store) => (
        <Marker
          key={store.id}
          coordinate={{
            latitude: store.coordinates.latitude,
            longitude: store.coordinates.longitude,
          }}
          title={store.name}
        />
      ))}
    </MapView>
  )
}