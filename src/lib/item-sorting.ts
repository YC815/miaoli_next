/**
 * 統一物資排序邏輯
 *
 * 排序規則:
 * 1. 標準品項按 sortOrder (0-29) 升序
 * 2. 自訂品項按 createdAt 升序，sortOrder 統一為 9999
 *
 * 這是整個系統的單一真相來源，所有物資清單都應使用這個邏輯排序。
 */

import prisma from '@/lib/prisma';

/**
 * 通用物資項目介面（必須包含排序所需欄位）
 */
export interface ItemWithSort {
  name: string;
  category: string;
  sortOrder?: number;
  createdAt?: string | Date;
  isStandard?: boolean;
}

/**
 * 標準品項 sortOrder：0-29
 * 自訂品項 sortOrder：9999
 */
export const CUSTOM_ITEM_SORT_ORDER = 9999;

/**
 * 從資料庫查詢所有標準物品的 sortOrder，建立查詢表
 *
 * @returns Map<"品項名稱|分類", sortOrder>
 */
export async function getSortOrderMap(): Promise<Map<string, number>> {
  const standardItems = await prisma.standardItem.findMany({
    where: { isActive: true },
    select: {
      name: true,
      category: true,
      sortOrder: true,
    },
  });

  const sortOrderMap = new Map<string, number>();
  standardItems.forEach(item => {
    const key = `${item.name}|${item.category}`;
    sortOrderMap.set(key, item.sortOrder);
  });

  return sortOrderMap;
}

/**
 * 統一排序函式：前端和後端通用
 *
 * 排序邏輯：
 * 1. 先按 sortOrder 升序（標準品 0-29，自訂品 9999）
 * 2. sortOrder 相同時，按 createdAt 升序（自訂品之間的順序）
 *
 * @param items 待排序的物資清單
 * @returns 已排序的物資清單
 */
export function sortItems<T extends ItemWithSort>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aSortOrder = a.sortOrder ?? CUSTOM_ITEM_SORT_ORDER;
    const bSortOrder = b.sortOrder ?? CUSTOM_ITEM_SORT_ORDER;

    // 第一優先：sortOrder
    if (aSortOrder !== bSortOrder) {
      return aSortOrder - bSortOrder;
    }

    // 第二優先：createdAt（自訂品項之間的排序）
    if (a.createdAt && b.createdAt) {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return aTime - bTime;
    }

    // 若都沒有 createdAt，保持原順序
    return 0;
  });
}

/**
 * 為物資清單附加 sortOrder（API 回傳前使用）
 *
 * 用途：將資料庫查詢到的 ItemStock 附加正確的 sortOrder
 *
 * @param items 從 ItemStock 查詢的物資清單
 * @returns 附加 sortOrder 後的物資清單
 */
export async function attachSortOrder<T extends { itemName: string; itemCategory: string; isStandard?: boolean }>(
  items: T[]
): Promise<(T & { sortOrder: number })[]> {
  const sortOrderMap = await getSortOrderMap();

  const itemsWithSortOrder = items.map(item => {
    const key = `${item.itemName}|${item.itemCategory}`;
    const sortOrder = sortOrderMap.get(key) ?? CUSTOM_ITEM_SORT_ORDER;

    return {
      ...item,
      sortOrder,
    };
  });

  // 直接在這裡排序，減少前端負擔
  return itemsWithSortOrder.sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * 為已經轉換過的物資清單附加 sortOrder（用於前端友好格式）
 *
 * 與 attachSortOrder 的差異：
 * - attachSortOrder: 接收 itemName/itemCategory（資料庫原始格式）
 * - attachSortOrderToItems: 接收 name/category（前端友好格式）
 *
 * @param items 已轉換為前端格式的物資清單
 * @returns 附加 sortOrder 後的物資清單
 */
export async function attachSortOrderToItems<T extends { name: string; category: string; isStandard?: boolean }>(
  items: T[]
): Promise<(T & { sortOrder: number })[]> {
  const sortOrderMap = await getSortOrderMap();

  const itemsWithSortOrder = items.map(item => {
    const key = `${item.name}|${item.category}`;
    const sortOrder = sortOrderMap.get(key) ?? CUSTOM_ITEM_SORT_ORDER;

    return {
      ...item,
      sortOrder,
    };
  });

  // 直接在這裡排序，減少前端負擔
  return itemsWithSortOrder.sort((a, b) => a.sortOrder - b.sortOrder);
}
