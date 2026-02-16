import React from "react"
import { View, Text, Pressable, Modal, StyleSheet, ActivityIndicator, Alert } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import * as Clipboard from "expo-clipboard"
import { useTheme, type ThemeColors } from "../viewmodels/ThemeContext"

type Props = {
  visible: boolean
  onClose: () => void
  code: string | null
  loading: boolean
  onGenerate: () => Promise<void> | void
}

export default function InviteCodeModal({ visible, onClose, code, loading, onGenerate }: Props) {
  const { colors } = useTheme()
  const styles = createStyles(colors)

  const copy = async () => {
    if (!code) return
    await Clipboard.setStringAsync(code)
    Alert.alert("Kopioitu leikepöydälle")
  }

  return (
    <Modal visible={visible} transparent animationType="fade" presentationStyle="overFullScreen" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.titleRow}>
            <Text style={styles.modalTitle}>Jaa lista</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>

          <Text style={styles.helpText}>
            Generoi kutsukoodi ja lähetä se toiselle. Hän voi liittyä syöttämällä koodin etusivulla.
          </Text>

          <Pressable onPress={onGenerate} style={[styles.primaryBtn, loading && { opacity: 0.6 }]} disabled={loading}>
            {loading ? <ActivityIndicator /> : <Text style={styles.primaryBtnText}>{code ? "Generoi uusi koodi" : "Generoi koodi"}</Text>}
          </Pressable>

          <View style={styles.codeBox}>
            <Text style={styles.codeLabel}>Koodi</Text>
            <Text style={styles.codeText}>{code ?? "—"}</Text>

            <Pressable onPress={copy} style={[styles.copyBtn, !code && { opacity: 0.4 }]} disabled={!code} hitSlop={10}>
              <Ionicons name="copy-outline" size={18} color={colors.text} />
              <Text style={styles.copyText}>Kopioi</Text>
            </Pressable>
          </View>

          <View style={styles.footerRow}>
            <Pressable onPress={onClose} style={styles.secondaryBtn}>
              <Text style={styles.secondaryBtnText}>Sulje</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.35)",
      justifyContent: "center",
      alignItems: "center",
      padding: 16,
    },
    modalContent: {
      width: "100%",
      maxWidth: 420,
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    modalTitle: { fontSize: 18, fontWeight: "900", color: colors.text },
    helpText: { color: colors.secondaryText, marginBottom: 12, lineHeight: 18 },

    primaryBtn: {
      height: 44,
      borderRadius: 10,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
    },
    primaryBtnText: { color: "white", fontWeight: "900" },

    codeBox: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.elevated,
      borderRadius: 10,
      padding: 12,
      gap: 6,
    },
    codeLabel: { color: colors.secondaryText, fontWeight: "800" },
    codeText: { fontSize: 22, fontWeight: "900", color: colors.text, letterSpacing: 1 },

    copyBtn: {
      marginTop: 6,
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    copyText: { fontWeight: "900", color: colors.text },

    footerRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 12 },
    secondaryBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
    secondaryBtnText: { color: colors.text, fontWeight: "800" },
  })
