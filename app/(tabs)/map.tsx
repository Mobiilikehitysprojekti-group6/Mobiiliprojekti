import { useState } from 'react'
import MapView, { Marker } from 'react-native-maps'
import {
  ActivityIndicator,
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  Pressable,
} from 'react-native'

import { useMapViewModel } from '../../src/viewmodels/useMapViewModel'
import { useShopVM } from '../../src/viewmodels/ShopVMContext'
import { useTheme } from '../../src/viewmodels/ThemeContext'

export default function MapScreen() {
  const { colors } = useTheme()
  const {
    userLocation,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    filteredStores,
  } = useMapViewModel()

  const { createStore } = useShopVM()

  const [selectedStore, setSelectedStore] = useState<any>(null)

  const styles = createStyles(colors)

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color={colors.accent} />
  if (error) return <Text style={{ color: colors.text }}>{error}</Text>
  if (!userLocation) return null

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.textInput}>
        <TextInput
          placeholder="Hae kauppoja..."
          placeholderTextColor={colors.secondaryText}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={{ color: colors.text }}
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
          pinColor="blue"
          title="Oma sijainti"
        />

        {(filteredStores || []).map((store) => (
          <Marker
            key={store.id}
            coordinate={{
              latitude: store.coordinates.latitude,
              longitude: store.coordinates.longitude,
            }}
            onPress={() => setSelectedStore(store)}
          />
        ))}
      </MapView>

      {selectedStore && (
        <View style={styles.floatingCard} pointerEvents="box-none">
          <View style={styles.card}>
            <Text style={styles.storeTitle}>{selectedStore.name} {selectedStore.branch || ""}</Text>

            <Text style={styles.address}>
              {selectedStore.street} {selectedStore.housenumber}{' '}
              {selectedStore.postcode} {selectedStore.city}
            </Text>

            <Pressable
              style={styles.saveStoreButton}
              onPress={async () => {
                await createStore(selectedStore.name, selectedStore.branch)
                Alert.alert(
                  'Kauppa tallennettu!',
                  `${selectedStore.name} ${selectedStore.branch || ""} on nyt tallennettu suosikkeihisi.`
                )
              }}
            >
              <Text style={styles.saveStoreButtonText}>Tallenna kauppa</Text>
            </Pressable>

            <Pressable onPress={() => setSelectedStore(null)}>
              <Text style={styles.closeText}>Sulje</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  )
}

const createStyles = (colors: { background: string; text: string; secondaryText: string; accent: string }) =>
  StyleSheet.create({
    textInput: {
      position: 'absolute',
      top: 50,
      width: '90%',
      alignSelf: 'center',
      zIndex: 10,
      backgroundColor: colors.background,
      borderRadius: 10,
      padding: 10,
      borderWidth: 1,
      borderColor: colors.secondaryText,
    },
    floatingCard: {
      position: 'absolute',
      bottom: 80,
      width: '100%',
      alignItems: 'center',
      pointerEvents: 'box-none',
    },
    card: {
      width: '92%',
      backgroundColor: colors.background,
      borderRadius: 16,
      padding: 16,
      elevation: 10,
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 8,
      borderWidth: 1,
      borderColor: colors.secondaryText,
    },
    storeTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
    },
    address: {
      marginVertical: 8,
      color: colors.secondaryText,
    },
    saveStoreButton: {
      marginTop: 12,
      backgroundColor: colors.accent,
      paddingVertical: 12,
      borderRadius: 8,
    },
    saveStoreButtonText: {
      color: 'white',
      textAlign: 'center',
      fontWeight: 'bold',
    },
    closeText: {
      marginTop: 12,
      textAlign: 'center',
      color: colors.secondaryText,
    },
  })
