import type { Firestore } from "firebase/firestore"
import { collection, doc, getDocs, serverTimestamp, writeBatch } from "../../../firebase/Config"
import { DEFAULT_LIST_CATEGORIES } from "./types"

// Seedaa oletuskategoriat listalle, jos listalla ei ole vielä kategorioita.
// seededSet estää turhan uudelleenseedauksen saman session aikana.
//
// HUOM: seededSet.add(listId) tehdään heti alussa,
// jotta rinnakkaiset kutsut eivät pääse seedamaan samaa listaa kahdesti.
export async function ensureDefaultListCategories(db: Firestore, listId: string, seededSet: Set<string>) {
  if (seededSet.has(listId)) return

  // Lukitaan heti, ettei toinen rinnakkainen kutsu tee samaa työtä
  seededSet.add(listId)

  try {
    const ref = collection(db, "lists", listId, "categories")
    const snap = await getDocs(ref)

    // Jos kategorioita löytyy jo, ei tehdä mitään lisää
    if (!snap.empty) return

    const batch = writeBatch(db)
    DEFAULT_LIST_CATEGORIES.forEach((name, index) => {
      const newDoc = doc(ref)
      batch.set(newDoc, { name, order: index, createdAt: serverTimestamp() })
    })
    await batch.commit()
  } catch (e) {
    // Jos jokin menee pieleen, poistetaan lukko, jotta voidaan yrittää myöhemmin uudestaan
    seededSet.delete(listId)
    throw e
  }
}
