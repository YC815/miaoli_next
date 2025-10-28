/**
 * 物資品項統一型別定義
 *
 * 整個系統使用的標準 ItemStock 介面，確保型別一致性
 */

/**
 * 物資庫存項目（標準格式）
 *
 * 使用場景：
 * - 物資庫存清單
 * - 批量領取物資
 * - 庫存盤點
 * - 安全庫存調整
 */
export interface ItemStock {
  id: string;
  category: string;
  name: string;
  unit: string;
  totalStock: number;
  safetyStock: number;
  isStandard: boolean;
  sortOrder: number; // 必填，統一排序使用
  createdAt?: string; // 自訂品項用於排序
}

/**
 * 物資庫存項目（含狀態）
 *
 * 使用場景：
 * - /api/inventory/status 回傳格式
 * - 庫存狀態儀表板
 */
export interface ItemStockWithStatus extends ItemStock {
  status: 'sufficient' | 'insufficient' | 'out_of_stock';
}

/**
 * 標準物品（來自 StandardItem 表）
 *
 * 使用場景：
 * - 物資選擇下拉選單
 * - 標準物品管理
 */
export interface StandardItem {
  id?: string;
  name: string;
  category: string;
  units: string[];
  defaultUnit: string;
  sortOrder: number;
  isActive?: boolean;
}

/**
 * 自訂物品（來自 CustomItem 表）
 *
 * 使用場景：
 * - 物資選擇下拉選單
 * - 自訂物品管理
 */
export interface CustomItem {
  id: string;
  name: string;
  category: string;
  units: string[];
  defaultUnit: string;
  isHidden: boolean;
  createdAt: string;
  createdBy?: string;
}
