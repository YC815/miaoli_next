"use client";

import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Eye, EyeOff, Plus } from "lucide-react";
import { toast } from "sonner";
import { CustomItemDialog } from "@/components/donation/CustomItemDialog";

interface StandardItem {
  id: string;
  name: string;
  category: string;
  units: string[];
  defaultUnit: string;
  isActive: boolean;
  sortOrder: number;
}

interface CustomItem {
  id: string;
  name: string;
  category: string;
  units: string[];
  defaultUnit: string;
  isActive: boolean;
  isHidden: boolean;
  sortOrder: number;
  createdAt: string;
  user?: {
    nickname: string | null;
    email: string;
  };
}

export function ItemsManagement() {
  const [standardItems, setStandardItems] = useState<StandardItem[]>([]);
  const [customItems, setCustomItems] = useState<CustomItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showHidden, setShowHidden] = useState(false);
  const [showCustomItemDialog, setShowCustomItemDialog] = useState(false);

  useEffect(() => {
    loadStandardItems();
    loadCustomItems();
  }, []);

  const loadStandardItems = async () => {
    try {
      const response = await fetch('/api/standard-items');
      if (response.ok) {
        const data = await response.json();
        setStandardItems(data.data || []);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('載入基礎資料失敗:', response.status, errorData);
        toast.error(`載入基礎資料失敗: ${errorData.details || errorData.error}`);
      }
    } catch (error) {
      console.error('載入基礎資料失敗:', error);
      toast.error('載入基礎資料失敗');
    }
  };

  const loadCustomItems = async () => {
    try {
      const response = await fetch('/api/custom-items?includeHidden=true');
      if (response.ok) {
        const data = await response.json();
        setCustomItems(data.data || []);
      }
    } catch (error) {
      console.error('載入附加資料失敗:', error);
      toast.error('載入附加資料失敗');
    }
  };

  const handleToggleHidden = async (id: string) => {
    try {
      const response = await fetch(`/api/custom-items/${id}/toggle-hidden`, {
        method: 'PATCH',
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        loadCustomItems(); // 重新載入
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || '操作失敗');
      }
    } catch (error) {
      console.error('切換隱藏狀態失敗:', error);
      toast.error('操作失敗');
    }
  };

  const handleCustomItemCreated = () => {
    loadCustomItems();
    setShowCustomItemDialog(false);
  };

  const filterItems = <T extends StandardItem | CustomItem>(items: T[]) => {
    return items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            item.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesHiddenFilter = 'isHidden' in item
        ? (showHidden || !item.isHidden)
        : true;
      return matchesSearch && matchesHiddenFilter;
    });
  };

  // 按分類分組
  const groupByCategory = <T extends StandardItem | CustomItem>(items: T[]) => {
    const grouped: Record<string, T[]> = {};
    items.forEach(item => {
      if (!grouped[item.category]) {
        grouped[item.category] = [];
      }
      grouped[item.category].push(item);
    });
    return grouped;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">物資品項管理</h2>
        <p className="text-muted-foreground">
          管理基礎物資品項和自訂物資品項
        </p>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜尋物資名稱或分類..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="standard" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="standard">
            基礎資料 ({standardItems.length})
          </TabsTrigger>
          <TabsTrigger value="custom">
            附加資料 ({customItems.filter(i => !i.isHidden).length})
          </TabsTrigger>
        </TabsList>

        {/* 基礎資料 Tab */}
        <TabsContent value="standard" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">基礎物資品項（唯讀）</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.entries(groupByCategory(filterItems(standardItems))).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm ? "沒有符合搜尋條件的項目" : "目前沒有資料"}
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupByCategory(filterItems(standardItems))).map(([category, items]) => (
                    <div key={category}>
                      <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-2">
                        {category}
                      </h3>
                      <div className="space-y-2">
                        {items.map(item => (
                          <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{item.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  標準品項
                                </Badge>
                              </div>
                              <div className="text-sm text-muted-foreground mt-1">
                                單位：{item.units.join(' / ')}
                                {item.units.length > 1 && ` （預設：${item.defaultUnit}）`}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
            <p className="font-medium mb-1">ℹ️ 關於基礎資料：</p>
            <ul className="space-y-1 list-disc list-inside ml-2">
              <li>基礎資料為系統預設的標準物資品項，根據 item_list.json 定義</li>
              <li>這些品項為唯讀，無法透過介面新增、編輯或刪除</li>
              <li>若需修改基礎資料，請聯繫系統管理員</li>
            </ul>
          </div>
        </TabsContent>

        {/* 附加資料 Tab */}
        <TabsContent value="custom" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => setShowCustomItemDialog(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                新增物資
              </Button>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={showHidden}
                  onChange={(e) => setShowHidden(e.target.checked)}
                  className="rounded"
                />
                顯示已隱藏物資
              </label>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">自訂物資品項</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.entries(groupByCategory(filterItems(customItems))).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm ? "沒有符合搜尋條件的項目" : "目前沒有自訂物資，點擊「新增物資」開始建立"}
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupByCategory(filterItems(customItems))).map(([category, items]) => (
                    <div key={category}>
                      <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-2">
                        {category}
                      </h3>
                      <div className="space-y-2">
                        {items.map(item => (
                          <div
                            key={item.id}
                            className={`flex items-center justify-between p-3 border rounded-lg ${
                              item.isHidden ? 'bg-gray-100 dark:bg-gray-900 opacity-60' : 'hover:bg-muted/20'
                            }`}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{item.name}</span>
                                <Badge variant="secondary" className="text-xs">
                                  自訂品項
                                </Badge>
                                {item.isHidden && (
                                  <Badge variant="outline" className="text-xs text-gray-500">
                                    已隱藏
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground mt-1">
                                單位：{item.units.join(' / ')}
                                {item.units.length > 1 && ` （預設：${item.defaultUnit}）`}
                              </div>
                              {item.user && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  建立者：{item.user.nickname || item.user.email}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleHidden(item.id)}
                                className={item.isHidden ? "text-green-600 hover:text-green-800" : "text-gray-600 hover:text-gray-800"}
                                title={item.isHidden ? "顯示此物資" : "隱藏此物資"}
                              >
                                {item.isHidden ? (
                                  <Eye className="h-4 w-4" />
                                ) : (
                                  <EyeOff className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-lg">
            <p className="font-medium mb-1">📝 使用說明：</p>
            <ul className="space-y-1 list-disc list-inside ml-2">
              <li>自訂物資可由員工或管理員自行新增</li>
              <li>隱藏的物資不會出現在新增捐贈的下拉選單中</li>
              <li>隱藏操作不會刪除資料，歷史捐贈紀錄仍會保留該物資資訊</li>
              <li>勾選「顯示已隱藏物資」可查看並重新顯示被隱藏的物資</li>
            </ul>
          </div>
        </TabsContent>
      </Tabs>

      {/* Custom Item Dialog */}
      <CustomItemDialog
        open={showCustomItemDialog}
        onOpenChange={setShowCustomItemDialog}
        onCustomItemCreated={handleCustomItemCreated}
      />
    </div>
  );
}
