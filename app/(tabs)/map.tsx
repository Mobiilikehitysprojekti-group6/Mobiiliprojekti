import MapView, { Callout, Marker } from 'react-native-maps'
import { ActivityIndicator, View, Text, StyleSheet, TextInput, Alert } from 'react-native'
import { useMapViewModel } from '../../src/viewmodels/useMapViewModel'
import { useShopVM } from '../../src/viewmodels/ShopVMContext'

export default function MapScreen() {
  const { userLocation, stores, loading, error, searchQuery, setSearchQuery, filteredStores } = useMapViewModel()
  const { createStore } = useShopVM()

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
           >
            <Callout
              onPress={async () => {
                await createStore(store.name)
                Alert.alert("Kauppa tallennettu", `${store.name} on tallennettu suosikkeihisi.`)
              }}
            >
              <View style={styles.callOutBox}>
                <Text style={styles.storeTitle}>{store.name}</Text>
                <Text>{store.street} {store.housenumber}, {store.postcode} {store.city}</Text>
                <View style={styles.saveStoreButton}>
                  <Text style={styles.saveStoreButtonText}>Tallenna kauppa</Text>
                </View>
              </View>

            </Callout>
           </Marker>
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
  saveStoreButton: {
    marginTop: 5,
    backgroundColor: '#7ed957',
    padding: 5,
    borderRadius: 5,
  },
  saveStoreButtonText: {
    color: 'white',
    textAlign: 'center',
  },
  callOutBox: {
    padding: 10,
    alignItems: 'center',
  },
  storeTitle: {
    fontWeight: 'bold',
  }
})