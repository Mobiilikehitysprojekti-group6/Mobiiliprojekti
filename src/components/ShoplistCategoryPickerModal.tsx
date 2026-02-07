import React from "react"
import { View, Text, TextInput, Pressable, Modal } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import type { Category } from "../viewmodels/ShopVMContext"

type Props = {
  visible: boolean
  onClose: () => void

  // data
  categories: Category[]

  // actions
  onPickCategory: (id: string | null) => void
  onCreateNewCategory: () => void

  // add-new state (pidetään samana kuin ennen, eli state tulee parentilta)
  addingCategory: boolean
  setAddingCategory: (v: boolean) => void
  newCategoryName: string
  setNewCategoryName: (v: string) => void

  // theme + styles parentilta, jotta ulkoasu pysyy identtisenä
  colors: { background: string; text: string; secondaryText: string; accent: string }
  styles: any
}

export default function CategoryPickerModal({
  visible,
  onClose,
  categories,
  onPickCategory,
  onCreateNewCategory,
  addingCategory,
  setAddingCategory,
  newCategoryName,
  setNewCategoryName,
  colors,
  styles,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={styles.modalTitle}>Valitse kategoria</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>

          {/* Kategoriat */}
          {categories.map((c) => (
            <Pressable key={c.id} onPress={() => onPickCategory(c.id)} style={styles.pickerRow}>
              <Text style={{ fontWeight: "700", color: colors.text }}>{c.name}</Text>
            </Pressable>
          ))}

          {/* Ei kategoriaa */}
          <Pressable onPress={() => onPickCategory(null)} style={styles.pickerRow}>
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

          {/* Lisää uusi kategoria */}
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
                <Pressable onPress={onCreateNewCategory} style={styles.modalButton}>
                  <Text style={{ fontWeight: "900", color: colors.text }}>Lisää</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  )
}
