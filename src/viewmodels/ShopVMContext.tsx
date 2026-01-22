//Tehdään anonyymi uid ja kuunnellaan listat + kaupat yhdessä paikassa
//Käytetään Provideria ja Contextia, jotta saadaan tilat kaikille samoiksi

import React, { createContext, useContext, useEffect, useMemo, useState } from "react"
import type { User } from "firebase/auth"
import {
  auth,
  onAuthStateChanged,
  signInAnonymously,
  db,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "../../firebase/Config"

type Store = {
    id: string
    name: string
}

type ShopList = {
    id: string
    name: string
    storeId: string | null
}

type VM = {
    user: User | null
    uid: string | null
    stores: Store[]
    lists: ShopList[]
    createStore: (name: string) => Promise<void>
    createList: (name: string, storeId: string | null) => Promise<string | null>
    getStoreName: (storeId: string | null) => string | undefined
}

const Ctx = createContext<VM | null>(null)

export function ShopVMProvider({ children }: { children: React.ReactNode}) {
    const [user, setUser] = useState<User | null>(null)
    const [uid, setUid] = useState<string | null>(null)
    const [stores, setStores] = useState<Store[]>([])
    const [lists, setLists] = useState<ShopList[]>([])

    //Auth ja uid
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (u) => {
            if (u) {
                setUser(u)
                setUid(u.uid)
                return
            }
            const cred = await signInAnonymously(auth)
            setUser(cred.user)
            setUid(cred.user.uid)
        })
        return unsub
    }, [])

    //subscriptions -> stores ja lists
    useEffect(() => {
        if (!uid) return

        const unsubStores = onSnapshot(
            query(collection(db, "users", uid, "stores"), orderBy("createdAt", "desc")),
            ( snap ) => setStores(snap.docs.map((d) => ({ id: d.id, name: (d.data() as any).name })))
        )

        const unsubLists = onSnapshot(
            query(collection(db, "users", uid, "lists"), orderBy("createdAt", "desc")),
            ( snap ) =>
                setLists(
                    snap.docs.map((d) => {
                        const data = d.data() as any
                        return { id: d.id, name: data.name, storeId: data.storeId ?? null }
                    })
                )
        )

        return () => {
            unsubStores()
            unsubLists()
        }
    }, [uid])

    const createStore = async (name: string) => {
        if (!uid) return

        const trimmed = name.trim()
        if (!trimmed) return

        await addDoc(collection(db, "users", uid, "stores"), {
            name: trimmed,
            createdAt: serverTimestamp(),
        })
    }

    const createList = async (name: string, storeId: string | null) => {
        if (!uid) return null
        
        const trimmed = name.trim()
        if (!trimmed) return null

        const ref = await addDoc(collection(db, "users", uid, "lists"), {
            name: trimmed,
            storeId: storeId ?? null,
            createdAt: serverTimestamp(),
        })
        
        return ref.id
    }

    const getStoreName = (storeId: string | null) => {
        if (!storeId) return undefined
        return stores.find((s) => s.id === storeId)?.name
    }

    const value = useMemo(
        () => ({ user, uid, stores, lists, createStore, createList, getStoreName }),
        [user, uid, stores, lists]
    )

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useShopVM() {
    const v = useContext(Ctx)
    if (!v) throw new Error("useShopVM must be used inside ShopVMProvider")
    return v
}