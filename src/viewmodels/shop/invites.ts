import type { Firestore } from "firebase/firestore"
import { doc, getDoc, runTransaction, arrayUnion, setDoc, serverTimestamp } from "../../../firebase/Config"
import type { InviteDoc, ListDoc } from "./types"

// makeCode:
// - luo satunnaisen 6-merkkisen koodin (esim. "K3J9QW")
// - koodi ei ole “matemaattisesti varma” uniikki, siksi tarkistetaan Firestoresta
const makeCode = () => Math.random().toString(36).slice(2, 8).toUpperCase()

// createInviteCodeForList:
// Tarkoitus:
// - luo listalle “kutsukoodi”, jolla toinen käyttäjä voi liittyä listaan.
//
// Miten toimii:
// 1) Varmistaa, että kutsun luoja (uid) on listan jäsen.
// 2) Generoi koodin ja tarkistaa, ettei invites/{CODE} ole jo olemassa.
// 3) Tallentaa invites/{CODE} -dokumentin (listId + createdBy + createdAt).
//
// Miksi max 5 yritystä?
// - satunnaiskoodi voi joskus osua olemassa olevaan -> kokeillaan uudestaan
export async function createInviteCodeForList(db: Firestore, uid: string, listId: string) {
  // Varmistetaan jäsenyys: ettei kuka tahansa voi luoda kutsua mihin tahansa listaan
  const listRef = doc(db, "lists", listId)
  const listSnap = await getDoc(listRef)
  if (!listSnap.exists()) return null

  const list = listSnap.data() as Partial<ListDoc>
  if (!Array.isArray(list.memberIds) || !list.memberIds.includes(uid)) return null

  for (let i = 0; i < 5; i++) {
    const code = makeCode()

    // Koodi toimii document id:nä -> invites/{CODE}
    const inviteRef = doc(db, "invites", code)

    // Tarkistetaan, ettei koodi ole jo käytössä
    const existing = await getDoc(inviteRef)
    if (existing.exists()) continue

    // Tallennetaan kutsu
    await setDoc(inviteRef, {
      listId,
      createdBy: uid,
      createdAt: serverTimestamp(),
    } satisfies InviteDoc)

    return code
  }

  // Jos 5 yritystä ei tuottanut uniikkia koodia -> palautetaan null (UI voi näyttää virheen)
  return null
}

// joinListByCode:
// Tarkoitus:
// - käyttäjä syöttää koodin ja liittyy listaan.
//
// Miten toimii:
// - haetaan invites/{CODE}
// - jos löytyy:
//   - lisätään uid listan memberIds-taulukkoon (arrayUnion estää tuplauksen)
//   - asetetaan käyttäjän listajärjestys orderBy[uid] = 999999 (eli “loppuun”)
//   - poistetaan invites/{CODE}, ettei samaa koodia voi käyttää uudestaan
//
// Miksi runTransaction?
// - atomisuus: kaikki tapahtuu “yhtenä pakettina”
// - vältetään tilanne, jossa käyttäjä lisätään listaan, mutta kutsu ei poistukaan (tai päinvastoin)
export async function joinListByCode(db: Firestore, uid: string, codeRaw: string) {
  const code = codeRaw.trim().toUpperCase()
  if (!code) return null

  const listId = await runTransaction(db, async (tx) => {
    // 1) Haetaan kutsu
    const inviteRef = doc(db, "invites", code)
    const inviteSnap = await tx.get(inviteRef)
    if (!inviteSnap.exists()) throw new Error("Kutsua ei löydy")

    const inv = inviteSnap.data() as Partial<InviteDoc>
    if (typeof inv.listId !== "string") throw new Error("Kutsu on virheellinen")

    // 2) Päivitetään lista: lisätään käyttäjä jäseneksi + annetaan oletusjärjestys
    const listRef = doc(db, "lists", inv.listId)
    tx.update(listRef, {
      memberIds: arrayUnion(uid),
      [`orderBy.${uid}`]: 999999,
    })

    // 3) Poistetaan kutsu käytön jälkeen
    tx.delete(inviteRef)

    return inv.listId
  })

  return listId
}
