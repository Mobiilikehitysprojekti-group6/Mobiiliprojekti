// src/viewmodels/ShopVMContext.tsx
// YHTENÄINEN malli:
// - Kaikki listat: /lists/{listId}
// - Kategoriat: /lists/{listId}/categories
// - Itemit: /lists/{listId}/items
// - Järjestys per käyttäjä: list.orderBy[uid]

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react"
import type { User } from "firebase/auth"

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
  getDoc,
  setDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
  writeBatch,
  where,
  runTransaction,
  arrayUnion,
} from "../../firebase/Config"

export type Store = {
  id: string
  name: string
  branch?: string
}

export type ShopList = {
  id: string
  name: string
  storeId: string | null
  order: number
  ownerId: string
  memberIds: string[]
}

export type Category = {
  id: string
  name: string
  order: number
}

export type ListItem = {
  id: string
  name: string
  done: boolean
  categoryId: string | null
  order: number
  quantity: number
}

type StoreDoc = {
  name: string
  branch?: string | null
  createdAt?: unknown
}

type ListDoc = {
  name: string
  storeId?: string | null
  ownerId: string
  memberIds: string[]
  orderBy: Record<string, number>
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
  quantity: number
  createdAt?: unknown
}

type InviteDoc = {
  listId: string
  createdBy: string
  createdAt?: unknown
}

const DEFAULT_LIST_CATEGORIES = [
  "Hedelmät & vihannekset",
  "Maito & kananmunat",
  "Leipä",
  "Liha & kala",
  "Valmisruoka",
  "Kuivat tuotteet",
  "Pakasteet",
  "Juomat",
  "Makeiset & naposteltavat",
  "Hygienia",
  "Koti & siivous",
]

type VM = {
  // Auth
  user: User | null
  uid: string | null

  // Data
  stores: Store[]
  lists: ShopList[]
  categoriesByListId: Record<string, Category[]>
  itemsByListId: Record<string, ListItem[]>

  // Stores (pidetään ennallaan users/{uid}/stores)
  createStore: (name: string, branch?: string) => Promise<void>
  deleteStore: (storeId: string) => Promise<void>

  // Lists (uusi malli /lists)
  createList: (name: string, storeId: string | null) => Promise<string | null>
  deleteList: (listId: string) => Promise<void>
  reorderLists: (nextListIds: string[]) => Promise<void>

  // Invites
  createInviteCodeForList: (listId: string) => Promise<string | null>
  joinListByCode: (code: string) => Promise<string | null>

  // Categories
  subscribeCategoriesForList: (listId: string) => () => void
  createCategoryForList: (listId: string, name: string) => Promise<void>
  reorderCategoriesForList: (listId: string, nextIds: string[]) => Promise<void>

  // Items
  subscribeItems: (listId: string) => () => void
  addItem: (listId: string, name: string, categoryId: string | null) => Promise<void>
  updateItem: (
    listId: string,
    itemId: string,
    patch: Partial<Pick<ListItem, "name" | "done" | "categoryId" | "order" | "quantity">>
  ) => Promise<void>
  deleteItem: (listId: string, itemId: string) => Promise<void>
  reorderItemsInCategory: (listId: string, categoryId: string | null, nextItemIds: string[]) => Promise<void>
  changeQuantity: (listId: string, itemId: string, delta: number) => Promise<void>

  // Helpers
  getStoreLabel: (storeId: string | null) => string | undefined
  isOwnerOfList: (list: ShopList) => boolean
}

const Ctx = createContext<VM | null>(null)

