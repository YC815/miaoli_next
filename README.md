# 苗栗社福物資管理系統

## 技術框架

- Next.js - Fontend + Backend
- Prisma + PostGregSQL - Database
- Clerk Auth - Authentication
- Tailwind CSS - UI

## 印章管理功能說明

### 當前架構

系統已重構為「使用者個人印章」模式：

- 每位使用者可在「個人設定」頁面上傳自己的印章和設定暱稱
- 印章管理頁面為**唯讀模式**，僅供查看所有使用者的印章
- 印章與使用者綁定（一對一關係），暱稱會同步顯示在印章上

### 如何恢復收據列印功能

收據列印功能已暫時移除。如需恢復，請依照以下步驟：

#### 1. 恢復浮動按鈕中的收據列印選項

編輯 `src/components/FloatingActionButtons.tsx`，取消註解以下程式碼：

```typescript
const allActions = [
  // ... 其他按鈕 ...

  // 取消以下註解：
  {
    label: "收據列印",
    icon: Receipt,
    onClick: onPrintReceipt,
    variant: "outline" as const,
    description: "列印捐贈收據PDF文件",
    permission: "canPrintReceipts" as keyof Permission,
  },
];
```

#### 2. 確認相關檔案存在

收據列印功能依賴以下檔案：

- `src/components/modals/ReceiptModal.tsx` - 收據生成流程 UI
- `src/lib/receipt-generator.ts` - PDF 生成邏輯
- `src/types/receipt.ts` - 收據相關 TypeScript 定義（已標記為 deprecated 但仍可用）

#### 3. 調整印章邏輯（如需要）

原收據系統使用三種類別的印章（機構、理事長、經手人）。當前系統僅保留「使用者個人印章」。

如需恢復完整的三類印章系統，需要：

1. 還原 `ReceiptSealCategory` enum 到 Prisma schema
2. 在 `ReceiptSeal` model 中重新加入 `category` 欄位
3. 更新相關 API 和 UI 以支援類別分類

或者，您可以修改收據生成邏輯，改用當前的「使用者個人印章」系統。

#### 4. 測試流程

恢復功能後，請測試：

1. 收據生成流程是否正常
2. 印章是否正確顯示在 PDF 中
3. 列印出的 PDF 格式是否正確
