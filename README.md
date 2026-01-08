# Kauppalappu (React Native) — Perheille & Pariskunnille

Kauppalappu on Suomessa toimiville perheille ja pariskunnille suunnattu mobiilisovellus, joka helpottaa arjen ostosten suunnittelua ja tekemistä. Sovelluksessa käyttäjät toimivat **ryhmissä**, joissa voidaan ylläpitää **reaaliaikaisesti päivittyviä kauppalappuja** eri kaupoille. Tuotteet lisätään **tuotekategorioittain**, ja kategorioita voi järjestää “fyysisen lapun” tapaan. Tarvittaessa sovellus voi hakea **lähimmän halutun kaupan** puhelimen GPS-sijainnin perusteella.

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
- Ryhmän luonti / liittyminen (esim. kutsulinkki tai koodi) *(tätä muokataan vielä)*
- Ryhmän jäsenet näkevät samat kauppalistat
- Roolit (esim. owner/member) *(mahdollisesti?)*

### 2) Useat kauppalistat eri kaupoille
- Ryhmä voi luoda useita kauppalappuja (esim. “Prisma”, “K-Citymarket”, “Lidl”)
- Listakohtainen sisältö ja järjestys
- Listojen nimeäminen ja arkistointi *(Jos jää aikaa)*

### 3) Tuotteet tuotekategorioittain + siirrettävät kategoriat
- Tuotteen lisääminen: nimi, määrä, lisätiedot(?)
- Kategoriat (esim. Hedelmät, Maitotuotteet, Pakasteet…)
- Kategorioiden järjestyksen muokkaus drag & drop (siirrettävä “fyysisen lapun” tapaan)
- Tuotteiden siirtäminen kategorian sisällä / kategorioiden välillä *(Jos jää aikaa)*

### 4) Reaaliaikainen päivittyminen
- Kun yksi käyttäjä lisää/muokkaa/poistaa, muut näkevät muutokset reaaliajassa
- Konfliktien minimointi (last-write-wins tms.) *(selvitetään)*

### 5) GPS: lähimmän halutun kaupan haku
- “Etsi lähin kauppa” -toiminto sijainnin perusteella
- Valittavissa kauppaketju / kauppatyyppi *(selvitetään)*
- Avataan reitti karttasovellukseen

### 6) Offline-tuki (MVP+)
- Sovellus näyttää **viimeisimmän synkatun** kauppalapun, vaikka internet-yhteys katkeaa
- Käyttöliittymä näyttää yhteyden/synkkauksen tilan: **Synkattu / Synkronoidaan / Offline**
- *(Valinnainen laajennus)* Offline-muutokset jonoutetaan ja synkataan automaattisesti, kun yhteys palautuu

### 7) Perustoiminnot (CRUD)
- Luo / lue / päivitä / poista:
  - kauppalistat
  - kategoriat
  - tuotteet

---

## Projektin vaatimukset ja miten ne täyttyvät

> **Huom:** Alla on yleinen kouluprojektin vaatimusrunko. Vaihtakaa vasemman sarakkeen vaatimukset täsmälleen kurssin/tehtävänannon mukaisiksi.

| Vaatimus (muokkaa) | Miten toteutuu tässä projektissa | Missä näkyy / esimerkki |
|---|---|---|
| Cross-platform mobiilisovellus | React Native (iOS + Android samasta koodista) | `/apps/mobile` tai projektin root |
| Käyttäjien yhteiskäyttö / ryhmätoiminnallisuus | Ryhmät, yhteiset listat | Ryhmänäkymä + jäsenlista |
| Reaaliaikaisuus | Listojen synkronointi reaaliaikaisesti (esim. Firestore/Supabase) | “muutos näkyy heti” demo |
| CRUD-toiminnot | Listat, kategoriat, tuotteet | Lisää/Muokkaa/Poista -toiminnot |
| Selkeä UI/UX ja käytettävyys | Kategoriat, nopea lisäys, selkeä listaus | Kotinäkymä + listanäkymä |
| Laitteen ominaisuuden hyödyntäminen | GPS-sijainti “lähin kauppa” -hakuun | Sijaintilupa + hakutoiminto |
| Toimii heikossa verkossa / offline | Näyttää viimeisimmän synkatun datan offline-tilassa (välimuisti) | Demo: katkaise netti → lista näkyy edelleen |
| Tietosuoja huomioitu | Sijaintia käytetään vain pyydettäessä, minimidatan periaate | Tietosuojasivu + lupatekstit |
| Dokumentointi | README + (valinnainen) arkkitehtuuri/diagr. | Tämä README |
| Versiohallinta ja työnjako | Git, branchit, PR:t, issue-tracking | GitHub/GitLab |

### Käyttötapaus-esimerkki (User Story)
**Käyttäjänä** haluan lisätä tuotteita yhteiseen kauppalistaan, **jotta** perhe näkee reaaliajassa mitä pitää ostaa.

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
- Reaaliaikainen backend: esim. Firebase Firestore
- Kartta/paikkatieto: esim. Expo Location + Places API
- 
---

## Käyttöönotto

### Esivaatimukset
- Node.js (LTS)
- Git
- Expo Go puhelimeen testaukseen

### Asennus
```bash
git clone <repo-url>
cd <repo>
npm install




