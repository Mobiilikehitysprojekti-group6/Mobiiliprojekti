// src/viewmodels/shop/categories.ts
//
// KATEGORIAT = listan omat kategoriat polussa /lists/{listId}/categories.
//
// Tässä tiedostossa on vain Firestore-työt:
// - reaaliaikainen kuuntelu (subscribe)
// - lisäys (add)
// - järjestyksen tallennus (reorder)
//
// UI:n optimistiset state-päivitykset (eli “näytä heti”) tehdään ShopVMContextissa.

import type { Firestore } from "firebase/firestore"
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  doc,
  writeBatch,
} from "../../../firebase/Config"
import type { Category, CategoryDoc } from "./types"

// Reaaliaikainen kuuntelu listan kategorioille.
// Palauttaa unsubscribe-funktion.
export function subscribeCategories(params: {
  db: Firestore
  listId: string
  onCategories: (cats: Category[]) => void
  onError?: (err: unknown) => void
}): () => void {
  const { db, listId, onCategories, onError } = params

  const ref = collection(db, "lists", listId, "categories")
  const q = query(ref, orderBy("order", "asc"))

  const unsub = onSnapshot(
    q,
    (snap) => {
      const next: Category[] = snap.docs
        .map((d) => {
          const data = d.data() as Partial<CategoryDoc>
          if (typeof data.name !== "string") return null
          const order = typeof data.order === "number" ? data.order : 0
          return { id: d.id, name: data.name, order } satisfies Category
        })
        .filter((x): x is Category => x !== null)

      onCategories(next)
    },
    (err) => onError?.(err)
  )

  return unsub
}

// Lisää uuden kategorian listalle (order annetaan valmiina).
export async function addCategoryDoc(params: {
  db: Firestore
  listId: string
  name: string
  order: number
}): Promise<void> {
  const { db, listId, name, order } = params

  await addDoc(collection(db, "lists", listId, "categories"), {
    name,
    order,
    createdAt: serverTimestamp(),
  } satisfies CategoryDoc)
}

// Miksi chunkSize 450?
// - Firestore batch commitissa on raja (500 operaatiota)
// - jätetään marginaali, jotta ei ylitetä rajaa vahingossa
export async function reorderCategoriesDb(params: {
  db: Firestore
  listId: string
  nextIds: string[]
}): Promise<void> {
  const { db, listId, nextIds } = params

  const chunkSize = 450
  for (let i = 0; i < nextIds.length; i += chunkSize) {
    const batch = writeBatch(db)
    nextIds.slice(i, i + chunkSize).forEach((id, localIndex) => {
      const order = i + localIndex
      batch.update(doc(db, "lists", listId, "categories", id), { order })
    })
    await batch.commit()
  }
}
