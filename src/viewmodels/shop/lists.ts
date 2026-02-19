// src/viewmodels/shop/lists.ts
//
// Tämä tiedosto hoitaa LISTOIHIN liittyvät Firestore-operaatiot.
// Huom: optimistinen UI (setLists) jätetään ShopVMContextiin,
// jotta React-state ei ala vuotaa tänne.

import type { Firestore } from "firebase/firestore"
import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  deleteDoc,
  doc,
  writeBatch,
} from "../../../firebase/Config"
import type { ListDoc } from "./types"

// Luo uuden listadokumentin /lists-kokoelmaan.
// Palauttaa luodun listan id:n.
export async function createListDoc(params: {
  db: Firestore
  uid: string
  name: string
  storeId: string | null
  orderForUser: number
}): Promise<string> {
  const { db, uid, name, storeId, orderForUser } = params

  const ref = await addDoc(collection(db, "lists"), {
    name,
    storeId: storeId ?? null,
    ownerId: uid,
    memberIds: [uid],
    orderBy: { [uid]: orderForUser },
    createdAt: serverTimestamp(),
  } satisfies ListDoc)

  return ref.id
}

// Poistaa listan ja sen alakokoelmat:
// - /lists/{listId}/items
// - /lists/{listId}/categories
// - /lists/{listId}
// Miksi pitää poistaa myös subcollectionit?
// - Firestore ei poista alakokoelmia automaattisesti
// - muuten items/categories jäisivät “orvoiksi” tietokantaan
export async function deleteListDeep(params: { db: Firestore; listId: string }): Promise<void> {
  const { db, listId } = params

  // Poista items
  const itemsRef = collection(db, "lists", listId, "items")
  const itemsSnap = await getDocs(itemsRef)
  const itemDocs = itemsSnap.docs

  // Poista categories
  const catsRef = collection(db, "lists", listId, "categories")
  const catsSnap = await getDocs(catsRef)
  const catDocs = catsSnap.docs

  // Batchin maksimi on 500 operaatiota -> käytetään 450 varmuuden vuoksi
  const chunkSize = 450

  for (let i = 0; i < itemDocs.length; i += chunkSize) {
    const batch = writeBatch(db)
    itemDocs.slice(i, i + chunkSize).forEach((d) => batch.delete(d.ref))
    await batch.commit()
  }

  for (let i = 0; i < catDocs.length; i += chunkSize) {
    const batch = writeBatch(db)
    catDocs.slice(i, i + chunkSize).forEach((d) => batch.delete(d.ref))
    await batch.commit()
  }

  await deleteDoc(doc(db, "lists", listId))
}

// Tallentaa listojen järjestyksen yhdelle käyttäjälle (orderBy.{uid})
export async function reorderListsForUser(params: {
  db: Firestore
  uid: string
  nextListIds: string[]
}): Promise<void> {
  const { db, uid, nextListIds } = params

  const batch = writeBatch(db)
  nextListIds.forEach((id, idx) => {
    batch.update(doc(db, "lists", id), {
      [`orderBy.${uid}`]: idx,
    })
  })
  await batch.commit()
}
