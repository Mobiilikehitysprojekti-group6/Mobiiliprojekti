import React, { useMemo, useRef, useState } from "react"
import { View, Text, StyleSheet, Pressable, Alert } from "react-native"
import DraggableFlatList from "react-native-draggable-flatlist"
import { SafeAreaView } from "react-native-safe-area-context"
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { useShopVM } from "../../src/viewmodels/ShopVMContext"
import { useTheme, type ThemeColors } from "../../src/viewmodels/ThemeContext"
import CreateOrJoinListModal from "../../src/components/CreateOrJoinListModal"

export default function Home() {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const {
    uid,
    lists,
    stores,
    createList,
    createStore,
    deleteList,
    deleteStore,
    reorderLists,
    joinListByCode,
    getStoreLabel,
    isOwnerOfList,
  } = useShopVM()

  const tabBarHeight = useBottomTabBarHeight()
  const blockRowDragRef = useRef(false)

  const [modalVisible, setModalVisible] = useState(false)

  // create state
  const [newListName, setNewListName] = useState("")
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null)
  const [newStoreName, setNewStoreName] = useState("")

  // join state
  const [joinCode, setJoinCode] = useState("")
  const [modalLoading, setModalLoading] = useState(false)

  const openModal = () => setModalVisible(true)
  const closeModal = () => {
    setModalVisible(false)
    setModalLoading(false)
  }

  const confirmDeleteList = (listId: string, listName: string) => {
    Alert.alert("Poistetaanko lista?", `"${listName}" poistetaan pysyvästi.`, [
      { text: "Peruuta", style: "cancel" },
      { text: "Poista", style: "destructive", onPress: () => deleteList(listId) },
    ])
  }

  const confirmDeleteStore = (storeId: string, storeName: string) => {
    Alert.alert("Poistetaanko kauppa?", `"${storeName}" poistetaan.`, [
      { text: "Peruuta", style: "cancel" },
      {
        text: "Poista",
        style: "destructive",
        onPress: async () => {
          await deleteStore(storeId)
        },
      },
    ])
  }

  const handleCreateList = async () => {
    try {
      setModalLoading(true)
      const id = await createList(newListName, selectedStoreId)
      if (!id) return

      setNewListName("")
      setSelectedStoreId(null)
      closeModal()

      router.push({ pathname: "/shoplist", params: { listId: id } })
    } finally {
      setModalLoading(false)
    }
  }

  const handleCreateStore = async () => {
    await createStore(newStoreName)
    setNewStoreName("")
  }

  const handleJoin = async () => {
    try {
      setModalLoading(true)
      const id = await joinListByCode(joinCode)
      if (!id) {
        Alert.alert("Virhe", "Liittyminen epäonnistui.")
        return
      }
      setJoinCode("")
      closeModal()
      router.push({ pathname: "/shoplist", params: { listId: id } })
    } catch {
      Alert.alert("Virhe", "Liittyminen epäonnistui.")
    } finally {
      setModalLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>KauppaLappusi</Text>
        <Pressable onPress={openModal} style={[styles.addButton, !uid && { opacity: 0.4 }]} disabled={!uid}>
          <Text style={styles.addButtonText}>+</Text>
        </Pressable>
      </View>

      {!uid && <Text style={{ color: colors.secondaryText }}>Kirjaudutaan anonyymisti…</Text>}

      <DraggableFlatList
        data={lists}
        keyExtractor={(l) => l.id}
        activationDistance={8}
        contentContainerStyle={{ paddingBottom: tabBarHeight + insets.bottom + 16 }}
        showsVerticalScrollIndicator
        onDragEnd={async ({ data }) => {
          await reorderLists(data.map((x) => x.id))
        }}
        renderItem={({ item, drag, isActive }) => {
          const storeLabel = getStoreLabel(item.storeId) ?? "Ei kauppaa"
          const sharedTag = item.memberIds.length > 1 ? ` • Jaettu (${item.memberIds.length})` : ""

          return (
            <Pressable
              style={[styles.listBlock, isActive && { opacity: 0.9 }]}
              delayLongPress={150}
              onLongPress={() => {
                if (blockRowDragRef.current) return
                drag()
              }}
              onPress={() => {
                router.push({ pathname: "/shoplist", params: { listId: item.id } })
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.listTitle}>{item.name}</Text>
                <Text style={styles.listSubtitle}>
                  {storeLabel}
                  {sharedTag}
                </Text>
              </View>

              {/* Roskakori: vain owner saa poistaa (rules myös estää) */}
              {isOwnerOfList(item) ? (
                <Pressable
                  onPressIn={() => (blockRowDragRef.current = true)}
                  onPressOut={() => (blockRowDragRef.current = false)}
                  onPress={() => confirmDeleteList(item.id, item.name)}
                  hitSlop={10}
                  style={styles.iconButton}
                >
                  <Ionicons name="trash-outline" size={22} color="#e53935" />
                </Pressable>
              ) : (
                <View style={{ width: 34 }} />
              )}
            </Pressable>
          )
        }}
        ListEmptyComponent={
          <Text style={{ marginTop: 20, color: colors.secondaryText }}>
            Luo uusi lista tai liity koodilla painamalla +
          </Text>
        }
      />

      {/* Create / Join modal */}
      <CreateOrJoinListModal
        visible={modalVisible}
        onClose={closeModal}
        stores={stores}
        selectedStoreId={selectedStoreId}
        setSelectedStoreId={setSelectedStoreId}
        newListName={newListName}
        setNewListName={setNewListName}
        newStoreName={newStoreName}
        setNewStoreName={setNewStoreName}
        onCreateStore={handleCreateStore}
        onCreateList={handleCreateList}
        joinCode={joinCode}
        setJoinCode={setJoinCode}
        onJoinByCode={handleJoin}
        loading={modalLoading}
        getStoreLabel={getStoreLabel}
      />
    </SafeAreaView>
  )
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 16 },
    headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
    headerTitle: { fontSize: 24, fontWeight: "bold", flex: 1, color: colors.text },
    addButton: {
      backgroundColor: colors.accent,
      borderRadius: 20,
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
    },
    addButtonText: { color: "white", fontSize: 28, fontWeight: "bold", marginTop: -2 },

    listBlock: {
      backgroundColor: colors.surface,
      borderRadius: 15,
      padding: 16,
      marginVertical: 8,
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    listTitle: { fontSize: 18, fontWeight: "900", color: colors.text },
    listSubtitle: { marginTop: 4, color: colors.secondaryText },
    iconButton: { padding: 6, borderRadius: 10 },
  })
