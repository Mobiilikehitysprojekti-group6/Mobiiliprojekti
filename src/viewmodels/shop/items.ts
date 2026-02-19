// src/viewmodels/shop/items.ts
//
// Tämä tiedosto hoitaa ITEMEIHIN liittyvät Firestore-operaatiot.
// HUOM:
// - UI:n optimistiset state-päivitykset tehdään ShopVMContextissa.
// - Tämä tiedosto tekee vain “tietokantatyöt”: kuuntelu, lisäys, päivitys, poisto, reorder.

import type { Firestore } from "firebase/firestore"
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  doc,
  writeBatch,
} from "../../../firebase/Config"
import type { ItemDoc, ListItem } from "./types"

// subscribeItems:
// - kuuntelee listan items-alakokoelmaa reaaliajassa
// - järjestää dokumentit order-kentän mukaan
// - muuntaa Firestore-datan UI:n ListItem-tyyppiin
// - kutsuu onItems callbackia aina kun data muuttuu
//
// Palauttaa unsubscribe-funktion (UI kutsuu tätä kun poistutaan näkymästä).
export function subscribeItems(params: {
  db: Firestore
  listId: string
  onItems: (items: ListItem[]) => void
  onError?: (err: unknown) => void
}): () => void {
  const { db, listId, onItems, onError } = params

  const ref = collection(db, "lists", listId, "items")
  const q = query(ref, orderBy("order", "asc"))

  const unsub = onSnapshot(
    q,
    (snap) => {
      const next: ListItem[] = snap.docs
        .map((d) => {
          const data = d.data() as Partial<ItemDoc>
          if (typeof data.name !== "string") return null

          return {
            id: d.id,
            name: data.name,
            done: !!data.done,

            // categoryId voi olla string tai null
            categoryId:
              typeof data.categoryId === "string"
                ? data.categoryId
                : data.categoryId === null
                  ? null
                  : null,

            order: typeof data.order === "number" ? data.order : 0,

            // quantity oletuksena 1, jos kenttä puuttuu
            quantity: typeof data.quantity === "number" ? data.quantity : 1,
          } satisfies ListItem
        })
        .filter((x): x is ListItem => x !== null)

      onItems(next)
    },
    (err) => onError?.(err)
  )

  return unsub
}

// addItemDoc:
// - lisää uuden itemin listalle
// - done alkaa false
// - quantity alkaa 1
// - order annetaan valmiina (UI laskee max+1)
export async function addItemDoc(params: {
  db: Firestore
  listId: string
  name: string
  categoryId: string | null
  order: number
}): Promise<void> {
  const { db, listId, name, categoryId, order } = params

  await addDoc(collection(db, "lists", listId, "items"), {
    name,
    done: false,
    categoryId: categoryId ?? null,
    order,
    quantity: 1,
    createdAt: serverTimestamp(),
  } satisfies ItemDoc)
}

// updateItemDoc:
// - päivittää itemin kenttiä (vain patchin kentät muuttuvat)
// - patchin rakentaminen tehdään ShopVMContextissa, jotta undefined-arvoja ei lähetetä
export async function updateItemDoc(params: {
  db: Firestore
  listId: string
  itemId: string
  patch: Partial<ItemDoc>
}): Promise<void> {
  const { db, listId, itemId, patch } = params
  await updateDoc(doc(db, "lists", listId, "items", itemId), patch)
}

// deleteItemDoc:
// - poistaa yhden item-dokumentin
export async function deleteItemDoc(params: {
  db: Firestore
  listId: string
  itemId: string
}): Promise<void> {
  const { db, listId, itemId } = params
  await deleteDoc(doc(db, "lists", listId, "items", itemId))
}

// setItemQuantity:
// - asettaa itemin määrän (quantity) tiettyyn arvoon
export async function setItemQuantity(params: {
  db: Firestore
  listId: string
  itemId: string
  quantity: number
}): Promise<void> {
  const { db, listId, itemId, quantity } = params
  await updateDoc(doc(db, "lists", listId, "items", itemId), { quantity })
}

// reorderItemsInCategoryDb:
// - tallentaa UI:n antaman järjestyksen Firestoreen
// - koskee vain yhden kategorian itemeitä kerrallaan
//
// Miksi chunkSize?
// - Firestore batch commitissa on raja (500 operaatiota)
// - jätetään marginaali ja tehdään päivitykset esim. 450 kerrallaan
export async function reorderItemsInCategoryDb(params: {
  db: Firestore
  listId: string
  categoryId: string | null
  nextItemIds: string[]
}): Promise<void> {
  const { db, listId, categoryId, nextItemIds } = params

  const chunkSize = 450

  for (let i = 0; i < nextItemIds.length; i += chunkSize) {
    const batch = writeBatch(db)

    nextItemIds.slice(i, i + chunkSize).forEach((id, localIndex) => {
      const order = i + localIndex
      batch.update(doc(db, "lists", listId, "items", id), {
        order,
        categoryId: categoryId ?? null,
      })
    })

    await batch.commit()
  }
}
