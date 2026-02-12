import { useState, useEffect } from "react";
import { db, auth, collection, getDocs } from "../../firebase/Config";

// Kategoriatilasto: nimi, määrä ja prosenttiosuus
export type CategoryStat = {
  categoryName: string;
  count: number;
  percentage: number;
};

// Suosituimmat tuotteet: nimi ja kuinka monta kertaa esiintyy
export type PopularProduct = {
  name: string;
  count: number;
};

export function useStatisticsViewModel() {
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([]);
  const [popularProducts, setPopularProducts] = useState<PopularProduct[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      const listsRef = collection(db, `users/${user.uid}/lists`);
      const listsSnapshot = await getDocs(listsRef);

      const categoryCounts: { [key: string]: number } = {};
      const productCounts: { [key: string]: number } = {};
      let total = 0;

      // Käy läpi kaikki käyttäjän ostoslistat
      for (const listDoc of listsSnapshot.docs) {
        const listId = listDoc.id;
        const listData = listDoc.data();
        const categoryMap = new Map<string, string>();

        // Jos listalla on määritelty kauppa, hae kaupan kategoriat
        if (listData.storeId) {
          const storeCategoriesRef = collection(db, `users/${user.uid}/stores/${listData.storeId}/categories`);
          const storeCategoriesSnapshot = await getDocs(storeCategoriesRef);
          storeCategoriesSnapshot.docs.forEach(doc => {
            categoryMap.set(doc.id, doc.data().name || "Ei kategoriaa");
          });
        }

        // Hae myös listan omat kategoriat (jos on luotu itse)
        const listCategoryRef = collection(db, `users/${user.uid}/lists/${listId}/categories`);
        const categoriesSnapshot = await getDocs(listCategoryRef);
        categoriesSnapshot.docs.forEach(doc => {
          categoryMap.set(doc.id, doc.data().name || "Ei kategoriaa");
        });

        // Hae listan tuotteet ja laske kategorioittain
        const itemsRef = collection(db, `users/${user.uid}/lists/${listId}/items`);
        const itemsSnapshot = await getDocs(itemsRef);

        for (const itemDoc of itemsSnapshot.docs) {
          const itemData = itemDoc.data();
          const categoryId = itemData.categoryId;
          const categoryName = categoryId ? (categoryMap.get(categoryId) || "Ei kategoriaa") : "Ei kategoriaa";

          categoryCounts[categoryName] = (categoryCounts[categoryName] || 0) + 1;
          
          // Laske tuotefrekvenssi (normalisoi nimi pieniksi kirjaimiksi)
          const productName = itemData.name?.trim().toLowerCase() || "Nimetön";
          productCounts[productName] = (productCounts[productName] || 0) + 1;
          
          total += 1;
        }
      }

      setTotalItems(total);

      // Laske prosenttiosuudet ja järjestä suurimmasta pienimpään
      const stats: CategoryStat[] = Object.entries(categoryCounts)
        .map(([categoryName, count]) => ({
          categoryName,
          count,
          percentage: total > 0 ? (count / total) * 100 : 0,
        }))
        .sort((a, b) => b.percentage - a.percentage);

      setCategoryStats(stats);

      // Suosituimmat tuotteet TOP 10 (frekvenssitaulukko + moodianalyysi)
      const topProducts: PopularProduct[] = Object.entries(productCounts)
        .map(([name, count]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1), // Capitalize first letter
          count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setPopularProducts(topProducts);
    } catch (error) {
      console.error("Virhe tilastojen haussa:", error);
    } finally {
      setLoading(false);
    }
  };

  return {
    categoryStats,
    popularProducts,
    totalItems,
    loading,
    refreshStatistics: fetchStatistics,
  };
}
