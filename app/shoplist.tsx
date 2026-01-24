import React, { useEffect, useMemo, useState } from "react"
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Modal,
  SectionList,
  Alert,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useLocalSearchParams, useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"

import { useShopVM, ListItem, Category } from "../src/viewmodels/ShopVMContext"

/**
 * ScopeKey kertoo mistä kategoriat haetaan:
 * - jos listalla on kauppa (storeId) => store:<storeId>  (kaupan kategoriat)
 * - jos listalla ei ole kauppaa       => list:<listId>    (listakohtaiset kategoriat)
 *
 * Näin saadaan sama UI toimimaan sekä “kaupallisille” listoille että ilman kauppaa -listoille.
 */
const scopeKey = (storeId: string | null, listId: string) =>
  storeId ? `store:${storeId}` : `list:${listId}`

export default function ShopListScreen() {
  const router = useRouter()
  const { listId } = useLocalSearchParams<{ listId: string }>()

  const {
    uid,
    lists,
    getStoreName,
    categoriesByScope,
    itemsByListId,
    subscribeCategoriesForList,
    createCategoryForList,
    subscribeItems,
    addItem,
    updateItem,
    deleteItem,
  } = useShopVM();

  /**
   * Listan perustiedot: haetaan VM:n lists-taulukosta listId:llä.
   * Tämä pitää UI:n “ohut”: listan nimi ja storeId tulevat yhdestä paikasta.
   */
  const list = useMemo(
    () => lists.find((l) => l.id === String(listId)),
    [lists, listId]
  )

  const storeName = useMemo(
    () => getStoreName(list?.storeId ?? null),
    [list?.storeId, getStoreName]
  )

  // Turvallinen string avain item-cacheen
  const listKey = String(listId ?? "")

  // Kategoriat haetaan scopeKey:llä (store:<id> tai list:<id>)
  const catKey = useMemo(
    () => (list ? scopeKey(list.storeId, list.id) : ""),
    [list]
  )

  // VM-cacheista tämän listan itemit ja kategoriat
  const categories: Category[] = categoriesByScope[catKey] ?? []
  const items: ListItem[] = itemsByListId[listKey] ?? []

  /* Itemin lisäys UI-state */
  const [newItemName, setNewItemName] = useState("")

  // itemille valittu kategoria (dropdownista)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)

  /* Kategoria dropdown */
  const [pickerOpen, setPickerOpen] = useState(false)

  // mode kertoo, valitaanko kategoria "uudelle itemille" vai "edit itemille"
  const [pickerMode, setPickerMode] = useState<"new" | "edit">("new")

  // "Lisää uusi kategoria" -tila dropdownin sisällä
  const [addingCategory, setAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")

  /* Edit modal */
  const [editVisible, setEditVisible] = useState(false)
  const [editItem, setEditItem] = useState<ListItem | null>(null)
  const [editName, setEditName] = useState("")
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null)

  /**
   * TÄRKEÄ: tässä siirretään Firestore-kuuntelut VM:n kautta
   * - subscribeItems(list.id) kuuntelee itemsit
   * - subscribeCategoriesForList(list.id, list.storeId) kuuntelee kategoriat oikeasta paikasta
   *
   * Palautetaan cleanupissa unsubscribe-funktiot => ei jää “roikkumaan” kuuntelijoita.
   */
  useEffect(() => {
    if (!uid || !list) return

    const unsubItems = subscribeItems(list.id)
    const unsubCats = subscribeCategoriesForList(list.id, list.storeId)

    return () => {
      unsubItems()
      unsubCats()
    }
  }, [uid, list?.id, list?.storeId])

  /* Varmistus */
  if (!uid) {
    return (
      <View style={styles.container}>
        <Text style={{ color: "#666" }}>Kirjaudutaan…</Text>
      </View>
    )
  }

  if (!list) {
    return (
      <View style={styles.container}>
        <Text style={{ fontWeight: "900" }}>Listaa ei löytynyt.</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ color: "#7ed957", fontWeight: "900" }}>Takaisin</Text>
        </Pressable>
      </View>
    )
  }

  const title = storeName ? `${list.name} • ${storeName}` : list.name

  /* UI apunimet (kategorian nimi) */
  const selectedCategoryName = useMemo(() => {
    if (!selectedCategoryId) return "Ei kategoriaa"
    return categories.find((c) => c.id === selectedCategoryId)?.name ?? "Ei kategoriaa"
  }, [selectedCategoryId, categories])

  const editCategoryName = useMemo(() => {
    if (!editCategoryId) return "Ei kategoriaa"
    return categories.find((c) => c.id === editCategoryId)?.name ?? "Ei kategoriaa"
  }, [editCategoryId, categories])

  /* Itemit ryhmiteltynä */
  /**
   * Tehdään SectionListin tarvitsemat “sections”.
   * - Jokaiselle kategorialle oma section (järjestys = category.order)
   * - Lisäksi “Ei kategoriaa” -section jos sinne jää itemeitä
   *
   * Tämä on perusta tulevalle drag&dropille: meillä on jo item.order & category.order VM:ssä.
   */
  const sections = useMemo(() => {
    const byCat = new Map<string | null, ListItem[]>()
    for (const it of items) {
      const key = it.categoryId ?? null
      byCat.set(key, [...(byCat.get(key) ?? []), it])
    }

    // Kategoriat järjestyksessä
    const catSections = categories
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((c) => ({
        title: c.name,
        categoryId: c.id,
        data: (byCat.get(c.id) ?? []).slice().sort((a, b) => a.order - b.order),
      }))
      .filter((s) => s.data.length > 0)

    const noCat = (byCat.get(null) ?? []).slice().sort((a, b) => a.order - b.order)

    return [
      ...catSections,
      ...(noCat.length ? [{ title: "Ei kategoriaa", categoryId: null, data: noCat }] : []),
    ]
  }, [items, categories])

  /* Actions */

  // Avaa dropdown “uuden itemin” kategoriavalinnalle
  const openPickerForNew = () => {
    setPickerMode("new")
    setAddingCategory(false)
    setNewCategoryName("")
    setPickerOpen(true)
  }

  // Avaa dropdown “edit itemin” kategoriavalinnalle
  const openPickerForEdit = () => {
    setPickerMode("edit")
    setAddingCategory(false)
    setNewCategoryName("")
    setPickerOpen(true)
  }

  // Valitse kategoria (tai null = “Ei kategoriaa”)
  const pickCategory = (id: string | null) => {
    if (pickerMode === "new") setSelectedCategoryId(id)
    else setEditCategoryId(id)
    setPickerOpen(false)
  }

  // Lisää item (VM hoitaa tallennuksen, orderin ja categoryId:n)
  const handleAdd = async () => {
    const n = newItemName.trim()
    if (!n) return

    await addItem(list.id, n, selectedCategoryId)
    setNewItemName("")
  }

  // Toggle done
  const toggleDone = async (it: ListItem) => {
    await updateItem(list.id, it.id, { done: !it.done })
  }

  // Poista item
  const remove = async (it: ListItem) => {
    await deleteItem(list.id, it.id)
  }

  // Avaa edit-modal
  const openEdit = (it: ListItem) => {
    setEditItem(it)
    setEditName(it.name)
    setEditCategoryId(it.categoryId ?? null)
    setEditVisible(true)
  };

  // Tallenna edit
  const saveEdit = async () => {
    if (!editItem) return

    const n = editName.trim()
    if (!n) return

    await updateItem(list.id, editItem.id, {
      name: n,
      categoryId: editCategoryId ?? null,
    })

    setEditVisible(false)
    setEditItem(null)
  };

  // Lisää uusi kategoria (oikeaan scopeen store/list)
  const createNewCategory = async () => {
    const n = newCategoryName.trim()
    if (!n) return

    await createCategoryForList(list.id, list.storeId, n)
    setNewCategoryName("")
    setAddingCategory(false)
  }

  /* I */

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

      {/* Add row: Tuote + Kategoria dropdown + Lisää */}
      <View style={styles.addRow}>
        <TextInput
          style={[styles.input, { flex: 1, marginBottom: 0 }]}
          placeholder="Tuote"
          value={newItemName}
          onChangeText={setNewItemName}
        />

        {/* Kategoria dropdown */}
        <Pressable onPress={openPickerForNew} style={styles.categorySelect}>
          <Text style={{ color: "#666" }}>Kategoria</Text>
          <Text style={{ fontWeight: "900" }} numberOfLines={1}>
            {selectedCategoryName}
          </Text>
          <Ionicons name="chevron-down" size={16} color="#666" />
        </Pressable>

        <Pressable onPress={handleAdd} style={styles.addBtn}>
          <Text style={styles.addBtnText}>Lisää</Text>
        </Pressable>
      </View>

      {/* Tuotteet järjestettynä kategorian mukaan */}
      <SectionList
        sections={sections}
        keyExtractor={(it) => it.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={styles.itemRow}>
            <Pressable onPress={() => toggleDone(item)} style={styles.checkbox} hitSlop={10}>
              <Text style={{ fontSize: 20 }}>{item.done ? "✔" : "□"}</Text>
            </Pressable>

            {/* Painamalla nimeä avaat muokkauksen */}
            <Pressable onPress={() => openEdit(item)} style={{ flex: 1 }}>
              <Text style={[styles.itemText, item.done && styles.itemDone]}>{item.name}</Text>
            </Pressable>

            {/* Roskakori ikonina */}
            <Pressable
              onPress={() =>
                Alert.alert("Poistetaanko tuote?", `"${item.name}" poistetaan.`, [
                  { text: "Peruuta", style: "cancel" },
                  { text: "Poista", style: "destructive", onPress: () => remove(item) },
                ])
              }
              style={styles.iconButton}
              hitSlop={10}
            >
              <Ionicons name="trash-outline" size={20} color="#e53935" />
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          <Text style={{ marginTop: 16, color: "#666" }}>
            Lisää ensimmäinen tuote yllä.
          </Text>
        }
      />

      {/* Kategorian valinta modal (dropdownin “sisältö”) */}
      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        presentationStyle="overFullScreen"
        onRequestClose={() => setPickerOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={styles.modalTitle}>Valitse kategoria</Text>
              <Pressable onPress={() => setPickerOpen(false)} hitSlop={10}>
                <Ionicons name="close" size={22} color="#555" />
              </Pressable>
            </View>

            {/* Ei kategoriaa */}
            <Pressable onPress={() => pickCategory(null)} style={styles.pickerRow}>
              <Text style={{ fontWeight: "900" }}>Ei kategoriaa</Text>
            </Pressable>

            {/* Kategoriat */}
            {categories.map((c) => (
              <Pressable key={c.id} onPress={() => pickCategory(c.id)} style={styles.pickerRow}>
                <Text style={{ fontWeight: "700" }}>{c.name}</Text>
              </Pressable>
            ))}

            <View style={{ height: 1, backgroundColor: "#eee", marginVertical: 12 }} />

            {/* Lisää uusi kategoria -kohta */}
            {!addingCategory ? (
              <Pressable onPress={() => setAddingCategory(true)} style={styles.pickerRow}>
                <Text style={{ fontWeight: "900", color: "#7ed957" }}>
                  + Lisää uusi kategoria
                </Text>
              </Pressable>
            ) : (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Uuden kategorian nimi"
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                />
                <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
                  <Pressable onPress={() => setAddingCategory(false)} style={styles.modalButton}>
                    <Text>Peruuta</Text>
                  </Pressable>
                  <Pressable onPress={createNewCategory} style={styles.modalButton}>
                    <Text style={{ fontWeight: "900" }}>Lisää</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Edit modal */}
      <Modal
        visible={editVisible}
        transparent
        animationType="fade"
        presentationStyle="overFullScreen"
        onRequestClose={() => setEditVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Muokkaa tuotetta</Text>

            <TextInput
              style={styles.input}
              placeholder="Tuote"
              value={editName}
              onChangeText={setEditName}
            />

            {/* Editissäkin käytetään samaa dropdownia */}
            <Pressable onPress={openPickerForEdit} style={styles.categorySelectWide}>
              <Text style={{ color: "#666" }}>Kategoria</Text>
              <Text style={{ fontWeight: "900" }} numberOfLines={1}>
                {editCategoryName}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#666" />
            </Pressable>

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
  )
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

  addRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },

  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },

  addBtn: {
    backgroundColor: "#7ed957",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  addBtnText: { color: "white", fontWeight: "900" },

  categorySelect: {
    width: 150,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "white",
    gap: 2,
  },
  categorySelectWide: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 10,
    backgroundColor: "white",
    marginBottom: 10,
    gap: 2,
  },

  sectionHeader: { paddingTop: 10, paddingBottom: 6 },
  sectionTitle: { fontSize: 14, fontWeight: "900", color: "#555" },

  itemRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, gap: 10 },
  checkbox: { padding: 4 },
  itemText: { fontSize: 16, fontWeight: "800" },
  itemDone: { textDecorationLine: "line-through", color: "#888" },

  iconButton: { padding: 6, borderRadius: 10 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: { backgroundColor: "white", padding: 24, borderRadius: 10, width: "85%" },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 12, textAlign: "center" },
  modalButton: { marginLeft: 16, marginTop: 12 },

  pickerRow: { paddingVertical: 10 },
})
