/**
 * STATISTIIKKANÄKYMÄ
 * 
 * Tämä komponentti näyttää käyttäjän ostoshistorian tilastollisen analyysin.
 * Sisältää kaksi päävisualisointia:
 * 1. Piirakkadiagrammi - kategorioiden jakauma prosentteina
 * 2. TOP 10 lista - suosituimmat tuotteet frekvenssianalyysin perusteella
 * 
 * Käyttää useStatisticsViewModel hookia datan hakemiseen Firebasesta.
 */

import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { PieChart } from "react-native-chart-kit"; // Kuvaajien piirtämiseen
import { useStatisticsViewModel } from "../src/viewmodels/useStatisticsViewModel";
import { useTheme, type ThemeColors } from "../src/viewmodels/ThemeContext";

/**
 * Väripaletti piirakkadiagrammille
 * Jokainen kategoria saa oman värin tästä taulukosta
 * Modulo-operaattori varmistaa että värit kiertävät jos kategorioita on yli 10
 */
const PIE_COLORS = [
  "#4CAF50", // Vihreä - Ensimmäinen kategoria
  "#2196F3", // Sininen
  "#FF9800", // Oranssi
  "#9C27B0", // Violetti
  "#F44336", // Punainen
  "#00BCD4", // Syaani
  "#FFEB3B", // Keltainen
  "#795548", // Ruskea
  "#607D8B", // Siniharmaa
  "#E91E63", // Pinkki
];

/**
 * StatisticsScreen - Pääkomponentti tilastonäkymälle
 * @returns JSX.Element - Renderöity statistiikkanäyttö
 */
