// Role-based permission system for 苗栗社福物資管理平台

export type UserRole = "ADMIN" | "STAFF" | "VOLUNTEER";

export interface Permission {
  // 物資管理相關權限
  canAddSupplies: boolean;           // 新增物資
  canAddCategories: boolean;         // 新增分類品項
  canEditSupplyInfo: boolean;        // 編輯物資資訊
  canEditQuantity: boolean;          // 編輯數量
  canEditSafetyStock: boolean;       // 編輯安全庫存量
  
  // 報表和記錄相關權限
  canExportReports: boolean;         // 匯出報表
  canViewRecords: boolean;           // 查看記錄頁面
  canPrintReceipts: boolean;         // 列印收據
  
  // 系統管理相關權限
  canManageUsers: boolean;           // 管理使用者
  canAccessAdminPanel: boolean;      // 存取管理面板
}

export const getPermissions = (role: UserRole): Permission => {
  switch (role) {
    case "ADMIN":
      return {
        canAddSupplies: true,
        canAddCategories: true,
        canEditSupplyInfo: true,
        canEditQuantity: true,
        canEditSafetyStock: true,
        canExportReports: true,
        canViewRecords: true,
        canPrintReceipts: true,
        canManageUsers: true,
        canAccessAdminPanel: true,
      };
      
    case "STAFF":
      return {
        canAddSupplies: true,
        canAddCategories: true,
        canEditSupplyInfo: false,
        canEditQuantity: false,
        canEditSafetyStock: false,
        canExportReports: true,
        canViewRecords: true,
        canPrintReceipts: true,
        canManageUsers: false,
        canAccessAdminPanel: false,
      };
      
    case "VOLUNTEER":
      return {
        canAddSupplies: true,
        canAddCategories: false,
        canEditSupplyInfo: false,
        canEditQuantity: false,
        canEditSafetyStock: false,
        canExportReports: true,
        canViewRecords: false,
        canPrintReceipts: false,
        canManageUsers: false,
        canAccessAdminPanel: false,
      };
      
    default:
      // 預設為最低權限
      return {
        canAddSupplies: false,
        canAddCategories: false,
        canEditSupplyInfo: false,
        canEditQuantity: false,
        canEditSafetyStock: false,
        canExportReports: false,
        canViewRecords: false,
        canPrintReceipts: false,
        canManageUsers: false,
        canAccessAdminPanel: false,
      };
  }
};

// 檢查使用者是否有特定權限
export const hasPermission = (role: UserRole, permission: keyof Permission): boolean => {
  const permissions = getPermissions(role);
  return permissions[permission];
};

// 權限描述對應
export const permissionDescriptions: Record<keyof Permission, string> = {
  canAddSupplies: "新增物資",
  canAddCategories: "新增物資分類",
  canEditSupplyInfo: "編輯物資資訊",
  canEditQuantity: "編輯物資數量",
  canEditSafetyStock: "編輯安全庫存",
  canExportReports: "匯出報表",
  canViewRecords: "查看記錄",
  canPrintReceipts: "列印收據",
  canManageUsers: "管理使用者",
  canAccessAdminPanel: "系統管理",
};