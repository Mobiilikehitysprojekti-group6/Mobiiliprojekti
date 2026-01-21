import { View, Text, TextInput, StyleSheet, TouchableOpacity, FlatList, Modal, Pressable } from 'react-native';
import React, { useState } from 'react';


// Ostos-tyyppi: yksittäinen ostos (nimi ja suoritettu-tieto)
type Item = {
  name: string;
  done: boolean;
};

// List-tyyppi: yksittäinen ostoslista (id, nimi, ostokset)
type List = {
  id: string;        // Yksilöllinen tunniste
  name: string;      // Listan nimi
  items?: Item[];    // Ostokset (valinnainen)
};


// Pääkomponentti: ShopList
const ShopList = () => {
  // --- Tilat ---
  // Kaikki ostoslistat (array, jossa jokaisella listalla id, nimi ja ostokset)
  const [lists, setLists] = useState<List[]>([]);

  // Onko "Uusi lista" -modal auki
  const [modalVisible, setModalVisible] = useState(false);
  // Uuden listan nimi tekstikentässä
  const [newListName, setNewListName] = useState("");
  // Aktiivinen lista, jonka sisältöä katsotaan/modalissa muokataan (null = mikään ei auki)
  const [activeList, setActiveList] = useState<List | null>(null);
  // Uusi ostos (tekstikenttä modalissa)
  const [newItem, setNewItem] = useState("");

  // --- Funktiot ---

  // Lisää uusi ostoslista (avaa "Uusi lista" -modalista)
  // Luo uuden listan annetulla nimellä ja lisää sen lists-taulukkoon
  const handleAddList = () => {
    if (newListName.trim()) {
      const newId = Date.now().toString(); // yksilöllinen id aikaleimasta
      setLists([...lists, { id: newId, name: newListName, items: [] }]);
      setNewListName(""); // tyhjennä tekstikenttä
      setModalVisible(false); // sulje modal
    }
  };

  // Avaa valitun listan modalin (näyttää ja mahdollistaa ostosten muokkauksen)
  // Asettaa activeList:ksi valitun listan ja tyhjentää uuden ostoksen kentän
  const openListModal = (list: List) => {
    setActiveList(list);
    setNewItem("");
  };

  // Lisää uusi ostos aktiiviseen listaan (modalissa) ja päivittää sekä lists-taulukon että activeList-tilan
  const handleAddItem = () => {
    if (activeList && newItem.trim()) {
      const newItemObj = { name: newItem, done: false };
      setLists(lists.map(l =>
        l.id === activeList.id
          ? { ...l, items: [...(l.items || []), newItemObj] } // lisää uusi ostos oikeaan listaan
          : l
      ));
      setActiveList({ ...activeList, items: [...(activeList.items || []), newItemObj] }); // päivitä modalin lista
      setNewItem(""); // tyhjennä tekstikenttä
    }
  };

  // Poistaa ostoksen aktiivisesta listasta (modalissa) ja päivittää sekä lists-taulukon että activeList-tilan
  const handleRemoveItem = (index: number) => {
    if (activeList) {
      // Poista valitun indeksin ostos
      const newItems = (activeList.items || []).filter((_, i) => i !== index);
      setLists(lists.map(l =>
        l.id === activeList.id
          ? { ...l, items: newItems }
          : l
      ));
      setActiveList({ ...activeList, items: newItems });
    }
  };

  // Vaihda ostoksen suoritettu-tila (checkbox)
  const handleToggleDone = (index: number) => {
    if (activeList) {
      const newItems = (activeList.items || []).map((item, i) =>
        i === index ? { ...item, done: !item.done } : item
      );
      setLists(lists.map(l =>
        l.id === activeList.id
          ? { ...l, items: newItems }
          : l
      ));
      setActiveList({ ...activeList, items: newItems });
    }
  };

  // --- Palautus (UI) ---
  // Näyttää listat, modaalit ja kaikki käyttöliittymän osat
  return (
    <View style={styles.container}>
      {/* Ylätunniste: otsikko ja plus-nappi uuden listan luontiin */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Ostoslistat</Text>
        {/* Plus-nappi avaa uuden listan modalin */}
        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addButton}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Kaikki ostoslistat näkyvät allekkain. Klikkaamalla avautuu listan sisältö modalissa. */}
      <FlatList
        data={lists}
        keyExtractor={l => l.id}
        renderItem={({ item: l }) => (
          <TouchableOpacity onPress={() => openListModal(l)} style={styles.listBlock}>
            {/* Listan nimi */}
            <Text style={styles.titleInput}>{l.name}</Text>
          </TouchableOpacity>
        )}
      />

      {/* Modal: valitun listan sisältö ja ostosten muokkaus */}
      <Modal
        visible={!!activeList}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveList(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Sulje-modal-nappi (rasti oikeassa yläkulmassa) */}
            <TouchableOpacity onPress={() => setActiveList(null)} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
            {/* Listan otsikko modalissa */}
            <Text style={styles.modalTitle}>{activeList?.name}</Text>
            {/* Uuden ostoksen lisäysrivi: tekstikenttä ja "Lisää"-nappi */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                placeholder="Lisää ostos"
                value={newItem}
                onChangeText={setNewItem}
              />
              {/* Lisää ostos -nappi */}
              <Pressable onPress={handleAddItem} style={styles.addItemButton}>
                <Text style={styles.addItemButtonText}>Lisää</Text>
              </Pressable>
            </View>
            {/* Ostoslistan ostokset: jokainen ostos omalla rivillä, jossa Poista-nappi */}
            <FlatList
              data={activeList?.items || []}
              keyExtractor={(_, idx) => idx.toString()}
              renderItem={({ item, index }) => (
                <View style={styles.listItemRow}>
                  {/* Checkbox: paina vaihtaa suoritettu-tilaa */}
                  <TouchableOpacity onPress={() => handleToggleDone(index)} style={styles.checkbox}>
                    <Text style={{ fontSize: 20 }}>
                      {item.done ? '✔' : '□'}
                    </Text>
                  </TouchableOpacity>
                  {/* Ostoksen nimi, yliviivaus jos done */}
                  <Text style={[styles.listItemText, item.done && { textDecorationLine: 'line-through', color: '#888' }]}>
                    {item.name}
                  </Text>
                  {/* Poista-nappi */}
                  <Pressable onPress={() => handleRemoveItem(index)} style={styles.removeItemButton}>
                    <Text style={styles.removeItemButtonText}>Poista</Text>
                  </Pressable>
                </View>
              )}
              style={{ marginTop: 12 }}
            />
          </View>
        </View>
      </Modal>

      {/* Modal: uuden listan luonti */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modalin otsikko */}
            <Text style={styles.modalTitle}>Uusi ostoslista</Text>
            {/* Tekstikenttä uuden listan nimelle */}
            <TextInput
              style={styles.input}
              placeholder="Anna listan nimi"
              value={newListName}
              onChangeText={setNewListName}
            />
            {/* Napit: Peruuta ja Luo */}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <Pressable onPress={() => setModalVisible(false)} style={styles.modalButton}>
                <Text>Peruuta</Text>
              </Pressable>
              <Pressable onPress={handleAddList} style={styles.modalButton}>
                <Text>Luo</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
	</View>
  );
}

