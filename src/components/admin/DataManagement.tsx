"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, Search, Edit } from "lucide-react";
import { toast } from "sonner";
import { ItemsManagement } from "@/components/admin/ItemsManagement";
import { DonorsManagement } from "@/components/admin/DonorsManagement";
import { RecipientUnitsManagement } from "@/components/recipient/RecipientUnitsManagement";
import { SealManagement } from "@/components/admin/SealManagement";
import { useDataRefresh } from "@/contexts/DataRefreshContext";

interface Category {
  id: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface DataCounts {
  categories: number;
  standardItems: number;
  customItems: number;
  donors: number;
  recipients: number;
  seals: number;
}

export function DataManagement() {
  const { refreshKey, triggerRefresh } = useDataRefresh();
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSection, setActiveSection] = useState<"categories" | "recipients" | "donors" | "items" | "seals">("items");
  const [editingItem, setEditingItem] = useState<{ type: string; id: string; name: string } | null>(null);
  const [editName, setEditName] = useState("");
  const [counts, setCounts] = useState<DataCounts>({
    categories: 0,
    standardItems: 0,
    customItems: 0,
    donors: 0,
    recipients: 0,
    seals: 0,
  });
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    loadAllData();
  }, [refreshKey]);

  const loadAllData = async () => {
    setInitialLoading(true);
    try {
      // 並行載入所有資料以取得計數
      const [categoriesRes, standardItemsRes, customItemsRes, donorsRes, recipientsRes, sealsRes] = await Promise.all([
        fetch('/api/categories').then(r => r.ok ? r.json() : []).catch(() => []),
        fetch('/api/standard-items').then(r => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] })),
        fetch('/api/custom-items?includeHidden=true').then(r => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] })),
        fetch('/api/donors?includeInactive=true').then(r => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] })),
        fetch('/api/recipient-units?includeInactive=true').then(r => r.ok ? r.json() : []).catch(() => []),
        fetch('/api/seals').then(r => r.ok ? r.json() : []).catch(() => []),
      ]);

      // 更新 categories（用於當前頁面顯示）
      if (Array.isArray(categoriesRes)) {
        setCategories(categoriesRes);
      }

      // 更新計數
      setCounts({
        categories: Array.isArray(categoriesRes) ? categoriesRes.length : 0,
        standardItems: standardItemsRes.data?.length || 0,
        customItems: customItemsRes.data?.filter((i: { isHidden: boolean }) => !i.isHidden).length || 0,
        donors: donorsRes.data?.filter((d: { isActive: boolean }) => d.isActive).length || 0,
        recipients: Array.isArray(recipientsRes)
          ? recipientsRes.filter((r: { isActive: boolean }) => r.isActive).length
          : recipientsRes.data?.filter((r: { isActive: boolean }) => r.isActive).length || 0,
        seals: Array.isArray(sealsRes) ? sealsRes.length : 0,
      });
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleEdit = (type: string, id: string, name: string) => {
    setEditingItem({ type, id, name });
    setEditName(name);
  };

  const handleSaveEdit = async () => {
    if (!editingItem || !editName.trim()) {
      toast.error("請輸入有效的名稱");
      return;
    }

    try {
      let endpoint = "";
      let body = {};

      endpoint = "/api/categories";
      body = { id: editingItem.id, name: editName.trim() };
      
      const response = await fetch(endpoint, {
        method: "PUT",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast.success(`「${editingItem.name}」已成功更新為「${editName.trim()}」`);
        triggerRefresh(); // Trigger global data refresh
        fetchCategories();
        setEditingItem(null);
        setEditName("");
      } else {
        const errorData = await response.json();
        toast.error(`更新失敗: ${errorData.error}`);
      }
    } catch (error) {
      console.error(`Error updating ${editingItem.type}:`, error);
      toast.error("更新失敗");
    }
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setEditName("");
  };

  const handleDelete = async (type: string, id: string, name: string) => {
    if (!confirm(`確定要停用「${name}」嗎？停用後將不會在選單中顯示。`)) {
      return;
    }

    try {
      const response = await fetch("/api/categories", {
        method: "DELETE",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });

      if (response.ok) {
        toast.success(`「${name}」已成功停用`);
        triggerRefresh(); // Trigger global data refresh
        fetchCategories();
      } else {
        const errorData = await response.json();
        toast.error(`停用失敗: ${errorData.error}`);
      }
    } catch (error) {
      console.error(`Error updating ${type}:`, error);
      toast.error("停用失敗");
    }
  };

  const filterData = (data: Category[]) => {
    return data.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const DataTable = ({ data, type, title }: { data: Category[], type: string, title: string }) => (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {filterData(data).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? "沒有符合搜尋條件的項目" : "目前沒有資料"}
            </div>
          ) : (
            filterData(data).map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/20">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {editingItem?.id === item.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit();
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                        />
                        <Button size="sm" onClick={handleSaveEdit} disabled={!editName.trim()}>
                          儲存
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                          取消
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="font-medium">{item.name}</div>
                        {'isActive' in item && !item.isActive && (
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">已停用</span>
                        )}
                      </>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    建立時間：{new Date(item.createdAt).toLocaleDateString()}
                  </div>
                </div>
                {editingItem?.id !== item.id && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(type, item.id, item.name)}
                      className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                      title="編輯此項目"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {'isActive' in item && item.isActive && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(type, item.id, item.name)}
                        className="text-red-600 hover:text-red-800 hover:bg-red-50"
                        title="停用此項目"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">資料管理</h2>
        <p className="text-muted-foreground">
          管理系統中的物資品項、類別、捐贈與領取單位以及收據印章等基礎資料
        </p>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜尋項目名稱..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Section Tabs */}
      <div className="overflow-x-auto border-b">
        <div className="flex gap-2 min-w-max">
          <Button
            variant={activeSection === "items" ? "default" : "ghost"}
            onClick={() => setActiveSection("items")}
            className="rounded-b-none whitespace-nowrap"
          >
            物資品項 {(counts.standardItems + counts.customItems) > 0 && `(${counts.standardItems + counts.customItems})`}
          </Button>
          <Button
            variant={activeSection === "categories" ? "default" : "ghost"}
            onClick={() => setActiveSection("categories")}
            className="rounded-b-none whitespace-nowrap"
          >
            物資類別 {counts.categories > 0 && `(${counts.categories})`}
          </Button>
          <Button
            variant={activeSection === "donors" ? "default" : "ghost"}
            onClick={() => setActiveSection("donors")}
            className="rounded-b-none whitespace-nowrap"
          >
            捐贈單位 {counts.donors > 0 && `(${counts.donors})`}
          </Button>
          <Button
            variant={activeSection === "recipients" ? "default" : "ghost"}
            onClick={() => setActiveSection("recipients")}
            className="rounded-b-none whitespace-nowrap"
          >
            領取單位 {counts.recipients > 0 && `(${counts.recipients})`}
          </Button>
          <Button
            variant={activeSection === "seals" ? "default" : "ghost"}
            onClick={() => setActiveSection("seals")}
            className="rounded-b-none whitespace-nowrap"
          >
            印章管理 {counts.seals > 0 && `(${counts.seals})`}
          </Button>
        </div>
      </div>

      {/* Data Tables */}
      <div className="min-h-[400px]">
        {initialLoading ? (
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-48" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ) : (
          <>
            {activeSection === "items" && <ItemsManagement />}
            {activeSection === "categories" && (
              <DataTable data={categories} type="categories" title="物資類別清單" />
            )}
            {activeSection === "donors" && <DonorsManagement />}
            {activeSection === "recipients" && <RecipientUnitsManagement />}
            {activeSection === "seals" && <SealManagement />}
          </>
        )}
      </div>

      {/* Note */}
      <div className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-lg">
        <p className="font-medium mb-1">📝 使用說明：</p>
        <ul className="space-y-1 list-disc list-inside ml-2">
          <li>物資品項管理專區整合標準品項與自訂品項，可直接新增或隱藏物資</li>
          <li>類別編輯：點擊編輯按鈕可直接修改項目名稱，按 Enter 確認或 Escape 取消</li>
          <li>捐贈單位與領取單位：提供完整的搜尋、篩選、新增、編輯與停用功能</li>
          <li>類別的刪除是軟刪除，保留歷史記錄；捐贈單位與領取單位可停用後重新啟用</li>
          <li>印章管理可集中維護所有收據印章，支援重新命名、裁切及刪除</li>
          <li>只有管理員和員工才能執行編輯操作，只有管理員才能執行停用/刪除操作</li>
        </ul>
      </div>
    </div>
  );
}
