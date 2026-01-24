// src/viewmodels/ShopVMContext.tsx, sisältää kaiken Firebase-logiikan

import React, { createContext, useContext, useEffect, useMemo, useState } from "react"
import type { User } from "firebase/auth" //tämä on vain tyyppi, voidaan tuoda suoraan tänne, ei Configiin

/**
 * Kaikki Firebase/Firestore-funktiot tuodaan Config.ts:stä
 */
import {
  auth,
  db,
  onAuthStateChanged,
  signInAnonymously,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
  writeBatch,
} from "../../firebase/Config"
import { store } from "expo-router/build/global-state/router-store";


/*  Data-tyypit: mitä tietoa talletetaan ja näytetään UI:ssa */

/**
 * Store = käyttäjän luoma "kauppa"
 * Tallennetaan Firestoreen: users/{uid}/stores/{storeDocId}
 */
export type Store = {
  id: string;  // Firestore-dokumentin id
  name: string // Kaupan nimi
}

/**
 * ShopList = ostoslista
 * Tallennetaan Firestoreen: users/{uid}/lists/{listDocId}
 * storeId voi olla null => lista ilman kauppaa
 */
export type ShopList = {
  id: string
  name: string
  storeId: string | null
}

/* Kategoria, jota käytetään kategorioiden drag & drop -järjestelyssä*/
export type Category = {
  id: string
  name: string
  order: number
}
/* Ostos item, categoryId + order käytetään ostosten drag & drop -järjestelyssä */
export type ListItem = {
  id: string
  name: string
  done: boolean
  categoryId: string | null
  order: number
}

/**
 * Nämä kuvaavat Firestore-dokumentin dataa (ilman id:tä).
 * Näin snapshotin d.data() voidaan käsitellä ilman "any":ä.
 */
type StoreDoc = {
  name: string
  createdAt?: unknown // serverTimestamp -> voi olla hetkellisesti "pending"
}

type ListDoc = {
  name: string;
  storeId?: string | null
  createdAt?: unknown
}

type CategoryDoc = {
  name: string
  order: number
  createdAt?: unknown
}

type ItemDoc = {
  name: string
  done: boolean
  categoryId: string | null
  order: number
  createdAt?: unknown
}

/**
 * Kategoria scope key:
 * - store kategoriat: "store:<storeId>"
 * - lista kategoriat: "list:<listId>"
 */
const categoryScopeKey = (storeId: string | null, listId: string) =>
  storeId ? `store:${storeId}` : `list:${listId}`


/*  ViewModelin API: mitä ruudut saavat käyttää */

/**
 * VM = ViewModelin julkinen rajapinta.
 * Ajatus (MVVM):
 * - View (index.tsx, shoplist.tsx) renderöi UI:n ja kutsuu näitä funktioita
 * - ViewModel hoitaa Firestore-polut, kuuntelijat ja CRUD-logiikan
 */
type VM = {
  // Auth
  user: User | null
  uid: string | null

  // Reaaliaikainen data
  stores: Store[]
  lists: ShopList[]

  // Reaaliaikainen cache shoplist-sivulle
  categoriesByScope: Record<string, Category[]>
  itemsByListId: Record<string, ListItem[]>

  // Toiminnot (Firestore kirjoitukset)
  createStore: (name: string) => Promise<void>
  deleteStore: (storeId: string) => Promise<void>

  createList: (name: string, storeId: string | null) => Promise<string | null>
  deleteList: (listId: string) => Promise<void>

  // Kategoria + item API (shoplist käyttää näitä)
  subscribeCategoriesForList: (listId: string, storeId: string | null) => () => void
  createCategoryForList: (listId: string, storeId: string | null, name: string) => Promise<void>

  subscribeItems: (listId: string) => () => void
  addItem: (listId: string, name: string, categoryId: string | null) => Promise<void>
  updateItem: (
    listId: string,
    itemId: string,
    patch: Partial<Pick<ListItem, "name" | "done" | "categoryId" | "order">>
  ) => Promise<void>
  deleteItem: (listId: string, itemId: string) => Promise<void>

  // Helper: storeId -> storeName
  getStoreName: (storeId: string | null) => string | undefined
}

/*  Context + Provider */