// Tyylit kaikkiin käyttöliittymän osiin
const styles = StyleSheet.create({
  // Koko näkymän peruspadding
  container: { padding: 20 },
  // Otsikkorivi ("Ostoslistat" + plus-nappi)
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  // Otsikon teksti
  headerTitle: { fontSize: 24, fontWeight: 'bold', flex: 1 },
  // Plus-nappi uuden listan luontiin
  addButton: { backgroundColor: '#7ed957', borderRadius: 20, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  // Plus-napin teksti
  addButtonText: { color: 'white', fontSize: 28, fontWeight: 'bold', marginTop: -2 },
  // Listan nimi (etusivulla)
  titleInput: { fontSize: 20, marginBottom: 10, fontWeight: 'bold', borderBottomWidth: 1, padding: 4 },
  // Tekstikentät (uusi lista, uusi ostos)
  input: { borderWidth: 1, padding: 8, marginBottom: 10 },
listBlock: {
  backgroundColor: 'white',
  borderRadius: 15,
  padding: 20,
  marginVertical: 8,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between'
},
  // Modalin tausta (tummennus)
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  // Modalin sisältölaatikko
  modalContent: { backgroundColor: 'white', padding: 24, borderRadius: 10, width: '80%', position: 'relative' },
  // Modalin otsikko
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  // Modalin sulkunappi (rasti)
  closeButton: { position: 'absolute', top: 8, right: 8, zIndex: 1, padding: 4 },
  // Sulkunapin teksti (rasti)
  closeButtonText: { fontSize: 28, color: '#888' },
  // "Lisää ostos" -nappi
  addItemButton: { backgroundColor: '#7ed957', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6, marginLeft: 8 },
  // "Lisää ostos" -napin teksti
  addItemButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  // Yksittäinen ostosrivi modalissa
  listItemRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 2 },
  // Checkboxin tyyli
  checkbox: { marginRight: 10, padding: 4 },
  // Ostoksen teksti
  listItemText: { fontSize: 16, flex: 1 },
  // "Poista"-nappi ostosrivillä
  removeItemButton: { backgroundColor: '#e53935', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6, marginLeft: 8 },
  // "Poista"-napin teksti
  removeItemButtonText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  // Modalin oikean alakulman napit ("Peruuta", "Luo")
  modalButton: { marginLeft: 16, marginTop: 16 },
});

export default ShopList;