import React, { useEffect, useMemo, useRef, useState } from "react"
import { View, Text, TextInput, StyleSheet, Pressable, Alert, useWindowDimensions } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useLocalSearchParams, useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { NestableScrollContainer, NestableDraggableFlatList } from "react-native-draggable-flatlist"

import { useShopVM, ListItem, Category } from "../src/viewmodels/ShopVMContext"
import { useTheme, type ThemeColors } from "../src/viewmodels/ThemeContext"
import EditItemModal from "../src/components/ShoplistEditItemModal"
import CategoryPickerModal from "../src/components/ShoplistCategoryPickerModal"
import InviteCodeModal from "../src/components/InviteCodeModal"

export default function ShopListScreen() {
  const { colors } = useTheme()
  const router = useRouter()
  const { listId } = useLocalSearchParams<{ listId: string }>()
  const { width } = useWindowDimensions()

  const addWidth = Math.max(60, Math.min(78, Math.round(width * 0.13)))
  const catWidth = Math.max(115, Math.min(180, Math.round(width * 0.28)))

  const blockRowDragRef = useRef(false)

  const {
    uid,
    lists,
    categoriesByListId,
    itemsByListId,
    subscribeCategoriesForList,
    createCategoryForList,
    subscribeItems,
    addItem,
    updateItem,
    deleteItem,
    reorderCategoriesForList,
    reorderItemsInCategory,
    changeQuantity,
    createInviteCodeForList,
    getStoreLabel,
  } = useShopVM()

  const styles = createStyles(colors)

  const list = useMemo(() => lists.find((l) => l.id === String(listId)), [lists, listId])

  const title = useMemo(() => {
    if (!list) return ""
    const storeName = getStoreLabel(list.storeId)
    return storeName ? `${list.name} • ${storeName}` : list.name
  }, [list, getStoreLabel])

  const categories: Category[] = categoriesByListId[String(listId)] ?? []
  const items: ListItem[] = itemsByListId[String(listId)] ?? []

  // UI state
  const [newItemName, setNewItemName] = useState("")
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null | undefined>(undefined)

  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerMode, setPickerMode] = useState<"new" | "edit">("new")
  const [addingCategory, setAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")

  const [editVisible, setEditVisible] = useState(false)
  const [editItem, setEditItem] = useState<ListItem | null>(null)
  const [editName, setEditName] = useState("")
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null)

  // Share modal state
  const [shareOpen, setShareOpen] = useState(false)
  const [shareCode, setShareCode] = useState<string | null>(null)
  const [shareLoading, setShareLoading] = useState(false)

  useEffect(() => {
    if (!uid || !list) return
    const unsubItems = subscribeItems(list.id)
    const unsubCats = subscribeCategoriesForList(list.id)
    return () => {
      unsubItems()
      unsubCats()
    }
  }, [uid, list?.id])

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

  const selectedCategoryLabel = useMemo(() => {
    if (selectedCategoryId === undefined) return "Kategoria"
    if (selectedCategoryId === null) return "Ei kategoriaa"
    return categories.find((c) => c.id === selectedCategoryId)?.name ?? "Kategoria"
  }, [selectedCategoryId, categories])

  const editCategoryName = useMemo(() => {
    if (!editCategoryId) return "Ei kategoriaa"
    return categories.find((c) => c.id === editCategoryId)?.name ?? "Ei kategoriaa"
  }, [editCategoryId, categories])

  type CategoryBlock = { id: string | null; name: string; order: number; items: ListItem[] }

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
      catBlocks.push({ id: null, name: "Ei kategoriaa", order: 999999, items: noCatItems })
    }

    return catBlocks
  }, [items, categories])

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

    await updateItem(list.id, editItem.id, { name: n, categoryId: editCategoryId ?? null })
    setEditVisible(false)
    setEditItem(null)
  }

  const createNewCategory = async () => {
    const n = newCategoryName.trim()
    if (!n) return
    await createCategoryForList(list.id, n)
    setNewCategoryName("")
    setAddingCategory(false)
  }

  const openShareModal = () => {
    setShareOpen(true)
  }

  const generateShareCode = async () => {
    try {
      setShareLoading(true)
      const code = await createInviteCodeForList(list.id)
      if (!code) {
        Alert.alert("Virhe", "Kutsukoodin luominen epäonnistui.")
        return
      }
      setShareCode(code)
    } catch {
      Alert.alert("Virhe", "Kutsukoodin luominen epäonnistui.")
    } finally {
      setShareLoading(false)
    }
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

        <Pressable
          onPress={openShareModal}
          style={{
            marginLeft: 10,
            paddingHorizontal: 12,
            height: 36,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontWeight: "900", color: colors.text }}>Jaa</Text>
        </Pressable>
      </View>

      {/* Add row */}
      <View style={styles.addRow}>
        <TextInput
          style={[styles.input, { flex: 1, marginBottom: 0, minWidth: 0, fontWeight: "700" }]}
          placeholder="Tuote"
          placeholderTextColor={colors.mutedText}
          value={newItemName}
          onChangeText={setNewItemName}
        />

        <Pressable onPress={openPickerForNew} style={[styles.categoryPill, { width: catWidth }]}>
          <Text
            style={[
              styles.categoryPillText,
              selectedCategoryId == null && { color: colors.secondaryText, fontWeight: "700" },
              selectedCategoryId === undefined && { color: colors.secondaryText, fontWeight: "700" },
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

      <NestableScrollContainer style={{ flex: 1 }} nestedScrollEnabled contentContainerStyle={{ paddingBottom: 24 }}>
        <NestableDraggableFlatList
          activationDistance={24}
          data={blocks}
          keyExtractor={(b) => String(b.id ?? "__none__")}
          scrollEnabled={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ paddingBottom: 12 }}
          disableVirtualization
          removeClippedSubviews={false}
          onDragEnd={async ({ data }) => {
            const nextCatIds = data.filter((b) => b.id !== null).map((b) => b.id as string)
            await reorderCategoriesForList(list.id, nextCatIds)
          }}
          renderItem={({ item: block, drag, isActive }) => (
            <View style={{ paddingTop: 10 }}>
              {/* Category header */}
              <Pressable
                style={styles.sectionHeaderRow}
                onLongPress={block.id !== null ? drag : undefined}
                delayLongPress={150}
                disabled={isActive || block.id === null}
              >
                <Text style={styles.sectionTitle}>{block.name}</Text>
              </Pressable>

              {/* Items */}
              <NestableDraggableFlatList
                activationDistance={24}
                data={block.items}
                keyExtractor={(it) => it.id}
                scrollEnabled={false}
                style={{ flexGrow: 0 }}
                disableVirtualization
                removeClippedSubviews={false}
                onDragEnd={async ({ data }) => {
                  const nextItemIds = data.map((it) => it.id)
                  await reorderItemsInCategory(list.id, block.id, nextItemIds)
                }}
                renderItem={({ item, drag: dragItem, isActive: itemActive }) => (
                  <View style={[styles.itemRow, itemActive && styles.dragActive]}>
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

      {/* Category picker */}
      <CategoryPickerModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        categories={categories}
        onPickCategory={pickCategory}
        onCreateNewCategory={createNewCategory}
        addingCategory={addingCategory}
        setAddingCategory={setAddingCategory}
        newCategoryName={newCategoryName}
        setNewCategoryName={setNewCategoryName}
      />

      {/* Edit item */}
      <EditItemModal
        visible={editVisible}
        onClose={() => setEditVisible(false)}
        onSave={saveEdit}
        editName={editName}
        setEditName={setEditName}
        editCategoryName={editCategoryName}
        onOpenCategoryPicker={openPickerForEdit}
        colors={colors}
        styles={styles}
      />

      {/* Share modal */}
      <InviteCodeModal
        visible={shareOpen}
        onClose={() => setShareOpen(false)}
        code={shareCode}
        loading={shareLoading}
        onGenerate={generateShareCode}
      />
    </SafeAreaView>
  )
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { padding: 20, flex: 1, backgroundColor: colors.background },

    topRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },

    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 10,
    },

    backText: { fontSize: 26, color: colors.text, marginTop: -2 },

    headerTitle: { fontSize: 18, fontWeight: "900", flex: 1, color: colors.text },

    addRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },

    input: {
      borderWidth: 1,
      borderColor: colors.border,
      padding: 10,
      borderRadius: 10,
      marginBottom: 10,
      backgroundColor: colors.elevated,
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
      borderColor: colors.border,
      borderRadius: 10,
      backgroundColor: colors.elevated,
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
      borderColor: colors.border,
      borderRadius: 8,
    },

    qtyBtn: { fontSize: 18, fontWeight: "900", color: colors.text },

    qtyText: { width: 18, textAlign: "center", fontWeight: "900", color: colors.text },

    iconButton: { padding: 6, borderRadius: 10 },
  })
