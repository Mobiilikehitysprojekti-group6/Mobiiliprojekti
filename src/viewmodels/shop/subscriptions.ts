// src/viewmodels/shop/subscriptions.ts
//
// Tämä tiedosto sisältää Firestore-kuuntelut (onSnapshot) listoille ja storeille.
// Tärkeä idea:
// - tämä tiedosto ei käytä Reactia
// - se ottaa callbackit (onStores/onLists), joihin VM/Provider voi laittaa setState-kutsut

import type { Firestore } from "firebase/firestore"
import { collection, onSnapshot, orderBy, query, where } from "../../../firebase/Config"
import type { ListDoc, ShopList, Store, StoreDoc } from "./types"

// subscribeStores:
// - kuuntelee käyttäjän omia storeja polusta users/{uid}/stores
// - järjestää uusimman ensin createdAt:n mukaan
// - muuntaa Firestore-datan UI:n Store-tyyppiin
//
// Palauttaa unsubscribe-funktion.
export function subscribeStores(params: {
  db: Firestore
  uid: string
  onStores: (stores: Store[]) => void
  onError?: (err: unknown) => void
}): () => void {
  const { db, uid, onStores, onError } = params

  const storesRef = collection(db, "users", uid, "stores")
  const storesQ = query(storesRef, orderBy("createdAt", "desc"))

  const unsub = onSnapshot(
    storesQ,
    (snap) => {
      const next: Store[] = snap.docs
        .map((d) => {
          const data = d.data() as Partial<StoreDoc>
          if (typeof data.name !== "string") return null

          return {
            id: d.id,
            name: data.name,
            // branch on optional: lisätään vain jos se on string
            ...(typeof data.branch === "string" ? { branch: data.branch } : {}),
          } satisfies Store
        })
        .filter((x): x is Store => x !== null)

      onStores(next)
    },
    (err) => onError?.(err)
  )

  return unsub
}

// subscribeLists:
// - kuuntelee /lists-kokoelmaa ja hakee ne listat, joissa uid on jäsen
// - jäsenyys löytyy memberIds-taulukosta (array-contains uid)
// - järjestys on käyttäjäkohtainen: orderBy[uid]
//
// Palauttaa unsubscribe-funktion.
export function subscribeLists(params: {
  db: Firestore
  uid: string
  onLists: (lists: ShopList[]) => void
  onError?: (err: unknown) => void
}): () => void {
  const { db, uid, onLists, onError } = params

  const listsRef = collection(db, "lists")
  const listsQ = query(listsRef, where("memberIds", "array-contains", uid))

  const unsub = onSnapshot(
    listsQ,
    (snap) => {
      const next = snap.docs
        .map((d) => {
          const data = d.data() as Partial<ListDoc>

          // Perusvarmistukset: jos data on “rikki”, jätetään dokumentti välistä
          if (typeof data.name !== "string") return null
          if (typeof data.ownerId !== "string") return null
          if (!Array.isArray(data.memberIds)) return null

          // storeId voi olla string tai null (tai puuttua)
          const storeId =
            typeof data.storeId === "string"
              ? data.storeId
              : data.storeId === null
                ? null
                : null

          // Käyttäjäkohtainen järjestysnumero: orderBy[uid]
          const orderByMap = (data.orderBy ?? {}) as Record<string, number>
          const order = typeof orderByMap[uid] === "number" ? orderByMap[uid] : 999999

          return {
            id: d.id,
            name: data.name,
            storeId,
            order,
            ownerId: data.ownerId,
            memberIds: data.memberIds.filter((x): x is string => typeof x === "string"),
          } satisfies ShopList
        })
        .filter((x): x is ShopList => x !== null)
        .sort((a, b) => a.order - b.order)

      onLists(next)
    },
    (err) => onError?.(err)
  )

  return unsub
}
