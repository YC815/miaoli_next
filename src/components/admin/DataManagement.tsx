"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Trash2, Search } from "lucide-react";
import { toast } from "sonner";

interface SupplyName {
  id: string;
  name: string;
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
  const [supplyNames, setSupplyNames] = useState<SupplyName[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [recipientUnits, setRecipientUnits] = useState<RecipientUnit[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSection, setActiveSection] = useState<"supply-names" | "categories" | "recipient-units">("supply-names");

  useEffect(() => {
    fetchSupplyNames();
    fetchCategories();
    fetchRecipientUnits();
  }, []);

  const fetchSupplyNames = async () => {
    try {
      const response = await fetch('/api/supply-names');
      if (response.ok) {
        const data = await response.json();
        setSupplyNames(data);
      }
    } catch (error) {
      console.error('Error fetching supply names:', error);
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
    if (!confirm(`確定要刪除「${name}」嗎？此操作無法復原。`)) {
      return;
    }

    try {
      const endpoint = type === "supply-names" ? "/api/supply-names" : 
                     type === "categories" ? "/api/categories" :
                     "/api/recipient-units";
      
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });

      if (response.ok) {
        toast.success(`「${name}」已成功刪除`);
        
        // Refresh the appropriate list
        if (type === "supply-names") fetchSupplyNames();
        else if (type === "categories") fetchCategories();
        else fetchRecipientUnits();
      } else {
        const errorData = await response.json();
        toast.error(`刪除失敗: ${errorData.error}`);
      }
    } catch (error) {
      console.error(`Error deleting ${type}:`, error);
      toast.error("刪除失敗");
    }
  };

  const filterData = (data: (SupplyName | Category | RecipientUnit)[]) => {
    return data.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const DataTable = ({ data, type, title }: { data: (SupplyName | Category | RecipientUnit)[], type: string, title: string }) => (
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
                  <div className="font-medium">{item.name}</div>
                  {'phone' in item && item.phone && (
                    <div className="text-sm text-muted-foreground">電話：{item.phone}</div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    建立時間：{new Date(item.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(type, item.id, item.name)}
                  className="text-red-600 hover:text-red-800 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
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
          variant={activeSection === "supply-names" ? "default" : "ghost"}
          onClick={() => setActiveSection("supply-names")}
          className="rounded-b-none"
        >
          物資名稱 ({supplyNames.length})
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
        {activeSection === "supply-names" && (
          <DataTable data={supplyNames} type="supply-names" title="物資名稱清單" />
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
          <li>刪除操作僅會將項目設為「不活躍」狀態，不會真正從資料庫中移除</li>
          <li>被刪除的項目將不再顯示在下拉選單中，但歷史記錄仍會保留</li>
          <li>新增項目可以透過各個表單中的「+ 新增」功能進行</li>
          <li>只有管理員才能執行刪除操作</li>
        </ul>
      </div>
    </div>
  );
}