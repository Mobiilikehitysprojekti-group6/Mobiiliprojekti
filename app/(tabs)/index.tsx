import React, { useMemo, useRef, useState, useEffect } from "react"
import { View, Text, TextInput, StyleSheet, TouchableOpacity, FlatList, Modal, Pressable, Alert } from "react-native"
import DraggableFlatList from "react-native-draggable-flatlist"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useShopVM } from "../../src/viewmodels/ShopVMContext"

export default function Home() {
  const router = useRouter()
  const { uid, lists, stores, createList, createStore, deleteList, deleteStore, getStoreName, reorderLists } = useShopVM()

  useEffect(() => {
  console.log("✅ CURRENT UID:", uid)
  }, [uid])

  useEffect(() => {
    console.log("📦 lists length:", lists.length)
  }, [lists.length])


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
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Ostoslistat</Text>
        <Pressable
          onPress={openCreateListModal}
          style={[styles.addButton, !uid && { opacity: 0.4 }]}
          disabled={!uid}
        >
          <Text style={styles.addButtonText}>+</Text>
        </Pressable>
      </View>

      {/* Auth-status */}
      {!uid && <Text style={{ color: "#666" }}>Kirjaudutaan anonyymisti…</Text>}

      {/* Ostoslistat, drag&drop järjesty. Tap avaa, long press raahaa */}
      {/* Ostoslistat: drag&drop järjestys. Tap avaa, long press raahaa */}
      <DraggableFlatList
        data={lists}
        keyExtractor={(l) => l.id}
        activationDistance={8}
        onDragEnd={async ({ data }) => {
          // ✅ Päivitä järjestys Firestoreen
          await reorderLists(data.map((x) => x.id))
        }}
        renderItem={({ item, drag, isActive }) => {
          const storeName = getStoreName(item.storeId) ?? "Ei kauppaa"

          return (
            <Pressable
              style={[styles.listBlock, isActive && { opacity: 0.9 }]}
              delayLongPress={150}
              onLongPress={() => {
                // ✅ Jos kosketus alkaa roskiksesta, estä drag
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

              {/* ✅ Roskakori: ei aloita dragia */}
              <Pressable
                onPressIn={() => (blockRowDragRef.current = true)}
                onPressOut={() => (blockRowDragRef.current = false)}
                onPress={() => confirmDeleteList(item.id, item.name)}
                hitSlop={10}
                style={styles.iconButton}
              >
                <Ionicons name="trash-outline" size={22} color="#e53935" />
              </Pressable>

              {/* ✅ Pieni vihje, että kortti on raahattava */}
              <Ionicons name="reorder-two" size={18} color="#bbb" />
            </Pressable>
          )
        }}
        ListEmptyComponent={
          <Text style={{ marginTop: 20, color: "#666" }}>
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
                  value={newListName}
                  onChangeText={setNewListName}
                />

                <Pressable onPress={() => setModalStep("pickStore")} style={styles.storePicker}>
                  <Text style={{ fontWeight: "700" }}>Kauppa:</Text>
                  <Text style={{ marginLeft: 8, flex: 1 }} numberOfLines={1}>
                    {selectedStoreLabel}
                  </Text>
                  <Text style={{ color: "#7ed957", fontWeight: "900" }}>Vaihda</Text>
                </Pressable>

                <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
                  <Pressable onPress={closeModal} style={[styles.modalButton, !uid && { opacity: 0.4 }]} disabled={!uid}>
                    <Text>Peruuta</Text>
                  </Pressable>
                  <Pressable onPress={handleCreateList} style={styles.modalButton}>
                    <Text style={{ fontWeight: "900" }}>Luo</Text>
                  </Pressable>
                </View>
              </>
            )}

            {/* STEP 2: Valitse kauppa */}
            {modalStep === "pickStore" && (
              <>
                <View style={styles.stepHeader}>
                  <Pressable onPress={() => setModalStep("createList")} style={styles.backMiniBtn}>
                    <Ionicons name="chevron-back" size={18} color="#555" />
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
                    <Text style={{ fontWeight: "900" }}>Ei kauppaa</Text>
                  </Pressable>
                  {selectedStoreId === null && <Ionicons name="checkmark" size={18} color="#7ed957" />}
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
                        <Text style={{ fontWeight: "700" }}>{item.name} {item.branch}</Text>
                      </Pressable>

                      {selectedStoreId === item.id && <Ionicons name="checkmark" size={18} color="#7ed957" />}

                      <Pressable onPress={() => confirmDeleteStore(item.id, item.name)} hitSlop={10} style={styles.iconButton}>
                        <Ionicons name="trash-outline" size={18} color="#e53935" />
                      </Pressable>
                    </View>
                  )}
                  ListEmptyComponent={<Text style={{ color: "#666" }}>Ei vielä kauppoja.</Text>}
                />

                <View style={{ height: 1, backgroundColor: "#eee", marginVertical: 12 }} />

                {/* Lisää uusi kauppa */}
                <Text style={{ fontWeight: "700", marginBottom: 6 }}>Lisää uusi kauppa</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Kaupan nimi"
                  value={newStoreName}
                  onChangeText={setNewStoreName}
                />
                <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
                  <Pressable onPress={() => setModalStep("createList")} style={styles.modalButton}>
                    <Text>Takaisin</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleCreateStore}
                    style={[styles.modalButton, !newStoreName.trim() && { opacity: 0.4 }]}
                    disabled={!newStoreName.trim()}
                  >
                    <Text style={{ fontWeight: "900" }}>Lisää</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { padding: 20, flex: 1 },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  headerTitle: { fontSize: 24, fontWeight: "bold", flex: 1 },
  addButton: {
    backgroundColor: "#7ed957",
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: { color: "white", fontSize: 28, fontWeight: "bold", marginTop: -2 },

  listBlock: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 16,
    marginVertical: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  listTitle: { fontSize: 18, fontWeight: "900" },
  listSubtitle: { marginTop: 4, color: "#666" },
  chevron: { fontSize: 28, color: "#bbb", marginLeft: 10 },
  iconButton: { padding: 6, borderRadius: 10 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: { backgroundColor: "white", padding: 24, borderRadius: 10, width: "85%" },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 12, textAlign: "center" },

  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  modalButton: { marginLeft: 16, marginTop: 12 },

  storePicker: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  storeRow: { padding: 12, borderRadius: 10, backgroundColor: "#f7f7f7", marginVertical: 6, flexDirection: "row", alignItems: "center" },
  trashBtn: { padding: 6, borderRadius: 10, marginLeft: 10 },

  stepHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  headerSpacer: { width: 32 },
  backMiniBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f2f2f2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
})