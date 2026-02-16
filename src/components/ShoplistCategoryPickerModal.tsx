import React, { useMemo } from "react"
import { View, Text, TextInput, Pressable, Modal, StyleSheet, ScrollView } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import type { Category } from "../viewmodels/ShopVMContext"
import { useTheme, type ThemeColors } from "../viewmodels/ThemeContext"

type Props = {
  visible: boolean
  onClose: () => void

  // data
  categories: Category[]

  // actions
  onPickCategory: (id: string | null) => void
  onCreateNewCategory: () => void

  // lisää uusi- state
  addingCategory: boolean
  setAddingCategory: (v: boolean) => void
  newCategoryName: string
  setNewCategoryName: (v: string) => void
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
}: Props) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

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
          <View style={styles.headerRow}>
            <Text style={styles.modalTitle}>Valitse kategoria</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>

          {/* Scrollattava lista kategorioille */}
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {categories.map((c) => (
              <Pressable key={c.id} onPress={() => onPickCategory(c.id)} style={styles.pickerRow}>
                <Text style={styles.categoryText}>{c.name}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Ei kategoriaa */}
          <Pressable onPress={() => onPickCategory(null)} style={styles.pickerRow}>
            <Text style={styles.noCategoryText}>Ei kategoriaa</Text>
          </Pressable>

          <View style={[styles.divider, { backgroundColor: colors.divider }]} />

          {/* Lisää uusi kategoria */}
          {!addingCategory ? (
            <Pressable onPress={() => setAddingCategory(true)} style={styles.pickerRow}>
              <Text style={styles.addNewText}>+ Lisää uusi kategoria</Text>
            </Pressable>
          ) : (
            <>
              <TextInput
                style={styles.input}
                placeholder="Uuden kategorian nimi"
                placeholderTextColor={colors.mutedText}
                value={newCategoryName}
                onChangeText={setNewCategoryName}
              />
              <View style={styles.buttonRow}>
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

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.3)",
      justifyContent: "center",
      alignItems: "center",
      padding: 16,
    },

    modalContent: {
      backgroundColor: colors.surface,
      padding: 24,
      borderRadius: 10,
      width: "85%",
      maxHeight: "80%",
      borderWidth: 1,
      borderColor: colors.border,
    },

    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    modalTitle: {
      fontSize: 18,
      fontWeight: "bold",
      marginBottom: 12,
      textAlign: "center",
      color: colors.text,
      flex: 1,
    },

    // Scroll-alue vain kategorioille
    scrollArea: {
      maxHeight: 260, // tästä säädetään korkeus
      marginBottom: 4,
    },

    scrollContent: {
      paddingBottom: 4,
    },

    pickerRow: {
      paddingVertical: 10,
    },

    categoryText: {
      fontWeight: "700",
      color: colors.text,
    },

    noCategoryText: {
      fontWeight: "900",
      color: colors.text,
    },

    addNewText: {
      fontWeight: "900",
      color: colors.accent,
    },

    divider: {
      height: 1,
      marginVertical: 12,
      opacity: 0.6,
    },

    input: {
      borderWidth: 1,
      borderColor: colors.border,
      padding: 10,
      borderRadius: 8,
      marginBottom: 10,
      color: colors.text,
      backgroundColor: colors.elevated,
    },

    buttonRow: { flexDirection: "row", justifyContent: "flex-end" },

    modalButton: { marginLeft: 16, marginTop: 12 },
  })
