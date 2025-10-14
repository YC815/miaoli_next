"use client";

import React, { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ItemConditionData {
  condition: string;
  quantity: number;
  notes?: string;
}

interface SelectedItem {
  itemName: string;
  itemCategory: string;
  itemUnit: string;
  expiryDate?: string;
  isStandard: boolean;
}

interface ItemConditionsStepProps {
  selectedItems: SelectedItem[];
  itemConditions: Record<string, ItemConditionData[]>;
  onConditionsChange: (itemName: string, itemCategory: string, conditions: ItemConditionData[]) => void;
}

// 預設品相選項
const DEFAULT_CONDITIONS = [
  "全新",
  "二手良好",
  "二手一般",
  "包裝破損但內容物完整",
  "部分損壞",
  "需要檢查"
];

export function ItemConditionsStep({
  selectedItems,
  itemConditions,
  onConditionsChange
}: ItemConditionsStepProps) {

  const getItemKey = (item: SelectedItem) => `${item.itemName}_${item.itemCategory}`;

  const getItemConditions = (item: SelectedItem): ItemConditionData[] => {
    const itemKey = getItemKey(item);
    return itemConditions[itemKey] || [{ condition: "全新", quantity: 0, notes: "" }];
  };

  const updateItemCondition = (
    item: SelectedItem,
    conditionIndex: number,
    field: keyof ItemConditionData,
    value: string | number
  ) => {
    const currentConditions = getItemConditions(item);
    const updatedConditions = [...currentConditions];

    updatedConditions[conditionIndex] = {
      ...updatedConditions[conditionIndex],
      [field]: value
    };

    onConditionsChange(item.itemName, item.itemCategory, updatedConditions);
  };

  const addCondition = (item: SelectedItem) => {
    const currentConditions = getItemConditions(item);
    const newConditions = [
      ...currentConditions,
      { condition: "全新", quantity: 0, notes: "" }
    ];
    onConditionsChange(item.itemName, item.itemCategory, newConditions);
  };

  const removeCondition = (item: SelectedItem, conditionIndex: number) => {
    const currentConditions = getItemConditions(item);
    if (currentConditions.length > 1) {
      const newConditions = currentConditions.filter((_, index) => index !== conditionIndex);
      onConditionsChange(item.itemName, item.itemCategory, newConditions);
    }
  };

  const getTotalQuantity = (item: SelectedItem): number => {
    const conditions = getItemConditions(item);
    return conditions.reduce((total, condition) => total + (condition.quantity || 0), 0);
  };

  // 初始化每個物品的條件（如果還沒有的話）
  useEffect(() => {
    selectedItems.forEach(item => {
      const itemKey = getItemKey(item);
      if (!itemConditions[itemKey]) {
        onConditionsChange(item.itemName, item.itemCategory, [
          { condition: "全新", quantity: 0, notes: "" }
        ]);
      }
    });
  }, [selectedItems, itemConditions, onConditionsChange]);

  if (selectedItems.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>請先在上一步選擇物品</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {selectedItems.map((item) => {
        const conditions = getItemConditions(item);
        const totalQuantity = getTotalQuantity(item);

        return (
          <div key={`${item.itemName}_${item.itemCategory}`} className="border rounded-lg p-4">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">{item.itemName}</h3>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">總數量: {totalQuantity} {item.itemUnit}</Badge>
                  <Badge variant={item.isStandard ? "default" : "secondary"}>
                    {item.isStandard ? "標準" : "自訂"}
                  </Badge>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                分類: {item.itemCategory} | 單位: {item.itemUnit}
                {item.expiryDate && ` | 有效日期: ${item.expiryDate}`}
              </p>
            </div>

            <div className="space-y-4">
              <Label className="text-sm font-medium">品相設定</Label>

              {conditions.map((condition, conditionIndex) => (
                <div key={conditionIndex} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-3 border rounded">
                  {/* 品相選擇 */}
                  <div className="md:col-span-3">
                    <Label className="text-xs text-muted-foreground mb-1">品相</Label>
                    <Select
                      value={condition.condition}
                      onValueChange={(value) => updateItemCondition(item, conditionIndex, "condition", value)}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DEFAULT_CONDITIONS.map((conditionOption) => (
                          <SelectItem key={conditionOption} value={conditionOption}>
                            {conditionOption}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 數量輸入 */}
                  <div className="md:col-span-2">
                    <Label className="text-xs text-muted-foreground mb-1">數量</Label>
                    <Input
                      type="number"
                      min="0"
                      value={condition.quantity || ""}
                      onChange={(e) => updateItemCondition(
                        item,
                        conditionIndex,
                        "quantity",
                        parseInt(e.target.value) || 0
                      )}
                      placeholder="0"
                      className="h-8"
                    />
                  </div>

                  {/* 備註 */}
                  <div className="md:col-span-6">
                    <Label className="text-xs text-muted-foreground mb-1">備註</Label>
                    <Input
                      value={condition.notes || ""}
                      onChange={(e) => updateItemCondition(item, conditionIndex, "notes", e.target.value)}
                      placeholder="描述品相詳情"
                      className="h-8"
                    />
                  </div>

                  {/* 刪除按鈕 */}
                  <div className="md:col-span-1 flex items-end">
                    {conditions.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCondition(item, conditionIndex)}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {/* 新增品相按鈕 */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addCondition(item)}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                新增品相條件
              </Button>
            </div>

            {/* 驗證提示 */}
            {totalQuantity === 0 && (
              <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
                請至少設定一個品相的數量
              </div>
            )}
          </div>
        );
      })}

      {/* 整體總結 */}
      <div className="bg-muted/50 rounded-lg p-4">
        <h4 className="font-medium mb-2">捐贈總結</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          {selectedItems.map((item) => {
            const totalQuantity = getTotalQuantity(item);
            return (
              <div key={getItemKey(item)} className="flex justify-between">
                <span>{item.itemName}:</span>
                <span className="font-medium">{totalQuantity} {item.itemUnit}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}