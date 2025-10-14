# 資料庫種子指南

## 概述

本專案使用 Prisma 的種子功能來初始化資料庫的基礎資料。種子腳本位於 [prisma/seed.ts](../prisma/seed.ts)。

---

## 種子內容

### 1. **物資類別** (Category)
- 食品
- 衛生用品
- 清潔用品
- 生活用品
- 衣物
- 醫療用品

### 2. **領取單位** (RecipientUnit)
- 慈濟基金會
- 紅十字會
- 世界展望會
- 創世基金會

### 3. **單位** (Unit)
包、罐、盒、瓶、個、公斤、片、支、條、袋、件、組、公升

### 4. **庫存變更原因** (InventoryChangeReason)
- 增加原因：其他（請說明）
- 減少原因：過期、損壞、遺失、其他（請說明）

### 5. **標準物資品項** (StandardItem) ⭐
從 [public/item_list.json](../public/item_list.json) 自動匯入，包含：
- **食品** (14 項)：麥片、八寶粥、泡麵、米、油等
- **衛生用品** (8 項)：尿布、口罩、牙刷、衛生棉等
- **清潔用品** (8 項)：衛生紙、沐浴露、洗衣精等

每個品項包含：
- 名稱
- 分類
- 可用單位陣列 (如：`["包", "罐", "盒"]`)
- 預設單位

### 6. **預設捐贈人** (Donor)
- 匿名捐贈者

---

## 使用方式

### 方式 1: 手動執行種子腳本

```bash
npm run db:seed
```

### 方式 2: Prisma 自動種子 (推薦)

在執行 `prisma migrate reset` 或 `prisma db push` 時，Prisma 會自動執行種子腳本：

```bash
# 重置資料庫並自動種子
npx prisma migrate reset

# 推送 schema 變更 (不會自動種子)
npx prisma db push
```

---

## 種子腳本行為

### 🔄 **Upsert 策略**
StandardItem 使用 `upsert`，不會刪除既有資料：
- 如果品項已存在 → 更新 units 和 defaultUnit
- 如果品項不存在 → 建立新品項

### 🗑️ **清理策略**
以下資料會在種子前清空（使用 `deleteMany`）：
- Category
- RecipientUnit
- Unit
- InventoryChangeReason

**不會清理**：
- StandardItem (使用 upsert)
- CustomItem (使用者自訂資料)
- Donor (使用 upsert)
- DonationRecord (歷史紀錄)

---

## 更新物資清單

如果需要修改標準物資品項：

1. **編輯來源檔案**
   ```bash
   vim public/item_list.json
   ```

2. **格式範例**
   ```json
   {
     "食品": [
       {
         "item": "麥片",
         "units": ["包", "罐", "盒"],
         "defaultUnit": "包"
       }
     ]
   }
   ```

3. **重新執行種子**
   ```bash
   npm run db:seed
   ```

---

## 驗證種子結果

### 使用 Prisma Studio
```bash
npx prisma studio
```

在瀏覽器中開啟 `http://localhost:5555`，檢查：
- StandardItem 表有 30 筆資料
- Donor 表有 1 筆「匿名捐贈者」
- Category 表有 6 筆分類
- Unit 表有 13 筆單位

### 使用 SQL 查詢
```sql
-- 查看標準物資品項
SELECT name, category, units, "defaultUnit"
FROM "StandardItem"
ORDER BY category, name;

-- 查看捐贈人
SELECT * FROM "Donor";
```

---

## 常見問題

### Q1: 種子失敗，顯示「unique constraint」錯誤
**原因**: 資料已存在，且使用 `create` 而非 `upsert`

**解決**:
```bash
# 重置資料庫
npx prisma migrate reset
```

### Q2: StandardItem 的 units 欄位顯示為字串而非陣列
**原因**: 可能是舊版種子腳本執行的結果

**解決**:
```bash
# 重新執行種子
npm run db:seed
```

### Q3: 想要完全清空資料庫重來
```bash
# 方式 1: Prisma reset（推薦）
npx prisma migrate reset

# 方式 2: 手動清空 + 推送 + 種子
npx prisma db push --force-reset
npm run db:seed
```

---

## 種子腳本輸出範例

```
🌱 開始種子數據填充...
📦 創建物資類別...
🏢 創建領取單位...
📏 創建單位...
📝 創建庫存變更原因...
📦 創建標準物資品項（StandardItem）...
   ✓ 食品 - 麥片 (單位: 包/罐/盒)
   ✓ 食品 - 八寶粥 (單位: 罐)
   ...
👤 創建預設捐贈人...
   ✓ 匿名捐贈者

✅ 種子數據填充完成！

📊 填充結果:
   - 物資類別: 6 筆
   - 領取單位: 4 筆
   - 單位: 13 筆
   - 庫存變更原因: 5 筆
   - 標準物資品項: 30 筆
   - 捐贈人: 1 筆
```

---

## 相關檔案

- 種子腳本：[prisma/seed.ts](../prisma/seed.ts)
- 物資清單來源：[public/item_list.json](../public/item_list.json)
- 物資清單文件：[docs/main_item.md](./main_item.md)
- Package 配置：[package.json](../package.json#L10-L13)
