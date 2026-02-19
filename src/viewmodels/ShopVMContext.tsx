// src/viewmodels/ShopVMContext.tsx

// Tämä on sovelluksen ViewModel/Context: yksi paikka, josta UI saa
// ostoslistoihin liittyvän tilan ja toiminnot.
//
// UI saa täältä:
// - käyttäjän (Firebase Auth) ja uid:n
// - stores: käyttäjän omat “kaupat” (users/{uid}/stores)
// - lists: jaettavat listat (/lists, jäsenyys memberIds-taulukosta)
// - categories + items: listan alakokoelmista (/lists/{listId}/categories ja /items)
//
// Tärkeä periaate tässä tiedostossa:
// - ShopVMContext sisältää UI:n kannalta tärkeät “wrapperit” ja state-päivitykset
// - Varsinaiset Firestore-operaatiot on siirretty pienempiin shop/* tiedostoihin

//FIRESTORE-MALLI (rakenne):
// 
// 1) Listat (yhteiset, jaettavat):
//    /lists/{listId}
//       - name: listan nimi
//       - storeId: (valinnainen) viite käyttäjän omaan storeen
//       - ownerId: listan omistajan uid
//       - memberIds: uid-taulukko -> ketkä näkee listan
//       - orderBy: { [uid]: number } -> jokaisella käyttäjällä oma listajärjestys
//
// 2) Kategoriat (listakohtaiset):
//    /lists/{listId}/categories/{categoryId}
//       - name: kategorian nimi
//       - order: järjestysnumero listan sisällä
//
// 3) Itemit (listakohtaiset):
//    /lists/{listId}/items/{itemId}
//       - name: tuotteen nimi
//       - done: onko “ruksattu”
//       - categoryId: mihin kategoriaan kuuluu (tai null = ei kategoriaa)
//       - order: järjestysnumero kategorian/ listan sisällä
//       - quantity: määrä (min 1)
//
// 4) Kutsut (invites):
//    /invites/{CODE}
//       - listId: mihin listaan kutsu liittyy
//       - createdBy: kuka loi kutsun
//
// 
// (HUOMIO: stores on edelleen käyttäjäkohtainen)
// 
// /users/{uid}/stores/{storeId}
//  - name, branch
//
// Tällä mallilla listat ovat jaettavia (/lists), mutta “kauppavalinnat” voivat
// olla käyttäjäkohtaisia (stores). StoreId on vain string-viite listassa.

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react"
import type { User } from "firebase/auth"

import {
  auth,
  db,

  // Auth-toiminnot
  onAuthStateChanged,
  signInAnonymously,
} from "../../firebase/Config"

// Tyypit on eriytetty omaan tiedostoon (shop/types.ts),
// jotta ViewModel ei paisu pelkistä type-määrittelyistä.
import type { VM, Store, ShopList, Category, ListItem } from "./shop/types"
export type { Store, ShopList, Category, ListItem } from "./shop/types"

// Seed (oletuskategoriat) ja kutsulogiikka omissa tiedostoissaan.
import { ensureDefaultListCategories } from "./shop/seed"
import { createInviteCodeForList as createInviteCodeForListSvc, joinListByCode as joinListByCodeSvc } from "./shop/invites"

// Listojen Firestore-operaatiot omassa tiedostossa.
import { createListDoc, deleteListDeep, reorderListsForUser } from "./shop/lists"

// Itemien Firestore-operaatiot omassa tiedostossa.
import {
  subscribeItems as subscribeItemsSvc,
  addItemDoc,
  updateItemDoc,
  deleteItemDoc,
  reorderItemsInCategoryDb,
  setItemQuantity,
} from "./shop/items"

// Kategorioiden Firestore-operaatiot omassa tiedostossa.
import { subscribeCategories as subscribeCategoriesSvc, addCategoryDoc, reorderCategoriesDb } from "./shop/categories"

// Stores-toiminnot omassa tiedostossa.
import { createStoreDoc, deleteStoreDoc } from "./shop/stores"

