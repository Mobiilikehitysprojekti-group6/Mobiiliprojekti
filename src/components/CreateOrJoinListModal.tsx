import React, { useMemo, useState } from "react"
import { View, Text, TextInput, Pressable, Modal, StyleSheet, FlatList, ActivityIndicator } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useTheme, type ThemeColors } from "../viewmodels/ThemeContext"
import type { Store } from "../viewmodels/ShopVMContext"

type Step = "menu" | "create" | "pickStore" | "join"

type Props = {
  visible: boolean
  onClose: () => void

  // create
  stores: Store[]
  selectedStoreId: string | null
  setSelectedStoreId: (v: string | null) => void
  newListName: string
  setNewListName: (v: string) => void
  newStoreName: string
  setNewStoreName: (v: string) => void
  onCreateStore: () => Promise<void> | void
  onCreateList: () => Promise<void> | void

  // join
  joinCode: string
  setJoinCode: (v: string) => void
  onJoinByCode: () => Promise<void> | void

  loading?: boolean
  getStoreLabel: (storeId: string | null) => string | undefined
}

export default function CreateOrJoinListModal(props: Props) {
  const { colors } = useTheme()
  const styles = createStyles(colors)

  const [step, setStep] = useState<Step>("menu")

  const selectedStoreLabel = useMemo(
    () => props.getStoreLabel(props.selectedStoreId) ?? "Ei kauppaa",
    [props.selectedStoreId, props.getStoreLabel]
  )

  const closeAll = () => {
    setStep("menu")
    props.onClose()
  }

  return (
    <Modal visible={props.visible} transparent animationType="fade" presentationStyle="overFullScreen" onRequestClose={closeAll}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.titleRow}>
            <View style={{ width: 32 }}>
              {step !== "menu" ? (
                <Pressable onPress={() => setStep("menu")} hitSlop={10} style={styles.backMiniBtn}>
                  <Ionicons name="chevron-back" size={18} color={colors.text} />
                </Pressable>
              ) : null}
            </View>

            <Text style={styles.modalTitle}>
              {step === "menu" ? "Uusi tai jaettu lista" : step === "create" ? "Luo lista" : step === "pickStore" ? "Valitse kauppa" : "Liity listaan"}
            </Text>

            <Pressable onPress={closeAll} hitSlop={10} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.text} />
            </Pressable>
          </View>

          {/* MENU */}
          {step === "menu" && (
            <>
              <Pressable onPress={() => setStep("create")} style={styles.bigAction}>
                <Text style={styles.bigActionText}> Luo uusi lista</Text>
              </Pressable>

              <Pressable onPress={() => setStep("join")} style={[styles.bigAction, { backgroundColor: colors.surface }]}>
                <Text style={[styles.bigActionText, { color: colors.text }]}>Liity koodilla</Text>
              </Pressable>

              <Pressable onPress={closeAll} style={styles.footerBtn}>
                <Text style={styles.footerBtnText}>Sulje</Text>
              </Pressable>
            </>
          )}

          {/* CREATE */}
          {step === "create" && (
            <>
              <TextInput
                style={styles.input}
                placeholder="Listan nimi"
                placeholderTextColor={colors.mutedText}
                value={props.newListName}
                onChangeText={props.setNewListName}
              />

              <Pressable onPress={() => setStep("pickStore")} style={styles.storePicker}>
                <Text style={{ fontWeight: "700", color: colors.text }}>Kauppa:</Text>
                <Text style={{ marginLeft: 8, flex: 1, color: colors.text }} numberOfLines={1}>
                  {selectedStoreLabel}
                </Text>
                <Text style={{ color: colors.accent, fontWeight: "900" }}>Vaihda</Text>
              </Pressable>

              <Pressable
                onPress={props.onCreateList}
                style={[styles.primaryBtn, (!props.newListName.trim() || props.loading) && { opacity: 0.5 }]}
                disabled={!props.newListName.trim() || !!props.loading}
              >
                {props.loading ? <ActivityIndicator /> : <Text style={styles.primaryBtnText}>Luo</Text>}
              </Pressable>

              <Pressable onPress={closeAll} style={styles.footerBtn}>
                <Text style={styles.footerBtnText}>Sulje</Text>
              </Pressable>
            </>
          )}

          {/* PICK STORE */}
          {step === "pickStore" && (
            <>
              {/* Ei kauppaa */}
              <Pressable
                style={styles.storeRow}
                onPress={() => {
                  props.setSelectedStoreId(null)
                  setStep("create")
                }}
              >
                <Text style={{ fontWeight: "900", color: colors.text, flex: 1 }}>Ei kauppaa</Text>
                {props.selectedStoreId === null ? <Ionicons name="checkmark" size={18} color={colors.accent} /> : null}
              </Pressable>

              <FlatList
                data={props.stores}
                keyExtractor={(s) => s.id}
                style={{ maxHeight: 220, marginTop: 10 }}
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.storeRow}
                    onPress={() => {
                      props.setSelectedStoreId(item.id)
                      setStep("create")
                    }}
                  >
                    <Text style={{ fontWeight: "700", color: colors.text, flex: 1 }}>
                      {item.name} {item.branch ?? ""}
                    </Text>
                    {props.selectedStoreId === item.id ? <Ionicons name="checkmark" size={18} color={colors.accent} /> : null}
                  </Pressable>
                )}
                ListEmptyComponent={<Text style={{ color: colors.secondaryText }}>Ei vielä kauppoja.</Text>}
              />

              <View style={{ height: 1, backgroundColor: colors.divider, marginVertical: 12, opacity: 0.6 }} />

              <Text style={{ fontWeight: "700", marginBottom: 6, color: colors.text }}>Lisää uusi kauppa</Text>
              <TextInput
                style={styles.input}
                placeholder="Kaupan nimi"
                placeholderTextColor={colors.mutedText}
                value={props.newStoreName}
                onChangeText={props.setNewStoreName}
              />

              <Pressable
                onPress={props.onCreateStore}
                style={[styles.secondaryActionBtn, !props.newStoreName.trim() && { opacity: 0.5 }]}
                disabled={!props.newStoreName.trim()}
              >
                <Text style={styles.secondaryActionText}>Lisää kauppa</Text>
              </Pressable>
            </>
          )}

          {/* JOIN */}
          {step === "join" && (
            <>
              <Text style={styles.helpText}>Syötä kutsukoodi ja liity listaan.</Text>

              <TextInput
                style={styles.input}
                placeholder="Koodi (esim. A1B2C3)"
                placeholderTextColor={colors.mutedText}
                value={props.joinCode}
                onChangeText={props.setJoinCode}
                autoCapitalize="characters"
              />

              <Pressable
                onPress={props.onJoinByCode}
                style={[styles.primaryBtn, (!props.joinCode.trim() || props.loading) && { opacity: 0.5 }]}
                disabled={!props.joinCode.trim() || !!props.loading}
              >
                {props.loading ? <ActivityIndicator /> : <Text style={styles.primaryBtnText}>Liity</Text>}
              </Pressable>

              <Pressable onPress={closeAll} style={styles.footerBtn}>
                <Text style={styles.footerBtnText}>Sulje</Text>
              </Pressable>
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
      marginBottom: 12,
    },
    modalTitle: { fontSize: 16, fontWeight: "900", color: colors.text, flex: 1, textAlign: "center" },
    closeBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
    backMiniBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },

    bigAction: {
      height: 46,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 10,
    },
    bigActionText: { fontWeight: "900", color: "white" },

    helpText: { color: colors.secondaryText, marginBottom: 10, lineHeight: 18 },

    input: {
      borderWidth: 1,
      borderColor: colors.border,
      padding: 10,
      borderRadius: 10,
      marginBottom: 10,
      color: colors.text,
      backgroundColor: colors.elevated,
    },

    storePicker: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 12,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 10,
      backgroundColor: colors.elevated,
    },

    storeRow: {
      padding: 12,
      borderRadius: 10,
      backgroundColor: colors.surface,
      marginVertical: 6,
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },

    primaryBtn: {
      height: 44,
      borderRadius: 10,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 10,
    },
    primaryBtnText: { color: "white", fontWeight: "900" },

    secondaryActionBtn: {
      height: 44,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.elevated,
      alignItems: "center",
      justifyContent: "center",
    },
    secondaryActionText: { fontWeight: "900", color: colors.text },

    footerBtn: { paddingVertical: 10, alignItems: "center", marginTop: 6 },
    footerBtnText: { color: colors.text, fontWeight: "800" },
  })