/**
 * Context: tämän avulla jaetaan yksi ainoa VM-instanssi koko sovellukselle.
 * Provider luo VM:n ja pitää sitä “ylhäällä” app/_layout.tsx:ssä.
 */
const Ctx = createContext<VM | null>(null)

export function ShopVMProvider({ children }: { children: React.ReactNode }) {

  // 1) Auth statet
  const [user, setUser] = useState<User | null>(null)
  const [uid, setUid] = useState<string | null>(null)

  // 2) Data statet
  const [stores, setStores] = useState<Store[]>([])
  const [lists, setLists] = useState<ShopList[]>([])

  // 3) Kategoriat ja itemit tallennetaan stateihin, joissa on scope key
  const [categoriesByScope, setCategoriesByScope] = useState<Record<string, Category[]>>({})
  const [itemsByListId, setItemsByListId] = useState<Record<string, ListItem[]>>({})

  /**
   * AUTH: Anonyymi kirjautuminen.
   *
   * onAuthStateChanged kuuntelee kirjautumistilaa.
   * - Jos user löytyy -> asetetaan user ja uid stateen
   * - Jos user puuttuu -> signInAnonymously luo anonyymin käyttäjän
   *
   * Miksi tämä on tärkeää?
   * - Firestore-polut on users/{uid}/...
   * - uid pitää olla pysyvä (teillä persistence hoitaa sen), jotta data säilyy reloadissa
   */
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

    // cleanup: kun Provider unmountataan, auth-kuuntelu lopetetaan
    return unsub
  }, [])

  /**
   * SNAPSHOTS: kun uid on tiedossa, käynnistetään Firestore-kuuntelijat.
   *
   * onSnapshot:
   * - hakee heti nykyisen tilanteen
   * - kuuntelee sen jälkeen muutokset reaaliajassa
   *
   * Cleanup palauttaa unsubscribe-funktiot, jotta kuuntelu ei jää päälle turhaan.
   */
  useEffect(() => {
    if (!uid) return


    // 2.1) Kaupat: users/{uid}/stores
    const storesRef = collection(db, "users", uid, "stores")
    const storesQ = query(storesRef, orderBy("createdAt", "desc"))

    const unsubStores = onSnapshot(storesQ, (snap) => {
      /**
       * snap.docs = lista dokumentteja
       * Jokaisesta dokumentista:
       * - d.id = dokumentin id
       * - d.data() = dokumentin kentät (tyypitetään StoreDoc:ksi)
       *
       * Tähän on lisätty “turva”:
       * jos name puuttuisi tai ei olisi string, ohitetaan dokumentti.
       */
      const next: Store[] = snap.docs
        .map((d) => {
          const data = d.data() as Partial<StoreDoc>

          if (typeof data.name !== "string") return null

          return { id: d.id, name: data.name }
        })
        .filter((x): x is Store => x !== null)

      setStores(next)
    })


    // 2.2) Listat: users/{uid}/lists
    const listsRef = collection(db, "users", uid, "lists")
    const listsQ = query(listsRef, orderBy("createdAt", "desc"))

    const unsubLists = onSnapshot(listsQ, (snap) => {
      const next: ShopList[] = snap.docs
        .map((d) => {
          const data = d.data() as Partial<ListDoc>

          if (typeof data.name !== "string") return null

          // storeId voi olla string, null tai puuttua -> tulkitaan nulliksi jos puuttuu
          const storeId =
            typeof data.storeId === "string" ? data.storeId : data.storeId === null ? null : null

          return { id: d.id, name: data.name, storeId }
        })
        .filter((x): x is ShopList => x !== null)

      setLists(next)
    })

    // Cleanup: lopetetaan kuuntelijat kun uid vaihtuu tai Provider unmountataan
    return () => {
      unsubStores()
      unsubLists()
    };
  }, [uid])


  /*  Actions: KAUPAT */

  /**
   * Luo uusi kauppa:
   * - kirjoittaa users/{uid}/stores kokoelmaan
   */
  const createStore = async (name: string) => {
    if (!uid) return

    const trimmed = name.trim()
    if (!trimmed) return

    await addDoc(collection(db, "users", uid, "stores"), {
      name: trimmed,
      createdAt: serverTimestamp(),
    } satisfies StoreDoc)
  }

  /**
   * Poista kauppa:
   *
   * TÄRKEÄ: ennen kaupan poistoa siivotaan listat, joilla storeId == storeId
   * -> storeId asetetaan null
   *
   * Näin listat eivät “osoita” poistettuun kauppaan.
   */
  const deleteStore = async (storeId: string) => {
    if (!uid) return

    // 1) Hae kaikki listat ja etsi ne, joilla on tämä storeId
    const listsRef = collection(db, "users", uid, "lists")
    const listsSnap = await getDocs(listsRef)

    const affected = listsSnap.docs.filter((d) => {
      const data = d.data() as Partial<ListDoc>
      return data.storeId === storeId
    })

    // 2) Päivitä affected-listat batchissa: storeId -> null
    const chunkSize = 450
    for (let i = 0; i < affected.length; i += chunkSize) {
      const batch = writeBatch(db)

      affected.slice(i, i + chunkSize).forEach((d) => {
        batch.update(d.ref, { storeId: null })
      })

      await batch.commit()
    }

    // 3) Poista kauppa-dokumentti
    await deleteDoc(doc(db, "users", uid, "stores", storeId))
  }


  /*  Actions: LISTAT */

  /**
   * Luo uusi lista:
   * - kirjoittaa users/{uid}/lists
   * - palauttaa listan id:n, jotta View voi navigoida suoraan listaan
   */
  const createList = async (name: string, storeId: string | null) => {
    if (!uid) return null

    const trimmed = name.trim()
    if (!trimmed) return null

    const ref = await addDoc(collection(db, "users", uid, "lists"), {
      name: trimmed,
      storeId: storeId ?? null,
      createdAt: serverTimestamp(),
    } satisfies ListDoc)

    return ref.id
  }

  /**
   * Poista lista:
   *
   * Firestore EI poista automaattisesti alikokoelmia ("items").
   *
   * Rakenne:
   * users/{uid}/lists/{listId}/items/{itemId}
   *
   * Siksi:
   * 1) poistetaan items batcheissa (paloissa)
   * 2) poistetaan lista-dokumentti
   */
  const deleteList = async (listId: string) => {
    if (!uid) return

    // 1) Poista itemit
    const itemsRef = collection(db, "users", uid, "lists", listId, "items")
    const itemsSnap = await getDocs(itemsRef)

    const docsToDelete = itemsSnap.docs

    const chunkSize = 450
    for (let i = 0; i < docsToDelete.length; i += chunkSize) {
      const batch = writeBatch(db)

      docsToDelete.slice(i, i + chunkSize).forEach((d) => {
        batch.delete(d.ref)
      })

      await batch.commit()
    }

    // 2) Poista lista
    await deleteDoc(doc(db, "users", uid, "lists", listId))
  }

  /* Kategoriat (elinkaaret) */
  /**
   * subscribeCategoriesForList:
   * -shoplist kutsuu tätä (ListId + storeId)
   * -palauttaa unsubscribe-funktion, jonka shoplist-sivu kutsuu cleanupissa
   */
  const subscribeCategoriesForList = (listId: string, storeId: string | null) => {
    if (!uid) return () => { }
    const key = categoryScopeKey(storeId, listId)
    const ref = storeId ? collection(db, "users", uid, "stores", storeId, "categories")
      : collection(db, "users", uid, "lists", listId, "categories")

    // order-kenttä mahdollistaa drag & drop -järjestelyn
    const q = query(ref, orderBy("order", "asc"))

    const unsub = onSnapshot(q, (snap) => {
      const next: Category[] = snap.docs
        .map((d) => {
          const data = d.data() as Partial<CategoryDoc>
          if (typeof data.name !== "string") return null

          const order = typeof data.order === "number" ? data.order : 0
          return { id: d.id, name: data.name, order }
        })
        .filter((x): x is Category => x !== null)

      setCategoriesByScope((prev) => ({ ...prev, [key]: next }))
    })


    return () => {
      unsub
      // tyhjennettän cache kyseisestä scopesta, kun ruutu poistuu

      setCategoriesByScope((prev) => {
        const copy = { ...prev }
        delete copy[key]
        return copy
      })
    }
  }

  /**
   * createCategoryForList:
   * - lisää uuden kategorian oikeaan paikkaan (store- tai list-scope)
   * - asettaa orderin “viimeiseksi”
   */
  const createCategoryForList = async (listId: string, storeId: string | null, name: string) => {
    if (!uid) return;

    const trimmed = name.trim()
    if (!trimmed) return

    const key = categoryScopeKey(storeId, listId);
    const current = categoriesByScope[key] ?? [];
    const maxOrder = current.reduce((m, c) => Math.max(m, c.order), -1)
    const nextOrder = maxOrder + 1;

    const ref = storeId
      ? collection(db, "users", uid, "stores", storeId, "categories")
      : collection(db, "users", uid, "lists", listId, "categories")

    await addDoc(ref, {
      name: trimmed,
      order: nextOrder,
      createdAt: serverTimestamp(),
    } satisfies CategoryDoc)
  }

  /* Itemit (elinkaaret) */
  /**
   * subscribeItems:
   * -shoplist kutsuu tätä (ListId:llä)
   * -kuuntelee itemsit orderin mukaan (drag & drop varten)
   * -palauttaa unsubscribe-funktion, jonka shoplist-sivu kutsuu cleanupissa
   */
  const subscribeItems = (listId: string) => {
    if (!uid) return () => { }

    const ref = collection(db, "users", uid, "lists", listId, "items")
    const q = query(ref, orderBy("order", "asc"))

    const unsub = onSnapshot(q, (snap) => {
      const next: ListItem[] = snap.docs
        .map((d) => {
          const data = d.data() as Partial<ItemDoc>
          if (typeof data.name !== "string") return null

          return {
            id: d.id,
            name: data.name,
            done: !!data.done,
            categoryId:
              typeof data.categoryId === "string"
                ? data.categoryId
                : data.categoryId === null
                  ? null
                  : null,
            order: typeof data.order === "number" ? data.order : 0,
          }
        })
        .filter((x): x is ListItem => x !== null)

      setItemsByListId((prev) => ({ ...prev, [listId]: next }))
    })

    return () => {
      unsub()
      // tyhjennettän cache kyseisestä listasta, kun ruutu poistuu

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

    const current = itemsByListId[listId] ?? [];
    const maxOrder = current.reduce((m, it) => Math.max(m, it.order), -1)
    const nextOrder = maxOrder + 1

    await addDoc(collection(db, "users", uid, "lists", listId, "items"), {
      name: trimmed,
      done: false,
      categoryId: categoryId ?? null,
      order: nextOrder,
      createdAt: serverTimestamp(),
    } satisfies ItemDoc);
  }

  const updateItem = async (
    listId: string,
    itemId: string,
    patch: Partial<Pick<ListItem, "name" | "done" | "categoryId" | "order">>
  ) => {
    if (!uid) return

    const out: any = {}
    if (patch.name !== undefined) out.name = patch.name
    if (patch.done !== undefined) out.done = patch.done
    if (patch.categoryId !== undefined) out.categoryId = patch.categoryId
    if (patch.order !== undefined) out.order = patch.order

    await updateDoc(doc(db, "users", uid, "lists", listId, "items", itemId), out)
  }

  const deleteItem = async (listId: string, itemId: string) => {
    if (!uid) return;
    await deleteDoc(doc(db, "users", uid, "lists", listId, "items", itemId))
  }

  /*
  * Helper
   * storeId -> storeName
   * View käyttää tätä näyttämään listan yhteydessä kaupan nimen.
   */
  const getStoreName = (storeId: string | null) => {
    if (!storeId) return undefined
    return stores.find((s) => s.id === storeId)?.name
  }

  /**
   * useMemo:
   * - palautetaan sama value-olio niin pitkälle kuin mahdollista
   * - vähentää turhia uudelleenrenderöintejä
   */
  const value = useMemo<VM>(
    () => ({
      user,
      uid,
      stores,
      lists,
      categoriesByScope,
      itemsByListId,
      subscribeCategoriesForList,
      createCategoryForList,
      subscribeItems,
      addItem,
      updateItem,
      deleteItem,
      createStore,
      deleteStore,
      createList,
      deleteList,
      getStoreName,
    }),
    [user, uid, stores, lists, categoriesByScope, itemsByListId]
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

/**
 * Hook, jota View käyttää.
 * Jos joku käyttää tätä ilman Provideria, virhe kertoo heti missä ongelma on.
 */
export function useShopVM() {
  const v = useContext(Ctx)
  if (!v) throw new Error("useShopVM must be used inside ShopVMProvider")
  return v
}