export function ShopVMProvider({ children }: { children: React.ReactNode }) {

  const [user, setUser] = useState<User | null>(null)
  const [uid, setUid] = useState<string | null>(null)

  const [stores, setStores] = useState<Store[]>([])
  const [lists, setLists] = useState<ShopList[]>([])

  const [categoriesByListId, setCategoriesByListId] = useState<Record<string, Category[]>>({})
  const [itemsByListId, setItemsByListId] = useState<Record<string, ListItem[]>>({})

  // jotta ei seedailla samaa listaa useasti saman session aikana
  const seededListIdsRef = useRef<Set<string>>(new Set())

  const dedupeLists = (arr: ShopList[]) => {
    const m = new Map<string, ShopList>()
    for (const l of arr) m.set(l.id, l)
    return Array.from(m.values())
}

  console.log("UID:", uid)

  // AUTH
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

  // SNAPSHOTS: stores + lists
  useEffect(() => {
    if (!uid) return

    // STORES: users/{uid}/stores (tätä voi käyttää edelleen “kauppavalintana”)
    const storesRef = collection(db, "users", uid, "stores")
    const storesQ = query(storesRef, orderBy("createdAt", "desc"))

    const unsubStores = onSnapshot(storesQ, (snap) => {
      const next: Store[] = snap.docs
        .map((d) => {
          const data = d.data() as Partial<StoreDoc>
          if (typeof data.name !== "string") return null
          return {
            id: d.id,
            name: data.name,
            ...(typeof data.branch === "string" ? { branch: data.branch } : {}),
          }
        })
        .filter((x): x is Store => x !== null)

      setStores(next)
    })

    // LISTS: /lists where memberIds contains uid
    const listsRef = collection(db, "lists")
    const listsQ = query(listsRef, where("memberIds", "array-contains", uid))

    // DEBUG: testaa query kertahaulla
    getDocs(listsQ)
      .then((snapOnce) => {
        console.log(
          "DEBUG getDocs lists count:",
          snapOnce.size,
          snapOnce.docs.map((d) => d.id)
        )
      })
      .catch((e) => console.error("DEBUG getDocs error:", e))


    const unsubLists = onSnapshot(
      listsQ,
      (snap) => {
        const next = snap.docs
          .map((d) => {
            const data = d.data() as Partial<ListDoc>
            if (typeof data.name !== "string") return null
            if (typeof data.ownerId !== "string") return null
            if (!Array.isArray(data.memberIds)) return null

            const storeId =
              typeof data.storeId === "string"
                ? data.storeId
                : data.storeId === null
                  ? null
                  : null

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

        setLists(dedupeLists(next))
      },
      (err) => console.error("Lists onSnapshot error:", err)
    )

    return () => {
      unsubStores()
      unsubLists()
    }
  }, [uid])

  /* STORES actions */

  const createStore = async (name: string, branch?: string) => {
    if (!uid) return
    const trimmed = name.trim()
    if (!trimmed) return

    await addDoc(collection(db, "users", uid, "stores"), {
      name: trimmed,
      branch: branch?.trim() ?? null,
      createdAt: serverTimestamp(),
    } satisfies StoreDoc)
  }

  const deleteStore = async (storeId: string) => {
    if (!uid) return
    await deleteDoc(doc(db, "users", uid, "stores", storeId))
  }

  /* LIST helpers */

  const ensureDefaultListCategories = async (listId: string) => {
    if (!uid) return
    if (seededListIdsRef.current.has(listId)) return

    const ref = collection(db, "lists", listId, "categories")
    const snap = await getDocs(ref)
    if (!snap.empty) {
      seededListIdsRef.current.add(listId)
      return
    }

    const batch = writeBatch(db)
    DEFAULT_LIST_CATEGORIES.forEach((name, index) => {
      const newDoc = doc(ref)
      batch.set(newDoc, { name, order: index, createdAt: serverTimestamp() })
    })
    await batch.commit()

    seededListIdsRef.current.add(listId)
  }

  /* LISTS actions */

  const createList = async (name: string, storeId: string | null) => {
    if (!uid) return null
    const trimmed = name.trim()
    if (!trimmed) return null

    const currentMax = lists.reduce((m, l) => Math.max(m, l.order), -1)
    const nextOrder = currentMax + 1

    const ref = await addDoc(collection(db, "lists"), {
      name: trimmed,
      storeId: storeId ?? null,
      ownerId: uid,
      memberIds: [uid],
      orderBy: { [uid]: nextOrder },
      createdAt: serverTimestamp(),
    } satisfies ListDoc)

    // lisätään lista heti lokaalisti, ettei /shoplist ehdi näyttää "ei löydy"
    setLists((prev) => {
      const merged = dedupeLists([
        ...prev,
        {
          id: ref.id,
          name: trimmed,
          storeId: storeId ?? null,
          order: nextOrder,
          ownerId: uid,
          memberIds: [uid],
        },
      ])
      return merged.sort((a, b) => a.order - b.order)
    })

    await ensureDefaultListCategories(ref.id)
    return ref.id
  }

  const deleteList = async (listId: string) => {
    if (!uid) return

    // Poista items
    const itemsRef = collection(db, "lists", listId, "items")
    const itemsSnap = await getDocs(itemsRef)
    const itemDocs = itemsSnap.docs

    // Poista categories
    const catsRef = collection(db, "lists", listId, "categories")
    const catsSnap = await getDocs(catsRef)
    const catDocs = catsSnap.docs

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

  const reorderLists = async (nextListIds: string[]) => {
    if (!uid) return

    const batch = writeBatch(db)
    nextListIds.forEach((id, idx) => {
      batch.update(doc(db, "lists", id), {
        [`orderBy.${uid}`]: idx,
      })
    })
    await batch.commit()
  }

  /* INVITES */

  const makeCode = () => Math.random().toString(36).slice(2, 8).toUpperCase()

  const createInviteCodeForList = async (listId: string) => {
    if (!uid) return null

    // varmistus: olet jäsen
    const listRef = doc(db, "lists", listId)
    const listSnap = await getDoc(listRef)
    if (!listSnap.exists()) return null
    const list = listSnap.data() as Partial<ListDoc>
    if (!Array.isArray(list.memberIds) || !list.memberIds.includes(uid)) return null

    for (let i = 0; i < 5; i++) {
      const code = makeCode()
      const inviteRef = doc(db, "invites", code)
      const existing = await getDoc(inviteRef)
      if (existing.exists()) continue

      await setDoc(inviteRef, {
        listId,
        createdBy: uid,
        createdAt: serverTimestamp(),
      } satisfies InviteDoc)

      return code
    }

    return null
  }

  const joinListByCode = async (codeRaw: string) => {
    if (!uid) return null

    const code = codeRaw.trim().toUpperCase()
    if (!code) return null

    const listId = await runTransaction(db, async (tx) => {
      const inviteRef = doc(db, "invites", code)
      const inviteSnap = await tx.get(inviteRef)
      if (!inviteSnap.exists()) throw new Error("Kutsua ei löydy")

      const inv = inviteSnap.data() as Partial<InviteDoc>
      if (typeof inv.listId !== "string") throw new Error("Kutsu on virheellinen")

      const listRef = doc(db, "lists", inv.listId)

      tx.update(listRef, {
        memberIds: arrayUnion(uid),
        [`orderBy.${uid}`]: 999999,
      })

      // siisti: poista kutsu käytön jälkeen
      tx.delete(inviteRef)

      return inv.listId
    })

    return listId
  }

  /* CATEGORIES */

  const subscribeCategoriesForList = (listId: string) => {
    if (!uid) return () => { }

    // varmistetaan defaultit (vain kerran / session)
    ensureDefaultListCategories(listId)

    const ref = collection(db, "lists", listId, "categories")
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

      setCategoriesByListId((prev) => ({ ...prev, [listId]: next }))
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

    await addDoc(collection(db, "lists", listId, "categories"), {
      name: trimmed,
      order: nextOrder,
      createdAt: serverTimestamp(),
    } satisfies CategoryDoc)
  }

  const reorderCategoriesForList = async (listId: string, nextIds: string[]) => {
    if (!uid) return

    // optimistinen UI
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

  /* ITEMS */

  const subscribeItems = (listId: string) => {
    if (!uid) return () => { }

    const ref = collection(db, "lists", listId, "items")
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
            quantity: typeof data.quantity === "number" ? data.quantity : 1,
          }
        })
        .filter((x): x is ListItem => x !== null)

      setItemsByListId((prev) => ({ ...prev, [listId]: next }))
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

    await addDoc(collection(db, "lists", listId, "items"), {
      name: trimmed,
      done: false,
      categoryId: categoryId ?? null,
      order: nextOrder,
      quantity: 1,
      createdAt: serverTimestamp(),
    } satisfies ItemDoc)
  }

  const updateItem = async (
    listId: string,
    itemId: string,
    patch: Partial<Pick<ListItem, "name" | "done" | "categoryId" | "order" | "quantity">>
  ) => {
    if (!uid) return

    const out: Partial<ItemDoc> = {}
    if (patch.name !== undefined) out.name = patch.name
    if (patch.done !== undefined) out.done = patch.done
    if (patch.categoryId !== undefined) out.categoryId = patch.categoryId
    if (patch.order !== undefined) out.order = patch.order
    if (patch.quantity !== undefined) out.quantity = patch.quantity

    await updateDoc(doc(db, "lists", listId, "items", itemId), out)
  }

  const deleteItem = async (listId: string, itemId: string) => {
    if (!uid) return
    await deleteDoc(doc(db, "lists", listId, "items", itemId))
  }

  const changeQuantity = async (listId: string, itemId: string, delta: number) => {
    if (!uid) return
    const current = itemsByListId[listId]?.find((i) => i.id === itemId)
    const next = Math.max(1, (current?.quantity ?? 1) + delta)

    // optimistinen UI
    setItemsByListId((prev) => ({
      ...prev,
      [listId]: (prev[listId] ?? []).map((it) => (it.id === itemId ? { ...it, quantity: next } : it)),
    }))

    await updateDoc(doc(db, "lists", listId, "items", itemId), { quantity: next })
  }

  const reorderItemsInCategory = async (listId: string, categoryId: string | null, nextItemIds: string[]) => {
    if (!uid) return

    // optimistinen UI
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

    const chunkSize = 450
    for (let i = 0; i < nextItemIds.length; i += chunkSize) {
      const batch = writeBatch(db)
      nextItemIds.slice(i, i + chunkSize).forEach((id, localIndex) => {
        const order = i + localIndex
        batch.update(doc(db, "lists", listId, "items", id), { order, categoryId: categoryId ?? null })
      })
      await batch.commit()
    }
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
