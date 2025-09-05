# 資料庫設計 - 苗栗社福物資管理系統

## 🗃️ 建議技術棧

### 資料庫選擇：PostgreSQL + Prisma
- **PostgreSQL**: 強大的關聯式資料庫，支援 UUID、JSONB 等進階功能
- **Prisma**: 型別安全的 ORM，與 TypeScript 完美整合

### 需要安裝的套件
```bash
npm install @clerk/nextjs prisma @prisma/client
npm install -D prisma
```

---

## 📊 資料庫架構設計

### 1. Users (用戶表)
```prisma
model User {
  id          String   @id @default(cuid())
  clerkId     String   @unique @map("clerk_id")
  email       String   @unique
  nickname    String?
  avatarUrl   String?  @map("avatar_url")
  role        Role     @default(VOLUNTEER)
  isFirstLogin Boolean @default(true) @map("is_first_login")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  lastLoginAt DateTime? @map("last_login_at")

  // 關聯
  activityLogs ActivityLog[]
  supplyChanges SupplyChange[]
  donationRecords DonationRecord[]

  @@map("users")
}

enum Role {
  ADMIN
  STAFF
  VOLUNTEER
}
```

### 2. Supplies (物資表)
```prisma
model Supply {
  id          String   @id @default(cuid())
  category    String
  name        String
  quantity    Int
  safetyStock Int      @map("safety_stock")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  // 關聯
  supplyChanges SupplyChange[]
  donationItems DonationItem[]
  pickupItems   PickupItem[]

  @@map("supplies")
}
```

### 3. Supply Changes (庫存變更記錄)
```prisma
model SupplyChange {
  id         String      @id @default(cuid())
  supplyId   String      @map("supply_id")
  userId     String      @map("user_id")
  changeType ChangeType  @map("change_type")
  oldQuantity Int        @map("old_quantity")
  newQuantity Int        @map("new_quantity")
  amount     Int
  reason     String
  createdAt  DateTime    @default(now()) @map("created_at")

  // 關聯
  supply Supply @relation(fields: [supplyId], references: [id], onDelete: Cascade)
  user   User   @relation(fields: [userId], references: [id])

  @@map("supply_changes")
}

enum ChangeType {
  INCREASE
  DECREASE
}
```

### 4. Donation Records (捐贈記錄)
```prisma
model DonationRecord {
  id          String   @id @default(cuid())
  donorName   String   @map("donor_name")
  donorPhone  String   @map("donor_phone")
  donorAddress String? @map("donor_address")
  notes       String?
  createdByUserId String @map("created_by_user_id")
  createdAt   DateTime @default(now()) @map("created_at")

  // 關聯
  createdBy User @relation(fields: [createdByUserId], references: [id])
  items     DonationItem[]

  @@map("donation_records")
}
```

### 5. Donation Items (捐贈物品)
```prisma
model DonationItem {
  id         String   @id @default(cuid())
  donationId String   @map("donation_id")
  supplyId   String   @map("supply_id")
  quantity   Int
  expiryDate DateTime? @map("expiry_date")

  // 關聯
  donation DonationRecord @relation(fields: [donationId], references: [id], onDelete: Cascade)
  supply   Supply         @relation(fields: [supplyId], references: [id])

  @@map("donation_items")
}
```

### 6. Pickup Records (發放記錄)
```prisma
model PickupRecord {
  id        String   @id @default(cuid())
  unit      String
  phone     String
  purpose   String
  createdByUserId String @map("created_by_user_id")
  createdAt DateTime @default(now()) @map("created_at")

  // 關聯
  createdBy User @relation(fields: [createdByUserId], references: [id])
  items     PickupItem[]

  @@map("pickup_records")
}
```

### 7. Pickup Items (發放物品)
```prisma
model PickupItem {
  id       String @id @default(cuid())
  pickupId String @map("pickup_id")
  supplyId String @map("supply_id")
  quantity Int

  // 關聯
  pickup PickupRecord @relation(fields: [pickupId], references: [id], onDelete: Cascade)
  supply Supply       @relation(fields: [supplyId], references: [id])

  @@map("pickup_items")
}
```

### 8. Activity Logs (操作日誌)
```prisma
model ActivityLog {
  id           String   @id @default(cuid())
  userId       String   @map("user_id")
  action       String
  resourceType String?  @map("resource_type")
  resourceId   String?  @map("resource_id")
  details      Json?
  ipAddress    String?  @map("ip_address")
  userAgent    String?  @map("user_agent")
  createdAt    DateTime @default(now()) @map("created_at")

  // 關聯
  user User @relation(fields: [userId], references: [id])

  @@map("activity_logs")
}
```

---

## 🔧 Prisma 設定檔

### prisma/schema.prisma
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// 將上述所有 model 放在這裡
```

### 環境變數 (.env.local)
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/miaoli_supplies"

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding
```

---

## 🚀 初始化步驟

### 1. 安裝依賴套件
```bash
npm install @clerk/nextjs prisma @prisma/client
npm install -D prisma
```

### 2. 初始化 Prisma
```bash
npx prisma init
```

### 3. 設定資料庫連線
```bash
# 修改 .env.local 中的 DATABASE_URL
# 將 schema.prisma 的內容替換為上述設計
```

### 4. 生成和推送資料庫
```bash
npx prisma db push
npx prisma generate
```

### 5. 建立初始資料
```bash
npx prisma studio  # 可視化資料庫管理介面
```

---

## 📝 API 路由設計

### 用戶管理 API
```
POST   /api/users/sync          # 同步 Clerk 用戶到資料庫
PUT    /api/users/[id]/profile  # 更新用戶資料
PUT    /api/users/[id]/role     # 更新用戶權限 (僅管理員)
GET    /api/users               # 獲取所有用戶 (僅管理員)
```

### 物資管理 API
```
GET    /api/supplies           # 獲取物資清單
PUT    /api/supplies/[id]      # 更新物資資訊
POST   /api/supplies/changes   # 記錄庫存變更
```

### 操作日誌 API
```
POST   /api/logs               # 記錄操作日誌
GET    /api/logs               # 獲取操作日誌 (僅管理員)
```

---

## 🎯 下一步實作

### 優先順序
1. **設定 Prisma 和資料庫**
2. **安裝和配置 Clerk**
3. **建立用戶同步機制**
4. **實作人員管理頁面**
5. **整合權限檢查到現有功能**

### 開發順序建議
1. 資料庫架構 → Clerk 整合 → API 層 → UI 層 → 測試

*準備開始安裝和設定嗎？*