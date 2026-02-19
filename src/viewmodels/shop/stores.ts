// src/viewmodels/shop/stores.ts
//
// STORES = käyttäjän omat kaupat polussa users/{uid}/stores.
// Tämä tiedosto sisältää Firestore-operaatiot (create/delete).

import type { Firestore } from "firebase/firestore"
import { addDoc, collection, deleteDoc, doc, serverTimestamp } from "../../../firebase/Config"
import type { StoreDoc } from "./types"

export async function createStoreDoc(params: {
  db: Firestore
  uid: string
  name: string
  branch?: string
}): Promise<void> {
  const { db, uid, name, branch } = params

  await addDoc(collection(db, "users", uid, "stores"), {
    name,
    branch: branch?.trim() ?? null,
    createdAt: serverTimestamp(),
  } satisfies StoreDoc)
}

// HUOM: jos jokin lista viittaa tähän storeId:hen,
// se ei päivity automaattisesti (UI voi näyttää "kauppaa ei löydy").
export async function deleteStoreDoc(params: {
  db: Firestore
  uid: string
  storeId: string
}): Promise<void> {
  const { db, uid, storeId } = params
  await deleteDoc(doc(db, "users", uid, "stores", storeId))
}
