import React, { useMemo, useState } from "react"
import { View, Text, TextInput, StyleSheet, TouchableOpacity, FlatList, Modal, Pressable } from "react-native"
import { useRouter } from "expo-router";
import { useShopVM } from "../../src/viewmodels/ShopVMContext"

export default function Home() {
  const router = useRouter();
  const { uid, lists, stores, createList, createStore, getStoreName } = useShopVM()

  // --- Modal: uusi lista ---
  const [createListModal, setCreateListModal] = useState(false)
  const [newListName, setNewListName] = useState("")
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null)

  // --- Modal: valitse/lisää kauppa ---
  const [storeModal, setStoreModal] = useState(false)
  const [newStoreName, setNewStoreName] = useState("")

  const selectedStoreLabel = useMemo(
    () => getStoreName(selectedStoreId) ?? "Ei kauppaa",
    [selectedStoreId, getStoreName]
  )

  // Luo lista ja siirry suoraan listanäkymään
  const handleCreateList = async () => {
    const id = await createList(newListName, selectedStoreId)
    if (!id) return;

    setNewListName("");
    setSelectedStoreId(null);
    setCreateListModal(false);

    router.push({ pathname: "/shoplist", params: { listId: id } })
  };

  // Luo uusi kauppa (jää auki, jotta voi vielä valita sen listalle)
  const handleCreateStore = async () => {
    await createStore(newStoreName)
    setNewStoreName("");
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Ostoslistat</Text>
        <TouchableOpacity onPress={() => setCreateListModal(true)} style={styles.addButton}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Debug: näkyykö uid ja vaihtuuko se reloadissa */}
      <Text style={{ color: "#666", marginBottom: 8 }}>
      uid: {uid ?? "ei vielä"}
      </Text>

      {/* Auth-status */}
      {!uid && <Text style={{ color: "#666" }}>Kirjaudutaan anonyymisti…</Text>}

      {/* Lists */}
      <FlatList
        data={lists}
        keyExtractor={(l) => l.id}
        renderItem={({ item }) => {
          const storeName = getStoreName(item.storeId);
          return (
            <TouchableOpacity
              style={styles.listBlock}
              onPress={() => router.push({ pathname: "/shoplist", params: { listId: item.id } })}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.listTitle}>{item.name}</Text>
                <Text style={styles.listSubtitle}>{storeName ?? "Ei kauppaa"}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <Text style={{ marginTop: 20, color: "#666" }}>Luo ensimmäinen lista painamalla +</Text>
        }
      />

      {/* Modal: Uusi lista */}
      <Modal
        visible={createListModal}
        transparent
        animationType="slide"
        onRequestClose={() => setCreateListModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Uusi ostoslista</Text>

            <TextInput
              style={styles.input}
              placeholder="Listan nimi"
              value={newListName}
              onChangeText={setNewListName}
            />

            <Pressable onPress={() => setStoreModal(true)} style={styles.storePicker}>
              <Text style={{ fontWeight: "700" }}>Kauppa:</Text>
              <Text style={{ marginLeft: 8, flex: 1 }} numberOfLines={1}>
                {selectedStoreLabel}
              </Text>
              <Text style={{ color: "#7ed957", fontWeight: "900" }}>Vaihda</Text>
            </Pressable>

            <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
              <Pressable onPress={() => setCreateListModal(false)} style={styles.modalButton}>
                <Text>Peruuta</Text>
              </Pressable>
              <Pressable onPress={handleCreateList} style={styles.modalButton}>
                <Text style={{ fontWeight: "900" }}>Luo</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: valitse / lisää kauppa */}
      <Modal
        visible={storeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setStoreModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Valitse kauppa</Text>

            {/* Ei kauppaa */}
            <Pressable
              onPress={() => {
                setSelectedStoreId(null);
                setStoreModal(false);
              }}
              style={[styles.storeRow, { borderWidth: 1, borderColor: "#ddd" }]}
            >
              <Text style={{ fontWeight: "900" }}>Ei kauppaa</Text>
            </Pressable>

            {/* Olemassa olevat kaupat */}
            <FlatList
              data={stores}
              keyExtractor={(s) => s.id}
              style={{ maxHeight: 220, marginTop: 10 }}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    setSelectedStoreId(item.id);
                    setStoreModal(false);
                  }}
                  style={styles.storeRow}
                >
                  <Text style={{ fontWeight: "700" }}>{item.name}</Text>
                </Pressable>
              )}
              ListEmptyComponent={<Text style={{ color: "#666", marginTop: 8 }}>Ei kauppoja vielä.</Text>}
            />

            <View style={{ height: 1, backgroundColor: "#eee", marginVertical: 12 }} />

            {/* Lisää uusi kauppa */}
            <Text style={{ fontWeight: "900", marginBottom: 6 }}>Lisää uusi kauppa</Text>
            <TextInput
              style={styles.input}
              placeholder="Kaupan nimi"
              value={newStoreName}
              onChangeText={setNewStoreName}
            />

            <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
              <Pressable onPress={() => setStoreModal(false)} style={styles.modalButton}>
                <Text>Valmis</Text>
              </Pressable>
              <Pressable onPress={handleCreateStore} style={styles.modalButton}>
                <Text style={{ fontWeight: "900" }}>Lisää</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
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
  storeRow: { padding: 12, borderRadius: 10, backgroundColor: "#f7f7f7", marginVertical: 6 },
});
