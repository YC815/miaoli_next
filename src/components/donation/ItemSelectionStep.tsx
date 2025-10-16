"use client";

import React, { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";
import { CustomItemDialog } from "@/components/donation/CustomItemDialog";
import type { User } from "@/components/auth/AuthGuard";

interface StandardItem {
  name: string;
  category: string;
  units: string[];
  defaultUnit: string;
}

interface CustomItem {
  id: string;
  name: string;
  category: string;
  units: string[];
  defaultUnit: string;
  isHidden: boolean;
}

interface SelectedItem {
  itemName: string;
  itemCategory: string;
  itemUnit: string;
  availableUnits?: string[];  // 可選單位清單
  expiryDate?: string;
  isStandard: boolean;
  quantity: number;
  notes?: string;
}

interface ItemSelectionStepProps {
  selectedItems: SelectedItem[];
  onItemsChange: (items: SelectedItem[]) => void;
  dbUser?: User | null;
}

export function ItemSelectionStep({ selectedItems, onItemsChange }: Omit<ItemSelectionStepProps, 'dbUser'>) {
  const [standardItems, setStandardItems] = useState<StandardItem[]>([]);
  const [customItems, setCustomItems] = useState<CustomItem[]>([]);
  const [showCustomItemDialog, setShowCustomItemDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  // 載入標準物品和自訂物品
  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    setLoading(true);
    try {
      // 載入標準物品
      const standardResponse = await fetch('/api/standard-items');
      if (standardResponse.ok) {
        const standardData = await standardResponse.json();
        setStandardItems(standardData.data || []);
      }

      // 載入自訂物品
      const customResponse = await fetch('/api/custom-items');
      if (customResponse.ok) {
        const customData = await customResponse.json();
        setCustomItems(customData.data || []);
      }
    } catch (error) {
      console.error('載入物品清單失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  // 所有可選物品清單
  const availableItems = [
    ...standardItems.map(item => ({ ...item, isStandard: true })),
    ...customItems.filter(item => !item.isHidden).map(item => ({ ...item, isStandard: false }))
  ];

  // 依分類分組物品
  const itemsByCategory = availableItems.reduce((groups, item) => {
    const category = item.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(item);
    return groups;
  }, {} as Record<string, typeof availableItems>);

  const addItem = () => {
    const newItem: SelectedItem = {
      itemName: "",
      itemCategory: "",
      itemUnit: "個",
      expiryDate: "",
      isStandard: false,
      quantity: 0,
      notes: ""
    };
    onItemsChange([...selectedItems, newItem]);
  };

  const removeItem = (index: number) => {
    if (selectedItems.length > 1) {
      const updatedItems = selectedItems.filter((_, i) => i !== index);
      onItemsChange(updatedItems);
    }
  };

  const updateItem = (index: number, field: keyof SelectedItem, value: string | boolean | number) => {
    const updatedItems = [...selectedItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    onItemsChange(updatedItems);
  };

  const handleItemSelect = (index: number, itemKey: string) => {
    if (itemKey === "custom") {
      setShowCustomItemDialog(true);
      return;
    }

    const [name, category] = itemKey.split("|");
    const item = availableItems.find(i => i.name === name && i.category === category);

    if (item) {
      // 處理多單位：JSON 陣列或舊格式字串
      const units = Array.isArray(item.units) ? item.units : [item.units || item.defaultUnit];

      const updatedItems = [...selectedItems];
      updatedItems[index] = {
        ...updatedItems[index],
        itemName: item.name,
        itemCategory: item.category,
        itemUnit: item.defaultUnit,
        availableUnits: units,
        isStandard: item.isStandard
      };
      onItemsChange(updatedItems);
    }
  };

  const handleCustomItemCreated = (customItem: CustomItem) => {
    setCustomItems(prev => [...prev, customItem]);
    setShowCustomItemDialog(false);

    // 自動選擇剛建立的自訂物品到最後一個空的選項
    const emptyIndex = selectedItems.findIndex(item => !item.itemName);
    if (emptyIndex >= 0) {
      const units = Array.isArray(customItem.units) ? customItem.units : [customItem.units || customItem.defaultUnit];

      const updatedItems = [...selectedItems];
      updatedItems[emptyIndex] = {
        ...updatedItems[emptyIndex],
        itemName: customItem.name,
        itemCategory: customItem.category,
        itemUnit: customItem.defaultUnit,
        availableUnits: units,
        isStandard: false,
        quantity: updatedItems[emptyIndex].quantity || 1,
        notes: updatedItems[emptyIndex].notes || ""
      };
      onItemsChange(updatedItems);
    }
  };

  // 檢查物品是否已被選擇
  const isItemSelected = (name: string, category: string) => {
    return selectedItems.some(item => item.itemName === name && item.itemCategory === category);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {selectedItems.map((item, index) => (
          <div key={index} className="p-4 border rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">物品 {index + 1}</h4>
              {selectedItems.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem(index)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    物品選擇 <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={item.itemName && item.itemCategory ? `${item.itemName}|${item.itemCategory}` : ""}
                    onValueChange={(value) => handleItemSelect(index, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="請選擇物品" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(itemsByCategory).map(([category, items]) => (
                        <React.Fragment key={category}>
                          <div className="px-2 py-1 text-sm font-medium text-muted-foreground bg-muted/50">
                            {category}
                          </div>
                          {items.map((availableItem) => {
                            const itemKey = `${availableItem.name}|${availableItem.category}`;
                            const disabled = isItemSelected(availableItem.name, availableItem.category) &&
                                            !(item.itemName === availableItem.name && item.itemCategory === availableItem.category);

                            return (
                              <SelectItem
                                key={itemKey}
                                value={itemKey}
                                disabled={disabled}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <span>{availableItem.name}</span>
                                  <div className="flex items-center gap-2 ml-2">
                                    <Badge variant={availableItem.isStandard ? "default" : "secondary"} className="text-xs">
                                      {availableItem.isStandard ? "標準" : "自訂"}
                                    </Badge>
                                  </div>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </React.Fragment>
                      ))}
                      <SelectItem value="custom">
                        <div className="flex items-center">
                          <Plus className="h-4 w-4 mr-2" />
                          新增自訂物品
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      數量 <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      value={item.quantity || ""}
                      onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 0)}
                      placeholder="請輸入數量"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">單位</Label>
                    {item.availableUnits && item.availableUnits.length > 1 ? (
                      <Select
                        value={item.itemUnit}
                        onValueChange={(value) => updateItem(index, "itemUnit", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {item.availableUnits.map(unit => (
                            <SelectItem key={unit} value={unit}>
                              {unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={item.itemUnit || ""}
                        disabled
                        className="bg-muted"
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">有效日期（選填）</Label>
                  <Input
                    type="date"
                    value={item.expiryDate || ""}
                    onChange={(e) => updateItem(index, "expiryDate", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">備註（選填）</Label>
                <Textarea
                  value={item.notes || ""}
                  onChange={(e) => updateItem(index, "notes", e.target.value)}
                  placeholder="請輸入物品相關備註說明..."
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>

            {/* 顯示選中物品的資訊 */}
            {item.itemName && (
              <div className="flex flex-wrap gap-2 pt-2">
                <Badge variant="outline">
                  分類: {item.itemCategory}
                </Badge>
                <Badge variant="outline">
                  數量: {item.quantity} {item.itemUnit}
                </Badge>
                <Badge variant={item.isStandard ? "default" : "secondary"}>
                  {item.isStandard ? "標準物品" : "自訂物品"}
                </Badge>
              </div>
            )}
          </div>
        ))}
      </div>

      <Button
        type="button"
        onClick={addItem}
        variant="outline"
        className="w-full py-6"
        disabled={loading}
      >
        <Plus className="h-4 w-4 mr-2" />
        新增物品
      </Button>

      {/* 自訂物品對話框 */}
      <CustomItemDialog
        open={showCustomItemDialog}
        onOpenChange={setShowCustomItemDialog}
        onCustomItemCreated={handleCustomItemCreated}
      />
    </div>
  );
}