export default function StatisticsScreen() {
  // Haetaan tilastodata ViewModelista
  // categoryStats = kategoriat määrineen ja prosentteineen
  // popularProducts = TOP 10 tuotteet frekvenssijärjestyksessä
  // totalItems = kokonaismäärä ostoshistorian tuotteita
  // loading = latausstatuksen boolean
  // refreshStatistics = funktio datan päivittämiseen
  const { categoryStats, popularProducts, totalItems, loading, refreshStatistics } = useStatisticsViewModel();
  
  // Haetaan teeman värit (tummalle ja vaalealle teemalle)
  const { colors } = useTheme();
  
  // Luodaan dynaamiset tyylit teeman mukaan
  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ========== OTSIKKOPALKKI ========== */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <Text style={styles.headerTitle}>STATISTIIKKA</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* ========== PÄÄSISÄLTÖ ========== */}
        <View style={styles.content}>
          <Text style={styles.title}>Ostoshistorian analyysi</Text>
          
          {/* EHTOLAUSEKE 1: Jos data latautuu, näytetään latausanimaatio */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={styles.loadingText}>Ladataan tilastoja...</Text>
            </View>
          
          // EHTOLAUSEKE 2: Jos ei ole yhtään tuotetta, näytetään placeholder
          ) : totalItems === 0 ? (
            <View style={styles.placeholderSection}>
              <Text style={styles.placeholderText}>
                Ei vielä ostoshistoriaa. Lisää tuotteita ostoslistoihisi nähdäksesi tilastot!
              </Text>
            </View>
          
          // EHTOLAUSEKE 3: Jos dataa on, näytetään tilastot
          ) : (
            <>
              {/* ========== YHTEENVETO-KORTTI ========== */}
              {/* Näyttää kokonaismäärän ja kategorioiden lukumäärän */}
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Yhteensä tuotteita</Text>
                <Text style={styles.summaryValue}>{totalItems}</Text>
                <Text style={styles.summarySubtitle}>
                  Jaettu {categoryStats.length} kategoriaan
                </Text>
              </View>

              {/* ========== PIIRAKKADIAGRAMMI - KATEGORIAJAKAUMA ========== */}
              {/* Näyttää visuaalisesti mihin kategorioihin ostokset jakautuvat */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  <Ionicons name="stats-chart" size={24} color={colors.text} /> Kategorioiden jakauma
                </Text>
                <Text style={styles.sectionDescription}>
                  Mihin kategorioihin ostoksesi keskittyvät
                </Text>
                
                {/* Piirakkadiagrammi renderöidään vain jos kategorioita on */}
                {categoryStats.length > 0 && (
                  <View style={styles.chartContainer}>
                    <PieChart
                      // Muunnetaan categoryStats-data PieChart-formaattiin
                      data={categoryStats.map((stat, index) => ({
                        name: stat.categoryName,           // Kategorian nimi legendaan
                        population: stat.count,            // Tuotteiden määrä (käytetään accessor:lla)
                        color: PIE_COLORS[index % PIE_COLORS.length], // Väri kierrättää taulukkoa
                        legendFontColor: colors.text,      // Legendan tekstin väri teemasta
                        legendFontSize: 12,                // Legendan fonttikoko
                      }))}
                      width={Dimensions.get('window').width - 40}  // Leveys: näytön leveys - marginaalit
                      height={220}                                  // Kiinteä korkeus
                      chartConfig={{
                        backgroundColor: 'transparent',              // Läpinäkyvä tausta
                        backgroundGradientFrom: colors.background,   // Gradientti alkuväri teemasta
                        backgroundGradientTo: colors.background,     // Gradientti loppuväri teemasta
                        color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`, // Perusväri (vihreä)
                      }}
                      accessor="population"  // Mikä kenttä määrittää siivojen koon
                      backgroundColor="transparent"
                      paddingLeft="15"       // Vasemman reunan padding legendalle
                    />
                  </View>
                )}
              </View>

              {/* ========== TOP 10 SUOSITUIMMAT TUOTTEET ========== */}
              {/* Käyttää frekvenssianalyysiä ja modia löytääkseen yleisimmät tuotteet */}
              {popularProducts.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    <Ionicons name="trophy" size={24} color={colors.accent} /> Suosituimmat tuotteet
                  </Text>
                  <Text style={styles.sectionDescription}>
                    Mitkä tuotteet toistuvat useimmin listoillasi
                  </Text>

                  {/* Loopataan läpi TOP 10 tuotetta */}
                  {popularProducts.map((product, index) => {
                    // Lasketaan pylväänleveys prosentteina suhteessa suosituimpaan
                    const maxCount = popularProducts[0].count;  // Ensimmäinen on aina suurin (järjestetty ViewModelissa)
                    const barWidth = (product.count / maxCount) * 100; // Prosenttilaskenta
                    
                    return (
                      <View key={`${product.name}-${index}`} style={styles.productRow}>
                        {/* Tuotteen otsikkorivi: sijoitus, nimi, määrä */}
                        <View style={styles.productHeader}>
                          {/* Sijoitusmerkki pyöreässä badgessa */}
                          <View style={styles.rankBadge}>
                            <Text style={styles.rankText}>#{index + 1}</Text>
                          </View>
                          <Text style={styles.productName}>{product.name}</Text>
                          <Text style={styles.productCount}>{product.count}x</Text>
                        </View>
                        
                        {/* Visuaalinen pylväs frekvenssille */}
                        <View style={styles.productBarContainer}>
                          <View 
                            style={[
                              styles.productBar,
                              { 
                                width: `${barWidth}%`, // Dynaaminen leveys
                                // Kolme kärkeä saavat erikoisvärit (kulta, hopea, pronssi)
                                backgroundColor: index === 0 ? colors.accent :      // #1 = vihreä
                                                index === 1 ? '#5ab8d6' :           // #2 = sininen
                                                index === 2 ? '#ffd93d' :           // #3 = keltainen
                                                colors.secondaryText                // Loput = harmaa
                              }
                            ]}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* ========== PÄIVITÄ-NAPPI ========== */}
              {/* Hakee tilastot uudelleen Firebasesta */}
              <Pressable 
                style={styles.refreshButton} 
                onPress={refreshStatistics}  // Kutsuu ViewModelin refresh-funktiota
              >
                <Text style={styles.refreshButtonText}>
                  <Ionicons name="refresh" size={20} color={"white"} />  Päivitä tilastot
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * ========================================
 * TYYLIMÄÄRITTELYT
 * ========================================
 * 
 * createStyles - Funktio joka luo dynaamisen StyleSheet-objektin
 * @param colors - ThemeColors objekti joka sisältää teeman värit
 * @returns StyleSheet objekti jossa kaikki komponenttien tyylit
 * 
 * Tyylit on jaettu seuraaviin kategorioihin:
 * - Ulkoasu (container, scrollContent, header)
 * - Sisältö (content, title, section)
 * - Lataus ja placeholder
 * - Yhteenveto-kortti
 * - Piirakkadiagrammi
 * - Tuotelista
 * - Napit
 */
const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    // ========== PÄÄULKOASU ==========
    
    container: {
      flex: 1,
      backgroundColor: colors.background,  // Taustaväri teemasta
    },
    
    scrollContent: {
      flexGrow: 1,  // Mahdollistaa skrollauksen
    },
    
    // ========== OTSIKKO ==========
    
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
    headerSpacer: {
      width: 36,
    },
    content: {
      padding: 20,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 24,
    },
    loadingContainer: {
      padding: 40,
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 15,
      fontSize: 16,
      color: colors.secondaryText,
    },
    placeholderSection: {
      backgroundColor: colors.surface,
      padding: 40,
      borderRadius: 10,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    placeholderText: {
      fontSize: 16,
      color: colors.secondaryText,
      textAlign: 'center',
    },
    // Yhteenveto-kortti vihreällä taustalla
    summaryCard: {
      backgroundColor: colors.accent,    // Vihreä accent-väri
      paddingVertical: 10,
      paddingHorizontal: 18,
      borderRadius: 12,
      marginBottom: 25,
      alignItems: 'center',
      shadowColor: '#000',               // Varjo (iOS)
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,                      // Varjo (Android)
    },
    summaryTitle: {
      fontSize: 13,
      color: '#fff',                     // Valkoinen teksti
      opacity: 0.9,
      marginBottom: 4,
    },
    summaryValue: {
      fontSize: 32,                      // Iso numero keskellä
      fontWeight: 'bold',
      color: '#fff',
      marginVertical: 3,
    },
    summarySubtitle: {
      fontSize: 12,
      color: '#fff',
      opacity: 0.8,
      marginTop: 3,
    },
    
    // ========== OSIOT ==========
    
    section: {
      marginBottom: 35,                  // Väli osioiden välillä
    },
    sectionTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 8,
    },
    sectionDescription: {
      fontSize: 14,
      color: colors.secondaryText,
      marginBottom: 20,
      fontStyle: 'italic',               // Kursivoitu selitysteksti
    },
    
    // ========== PIIRAKKADIAGRAMMI ==========
    
    chartContainer: {
      alignItems: 'center',              // Keskittää kaavion horisontaalisesti
      marginVertical: 15,
    },
    
    // ========== TUOTELISTA (TOP 10) ==========
    
    productRow: {
      marginBottom: 18,                  // Väli tuotteiden välillä
    },
    productHeader: {
      flexDirection: 'row',              // Vaakasuora layout
      alignItems: 'center',              // Keskitys pystysuunnassa
      marginBottom: 8,
    },
    // Pyöreä badge sijoitusnumerolle (#1, #2, #3...)
    rankBadge: {
      width: 32,
      height: 32,
      borderRadius: 16,                  // Puolet leveydestä = täysin pyöreä
      backgroundColor: colors.accent,    // Vihreä tausta
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    rankText: {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#fff',                     // Valkoinen teksti badgessa
    },
    productName: {
      flex: 1,                           // Ottaa kaiken jäljelle jäävän tilan
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    productCount: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.accent,              // Vihreä määrä
      minWidth: 40,                      // Vähimmäisleveys tasaukseen
      textAlign: 'right',                // Oikealle tasattu
    },
    // Progress bar -tyyppinen container
    productBarContainer: {
      height: 8,                         // Matala palkki
      backgroundColor: colors.border,    // Harmaa tausta
      borderRadius: 4,
      overflow: 'hidden',                // Piilottaa ylimenevän sisällön
      marginLeft: 44,                    // Sisennetty badge+margin verran (32+12)
    },
    // Varsinainen värillinen pylväs
    productBar: {
      height: '100%',                    // Täyttää containerin korkeuden
      borderRadius: 4,
      // Leveys ja väri asetetaan dynaamisesti JSX:ssä
    },
    
    // ========== PÄIVITÄ-NAPPI ==========
    
    refreshButton: {
      backgroundColor: colors.accent,    // Vihreä tausta
      padding: 16,
      borderRadius: 10,
      alignItems: 'center',
      marginBottom: 25,
      shadowColor: '#000',               // Varjo (iOS)
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,                      // Varjo (Android)
    },
    refreshButtonText: {
      color: '#fff',                     // Valkoinen teksti
      fontSize: 16,
      fontWeight: '600',
    },
  });
