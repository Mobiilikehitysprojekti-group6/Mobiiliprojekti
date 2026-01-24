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
  Modal
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useShopVM } from "../../src/viewmodels/ShopVMContext";
import { db, doc, setDoc, getDoc } from "../../firebase/config";

export default function ProfileScreen() {
  const { uid } = useShopVM();
  const [username, setUsername] = useState('');
  const [savedUsername, setSavedUsername] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<TextInput>(null);

  // Lataa käyttäjänimi Firestoresta
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
        }
      } catch (error) {
        console.error("Virhe käyttäjänimen latauksessa:", error);
      } finally {
        setLoading(false);
      }
    };

    loadUsername();
  }, [uid]);

  useEffect(() => {
    if (isEditing) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isEditing]);

  const handleChangePicture = () => {
    Alert.alert("Vaihda kuva", "Kuvanhallinta tulossa pian!");
  };

  const handleEdit = () => {
    setUsername(savedUsername);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (username.trim() === "") {
      Alert.alert("Virhe", "Käyttäjänimi ei voi olla tyhjä");
      return;
    }

    if (!uid) {
      Alert.alert("Virhe", "Käyttäjä ei ole kirjautunut");
      return;
    }

    try {
      // Tallenna Firebaseen
      await setDoc(doc(db, "users", uid), { username: username.trim() }, { merge: true });
      setSavedUsername(username);
      setIsEditing(false);
      Keyboard.dismiss();
    } catch (error) {
      console.error("Virhe tallennuksessa:", error);
      Alert.alert("Virhe", "Käyttäjänimen tallennus epäonnistui");
    }
  };

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
            <Text style={styles.profileInitial}>
              {savedUsername.charAt(0).toUpperCase() || '?'}
            </Text>
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