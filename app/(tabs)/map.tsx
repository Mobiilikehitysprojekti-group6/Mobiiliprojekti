import MapView, { Marker } from 'react-native-maps'
import { ActivityIndicator, View, Text, StyleSheet, TextInput } from 'react-native'
import { useMapViewModel } from '../../src/viewmodels/useMapViewModel'

export default function MapScreen() {
  const { userLocation, stores, loading, error, searchQuery, setSearchQuery, filteredStores } = useMapViewModel()

  if(loading) return <ActivityIndicator style={{ flex: 1 }}/>
  if(error) return <Text>{error}</Text>
  if(!userLocation) return null

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.textInput}>
        <TextInput
        placeholder="Hae kauppoja..."
        value={searchQuery}
        onChangeText={setSearchQuery} 
        />
      </View>

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

        {(filteredStores || []).map((store) => (
          <Marker
            key={store.id}
            coordinate={{
              latitude: store.coordinates.latitude,
              longitude: store.coordinates.longitude,
            }}
            title={store.name}
            description={[
              `${store.street} ${store.housenumber}`,
              `${store.postcode} ${store.city}`
            ].filter(Boolean).join(", ")}
          />
        ))}
      </MapView>
    </View>
  )
}

const styles = StyleSheet.create({
  textInput: {
    position: 'absolute',
    top: 50,
    width: '90%',
    alignSelf: 'center',
    zIndex: 1,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 10,
  },
})