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
import {
  NestableScrollContainer,
  NestableDraggableFlatList,
} from "react-native-draggable-flatlist"

import { useShopVM, ListItem, Category } from "../src/viewmodels/ShopVMContext"
import { useTheme } from "../src/viewmodels/ThemeContext"

/**
 * ScopeKey kertoo mistä kategoriat haetaan:
 * - jos listalla on kauppa (storeId) => store:<storeId>  (kaupan kategoriat)
 * - jos listalla ei ole kauppaa       => list:<listId>    (listakohtaiset kategoriat)
 */
const scopeKey = (storeId: string | null, listId: string) =>
  storeId ? `store:${storeId}` : `list:${listId}`

export default function ShopListScreen() {
  const { colors } = useTheme()
  const router = useRouter()
  const { listId } = useLocalSearchParams<{ listId: string }>()
  const { width } = useWindowDimensions()

  // Nappien leveydet suhteessa näytön leveyteen (max/min rajoilla)
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

  // Listan perustiedot
  const list = useMemo(
    () => lists.find((l) => l.id === String(listId)),
    [lists, listId]
  )

  const storeName = useMemo(
    () => getStoreName(list?.storeId ?? null),
    [list?.storeId, getStoreName]
  )

  const listKey = String(listId ?? "")

  const catKey = useMemo(() => (list ? scopeKey(list.storeId, list.id) : ""), [list])

  const categories: Category[] = categoriesByScope[catKey] ?? []
  const items: ListItem[] = itemsByListId[listKey] ?? []

  /* Itemin lisäys UI-state */
  const [newItemName, setNewItemName] = useState("")
  const [selectedCategoryId, setSelectedCategoryId] = useState<
    string | null | undefined
  >(undefined)

  /* Kategoria dropdown */
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerMode, setPickerMode] = useState<"new" | "edit">("new")
  const [addingCategory, setAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")

  /* Edit modal */
  const [editVisible, setEditVisible] = useState(false)
  const [editItem, setEditItem] = useState<ListItem | null>(null)
  const [editName, setEditName] = useState("")
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null)

  // Firestore-kuuntelut
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

  const selectedCategoryLabel = useMemo(() => {
    if (selectedCategoryId === undefined) return "Kategoria"
    if (selectedCategoryId === null) return "Ei kategoriaa"
    return categories.find((c) => c.id === selectedCategoryId)?.name ?? "Kategoria"
  }, [selectedCategoryId, categories])

  const editCategoryName = useMemo(() => {
    if (!editCategoryId) return "Ei kategoriaa"
    return categories.find((c) => c.id === editCategoryId)?.name ?? "Ei kategoriaa"
  }, [editCategoryId, categories])

  type CategoryBlock = {
    id: string | null
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

    const catBlocks: CategoryBlock[] = categories
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((c) => ({
        id: c.id,
        name: c.name,
        order: c.order,
        items: (byCat.get(c.id) ?? []).slice().sort((a, b) => a.order - b.order),
      }))
      .filter((b) => b.items.length > 0)

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

  // Dropdown open
  const openPickerForNew = () => {
    setPickerMode("new")
    setAddingCategory(false)
    setNewCategoryName("")
    setPickerOpen(true)
  }

  const openPickerForEdit = () => {
    setPickerMode("edit")
    setAddingCategory(false)
    setNewCategoryName("")
    setPickerOpen(true)
  }

  const pickCategory = (id: string | null) => {
    if (pickerMode === "new") setSelectedCategoryId(id)
    else setEditCategoryId(id)
    setPickerOpen(false)
  }

  const handleAdd = async () => {
    const n = newItemName.trim()
    if (!n) return
    await addItem(list.id, n, selectedCategoryId ?? null)
    setNewItemName("")
  }

  const toggleDone = async (it: ListItem) => {
    await updateItem(list.id, it.id, { done: !it.done })
  }

  const remove = async (it: ListItem) => {
    await deleteItem(list.id, it.id)
  }

  const openEdit = (it: ListItem) => {
    setEditItem(it)
    setEditName(it.name)
    setEditCategoryId(it.categoryId ?? null)
    setEditVisible(true)
  }

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

  const createNewCategory = async () => {
    const n = newCategoryName.trim()
    if (!n) return

    await createCategoryForList(list.id, list.storeId, n)
    setNewCategoryName("")
    setAddingCategory(false)
  }

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
          style={[styles.input, { flex: 1, marginBottom: 0, minWidth: 0, fontWeight: "700" }]}
          placeholder="Tuote"
          placeholderTextColor={colors.secondaryText}
          value={newItemName}
          onChangeText={setNewItemName}
        />

        <Pressable onPress={openPickerForNew} style={[styles.categoryPill, { width: catWidth }]}>
          <Text
            style={[
              styles.categoryPillText,
              !selectedCategoryId && { color: colors.secondaryText, fontWeight: "700" },
            ]}
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

      {/* ✅ Scroll + drag: NestableScrollContainer scrollaa, listat kasvavat sisällön mukaan */}
      <NestableScrollContainer
        style={{ flex: 1 }}
        nestedScrollEnabled
        contentContainerStyle={{ paddingBottom: 24 }} // ✅ EI flexGrow
      >
        <NestableDraggableFlatList
          activationDistance={24}
          data={blocks}
          keyExtractor={(b) => String(b.id ?? "__none__")}
          scrollEnabled={false} // ✅ ulompi EI scrollaa
          style={{ flexGrow: 0 }} // ✅ tärkein: listan korkeus = sisältö
          contentContainerStyle={{ paddingBottom: 12 }}
          disableVirtualization
          removeClippedSubviews={false}
          onDragEnd={async ({ data }) => {
            const nextCatIds = data.filter((b) => b.id !== null).map((b) => b.id as string)
            await reorderCategoriesForList(list.id, list.storeId, nextCatIds)
          }}
          renderItem={({ item: block, drag, isActive }) => (
            <View style={{ paddingTop: 10 }}>
              {/* Kategoria-otsikko */}
              <Pressable
                style={styles.sectionHeaderRow}
                onLongPress={block.id !== null ? drag : undefined}
                delayLongPress={150}
                disabled={isActive || block.id === null}
              >
                <Text style={styles.sectionTitle}>{block.name}</Text>
              </Pressable>

              {/* Tuotteet kategoriassa */}
              <NestableDraggableFlatList
                activationDistance={24}
                data={block.items}
                keyExtractor={(it) => it.id}
                scrollEnabled={false} // ✅ sisempi EI scrollaa
                style={{ flexGrow: 0 }} // ✅ tärkeä myös täällä
                disableVirtualization
                removeClippedSubviews={false}
                onDragEnd={async ({ data }) => {
                  const nextItemIds = data.map((it) => it.id)
                  await reorderItemsInCategory(list.id, block.id, nextItemIds)
                }}
                ListEmptyComponent={
                  <Text style={{ color: colors.secondaryText, marginBottom: 6 }}>(Ei tuotteita)</Text>
                }
                renderItem={({ item, drag: dragItem, isActive: itemActive }) => (
                  <View style={[styles.itemRow, itemActive && styles.dragActive]}>
                    {/* Checkbox: tap = toggle, long press = drag */}
                    <Pressable
                      onPress={() => toggleDone(item)}
                      onLongPress={() => {
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

                    {/* Quantity stepper: estää dragin */}
                    <View style={styles.qtyWrap}>
                      <Pressable
                        onPressIn={() => (blockRowDragRef.current = true)}
                        onPressOut={() => (blockRowDragRef.current = false)}
                        onPress={() => changeQuantity(list.id, item.id, -1)}
                        hitSlop={10}
                      >
                        <Text style={styles.qtyBtn}>−</Text>
                      </Pressable>

                      <Text style={styles.qtyText}>{item.quantity ?? 1}</Text>

                      <Pressable
                        onPressIn={() => (blockRowDragRef.current = true)}
                        onPressOut={() => (blockRowDragRef.current = false)}
                        onPress={() => changeQuantity(list.id, item.id, +1)}
                        hitSlop={10}
                      >
                        <Text style={styles.qtyBtn}>+</Text>
                      </Pressable>
                    </View>

                    {/* Roskakori: estää dragin */}
                    <Pressable
                      onPressIn={() => (blockRowDragRef.current = true)}
                      onPressOut={() => (blockRowDragRef.current = false)}
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
              <Text style={{ marginTop: 16, color: colors.secondaryText }}>Lisää ensimmäinen tuote yllä.</Text>
            ) : (
              <View style={{ height: 12 }} />
            )
          }
        />
      </NestableScrollContainer>

      {/* Kategorian valinta modal */}
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

            {categories.map((c) => (
              <Pressable key={c.id} onPress={() => pickCategory(c.id)} style={styles.pickerRow}>
                <Text style={{ fontWeight: "700", color: colors.text }}>{c.name}</Text>
              </Pressable>
            ))}

            <Pressable onPress={() => pickCategory(null)} style={styles.pickerRow}>
              <Text style={{ fontWeight: "900", color: colors.text }}>Ei kategoriaa</Text>
            </Pressable>

            <View
              style={{
                height: 1,
                backgroundColor: colors.secondaryText,
                marginVertical: 12,
                opacity: 0.3,
              }}
            />

            {!addingCategory ? (
              <Pressable onPress={() => setAddingCategory(true)} style={styles.pickerRow}>
                <Text style={{ fontWeight: "900", color: colors.accent }}>+ Lisää uusi kategoria</Text>
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

const createStyles = (colors: {
  background: string
  text: string
  secondaryText: string
  accent: string
}) =>
  StyleSheet.create({
    container: { padding: 20, flex: 1, backgroundColor: colors.background },

    topRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },

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

    backText: { fontSize: 26, color: colors.text, marginTop: -2 },

    headerTitle: { fontSize: 18, fontWeight: "900", flex: 1, color: colors.text },

    addRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },

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
      width: 120,
      flexShrink: 0,
    },

    categoryPillText: { fontSize: 14, fontWeight: "900", color: colors.text, flexShrink: 1 },

    sectionHeaderRow: {
      paddingTop: 10,
      paddingBottom: 6,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    sectionTitle: { fontSize: 14, fontWeight: "900", color: colors.secondaryText },

    itemRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, gap: 10 },

    dragActive: {
      transform: [{ scale: 1.02 }],
      elevation: 3,
      shadowOpacity: 0.12,
      shadowRadius: 6,
    },

    checkbox: { padding: 4 },

    itemText: { fontSize: 16, fontWeight: "800", color: colors.text },

    itemDone: { textDecorationLine: "line-through", color: colors.secondaryText },

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

    qtyBtn: { fontSize: 18, fontWeight: "900", color: colors.text },

    qtyText: { width: 18, textAlign: "center", fontWeight: "900", color: colors.text },

    iconButton: { padding: 6, borderRadius: 10 },

    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.3)",
      justifyContent: "center",
      alignItems: "center",
    },

    modalContent: {
      backgroundColor: colors.background,
      padding: 24,
      borderRadius: 10,
      width: "85%",
      borderWidth: 1,
      borderColor: colors.secondaryText,
    },

    modalTitle: {
      fontSize: 18,
      fontWeight: "bold",
      marginBottom: 12,
      textAlign: "center",
      color: colors.text,
    },

    modalButton: { marginLeft: 16, marginTop: 12 },

    pickerRow: { paddingVertical: 10 },

    categorySelectWide: {
      borderWidth: 1,
      borderColor: colors.secondaryText,
      borderRadius: 10,
      padding: 10,
      backgroundColor: colors.background,
      marginBottom: 10,
      gap: 2,
    },
  })
