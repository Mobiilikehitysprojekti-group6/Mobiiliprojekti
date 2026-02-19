import React from "react"
import { View, Text, TextInput, Pressable, Modal, StyleSheet } from "react-native"
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
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.content, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[modalStyles.title, { color: colors.text }]}>Muokkaa tuotetta</Text>

          <TextInput
            style={[styles.input]}
            placeholder="Tuote"
            placeholderTextColor={colors.mutedText}
            value={editName}
            onChangeText={setEditName}
          />

          {/* Editissä käytetään samaa kategoriapickeriä */}
          <Pressable onPress={onOpenCategoryPicker} style={[
            modalStyles.categorySelectWide,
            { borderColor: colors.border, backgroundColor: colors.elevated },
          ]}>
            <Text style={{ color: colors.secondaryText }}>Kategoria</Text>
            <Text style={{ fontWeight: "900", color: colors.text }} numberOfLines={1}>
              {editCategoryName}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.secondaryText} />
          </Pressable>

          <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
            <Pressable onPress={onClose} style={[modalStyles.button, { borderColor: colors.border, backgroundColor: colors.elevated }]}>
              <Text style={{ color: colors.text }}>Peruuta</Text>
            </Pressable>
            <Pressable onPress={onSave} style={[modalStyles.button, { borderColor: colors.border, backgroundColor: colors.elevated }]}>
              <Text style={{ fontWeight: "900", color: colors.text }}>Tallenna</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 18,
  },
  content: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 10,
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginLeft: 10,
  },
  categorySelectWide: {
    marginTop: 10,
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
})

