import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useTheme, type ThemeColors } from "../src/viewmodels/ThemeContext";

export default function AboutScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <Text style={styles.headerTitle}>TIETOJA SOVELLUKSESTA</Text>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.appName}>Kauppalappu</Text>
          <Text style={styles.version}>Versio 1.0.0</Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Kuvaus</Text>
            <Text style={styles.text}>
              Kauppalappu on helppokäyttöinen ostoslistasovellus, joka auttaa sinua 
              organisoimaan ostoksesi ja säästämään aikaa kaupassa.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ominaisuudet</Text>
            <Text style={styles.text}>• Luo ja hallitse useita ostoslistoja</Text>
            <Text style={styles.text}>• Järjestä ostokset kauppojen mukaan</Text>
            <Text style={styles.text}>• Lisää tuotteita nopeasti</Text>
            <Text style={styles.text}>• Profiilikuva ja käyttäjänimi</Text>
            <Text style={styles.text}>• Jaa listoja muille käyttäjille</Text>
            <Text style={styles.text}>• Statistiikka ostoshistoriasta</Text>
            <Text style={styles.text}>• Karttanäkymä kauppojen löytämiseen</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Kehittäjät</Text>
            <Text style={styles.text}>Mobiilikehitysprojekti Ryhmä 6</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tekniikka</Text>
            <Text style={styles.text}>• React Native + Expo</Text>
            <Text style={styles.text}>• Firebase (Auth & Firestore)</Text>
            <Text style={styles.text}>• React Native Maps</Text>
            <Text style={styles.text}>• TypeScript</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Lähdekoodi</Text>
            <Text style={styles.text}>
              Sovelluksen lähdekoodi on saatavilla GitHubissa.
            </Text>
            <Pressable 
              style={styles.linkButton} 
              onPress={() => Linking.openURL('https://github.com/Mobiilikehitysprojekti-group6/Mobiiliprojekti')}
            >
              <Text style={styles.linkButtonText}>Avaa GitHub →</Text>
            </Pressable>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Lisenssit</Text>
            <Text style={styles.text}>
              Sovellus käyttää seuraavia avoimen lähdekoodin kirjastoja:
            </Text>
            <Text style={styles.text}>• React Native (MIT License)</Text>
            <Text style={styles.text}>• Expo (MIT License)</Text>
            <Text style={styles.text}>• Firebase (Apache 2.0)</Text>
            <Text style={styles.text}>• React Native Maps (MIT License)</Text>
            <Text style={styles.text}>• expo-image-picker (MIT License)</Text>
            <Text style={styles.text}>• react-native-chart-kit (MIT) — piirakkadiagrammi</Text>
            <Text style={styles.text}>• react-native-draggable-flatlist (MIT) — drag & drop</Text>
            <Text style={styles.text}>• @react-native-async-storage/async-storage (MIT) — välimuist</Text>
            <Text style={styles.text}>• expo-clipboard (MIT) — kopiointitoiminto</Text>
            <Text style={styles.text}>• TypeScript (Apache 2.0)</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tietosuoja</Text>
            <Text style={styles.text}>
              Sovellus tallentaa tietoja laitteellesi, jotta voit käyttää sovellusta:
            </Text>
            <Text style={styles.text}>• Käyttäjänimen</Text>
            <Text style={styles.text}>• Profiilikuvan</Text>
            <Text style={styles.text}>• Ostoslistat ja tuotteet</Text>
            <Text style={styles.text}>• Kaupat</Text>
            <Text style={styles.text}>{'\n'}Tietosi pysyvät turvassa ja yksityisinä. 
            Emme kerää tai jaa henkilötietoja kolmansille osapuolille.
            </Text>
          </View>

          <Text style={styles.footer}>© 2026 Kauppalappu - JMA Company</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      flexGrow: 1,
    },
    header: {
      backgroundColor: colors.background,
      padding: 20,
      flexDirection: 'row',
      alignItems: 'center',
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    backText: {
      fontSize: 26,
      color: colors.text,
      marginTop: -2,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '900',
      color: colors.text,
      letterSpacing: 2,
      textAlign: 'center',
      flex: 1,
    },
    content: {
      padding: 20,
    },
    appName: {
      fontSize: 32,
      fontWeight: 'bold',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 5,
    },
    version: {
      fontSize: 16,
      color: colors.secondaryText,
      textAlign: 'center',
      marginBottom: 30,
    },
    section: {
      marginBottom: 25,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 10,
    },
    text: {
      fontSize: 16,
      color: colors.secondaryText,
      lineHeight: 24,
      marginBottom: 5,
    },
    linkButton: {
      backgroundColor: colors.accent,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 8,
      marginTop: 10,
      alignSelf: 'flex-start',
    },
    linkButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
    },
    footer: {
      textAlign: 'center',
      color: colors.secondaryText,
      fontSize: 14,
      marginTop: 20,
      marginBottom: 40,
    },
  });
