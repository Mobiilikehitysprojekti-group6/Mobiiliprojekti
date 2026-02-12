import React from "react"
import { View, Text, TextInput, Pressable, Modal } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import type { ThemeColors } from "../viewmodels/ThemeContext"

type Props = {
  visible: boolean
  onClose: () => void
  onSave: () => void

  editName: string
  setEditName: (v: string) => void

  editCategoryName: string
  onOpenCategoryPicker: () => void

  colors: ThemeColors
  styles: any
}

export default function EditItemModal({
  visible,
  onClose,
  onSave,
  editName,
  setEditName,
  editCategoryName,
  onOpenCategoryPicker,
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
          <Text style={styles.modalTitle}>Muokkaa tuotetta</Text>

          <TextInput
            style={styles.input}
            placeholder="Tuote"
            placeholderTextColor={colors.mutedText}
            value={editName}
            onChangeText={setEditName}
          />

          {/* Editissä käytetään samaa kategoriapickeriä */}
          <Pressable onPress={onOpenCategoryPicker} style={styles.categorySelectWide}>
            <Text style={{ color: colors.secondaryText }}>Kategoria</Text>
            <Text style={{ fontWeight: "900", color: colors.text }} numberOfLines={1}>
              {editCategoryName}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.secondaryText} />
          </Pressable>

          <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
            <Pressable onPress={onClose} style={styles.modalButton}>
              <Text style={{ color: colors.text }}>Peruuta</Text>
            </Pressable>
            <Pressable onPress={onSave} style={styles.modalButton}>
              <Text style={{ fontWeight: "900", color: colors.text }}>Tallenna</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}
