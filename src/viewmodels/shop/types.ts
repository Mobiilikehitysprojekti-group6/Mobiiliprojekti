import type { User } from "firebase/auth"

// UI-tyypit (Store, ShopList, Category, ListItem) on siistejä ja helppoja käyttää komponenteissa.
// FirestoreDoc-tyypit sallii null/puuttuvat kentät, koska tietokannassa data voi olla keskeneräistä.

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

// Firestore-dokumenttien raaka tyypit (tietokannan muoto)

export type StoreDoc = {
  name: string
  branch?: string | null
  createdAt?: unknown
}

export type ListDoc = {
  name: string
  storeId?: string | null
  ownerId: string
  memberIds: string[]
  orderBy: Record<string, number>
  createdAt?: unknown
}

export type CategoryDoc = {
  name: string
  order: number
  createdAt?: unknown
}

export type ItemDoc = {
  name: string
  done: boolean
  categoryId: string | null
  order: number
  quantity: number
  createdAt?: unknown
}

export type InviteDoc = {
  listId: string
  createdBy: string
  createdAt?: unknown
}

// Oletuskategoriat (seedataan listalle, jos lista on tyhjä)
export const DEFAULT_LIST_CATEGORIES = [
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
] as const

export type VM = {
  user: User | null
  uid: string | null

  stores: Store[]
  lists: ShopList[]
  categoriesByListId: Record<string, Category[]>
  itemsByListId: Record<string, ListItem[]>

  createStore: (name: string, branch?: string) => Promise<void>
  deleteStore: (storeId: string) => Promise<void>

  createList: (name: string, storeId: string | null) => Promise<string | null>
  deleteList: (listId: string) => Promise<void>
  reorderLists: (nextListIds: string[]) => Promise<void>

  createInviteCodeForList: (listId: string) => Promise<string | null>
  joinListByCode: (code: string) => Promise<string | null>

  subscribeCategoriesForList: (listId: string) => () => void
  createCategoryForList: (listId: string, name: string) => Promise<void>
  reorderCategoriesForList: (listId: string, nextIds: string[]) => Promise<void>

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

  getStoreLabel: (storeId: string | null) => string | undefined
  isOwnerOfList: (list: ShopList) => boolean
}
