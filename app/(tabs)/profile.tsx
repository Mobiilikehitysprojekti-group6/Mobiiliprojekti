import React, { useState, useRef, useEffect } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Modal,
  Image,
  Switch
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from 'expo-image-picker'; //Kuva valitaan gallerian kautta
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useShopVM } from "../../src/viewmodels/ShopVMContext";
import { db, doc, setDoc, getDoc } from "../../firebase/Config";
import { useTheme, type ThemeColors } from "../../src/viewmodels/ThemeContext";

export default function ProfileScreen() {
  const { colors, mode, toggle } = useTheme();
  // Haetaan uid ShopVMContextista (anonyymi Firebase Auth)
  const { uid } = useShopVM();
  
  // State: username = muokattava arvo modalissa, savedUsername = Firestoressa tallennettu arvo
  const [username, setUsername] = useState('');
  const [savedUsername, setSavedUsername] = useState('');
  
  // Profiilikuva state
  const [profileImage, setProfileImage] = useState<string | null>(null);
  
  // Modal-näkyvyys
  const [isEditing, setIsEditing] = useState(false);
  
  // Ref input-kentälle, jotta voidaan fokussoida se modalin avautuessa
  const inputRef = useRef<TextInput>(null);

  const styles = createStyles(colors);

  // Lataa käyttäjänimi Firestoresta kun uid on saatavilla
  useEffect(() => {
    const loadUsername = async () => {
      if (!uid) return;
      
      try {
        const userDoc = await getDoc(doc(db, "users", uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.username) {
            setSavedUsername(data.username);
            setUsername(data.username);
          }
          if (data.profileImage) { // Ladataan profiilikuva Firestoresta
            setProfileImage(data.profileImage);
          }
        }
      } catch (error) {
        console.error("Virhe käyttäjänimen latauksessa:", error);
      }
    };

    loadUsername();
  }, [uid]);

  // Fokusoi input-kenttä kun modal avautuu (100ms viive Androidille)
  useEffect(() => {
    if (isEditing) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isEditing]);

  // Profiilikuvan vaihtofunktio
  const handleChangePicture = async () => {
    // Pyydä lupa käyttää mediagalleriaa
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert("Lupa vaaditaan", "Anna sovellukselle lupa käyttää galleriaa");
      return;
    }

    // Avaa kuvagalleria
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setProfileImage(base64Image);
      
      // Tallenna kuva Firestoreen
      if (uid) {
        try {
          await setDoc(doc(db, "users", uid), { profileImage: base64Image }, { merge: true });
        } catch (error) {
          console.error("Virhe kuvan tallennuksessa:", error);
          Alert.alert("Virhe", "Kuvan tallennus epäonnistui");
        }
      }
    }
  };

  // Avaa muokkausmodal ja aseta nykyinen tallennettu nimi muokattavaksi
  const handleEdit = () => {
    setUsername(savedUsername);
    setIsEditing(true);
  };

  // Tallenna käyttäjänimi Firestoreen
  const handleSave = async () => {
    // Validoi että käyttäjänimi ei ole tyhjä
    if (username.trim() === "") {
      Alert.alert("Virhe", "Käyttäjänimi ei voi olla tyhjä");
      return;
    }

    // Jos uid puuttuu (lataus käynnissä), älä tee mitään
    if (!uid) {
      return;
    }

    try {
      // Tallenna users/{uid} dokumenttiin, merge: true säilyttää muut kentät
      await setDoc(doc(db, "users", uid), { username: username.trim() }, { merge: true });
      setSavedUsername(username);
      setIsEditing(false);
      Keyboard.dismiss();
    } catch (error) {
      console.error("Virhe tallennuksessa:", error);
      Alert.alert("Virhe", "Käyttäjänimen tallennus epäonnistui");
    }
  };

  // Sulje modal ilman tallennusta
  const handleCancel = () => {
    setIsEditing(false);
    Keyboard.dismiss();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Card */}
        <View style={styles.profileSection}>
          <View style={styles.profileCard}>
            <View style={styles.profileRow}>
              <View style={styles.profilePictureContainer}>
                <View style={styles.profilePicture}>
                  {profileImage ? (
                    <Image source={{ uri: profileImage }} style={styles.profileImage} />
                  ) : (
                    <Text style={styles.profileInitial}>
                      {savedUsername.charAt(0).toUpperCase() || '?'}
                    </Text>
                  )}
                </View>
                <Pressable onPress={handleChangePicture}>
                  <Text style={styles.changePictureText}>vaihda kuva</Text>
                </Pressable>
              </View>

              <View style={styles.profileInfo}>
                <View style={styles.usernameRow}>
                  <Text style={styles.usernameDisplay}>
                    {savedUsername || 'Ei käyttäjänimeä'}
                  </Text>
                  <Pressable style={styles.editIconButton} onPress={handleEdit}>
                    <Ionicons name="create-outline" size={24} color={colors.accent} />
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
          
          <Pressable style={styles.statisticsButton} onPress={() => router.push('/statistics')}>
            <Text style={styles.statisticsButtonText}>Statistiikka</Text>
          </Pressable>

           <View style={styles.themeRow}>
            <Text style={styles.themeLabel}>{mode === "dark" ? <Ionicons name="moon" size={20} color={colors.accent} /> : <Ionicons name="sunny" size={20} color={colors.accent} />}</Text>
            <Switch
              value={mode === "dark"}
              onValueChange={toggle}
              trackColor={{ false: "#767577", true: colors.accent }}
              thumbColor={mode === "dark" ? "white" : "#f4f3f4"}
            />
          </View>
          
          <Pressable style={styles.aboutButton} onPress={() => router.push('/about')}>
            <Text style={styles.aboutButtonText}>Tietoja sovelluksesta</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Modal for editing username */}
      <Modal
        visible={isEditing}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCancel}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {savedUsername ? 'Muokkaa käyttäjänimeä' : 'Lisää käyttäjänimi'}
              </Text>
            </View>

            <View style={styles.modalForm}>
              <Text style={styles.label}>KÄYTTÄJÄNIMI</Text>
              
              <TextInput
                ref={inputRef}
                style={styles.input}
                placeholder="Käyttäjänimi"
                placeholderTextColor={colors.mutedText}
                value={username}
                onChangeText={setUsername}
              />

              <View style={styles.buttonRow}>
                <Pressable style={styles.cancelButton} onPress={handleCancel}>
                  <Text style={styles.cancelButtonText}>Peruuta</Text>
                </Pressable>
                
                <Pressable style={styles.saveButton} onPress={handleSave}>
                  <Text style={styles.saveButtonText}>Tallenna</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      letterSpacing: 2,
    },
    profileSection: {
      alignItems: 'center',
      paddingVertical: 30,
      paddingHorizontal: 20,
    },
    profileCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 20,
      width: '100%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
      borderWidth: 2,
      borderColor: colors.accent,
      marginBottom: 25,
    },
    profileRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      width: '100%',
      paddingHorizontal: 0,
    },
    profilePictureContainer: {
      alignItems: 'center',
    },
    profilePicture: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: colors.elevated,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
      overflow: 'hidden',
    },
    profileImage: {
      width: '100%',
      height: '100%',
    },
    profileInitial: {
      fontSize: 40,
      color: '#fff',
      fontWeight: 'bold',
    },
    changePictureText: {
      fontSize: 11,
      color: colors.mutedText,
      textAlign: 'center',
    },
    profileInfo: {
      flex: 1,
      justifyContent: 'flex-start',
      marginLeft: 25,
      paddingTop: 40,
    },
    usernameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    usernameDisplay: {
      fontSize: 22,
      fontWeight: 'bold',
      color: colors.text,
    },
    editIconButton: {
      padding: 4,
    },
    themeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 0,
      marginTop: 10,
      backgroundColor: colors.surface,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 20,
    },
    themeLabel: {
      fontSize: 14,
      color: colors.text,
    },
    statisticsButton: {
      paddingHorizontal: 20,
      paddingVertical: 8,
      backgroundColor: colors.accent,
      borderRadius: 15,
      marginTop: 10,
    },
    statisticsButtonText: {
      fontSize: 14,
      color: '#fff',
      fontWeight: '600',
    },
    aboutButton: {
      paddingHorizontal: 20,
      paddingVertical: 8,
      backgroundColor: colors.accentSoft,
      borderRadius: 15,
      marginTop: 10,
    },
    aboutButtonText: {
      fontSize: 14,
      color: colors.text,
    },
    modalContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
      width: '90%',
      backgroundColor: colors.surface,
      borderRadius: 20,
      overflow: 'hidden',
    },
    modalHeader: {
      backgroundColor: colors.surface,
      padding: 20,
      alignItems: 'center',
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
    },
    modalForm: {
      padding: 30,
    },
    label: {
      fontSize: 14,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 15,
      letterSpacing: 1,
    },
    input: {
      backgroundColor: colors.elevated,
      borderRadius: 25,
      paddingHorizontal: 20,
      paddingVertical: 15,
      marginBottom: 15,
      fontSize: 16,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    buttonRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 10,
    },
    cancelButton: {
      flex: 1,
      backgroundColor: colors.elevated,
      borderRadius: 25,
      paddingVertical: 15,
      alignItems: 'center',
      marginTop: 10,
    },
    cancelButtonText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: 'bold',
    },
    saveButton: {
      flex: 1,
      backgroundColor: colors.accent,
      borderRadius: 25,
      paddingVertical: 15,
      alignItems: 'center',
      marginTop: 10,
    },
    saveButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
    },
  });