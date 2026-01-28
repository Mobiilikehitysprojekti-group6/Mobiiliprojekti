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
  Image
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from 'expo-image-picker'; //Kuva valitaan gallerian kautta
import { router } from "expo-router";
import { useShopVM } from "../../src/viewmodels/ShopVMContext";
import { db, doc, setDoc, getDoc } from "../../firebase/Config";

export default function ProfileScreen() {
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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>PROFIILI</Text>
        </View>

        {/* Profile Picture */}
        <View style={styles.profileSection}>
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
          
          <Text style={styles.usernameDisplay}>
            {savedUsername || 'Ei käyttäjänimeä'}
          </Text>
          
          <Pressable style={styles.editButton} onPress={handleEdit}>
            <Text style={styles.editButtonText}>
              {savedUsername ? 'Muokkaa käyttäjänimeä' : 'Lisää käyttäjänimi'}
            </Text>
          </Pressable>
          
          <Pressable style={styles.statisticsButton} onPress={() => router.push('/statistics')}>
            <Text style={styles.statisticsButtonText}>Statistiikka</Text>
          </Pressable>
          
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
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    letterSpacing: 2,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  profilePicture: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#c0c0c0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profileInitial: {
    fontSize: 48,
    color: '#fff',
    fontWeight: 'bold',
  },
  changePictureText: {
    fontSize: 12,
    color: '#888',
    marginBottom: 15,
  },
  usernameDisplay: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  editButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 15,
  },
  editButtonText: {
    fontSize: 14,
    color: '#555',
  },
  statisticsButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#e8f5e9',
    borderRadius: 15,
    marginTop: 10,
  },
  statisticsButtonText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  aboutButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 15,
    marginTop: 10,
  },
  aboutButtonText: {
    fontSize: 14,
    color: '#777',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalHeader: {
    backgroundColor: '#d3d3d3',
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalForm: {
    padding: 30,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    letterSpacing: 1,
  },
  input: {
    backgroundColor: '#d3d3d3',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#999',
    borderRadius: 25,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
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