// Reaaliaikaiset kuuntelut (stores + lists) omassa tiedostossa.
import { subscribeStores, subscribeLists } from "./shop/subscriptions"

// Context sisältää VM:n. Ilman Provideria arvo on null -> hook heittää selkeän virheen.
const Ctx = createContext<VM | null>(null)

export function ShopVMProvider({ children }: { children: React.ReactNode }) {
  // Auth state:
  // - user: Firebase Authin User-objekti (voi olla null)
  // - uid: user.uid erikseen stringinä, jotta sitä on helppo käyttää kaikkialla
  const [user, setUser] = useState<User | null>(null)
  const [uid, setUid] = useState<string | null>(null)

  // Päädata:
  // - stores: käyttäjän omat kaupat (users/{uid}/stores)
  // - lists: listat joihin käyttäjä kuuluu (/lists where memberIds contains uid)
  const [stores, setStores] = useState<Store[]>([])
  const [lists, setLists] = useState<ShopList[]>([])

  // Listakohtainen data mappeina:
  // - categoriesByListId[listId] = Category[]
  // - itemsByListId[listId] = ListItem[]
  //
  // Map-rakenne on nopea: UI saa suoraan “tämän listan” datan ilman suodatusta.
  const [categoriesByListId, setCategoriesByListId] = useState<Record<string, Category[]>>({})
  const [itemsByListId, setItemsByListId] = useState<Record<string, ListItem[]>>({})

  // Seedaus-esto (vain session ajaksi):
  // Ref on tärkeä, koska:
  // - se ei aiheuta rerenderiä
  // - se säilyy elossa Providerin elinkaaren ajan
  const seededListIdsRef = useRef<Set<string>>(new Set())

  // Apuri: poistaa listatuplikaatit id:n perusteella.
  // Tätä tarvitaan, koska createList tekee optimistisen lisäyksen, ja sen jälkeen
  // snapshot voi tuoda saman listan uudestaan -> hetkellinen duplikaatti.
  const dedupeLists = (arr: ShopList[]) => {
    const m = new Map<string, ShopList>()
    for (const l of arr) m.set(l.id, l)
    return Array.from(m.values())
  }

  // AUTH:
  // - kuunnellaan kirjautumistilaa
  // - jos käyttäjää ei ole, kirjaudutaan anonyymisti
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u)
        setUid(u.uid)
        return
      }

      try {
        const cred = await signInAnonymously(auth)
        setUser(cred.user)
        setUid(cred.user.uid)
      } catch (e) {
        console.error("Anonymous sign-in failed:", e)
      }
    })

    return unsub
  }, [])

  // SNAPSHOTS:
  // Kun uid on tiedossa, käynnistetään reaaliaikaiset kuuntelut:
  // - stores: käyttäjän omat kaupat
  // - lists: listat, joissa käyttäjä on jäsen
  useEffect(() => {
    if (!uid) return

    const unsubStores = subscribeStores({
      db,
      uid,
      onStores: (next) => setStores(next),
      onError: (err) => console.error("Stores onSnapshot error:", err),
    })

    const unsubLists = subscribeLists({
      db,
      uid,
      onLists: (next) => setLists(dedupeLists(next)),
      onError: (err) => console.error("Lists onSnapshot error:", err),
    })

    return () => {
      unsubStores()
      unsubLists()
    }
  }, [uid])

  /* STORES */

  const createStore = async (name: string, branch?: string) => {
    if (!uid) return
    const trimmed = name.trim()
    if (!trimmed) return
    await createStoreDoc({ db, uid, name: trimmed, branch })
  }

  const deleteStore = async (storeId: string) => {
    if (!uid) return
    await deleteStoreDoc({ db, uid, storeId })
  }

  /* LISTS */

  const createList = async (name: string, storeId: string | null) => {
    if (!uid) return null

    const trimmed = name.trim()
    if (!trimmed) return null

    // Käyttäjäkohtainen järjestysnumero tälle uudelle listalle.
    // Jos listoja ei ole, currentMax = -1 -> nextOrder = 0.
    const currentMax = lists.reduce((m, l) => Math.max(m, l.order), -1)
    const nextOrder = currentMax + 1

    // 1) Luodaan listadokumentti Firestoreen
    const listId = await createListDoc({
      db,
      uid,
      name: trimmed,
      storeId: storeId ?? null,
      orderForUser: nextOrder,
    })

    // 2) Optimistinen UI: lisätään lista heti stateen
    setLists((prev) => {
      const merged = dedupeLists([
        ...prev,
        { id: listId, name: trimmed, storeId: storeId ?? null, order: nextOrder, ownerId: uid, memberIds: [uid] },
      ])
      return merged.sort((a, b) => a.order - b.order)
    })

    // 3) Seedaus: oletuskategoriat, jos listalla ei ole vielä yhtään kategoriaa
    await ensureDefaultListCategories(db, listId, seededListIdsRef.current)

    return listId
  }

  const deleteList = async (listId: string) => {
    if (!uid) return
    await deleteListDeep({ db, listId })
  }

  const reorderLists = async (nextListIds: string[]) => {
    if (!uid) return
    await reorderListsForUser({ db, uid, nextListIds })
  }

  /* INVITES */

  // Wrapperit:
  // - varmistetaan uid
  // - delegoidaan Firestore-työ invites.ts tiedostolle
  const createInviteCodeForList = async (listId: string) => {
    if (!uid) return null
    return createInviteCodeForListSvc(db, uid, listId)
  }

  const joinListByCode = async (code: string) => {
    if (!uid) return null
    return joinListByCodeSvc(db, uid, code)
  }

  /* CATEGORIES */

  const subscribeCategoriesForList = (listId: string) => {
    if (!uid) return () => { }

    // Varmistetaan oletuskategoriat (vain kerran per lista / sessio)
    ensureDefaultListCategories(db, listId, seededListIdsRef.current)

    const unsub = subscribeCategoriesSvc({
      db,
      listId,
      onCategories: (next) => setCategoriesByListId((prev) => ({ ...prev, [listId]: next })),
      onError: (err) => console.error("Categories onSnapshot error:", err),
    })

    return () => {
      unsub()
      setCategoriesByListId((prev) => {
        const copy = { ...prev }
        delete copy[listId]
        return copy
      })
    }
  }

  const createCategoryForList = async (listId: string, name: string) => {
    if (!uid) return
    const trimmed = name.trim()
    if (!trimmed) return

    const current = categoriesByListId[listId] ?? []
    const maxOrder = current.reduce((m, c) => Math.max(m, c.order), -1)
    const nextOrder = maxOrder + 1

    await addCategoryDoc({ db, listId, name: trimmed, order: nextOrder })
  }

  const reorderCategoriesForList = async (listId: string, nextIds: string[]) => {
    if (!uid) return

    // Optimistinen UI: päivitetään orderit lokaaliin stateen heti
    setCategoriesByListId((prev) => {
      const current = prev[listId] ?? []
      const byId = new Map(current.map((c) => [c.id, c]))
      const next = nextIds
        .map((id, index) => {
          const c = byId.get(id)
          return c ? { ...c, order: index } : null
        })
        .filter((x): x is Category => x !== null)
      return { ...prev, [listId]: next }
    })

    await reorderCategoriesDb({ db, listId, nextIds })
  }

  /* ITEMS */

  const subscribeItems = (listId: string) => {
    if (!uid) return () => { }

    const unsub = subscribeItemsSvc({
      db,
      listId,
      onItems: (next) => setItemsByListId((prev) => ({ ...prev, [listId]: next })),
      onError: (err) => console.error("Items onSnapshot error:", err),
    })

    return () => {
      unsub()
      setItemsByListId((prev) => {
        const copy = { ...prev }
        delete copy[listId]
        return copy
      })
    }
  }

  const addItem = async (listId: string, name: string, categoryId: string | null) => {
    if (!uid) return
    const trimmed = name.trim()
    if (!trimmed) return

    const current = itemsByListId[listId] ?? []
    const maxOrder = current.reduce((m, it) => Math.max(m, it.order), -1)
    const nextOrder = maxOrder + 1

    await addItemDoc({ db, listId, name: trimmed, categoryId, order: nextOrder })
  }

  const updateItem = async (
    listId: string,
    itemId: string,
    patch: Partial<Pick<ListItem, "name" | "done" | "categoryId" | "order" | "quantity">>
  ) => {
    if (!uid) return

    // Firestoreen ei kannata lähettää undefined-arvoja,
    // joten rakennetaan patch puhtaaksi.
    const out: any = {}
    if (patch.name !== undefined) out.name = patch.name
    if (patch.done !== undefined) out.done = patch.done
    if (patch.categoryId !== undefined) out.categoryId = patch.categoryId
    if (patch.order !== undefined) out.order = patch.order
    if (patch.quantity !== undefined) out.quantity = patch.quantity

    await updateItemDoc({ db, listId, itemId, patch: out })
  }

  const deleteItem = async (listId: string, itemId: string) => {
    if (!uid) return
    await deleteItemDoc({ db, listId, itemId })
  }

  const changeQuantity = async (listId: string, itemId: string, delta: number) => {
    if (!uid) return

    const current = itemsByListId[listId]?.find((i) => i.id === itemId)
    const next = Math.max(1, (current?.quantity ?? 1) + delta)

    // Optimistinen UI: päivitys näkyy heti
    setItemsByListId((prev) => ({
      ...prev,
      [listId]: (prev[listId] ?? []).map((it) => (it.id === itemId ? { ...it, quantity: next } : it)),
    }))

    await setItemQuantity({ db, listId, itemId, quantity: next })
  }

  const reorderItemsInCategory = async (listId: string, categoryId: string | null, nextItemIds: string[]) => {
    if (!uid) return

    // Optimistinen UI: rakennetaan uusi järjestys vain tälle kategorialle
    setItemsByListId((prev) => {
      const all = prev[listId] ?? []
      const catKey = categoryId ?? null

      const inCat = all.filter((it) => it.categoryId === catKey)
      const outCat = all.filter((it) => it.categoryId !== catKey)

      const byId = new Map(inCat.map((it) => [it.id, it]))
      const nextInCat = nextItemIds
        .map((id, index) => {
          const it = byId.get(id)
          return it ? { ...it, order: index, categoryId: catKey } : null
        })
        .filter((x): x is ListItem => x !== null)

      return { ...prev, [listId]: [...outCat, ...nextInCat] }
    })

    await reorderItemsInCategoryDb({ db, listId, categoryId, nextItemIds })
  }

  /* HELPERS */

  const getStoreLabel = (storeId: string | null) => {
    if (!storeId) return undefined
    const s = stores.find((x) => x.id === storeId)
    if (!s) return undefined
    return s.branch ? `${s.name} (${s.branch})` : s.name
  }

  const isOwnerOfList = (list: ShopList) => {
    return !!uid && list.ownerId === uid
  }

  // Contextin arvo tallennetaan memoon, jotta UI ei renderöidy turhaan
  const value = useMemo<VM>(
    () => ({
      user,
      uid,

      stores,
      lists,
      categoriesByListId,
      itemsByListId,

      createStore,
      deleteStore,

      createList,
      deleteList,
      reorderLists,

      createInviteCodeForList,
      joinListByCode,

      subscribeCategoriesForList,
      createCategoryForList,
      reorderCategoriesForList,

      subscribeItems,
      addItem,
      updateItem,
      deleteItem,
      reorderItemsInCategory,
      changeQuantity,

      getStoreLabel,
      isOwnerOfList,
    }),
    [user, uid, stores, lists, categoriesByListId, itemsByListId]
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useShopVM() {
  const v = useContext(Ctx)
  if (!v) throw new Error("useShopVM must be used inside ShopVMProvider")
  return v
}
