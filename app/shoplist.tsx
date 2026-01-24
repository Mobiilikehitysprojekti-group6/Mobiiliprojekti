import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  FlatList,
  TouchableOpacity,
  Modal,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useShopVM } from "../src/viewmodels/ShopVMContext";
import {
  db,
  collection,
  addDoc,
  doc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "../firebase/Config";
import { SafeAreaView } from "react-native-safe-area-context";

type Item = { id: string; name: string; category?: string; done: boolean };

export default function ShopListScreen() {
  const router = useRouter();
  const { listId } = useLocalSearchParams<{ listId: string }>();
  const { uid, lists, getStoreName } = useShopVM();

  // Listan perustiedot tulee VM:n lists-taulukosta
  const list = useMemo(() => lists.find((l) => l.id === String(listId)), [lists, listId]);
  const storeName = useMemo(() => getStoreName(list?.storeId ?? null), [list?.storeId, getStoreName]);

  const [items, setItems] = useState<Item[]>([]);
  const [newItemName, setNewItemName] = useState("");
  const [newCategory, setNewCategory] = useState("");

  // Edit modal state
  const [editVisible, setEditVisible] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");

  // Kuunnellaan tämän listan itemit Firestoresta
  useEffect(() => {
    if (!uid || !listId) return;

    const ref = collection(db, "users", uid, "lists", String(listId), "items");
    const q = query(ref, orderBy("createdAt", "asc"));

    const unsub = onSnapshot(q, (snap) => {
      setItems(
        snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            name: data.name,
            category: data.category ?? undefined,
            done: !!data.done,
          };
        })
      );
    });

    return unsub;
  }, [uid, listId]);

  if (!uid) {
    return (
      <View style={styles.container}>
        <Text style={{ color: "#666" }}>Kirjaudutaan…</Text>
      </View>
    );
  }

  if (!list) {
    return (
      <View style={styles.container}>
        <Text style={{ fontWeight: "900" }}>Listaa ei löytynyt.</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ color: "#7ed957", fontWeight: "900" }}>Takaisin</Text>
        </Pressable>
      </View>
    );
  }

  const title = storeName ? `${list.name} • ${storeName}` : list.name;

  // Lisää item
  const handleAdd = async () => {
    const n = newItemName.trim();
    const c = newCategory.trim();
    if (!n) return;

    await addDoc(collection(db, "users", uid, "lists", list.id, "items"), {
      name: n,
      category: c ? c : null,
      done: false,
      createdAt: serverTimestamp(),
    });

    setNewItemName("");
    setNewCategory("");
  };

  // Toggle done
  const toggleDone = async (item: Item) => {
    await updateDoc(doc(db, "users", uid, "lists", list.id, "items", item.id), {
      done: !item.done,
    });
  };

  // Poista item
  const remove = async (item: Item) => {
    await deleteDoc(doc(db, "users", uid, "lists", list.id, "items", item.id));
  };

  // Avaa muokkaus-modal
  const openEdit = (item: Item) => {
    setEditItem(item);
    setEditName(item.name);
    setEditCategory(item.category ?? "");
    setEditVisible(true);
  };

  // Tallenna muokkaus
  const saveEdit = async () => {
    if (!editItem) return;
    const n = editName.trim();
    const c = editCategory.trim();
    if (!n) return;

    await updateDoc(doc(db, "users", uid, "lists", list.id, "items", editItem.id), {
      name: n,
      category: c ? c : null,
    });

    setEditVisible(false);
    setEditItem(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={2}>
          {title}
        </Text>
      </View>

      {/* Add row */}
      <View style={styles.addRow}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Tuote"
          value={newItemName}
          onChangeText={setNewItemName}
        />
        <TextInput
          style={[styles.input, { width: 130, marginLeft: 8 }]}
          placeholder="Kategoria"
          value={newCategory}
          onChangeText={setNewCategory}
        />
        <Pressable onPress={handleAdd} style={styles.addBtn}>
          <Text style={styles.addBtnText}>Lisää</Text>
        </Pressable>
      </View>

      {/* Items list */}
      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        renderItem={({ item }) => (
          <View style={styles.itemRow}>
            <TouchableOpacity onPress={() => toggleDone(item)} style={styles.checkbox}>
              <Text style={{ fontSize: 20 }}>{item.done ? "✔" : "□"}</Text>
            </TouchableOpacity>

            {/* Painamalla nimeä avaat muokkauksen */}
            <TouchableOpacity onPress={() => openEdit(item)} style={{ flex: 1 }}>
              <Text style={[styles.itemText, item.done && styles.itemDone]}>{item.name}</Text>
              {!!item.category && <Text style={styles.itemCategory}>{item.category}</Text>}
            </TouchableOpacity>

            <Pressable onPress={() => remove(item)} style={styles.removeBtn}>
              <Text style={styles.removeBtnText}>Poista</Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={<Text style={{ marginTop: 16, color: "#666" }}>Lisää ensimmäinen tuote yllä.</Text>}
      />

      {/* Edit modal */}
      <Modal visible={editVisible} transparent animationType="slide" onRequestClose={() => setEditVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Muokkaa tuotetta</Text>

            <TextInput style={styles.input} placeholder="Tuote" value={editName} onChangeText={setEditName} />
            <TextInput
              style={styles.input}
              placeholder="Kategoria"
              value={editCategory}
              onChangeText={setEditCategory}
            />

            <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
              <Pressable onPress={() => setEditVisible(false)} style={styles.modalButton}>
                <Text>Peruuta</Text>
              </Pressable>
              <Pressable onPress={saveEdit} style={styles.modalButton}>
                <Text style={{ fontWeight: "900" }}>Tallenna</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, flex: 1 },

  topRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f2f2f2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  backText: { fontSize: 26, color: "#555", marginTop: -2 },
  headerTitle: { fontSize: 18, fontWeight: "900", flex: 1 },

  addRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  input: { borderWidth: 1, borderColor: "#ddd", padding: 10, borderRadius: 10, marginBottom: 10 },
  addBtn: { backgroundColor: "#7ed957", paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, marginLeft: 8, marginBottom: 10 },
  addBtnText: { color: "white", fontWeight: "900" },

  itemRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  checkbox: { marginRight: 10, padding: 4 },
  itemText: { fontSize: 16, fontWeight: "800" },
  itemDone: { textDecorationLine: "line-through", color: "#888" },
  itemCategory: { marginTop: 2, color: "#666" },

  removeBtn: { backgroundColor: "#e53935", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, marginLeft: 10 },
  removeBtnText: { color: "white", fontWeight: "900" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "center", alignItems: "center" },
  modalContent: { backgroundColor: "white", padding: 24, borderRadius: 10, width: "85%" },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 12, textAlign: "center" },
  modalButton: { marginLeft: 16, marginTop: 12 },
})
