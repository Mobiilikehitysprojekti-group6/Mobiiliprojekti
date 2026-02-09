import React, { useMemo, useRef, useState, useEffect } from "react"
import { View, Text, TextInput, StyleSheet, FlatList, Modal, Pressable, Alert } from "react-native"
import DraggableFlatList from "react-native-draggable-flatlist"
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context"
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useShopVM } from "../../src/viewmodels/ShopVMContext"
import { useTheme } from "../../src/viewmodels/ThemeContext"

export default function Home() {
  const { colors } = useTheme()
  const router = useRouter()
  const { uid, lists, stores, createList, createStore, deleteList, deleteStore, getStoreName, reorderLists } = useShopVM()

  const styles = createStyles(colors)

  // SafeArea + tab bar korkeus
  const tabBarHeight = useBottomTabBarHeight()
  const listBottomPadding = tabBarHeight + 8

  // Estää dragin kun painetaan roskista
  const blockRowDragRef = useRef(false)

  const [modalVisible, setModalVisible] = useState(false)
  const [modalStep, setModalStep] = useState<"createList" | "pickStore">("createList")
  const [newListName, setNewListName] = useState("")
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null)
  const [newStoreName, setNewStoreName] = useState("");


  const selectedStoreLabel = useMemo(
    () => getStoreName(selectedStoreId) ?? "Ei kauppaa",
    [selectedStoreId, getStoreName]
  )

  const openCreateListModal = () => {
    setModalStep("createList")
    setModalVisible(true)
  }

  const closeModal = () => {
    setModalVisible(false)
    setModalStep("createList") // reset
  }

  const confirmDeleteList = (listId: string, listName: string) => {
    Alert.alert("Poistetaanko lista?", `"${listName}" poistetaan pysyvästi.`, [
      { text: "Peruuta", style: "cancel" },
      { text: "Poista", style: "destructive", onPress: () => deleteList(listId) },
    ])
  }

  const confirmDeleteStore = (storeId: string, storeName: string) => {
    Alert.alert(
      "Poistetaanko kauppa?",
      `"${storeName}" poistetaan. Kauppaan liitetyt listat jäävät talteen, mutta niiltä poistuu kauppa-valinta.`,
      [
        { text: "Peruuta", style: "cancel" },
        {
          text: "Poista",
          style: "destructive",
          onPress: async () => {
            if (selectedStoreId === storeId) setSelectedStoreId(null)
            await deleteStore(storeId)
          },
        },
      ]
    )
  }

  // Luo lista ja siirry suoraan listanäkymään
  const handleCreateList = async () => {
    const id = await createList(newListName, selectedStoreId)
    if (!id) return

    setNewListName("")
    setSelectedStoreId(null)
    closeModal()

    router.push({ pathname: "/shoplist", params: { listId: id } })
  }

  // Luo uusi kauppa (jää auki, jotta voi vielä valita sen listalle)
  const handleCreateStore = async () => {
    await createStore(newStoreName)
    setNewStoreName("")
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Omat KauppaLappusi</Text>
        <Pressable
          onPress={openCreateListModal}
          style={[styles.addButton, !uid && { opacity: 0.4 }]}
          disabled={!uid}
        >
          <Text style={styles.addButtonText}>+</Text>
        </Pressable>
      </View>

      {/* Auth-status */}
      {!uid && <Text style={{ color: colors.secondaryText }}>Kirjaudutaan anonyymisti…</Text>}

      {/* Ostoslistat: drag&drop järjestys. Tap avaa, long press raahaa */}
      <DraggableFlatList
        data={lists}
        keyExtractor={(l) => l.id}
        activationDistance={8}
        contentContainerStyle={{ paddingBottom: listBottomPadding }} // lisätään tilaa alareunaan, jottei jää alle
        onDragEnd={async ({ data }) => {
          // Päivitä järjestys Firestoreen
          await reorderLists(data.map((x) => x.id))
        }}
        renderItem={({ item, drag, isActive }) => {
          const storeName = getStoreName(item.storeId) ?? "Ei kauppaa"

          return (
            <Pressable
              style={[styles.listBlock, isActive && { opacity: 0.9 }]}
              delayLongPress={150}
              onLongPress={() => {
                // Jos kosketus alkaa roskiksesta, estä drag
                if (blockRowDragRef.current) return
                drag()
              }}
              onPress={() => {
                router.push({ pathname: "/shoplist", params: { listId: item.id } })
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.listTitle}>{item.name}</Text>
                <Text style={styles.listSubtitle}>{storeName}</Text>
              </View>

              {/* Roskakori: ei aloita dragia */}
              <Pressable
                onPressIn={() => (blockRowDragRef.current = true)}
                onPressOut={() => (blockRowDragRef.current = false)}
                onPress={() => confirmDeleteList(item.id, item.name)}
                hitSlop={10}
                style={styles.iconButton}
              >
                <Ionicons name="trash-outline" size={22} color="#e53935" />
              </Pressable>
            </Pressable>
          )
        }}
        ListEmptyComponent={
          <Text style={{ marginTop: 20, color: colors.secondaryText }}>
            Luo ensimmäinen lista painamalla +
          </Text>
        }
      />


      {/* Modal: Uusi lista */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        presentationStyle="overFullScreen"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>

            {/* STEP 1: Uusi lista */}
            {modalStep === "createList" && (
              <>
                <Text style={styles.modalTitle}>Uusi ostoslista </Text>

                <TextInput
                  style={styles.input}
                  placeholder="Listan nimi"
                  placeholderTextColor={colors.secondaryText}
                  value={newListName}
                  onChangeText={setNewListName}
                />

                <Pressable onPress={() => setModalStep("pickStore")} style={styles.storePicker}>
                  <Text style={{ fontWeight: "700", color: colors.text }}>Kauppa:</Text>
                  <Text style={{ marginLeft: 8, flex: 1, color: colors.text }} numberOfLines={1}>
                    {selectedStoreLabel}
                  </Text>
                  <Text style={{ color: colors.accent, fontWeight: "900" }}>Vaihda</Text>
                </Pressable>

                <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
                  <Pressable onPress={closeModal} style={[styles.modalButton, !uid && { opacity: 0.4 }]} disabled={!uid}>
                    <Text style={{ color: colors.text }}>Peruuta</Text>
                  </Pressable>
                  <Pressable onPress={handleCreateList} style={styles.modalButton}>
                    <Text style={{ fontWeight: "900", color: colors.text }}>Luo</Text>
                  </Pressable>
                </View>
              </>
            )}

            {/* STEP 2: Valitse kauppa */}
            {modalStep === "pickStore" && (
              <>
                <View style={styles.stepHeader}>
                  <Pressable onPress={() => setModalStep("createList")} style={styles.backMiniBtn}>
                    <Ionicons name="chevron-back" size={18} color={colors.text} />
                  </Pressable>
                  <Text style={styles.modalTitle}>Valitse kauppa</Text>
                  <View style={styles.headerSpacer} />
                </View>

                {/* Ei kauppaa */}
                <View style={styles.storeRow}>
                  <Pressable
                    style={{ flex: 1 }}
                    onPress={() => {
                      setSelectedStoreId(null)
                      setModalStep("createList")
                    }}
                  >
                    <Text style={{ fontWeight: "900", color: colors.text }}>Ei kauppaa</Text>
                  </Pressable>
                  {selectedStoreId === null && <Ionicons name="checkmark" size={18} color={colors.accent} />}
                </View>

                {/* Olemassaolevat kaupat */}
                <FlatList
                  data={stores}
                  keyExtractor={(s) => s.id}
                  style={{ maxHeight: 220, marginTop: 10 }}
                  renderItem={({ item }) => (
                    <View style={styles.storeRow}>
                      <Pressable
                        style={{ flex: 1 }}
                        onPress={() => {
                          setSelectedStoreId(item.id)
                          setModalStep("createList")
                        }}
                      >
                        <Text style={{ fontWeight: "700", color: colors.text }}>{item.name} {item.branch}</Text>
                      </Pressable>

                      {selectedStoreId === item.id && <Ionicons name="checkmark" size={18} color={colors.accent} />}

                      <Pressable onPress={() => confirmDeleteStore(item.id, item.name)} hitSlop={10} style={styles.iconButton}>
                        <Ionicons name="trash-outline" size={18} color="#e53935" />
                      </Pressable>
                    </View>
                  )}
                  ListEmptyComponent={<Text style={{ color: colors.secondaryText }}>Ei vielä kauppoja.</Text>}
                />

                <View style={{ height: 1, backgroundColor: colors.secondaryText, marginVertical: 12, opacity: 0.3 }} />

                {/* Lisää uusi kauppa */}
                <Text style={{ fontWeight: "700", marginBottom: 6, color: colors.text }}>Lisää uusi kauppa</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Kaupan nimi"
                  placeholderTextColor={colors.secondaryText}
                  value={newStoreName}
                  onChangeText={setNewStoreName}
                />
                <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
                  <Pressable onPress={() => setModalStep("createList")} style={styles.modalButton}>
                    <Text style={{ color: colors.text }}>Takaisin</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleCreateStore}
                    style={[styles.modalButton, !newStoreName.trim() && { opacity: 0.4 }]}
                    disabled={!newStoreName.trim()}
                  >
                    <Text style={{ fontWeight: "900", color: colors.text }}>Lisää</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const createStyles = (colors: { background: string; text: string; secondaryText: string; accent: string }) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 16},
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
      backgroundColor: colors.background,
      borderRadius: 15,
      padding: 16,
      marginVertical: 8,
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.secondaryText,
    },
    listTitle: { fontSize: 18, fontWeight: "900", color: colors.text },
    listSubtitle: { marginTop: 4, color: colors.secondaryText },
    chevron: { fontSize: 28, color: colors.secondaryText, marginLeft: 10 },
    iconButton: { padding: 6, borderRadius: 10 },

    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.3)",
      justifyContent: "center",
      alignItems: "center",
    },
    modalContent: { backgroundColor: colors.background, padding: 24, borderRadius: 10, width: "85%" },
    modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 12, textAlign: "center", color: colors.text },

    input: {
      borderWidth: 1,
      borderColor: colors.secondaryText,
      padding: 10,
      borderRadius: 8,
      marginBottom: 10,
      color: colors.text,
      backgroundColor: colors.background,
    },
    modalButton: { marginLeft: 16, marginTop: 12 },

    storePicker: {
      borderWidth: 1,
      borderColor: colors.secondaryText,
      borderRadius: 10,
      padding: 12,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 6,
      backgroundColor: colors.background,
    },
    storeRow: { padding: 12, borderRadius: 10, backgroundColor: colors.background, marginVertical: 6, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.secondaryText },
    trashBtn: { padding: 6, borderRadius: 10, marginLeft: 10 },

    stepHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
    headerSpacer: { width: 32 },
    backMiniBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.secondaryText,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 8,
    },
  })