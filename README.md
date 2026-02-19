# KauppaLappu (React Native) — Perheille, pariskunnille ja yhdessä ostaville

Kauppalappu on Suomessa toimiville perheille, pariskunnille ja yhdessä ostaville suunnattu mobiilisovellus, joka helpottaa arjen ostosten suunnittelua ja tekemistä. Sovelluksessa käyttäjät toimivat **ryhmissä**, joissa voidaan ylläpitää **reaaliaikaisesti päivittyviä kauppalappuja** eri kaupoille. Tuotteet lisätään **tuotekategorioittain**, ja kategorioita voi järjestää “fyysisen lapun” tapaan. Tarvittaessa sovellus voi hakea **lähimmän halutun kaupan** puhelimen GPS-sijainnin perusteella.

> Kohdemarkkina: Suomi  
> Teknologia: React Native (cross-platform: iOS + Android)

---

## Sisällysluettelo
- [Ominaisuudet](#ominaisuudet)
- [Projektin vaatimukset ja miten ne täyttyvät](#projektin-vaatimukset-ja-miten-ne-täyttyvät)
- [Teknologia & arkkitehtuuri](#teknologia--arkkitehtuuri)
- [Käyttöönotto](#käyttöönotto)
- [Ympäristömuuttujat](#ympäristömuuttujat)
- [Luvat ja tietosuoja](#luvat-ja-tietosuoja)
- [Datamalli (luonnos)](#datamalli-luonnos)
- [Testaus](#testaus)
- [Roadmap](#roadmap)
- [Tiimi & työnjako](#tiimi--työnjako)

---

## Ominaisuudet

### 1) Ryhmät ja yhteiskäyttö
- Kauppalistan jako kutsukoodilla
- Ryhmän jäsenet näkevät samat kauppalistat

### 2) Useat kauppalistat eri kaupoille
- Käyttäjä voi luoda useita kauppalappuja ja halutessaan liittää niihin kaupan (“Prisma”, “K-Citymarket”, “Lidl”)
- Listakohtainen sisältö ja järjestys
- Listojen nimeäminen ja tallennus Firebase/Firestoreen

### 3) Tuotteet tuotekategorioittain + siirrettävät kategoriat
- Tuotteen lisääminen: nimi, määrä
- Kategoriat (esim. Hedelmät, Maitotuotteet, Pakasteet…)
- Kategorioiden järjestyksen muokkaus drag & drop (siirrettävä “fyysisen lapun” tapaan)
- Tuotteiden siirtäminen kategorian sisällä (drag&drop)

### 4) Reaaliaikainen päivittyminen
- Kun yksi käyttäjä lisää/muokkaa/poistaa, muut näkevät muutokset reaaliajassa

### 5) GPS: lähimmän halutun kaupan haku
- “Etsi lähin kauppa” -toiminto sijainnin perusteella
- Tarkistetaan GPS-signaalin käyttölupa ja avataan reitti karttasovellukseen

### 6) Offline-tuki (MVP+)
- Data näkyy offline-tilassa (Firestore)
- Auth säilyy (AsyncStorage)

### 7) Perustoiminnot (CRUD)
- Luo / lue / päivitä / poista:
  - kauppalistat
  - kategoriat
  - tuotteet
- Huomioidaan subcollectionsien poistaminen Firebase/Firestoresta
---

## Projektin vaatimukset ja miten ne täyttyvät


| Vaatimus (muokkaa) | Miten toteutuu tässä projektissa | Missä näkyy / esimerkki |
|---|---|---|
| Cross-platform mobiilisovellus | React Native (iOS + Android samasta koodista) | `Mobiiliprojekti/` projektin root-taso |
| Käyttäjien yhteiskäyttö / ryhmätoiminnallisuus | Ryhmät, yhteiset listat reaaliajassa | Kutsukoodilla liittyminen, listat näkyvät kaikille ryhmän jäsenille |
| Reaaliaikaisuus | Listojen synkronointi reaaliaikaisesti (esim. Firestore/Supabase) | “muutos näkyy heti” demo |
| CRUD-toiminnot | Listat, kategoriat, tuotteet | Lisää/Muokkaa/Poista -toiminnot |
| Selkeä UI/UX ja käytettävyys | Kategoriat, nopea lisäys, selkeä listaus | Kotinäkymä + listanäkymä |
| Laitteen ominaisuuden hyödyntäminen | GPS-sijainti “lähin kauppa” -hakuun | Sijaintilupa + hakutoiminto |
| Toimii heikossa verkossa / offline | Firestore välimuisti + AsyncStorage: data näkyvissä offline-tilassa | Demo: katkaise netti → lista näkyy, muutokset synkataan kun yhteys palautuu |
| Tietosuoja huomioitu | Sijaintia käytetään vain pyydettäessä, minimidatan periaate | Tietosuojasivu + lupatekstit |
| Dokumentointi | README + (valinnainen) arkkitehtuuri/diagr. | Tämä README |
| Versiohallinta ja työnjako | Git, branchit, PR:t, issue-tracking | GitHub/GitLab |

### Käyttötapaus-esimerkki (User Story)
**Käyttäjänä** haluan lisätä tuotteita yhteiseen kauppalistaan, **jotta** ryhmän jäsen näkee reaaliajassa mitä pitää ostaa.

**Hyväksymiskriteerit**
- Kun lisään tuotteen, se ilmestyy välittömästi myös toiselle käyttäjälle.
- Tuote näkyy oikeassa kategoriassa.
- Kategoriajärjestys on sama kaikilla ryhmän jäsenillä.

---

## Teknologia & arkkitehtuuri

### Teknologiat
- React Native (cross-platform)
- Expo
- TypeScript
- Reaaliaikainen backend: Firebase Firestore + Authentication
- Kartta/paikkatieto: Expo Location + Overpass API
- Tilastot: react-native-chart-kit (piirakka- ja pylväskaaviot)
- UI-komponentit: react-native-draggable-flatlist, react-native-gesture-handler, react-native-reanimated
- Paikallinen tallennus: @react-native-async-storage/async-storage (offline + auth persistence)
- Kuvagalleria: expo-image-picker
- Teemoitus: Dark Mode / Light Mode (custom ThemeContext)
---

## Käyttöönotto

### Esivaatimukset
- Node.js (LTS)
- Git
- Expo Go puhelimeen testaukseen

### Asennus
```bash
git clone <repo-url>
npm install
```

### Firebase-konfigurointi
1. Luo Firebase-projekti [Firebase Console](https://console.firebase.google.com/)
2. Ota käyttöön Firestore Database ja Authentication
3. Lataa konfiguraatiotiedostot:
   - Android: `google-services.json` → `/android/app/`
   - iOS: `GoogleService-Info.plist` → `/ios/`
4. Päivitä Firebase-asetukset tiedostoon `/firebase/Config.ts`

### Sovelluksen käynnistys
```bash
# Käynnistä Expo development server
npx expo start

# Tai käynnistä suoraan laitteelle/emulaattorille:
npx expo start --android
npx expo start --ios
npx expo start --tunnel  # Käytä tunnelia, jos ei samassa verkossa
```

### Testaus puhelimella
1. Asenna **Expo Go** -sovellus (iOS: App Store, Android: Google Play)
2. Skannaa QR-koodi Expo Dev Tools -näkymästä
3. Sovellus käynnistyy Expo Go:ssa

---

## Ympäristömuuttujat

Sovellus käyttää Firebase-konfiguraatiota tiedostossa `/firebase/Config.ts`. Varmista että seuraavat arvot on asetettu:

```typescript
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

**Huom:** Älä tallenna arkaluontoisia tietoja versionhallintaan. Käytä `.gitignore`-tiedostoa suojaamaan konfiguraatiot.

---

## Luvat ja tietosuoja

### Tarvittavat luvat
- **Sijaintilupa (Location)**: Käytetään "Etsi lähin kauppa" -toiminnossa
  - iOS: `NSLocationWhenInUseUsageDescription` (`app.json`)
  - Android: `ACCESS_FINE_LOCATION` ja `ACCESS_COARSE_LOCATION`

### Tietosuojakäytännöt
- Sijaintitietoa käytetään vain käyttäjän pyynnöstä lähimmän kaupan hakuun
- Sijaintia ei tallenneta pysyvästi
- Firebase-autentikointi ja Firestore noudattavat GDPR-vaatimuksia
- Käyttäjätiedot tallennetaan minimaalisesti (vain tarpeelliset tiedot)

---

## UI-suunnitelma
![UI-suunnitelma](/Documents/FigmaUIsuunnitelma.png)

## Datamalli

### Firestore-rakenne

    users/
    {uid}/
    - username?: string
    - profileImage?: string

    stores/
      {storeId}/
        - name: string
        - branch?: string | null
        - createdAt: timestamp

    lists/
    {listId}/
    - name: string
    - storeId: string | null
    - ownerId: string
    - memberIds: string[]
    - orderBy: { [uid: string]: number }
    - createdAt: timestamp

    categories/
      {categoryId}/
        - name: string
        - order: number
        - createdAt: timestamp

    items/
      {itemId}/
        - name: string
        - done: boolean
        - categoryId: string | null
        - order: number
        - quantity: number
        - createdAt: timestamp

    invites/
     {CODE}/
    - listId: string
    - createdBy: string
    - createdAt: timestamp
```

### Tärkeät huomiot
- Käytetään subcollections-rakennetta Firestoressa
- `order`-kenttä kategorioille mahdollistaa drag & drop -järjestelyn
- Reaaliaikaiset päivitykset `onSnapshot()`-kuuntelijoilla
- Poistoissa huomioitava subcollectionien puhdistus

---

## Testaus

### Manuaalinen testaus
- Testaa sovellusta Expo Go:lla fyysisellä laitteella
- Testaa offline-tilaa: katkaise internet-yhteys ja tarkista toiminnallisuus
- Testaa sijaintiominaisuutta eri kauppojen läheisyydessä

### Reaaliaikaisuuden testaus
1. Avaa sovellus kahdella eri laitteella samalla käyttäjätilillä/ryhmässä
2. Lisää/muokkaa/poista tuotteita yhdellä laitteella
3. Varmista että muutokset näkyvät välittömästi toisella laitteella

---

## Roadmap

### MVP (Minimum Viable Product) - Valmis
- ✅ Firebase-integraatio (Firestore, Authentication)
- ✅ Ryhmien luonti ja hallinta
- ✅ Kauppalistojen CRUD-toiminnot
- ✅ Kategoriat ja tuotteet
- ✅ Reaaliaikainen synkronointi
- ✅ Perus-UI/UX
- ✅ Dark Mode / Light Mode
- ✅ Drag & drop kategorioiden järjestelyyn
- ✅ Ostoshistorian analytiikka ja tilastot

---

## Tiimi & työnjako

### Tiimi
*Ryhmä 6 - Mobiilikehitysprojekti*

### Työnjako
- **Frontend/UI**: React Native -komponentit, navigointi, käyttöliittymä
- **Backend/Firebase**: Firestore-rakenne, autentikointi, reaaliaikaisuus
- **Kartta/GPS**: Expo Location, Overpass API -integraatio
- **Testaus**: Manuaalinen testaus, testaussuunnitelma

  https://youtu.be/T30AL6ffF4w?si=i5GQLXFKsJ__F7bV








