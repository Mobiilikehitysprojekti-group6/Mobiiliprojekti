import React, { useEffect, useMemo, useRef, useState } from "react"
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Modal,
  Alert,
  useWindowDimensions,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useLocalSearchParams, useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { NestableScrollContainer, NestableDraggableFlatList } from "react-native-draggable-flatlist"

import { useShopVM, ListItem, Category } from "../src/viewmodels/ShopVMContext"
import { useTheme } from "../src/viewmodels/ThemeContext"

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
  const { colors } = useTheme()
  const router = useRouter()
  const { listId } = useLocalSearchParams<{ listId: string }>()
  const { width } = useWindowDimensions()
  // Nappien leveydet suhteessa näytön leveyteen (max/min rajoilla)
  // Huom! Ei laiteta stylesheettiin, koska riippuvat runtime-näytön leveydestä
  const addWidth = Math.max(60, Math.min(78, Math.round(width * 0.13)))
  const catWidth = Math.max(115, Math.min(180, Math.round(width * 0.28)))

  // Estetään drag quantity/roskis/checkbox kohdalta
  const blockRowDragRef = useRef(false)

  const {
    uid,
    lists,
    getStoreName,
    categoriesByScope,
    itemsByListId,
    subscribeCategoriesForList,
    createCategoryForList,
    ensureDefaultStoreCategories,
    subscribeItems,
    addItem,
    updateItem,
    deleteItem,
    reorderCategoriesForList,
    reorderItemsInCategory,
    changeQuantity,
  } = useShopVM()

  const styles = createStyles(colors)

  /**
   * Listan perustiedot: haetaan VM:n lists-taulukosta listId:llä.
   * Tämä pitää UI:n “ohuena”: listan nimi ja storeId tulevat yhdestä paikasta.
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
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null | undefined>(undefined)

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

    if (list.storeId) {
      ensureDefaultStoreCategories(list.storeId)
    }

    return () => {
      unsubItems()
      unsubCats()
    }
  }, [uid, listId, list?.storeId])

  /* Varmistus */
  if (!uid) {
    return (
      <View style={styles.container}>
        <Text style={{ color: colors.secondaryText }}>Kirjaudutaan…</Text>
      </View>
    )
  }

  if (!list) {
    return (
      <View style={styles.container}>
        <Text style={{ fontWeight: "900", color: colors.text }}>Listaa ei löytynyt.</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ color: colors.accent, fontWeight: "900" }}>Takaisin</Text>
        </Pressable>
      </View>
    )
  }

  const title = storeName ? `${list.name} • ${storeName}` : list.name

  /* UI apunimet (kategorian nimi) */
  const selectedCategoryLabel = useMemo(() => {
    if (selectedCategoryId === undefined) return "Kategoria"
    if (selectedCategoryId === null) return "Ei kategoriaa"
    return categories.find((c) => c.id === selectedCategoryId)?.name ?? "Kategoria"
  }, [selectedCategoryId, categories])

  const editCategoryName = useMemo(() => {
    if (!editCategoryId) return "Ei kategoriaa"
    return categories.find((c) => c.id === editCategoryId)?.name ?? "Ei kategoriaa"
  }, [editCategoryId, categories])

  /* Itemit ryhmiteltynä */
  /**
   *
   * Tässä nyt drag&drop blokkeina, ei SectionListillä.
   */

  type CategoryBlock = {
    id: string | null // null = "Ei kategoriaa"
    name: string
    order: number
    items: ListItem[]
  }

  const blocks = useMemo<CategoryBlock[]>(() => {
    const byCat = new Map<string | null, ListItem[]>()

    for (const it of items) {
      const key = it.categoryId ?? null
      byCat.set(key, [...(byCat.get(key) ?? []), it])
    }

    // Kategoriat järjestyksessä
    const catBlocks: CategoryBlock[] = categories
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((c) => ({
        id: c.id,
        name: c.name,
        order: c.order,
        items: (byCat.get(c.id) ?? []).slice().sort((a, b) => a.order - b.order),
      }))
      .filter((b) => b.items.length > 0) // suodatetaan pois tyhjät kategoriat

    // Ei kategoriaa
    const noCatItems = (byCat.get(null) ?? []).slice().sort((a, b) => a.order - b.order)
    if (noCatItems.length) {
      catBlocks.push({
        id: null,
        name: "Ei kategoriaa",
        order: 999999,
        items: noCatItems,
      })
    }

    return catBlocks
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

    await addItem(list.id, n, selectedCategoryId ?? null)
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
  }

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
  }

  // Lisää uusi kategoria (oikeaan scopeen store/list)
  const createNewCategory = async () => {
    const n = newCategoryName.trim()
    if (!n) return

    await createCategoryForList(list.id, list.storeId, n)
    setNewCategoryName("")
    setAddingCategory(false)
  }

  /* UI */

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
          style={[styles.input, { flex: 1, marginBottom: 0, minWidth: 0, fontWeight: "700" }]}
          placeholder="Tuote"
          placeholderTextColor={colors.secondaryText}
          value={newItemName}
          onChangeText={setNewItemName}
        />

        {/* Kategoria dropdown */}
        <Pressable onPress={openPickerForNew} style={[styles.categoryPill, { width: catWidth }]}>
          <Text
            style={[styles.categoryPillText, !selectedCategoryId && { color: colors.secondaryText, fontWeight: "700" }]}
            numberOfLines={1}
          >
            {selectedCategoryLabel}
          </Text>
          <Ionicons name="chevron-down" size={16} color={colors.secondaryText} />
        </Pressable>


        <Pressable onPress={handleAdd} style={[styles.addBtn, { width: addWidth }]}>
          <Text style={styles.addBtnText}>Lisää</Text>
        </Pressable>
      </View>

      {/* Tuotteet järjestettynä kategorian mukaan */}
      {/* Tuotteet (drag&drop): kategoriat + tuotteet saman sivun sisällä */}
      <NestableScrollContainer contentContainerStyle={{ paddingBottom: 24 }}>
        <NestableDraggableFlatList
          activationDistance={8}
          data={blocks}
          keyExtractor={(b) => String(b.id ?? "__none__")}
          // tärkeä: ulompi lista ei scrollaa itse, scroll container hoitaa
          scrollEnabled={false}
          onDragEnd={async ({ data }) => {
            // siirretään vain oikeita kategorioita; "Ei kategoriaa" jätetään loppuun
            const nextCatIds = data.filter((b) => b.id !== null).map((b) => b.id as string)
            await reorderCategoriesForList(list.id, list.storeId, nextCatIds)
          }}
          renderItem={({ item: block, drag, isActive }) => (
            <View style={{ paddingTop: 10 }}>
              {/* Kategoria-otsikko: koko rivi on dragattava (paitsi "Ei kategoriaa") */}
              <Pressable
                style={styles.sectionHeaderRow}
                onLongPress={block.id !== null ? drag : undefined}
                delayLongPress={150}
                disabled={isActive || block.id === null}
              >
                <Text style={styles.sectionTitle}>{block.name}</Text>
              </Pressable>


              {/* Tuotteet draggable tässä kategoriassa */}
              <NestableDraggableFlatList
                activationDistance={8}
                data={block.items}
                keyExtractor={(it) => it.id}
                scrollEnabled={false}
                onDragEnd={async ({ data }) => {
                  const nextItemIds = data.map((it) => it.id)
                  await reorderItemsInCategory(list.id, block.id, nextItemIds)
                }}
                ListEmptyComponent={
                  <Text style={{ color: colors.secondaryText, marginBottom: 6 }}>
                    (Ei tuotteita)
                  </Text>
                }
                renderItem={({ item, drag: dragItem, isActive: itemActive }) => (
                  <View style={[styles.itemRow, itemActive && styles.dragActive ]}>
                    {/* Checkbox: tap = toggle, long press = drag */}
                    <Pressable
                      onPress={() => toggleDone(item)}
                      onLongPress={() => {
                        // Drag sallittu vain jos ei olla painettu qty/roskista
                        if (blockRowDragRef.current) return
                        dragItem()
                      }}
                      delayLongPress={150}
                      disabled={itemActive}
                      style={styles.checkbox}
                      hitSlop={10}
                    >
                      <Text style={{ fontSize: 20, color: colors.text }}>{item.done ? "✔" : "□"}</Text>
                    </Pressable>

                    {/* Nimi: tap = edit, long press = drag */}
                    <Pressable
                      onPress={() => openEdit(item)}
                      onLongPress={() => {
                        if (blockRowDragRef.current) return
                        dragItem()
                      }}
                      delayLongPress={150}
                      disabled={itemActive}
                      style={{ flex: 1 }}
                    >
                      <Text style={[styles.itemText, item.done && styles.itemDone]}>{item.name}</Text>
                    </Pressable>

                    {/* quantity stepper: estää dragin kun tätä painetaan */}
                    <View style={styles.qtyWrap}>
                      <Pressable
                        onPressIn={() => (blockRowDragRef.current = true)}  // ✅ estä drag
                        onPressOut={() => (blockRowDragRef.current = false)} // ✅ vapauta
                        onPress={() => changeQuantity(list.id, item.id, -1)}
                        hitSlop={10}
                      >
                        <Text style={styles.qtyBtn}>−</Text>
                      </Pressable>

                      <Text style={styles.qtyText}>{item.quantity ?? 1}</Text>

                      <Pressable
                        onPressIn={() => (blockRowDragRef.current = true)}   // ✅ estä drag
                        onPressOut={() => (blockRowDragRef.current = false)} // ✅ vapauta
                        onPress={() => changeQuantity(list.id, item.id, +1)}
                        hitSlop={10}
                      >
                        <Text style={styles.qtyBtn}>+</Text>
                      </Pressable>
                    </View>

                    {/* Roskakori: estää dragin kun tätä painetaan */}
                    <Pressable
                      onPressIn={() => (blockRowDragRef.current = true)}    // ✅ estä drag
                      onPressOut={() => (blockRowDragRef.current = false)}  // ✅ vapauta
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
              />
            </View>
          )}
          ListFooterComponent={
            blocks.length === 0 ? (
              <Text style={{ marginTop: 16, color: colors.secondaryText }}>
                Lisää ensimmäinen tuote yllä.
              </Text>
            ) : (
              <View style={{ height: 12 }} />
            )
          }
        />
      </NestableScrollContainer>

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
                <Ionicons name="close" size={22} color={colors.text} />
              </Pressable>
            </View>

            {/* Kategoriat */}
            {categories.map((c) => (
              <Pressable key={c.id} onPress={() => pickCategory(c.id)} style={styles.pickerRow}>
                <Text style={{ fontWeight: "700", color: colors.text }}>{c.name}</Text>
              </Pressable>
            ))}

            {/* Ei kategoriaa */}
            <Pressable onPress={() => pickCategory(null)} style={styles.pickerRow}>
              <Text style={{ fontWeight: "900", color: colors.text }}>Ei kategoriaa</Text>
            </Pressable>

            <View style={{ height: 1, backgroundColor: colors.secondaryText, marginVertical: 12, opacity: 0.3 }} />

            {/* Lisää uusi kategoria -kohta */}
            {!addingCategory ? (
              <Pressable onPress={() => setAddingCategory(true)} style={styles.pickerRow}>
                <Text style={{ fontWeight: "900", color: colors.accent }}>
                  + Lisää uusi kategoria
                </Text>
              </Pressable>
            ) : (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Uuden kategorian nimi"
                  placeholderTextColor={colors.secondaryText}
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                />
                <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
                  <Pressable onPress={() => setAddingCategory(false)} style={styles.modalButton}>
                    <Text style={{ color: colors.text }}>Peruuta</Text>
                  </Pressable>
                  <Pressable onPress={createNewCategory} style={styles.modalButton}>
                    <Text style={{ fontWeight: "900", color: colors.text }}>Lisää</Text>
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
              placeholderTextColor={colors.secondaryText}
              value={editName}
              onChangeText={setEditName}
            />

            {/* Editissäkin käytetään samaa dropdownia */}
            <Pressable onPress={openPickerForEdit} style={styles.categorySelectWide}>
              <Text style={{ color: colors.secondaryText }}>Kategoria</Text>
              <Text style={{ fontWeight: "900", color: colors.text }} numberOfLines={1}>
                {editCategoryName}
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.secondaryText} />
            </Pressable>

            <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
              <Pressable onPress={() => setEditVisible(false)} style={styles.modalButton}>
                <Text style={{ color: colors.text }}>Peruuta</Text>
              </Pressable>
              <Pressable onPress={saveEdit} style={styles.modalButton}>
                <Text style={{ fontWeight: "900", color: colors.text }}>Tallenna</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const createStyles = (colors: { background: string; text: string; secondaryText: string; accent: string }) =>
  StyleSheet.create({
    container: { padding: 20, flex: 1, backgroundColor: colors.background },

    topRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 14
    },

    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.secondaryText,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 10,
    },

    backText: {
      fontSize: 26,
      color: colors.text,
      marginTop: -2
    },

    headerTitle: { fontSize: 18, fontWeight: "900", flex: 1, color: colors.text },

    addRow: {
      flexDirection: "row",
      alignItems: "center", gap: 8,
      marginBottom: 12
    },

    input: {
      borderWidth: 1,
      borderColor: colors.secondaryText,
      padding: 10,
      borderRadius: 10,
      marginBottom: 10,
      backgroundColor: colors.background,
      height: 44,
      color: colors.text,
    },

    addBtn: {
      backgroundColor: colors.accent,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 10,
      borderRadius: 10,
      width: 62,
      flexShrink: 0,
    },
    addBtnText: { color: "white", fontWeight: "900" },

    sectionHeaderRow: {
      paddingTop: 10,
      paddingBottom: 6,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    qtyWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: colors.secondaryText,
      borderRadius: 8,
    },

    qtyBtn: {
      fontSize: 18,
      fontWeight: "900",
      color: colors.text,
    },

    qtyText: {
      width: 18,
      textAlign: "center",
      fontWeight: "900",
      color: colors.text,
    },

    categoryPill: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      paddingHorizontal: 10,
      height: 44,
      borderWidth: 1,
      borderColor: colors.secondaryText,
      borderRadius: 10,
      backgroundColor: colors.background,
      width: 120, // lukittu leveys
      flexShrink: 0, // ei kutistu liian koskaan sisällön takia
    },

    categoryPillText: {
      fontSize: 14,
      fontWeight: "900",
      color: colors.text,
      flexShrink: 1,
    },

    categorySelectWide: {
      borderWidth: 1,
      borderColor: colors.secondaryText,
      borderRadius: 10,
      padding: 10,
      backgroundColor: colors.background,
      marginBottom: 10,
      gap: 2,
    },

    sectionTitle: { fontSize: 14, fontWeight: "900", color: colors.secondaryText },

    itemRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, gap: 10 },
    dragActive: {
      transform: [{ scale: 1.02 }],
      elevation: 3,
      shadowOpacity: 0.12,
      shadowRadius: 6
    },
    checkbox: { padding: 4 },
    itemText: {
      fontSize: 16, fontWeight: "800", color: colors.text },
    itemDone: { textDecorationLine: "line-through", color: colors.secondaryText },

    iconButton: { padding: 6, borderRadius: 10 },

    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.3)",
      justifyContent: "center",
      alignItems: "center",
    },
    modalContent: { backgroundColor: colors.background, padding: 24, borderRadius: 10, width: "85%", borderWidth: 1, borderColor: colors.secondaryText },
    modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 12, textAlign: "center", color: colors.text },
    modalButton: { marginLeft: 16, marginTop: 12 },

    pickerRow: { paddingVertical: 10 },
  })
