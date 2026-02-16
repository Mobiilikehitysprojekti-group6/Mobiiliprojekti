import { useMemo, useEffect, useRef } from "react";
import { useShopVM } from "./ShopVMContext";

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
  const { lists, itemsByListId, categoriesByListId, subscribeItems, subscribeCategoriesForList } = useShopVM();
  const subscribedListIds = useRef<Set<string>>(new Set());

  // Lataa data kaikille listoille, mutta vain kerran per lista
  useEffect(() => {
    for (const list of lists) {
      if (!subscribedListIds.current.has(list.id)) {
        subscribeItems(list.id);
        subscribeCategoriesForList(list.id);
        subscribedListIds.current.add(list.id);
      }
    }
  }, [lists.length]);

  // Laske tilastot kaikista omista listoista
  const { categoryStats, popularProducts, totalItems, loading } = useMemo(() => {
    // Jos ei ole listoja, ei dataa
    if (lists.length === 0) {
      return {
        categoryStats: [],
        popularProducts: [],
        totalItems: 0,
        loading: false,
      };
    }

    const categoryCounts: { [key: string]: number } = {};
    const productCounts: { [key: string]: number } = {};
    let total = 0;

    // Käy läpi kaikki listat ja laske tilastot niillä itemillä jotka on olemassa
    for (const list of lists) {
      const listId = list.id;
      const items = itemsByListId[listId] ?? [];
      const categories = categoriesByListId[listId] ?? [];
      
      // Luo kategorianimien kartta
      const categoryMap = new Map<string, string>();
      categories.forEach(cat => {
        categoryMap.set(cat.id, cat.name);
      });

      // Käy läpi listan tuotteet
      for (const item of items) {
        const categoryName = item.categoryId
          ? (categoryMap.get(item.categoryId) || "Ei kategoriaa")
          : "Ei kategoriaa";

        categoryCounts[categoryName] = (categoryCounts[categoryName] || 0) + 1;

        const productName = item.name?.trim().toLowerCase() || "Nimetön";
        productCounts[productName] = (productCounts[productName] || 0) + 1;

        total += 1;
      }
    }

    // Laske prosenttiosuudet ja järjestä
    const stats: CategoryStat[] = Object.entries(categoryCounts)
      .map(([categoryName, count]) => ({
        categoryName,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
      }))
      .sort((a, b) => b.percentage - a.percentage);

    // TOP 10 tuotteet
    const topProducts: PopularProduct[] = Object.entries(productCounts)
      .map(([name, count]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      categoryStats: stats,
      popularProducts: topProducts,
      totalItems: total,
      loading: false,
    };
  }, [lists, itemsByListId, categoriesByListId]);

  return {
    categoryStats,
    popularProducts,
    totalItems,
    loading,
    refreshStatistics: () => {
      // Data päivittyy automaattisesti
    },
  };
}
