import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useStatisticsViewModel } from "../src/viewmodels/useStatisticsViewModel";

const BAR_MAX_WIDTH = Dimensions.get('window').width - 100;

export default function StatisticsScreen() {
  const { categoryStats, totalItems, loading, refreshStatistics } = useStatisticsViewModel();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Takaisin</Text>
          </Pressable>
          <Text style={styles.headerTitle}>STATISTIIKKA</Text>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.title}>Ostoshistorian analyysi</Text>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#7ed957" />
              <Text style={styles.loadingText}>Ladataan tilastoja...</Text>
            </View>
          ) : totalItems === 0 ? (
            <View style={styles.placeholderSection}>
              <Text style={styles.placeholderText}>
                Ei vielä ostoshistoriaa. Lisää tuotteita ostoslistoihisi nähdäksesi tilastot!
              </Text>
            </View>
          ) : (
            <>
              {/* Yhteenveto */}
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Yhteensä tuotteita</Text>
                <Text style={styles.summaryValue}>{totalItems}</Text>
                <Text style={styles.summarySubtitle}>
                  Jaettu {categoryStats.length} kategoriaan
                </Text>
              </View>

              {/* Kategorioiden jakauma */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>📊 Kategorioiden jakauma</Text>
                <Text style={styles.sectionDescription}>
                  Mihin kategorioihin ostoksesi keskittyvät
                </Text>
                
                {categoryStats.map((stat, index) => (
                  <View key={stat.categoryName} style={styles.statRow}>
                    <View style={styles.statLabelContainer}>
                      <Text style={styles.statLabel}>{stat.categoryName}</Text>
                      <Text style={styles.statCount}>{stat.count} kpl</Text>
                    </View>
                    <View style={styles.barContainer}>
                      <View 
                        style={[
                          styles.bar, 
                          { 
                            width: (stat.percentage / 100) * BAR_MAX_WIDTH,
                            backgroundColor: index === 0 ? '#7ed957' : '#5ab8d6'
                          }
                        ]} 
                      />
                      <Text style={styles.percentageText}>
                        {stat.percentage.toFixed(1)}%
                      </Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Päivitä-nappi */}
              <Pressable 
                style={styles.refreshButton} 
                onPress={refreshStatistics}
              >
                <Text style={styles.refreshButtonText}>🔄 Päivitä tilastot</Text>
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: '#d3d3d3',
    padding: 20,
  },
  backButton: {
    marginBottom: 10,
  },
  backButtonText: {
    fontSize: 16,
    color: '#333',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    letterSpacing: 2,
    textAlign: 'center',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 30,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
  },
  placeholderSection: {
    backgroundColor: '#f5f5f5',
    padding: 40,
    borderRadius: 10,
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: '#7ed957',
    padding: 25,
    borderRadius: 15,
    marginBottom: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 5,
  },
  summaryValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    marginVertical: 5,
  },
  summarySubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
    marginTop: 5,
  },
  section: {
    marginBottom: 35,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  statRow: {
    marginBottom: 20,
  },
  statLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statCount: {
    fontSize: 14,
    color: '#666',
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bar: {
    height: 30,
    borderRadius: 6,
    marginRight: 10,
  },
  percentageText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    minWidth: 50,
  },
  refreshButton: {
    backgroundColor: '#5ab8d6',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
