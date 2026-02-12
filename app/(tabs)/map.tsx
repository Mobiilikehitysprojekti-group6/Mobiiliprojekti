import { useState } from 'react'
import MapView, { Marker } from 'react-native-maps'
import { Ionicons } from '@expo/vector-icons'
import {
  ActivityIndicator,
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  Pressable,
  Button,
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
    refresh,
  } = useMapViewModel()

  const { createStore } = useShopVM()

  const [selectedStore, setSelectedStore] = useState<any>(null)

  const styles = createStyles(colors)

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color={colors.accent} />
  if (error) return (
    <>
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>{error}</Text>
        <Pressable style={styles.errorButton} onPress={refresh}>
          <Text style={styles.errorButton}><Ionicons name="refresh" size={24} color={"white"} /></Text>
        </Pressable>
      </View>
    </>
  )
  if (!userLocation) return (
    <>
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>{error}</Text>
        <Pressable style={styles.errorButton} onPress={refresh}>
          <Text style={styles.errorButton}><Ionicons name="refresh" size={24} color={"white"} /></Text>
        </Pressable>
      </View>
    </>
  )

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
    errorTitle: {
      fontSize: 25,
      fontWeight: 'bold',
      color: colors.text,
      textAlign: 'center',
      alignItems: 'center',
      marginBottom: 15,
      alignContent: 'center',
    },
    errorButton: {
      backgroundColor: colors.accent,
      paddingHorizontal: 20,
      paddingVertical: 10,
      textAlign: 'center',
      color: 'white',
      borderRadius: 30,
      alignSelf: 'center',
    },
    errorContainer: {
      position: 'absolute',
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      backgroundColor: colors.background,
      zIndex: 10,
      padding: 10,
    }
  })
