## 📦 API: 取得庫存狀態

### 端點

```
GET /api/inventory/status
```

### 查詢參數（Query Parameters）

- **status**: `sufficient` | `insufficient` | `out_of_stock` | `all`（預設: `all`）
  → 篩選特定庫存狀態

- **category**: _string_
  → 篩選特定分類

- **activeOnly**: `true` | `false`（預設: `true`）
  → 是否只顯示啟用中的品項

---

### 使用範例

```bash
/api/inventory/status
# 所有庫存狀態

/api/inventory/status?status=insufficient
# 只看庫存不足

/api/inventory/status?category=防護用品
# 篩選「防護用品」分類
```

---

### 回傳格式 (JSON)

```json
{
  "summary": {
    "total": 150,
    "sufficient": 120,
    "insufficient": 25,
    "outOfStock": 5
  },
  "supplies": [
    ...
  ]
}
```

---

### 📢 備註

- 此 API 為 **公開 API**，外部系統可直接調用。
- **不需要權限驗證**。
