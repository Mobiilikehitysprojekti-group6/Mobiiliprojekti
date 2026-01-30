import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

export default function StatisticsScreen() {
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
          <Text style={styles.title}>Tilastot</Text>
          
          <View style={styles.placeholderSection}>
            <Text style={styles.placeholderText}>
              Tähän tulee statistiikka ostoslistoista ja tuotteista.
            </Text>
          </View>
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
  placeholderSection: {
    backgroundColor: '#f5f5f5',
    padding: 40,
    borderRadius: 10,
    marginBottom: 30,
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
  },
});
