"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Trash2, Search } from "lucide-react";
import { toast } from "sonner";

interface Supply {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  safetyStock: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface Category {
  id: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface RecipientUnit {
  id: string;
  name: string;
  phone?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export function DataManagement() {
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [recipientUnits, setRecipientUnits] = useState<RecipientUnit[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSection, setActiveSection] = useState<"supplies" | "categories" | "recipient-units">("supplies");

  useEffect(() => {
    fetchSupplies();
    fetchCategories();
    fetchRecipientUnits();
  }, []);

  const fetchSupplies = async () => {
    try {
      const response = await fetch('/api/supplies');
      if (response.ok) {
        const data = await response.json();
        setSupplies(data);
      }
    } catch (error) {
      console.error('Error fetching supplies:', error);
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

  const fetchRecipientUnits = async () => {
    try {
      const response = await fetch('/api/recipient-units');
      if (response.ok) {
        const data = await response.json();
        setRecipientUnits(data);
      }
    } catch (error) {
      console.error('Error fetching recipient units:', error);
    }
  };

  const handleDelete = async (type: string, id: string, name: string) => {
    if (!confirm(`確定要停用「${name}」嗎？停用後將不會在選單中顯示。`)) {
      return;
    }

    try {
      let endpoint = "";
      let method = "";
      let body = {};

      if (type === "supplies") {
        endpoint = `/api/supplies/${id}`;
        method = "PUT";
        body = { isActive: false };
      } else {
        endpoint = type === "categories" ? "/api/categories" : "/api/recipient-units";
        method = "DELETE";
        body = { id };
      }
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast.success(`「${name}」已成功停用`);
        
        // Refresh the appropriate list
        if (type === "supplies") fetchSupplies();
        else if (type === "categories") fetchCategories();
        else fetchRecipientUnits();
      } else {
        const errorData = await response.json();
        toast.error(`停用失敗: ${errorData.error}`);
      }
    } catch (error) {
      console.error(`Error updating ${type}:`, error);
      toast.error("停用失敗");
    }
  };

  const filterData = (data: (Supply | Category | RecipientUnit)[]) => {
    return data.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const DataTable = ({ data, type, title }: { data: (Supply | Category | RecipientUnit)[], type: string, title: string }) => (
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
                    <div className="font-medium">{item.name}</div>
                    {'isActive' in item && !item.isActive && (
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">已停用</span>
                    )}
                  </div>
                  {'category' in item && (
                    <div className="text-sm text-muted-foreground">類別：{item.category}</div>
                  )}
                  {'quantity' in item && (
                    <div className="text-sm text-muted-foreground">
                      庫存：{item.quantity} {item.unit} / 安全庫存：{item.safetyStock}
                    </div>
                  )}
                  {'phone' in item && item.phone && (
                    <div className="text-sm text-muted-foreground">電話：{item.phone}</div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    建立時間：{new Date(item.createdAt).toLocaleDateString()}
                  </div>
                </div>
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
                {!('isActive' in item) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(type, (item as Category | RecipientUnit).id, (item as Category | RecipientUnit).name)}
                    className="text-red-600 hover:text-red-800 hover:bg-red-50"
                    title="刪除此項目"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
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
          管理系統中的物資名稱、類別和領取單位等基礎資料
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
      <div className="flex gap-2 border-b">
        <Button
          variant={activeSection === "supplies" ? "default" : "ghost"}
          onClick={() => setActiveSection("supplies")}
          className="rounded-b-none"
        >
          物資項目 ({supplies.length})
        </Button>
        <Button
          variant={activeSection === "categories" ? "default" : "ghost"}
          onClick={() => setActiveSection("categories")}
          className="rounded-b-none"
        >
          物資類別 ({categories.length})
        </Button>
        <Button
          variant={activeSection === "recipient-units" ? "default" : "ghost"}
          onClick={() => setActiveSection("recipient-units")}
          className="rounded-b-none"
        >
          領取單位 ({recipientUnits.length})
        </Button>
      </div>

      {/* Data Tables */}
      <div className="min-h-[400px]">
        {activeSection === "supplies" && (
          <DataTable data={supplies} type="supplies" title="物資項目清單" />
        )}
        {activeSection === "categories" && (
          <DataTable data={categories} type="categories" title="物資類別清單" />
        )}
        {activeSection === "recipient-units" && (
          <DataTable data={recipientUnits} type="recipient-units" title="領取單位清單" />
        )}
      </div>

      {/* Note */}
      <div className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-lg">
        <p className="font-medium mb-1">📝 使用說明：</p>
        <ul className="space-y-1 list-disc list-inside ml-2">
          <li>物資項目：停用操作僅會將項目設為「不活躍」狀態，不會真正從資料庫中移除</li>
          <li>被停用的物資項目將不再顯示在表單下拉選單中，但歷史記錄仍會保留</li>
          <li>新增物資項目可以透過「物資管理」頁面的新增功能進行</li>
          <li>類別和領取單位的刪除是軟刪除，同樣保留歷史記錄</li>
          <li>只有管理員才能執行停用/刪除操作</li>
        </ul>
      </div>
    </div>
  );
}