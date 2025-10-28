"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { User } from "@/components/auth/AuthGuard";

interface CustomItem {
  id: string;
  name: string;
  category: string;
  units: string[];
  defaultUnit: string;
  isHidden: boolean;
  createdAt: string;
}

interface CustomItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCustomItemCreated: (item: CustomItem) => void;
  dbUser?: User | null;
}

export function CustomItemDialog({
  open,
  onOpenChange,
  onCustomItemCreated
}: Omit<CustomItemDialogProps, 'dbUser'>) {
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    unit: "個"
  });
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availableUnits, setAvailableUnits] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadOptions();
    }
  }, [open]);

  const loadOptions = async () => {
    try {
      // 載入現有分類
      const categoriesResponse = await fetch('/api/categories');
      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json();
        if (Array.isArray(categoriesData)) {
          setAvailableCategories(categoriesData.map((cat: { name: string }) => cat.name));
        }
      }

      // 載入現有單位
      const unitsResponse = await fetch('/api/units');
      if (unitsResponse.ok) {
        const unitsData = await unitsResponse.json();
        if (Array.isArray(unitsData)) {
          setAvailableUnits(unitsData.map((unit: { name: string }) => unit.name));
        }
      }

      // 從 item_list.json 載入標準分類
      const standardResponse = await fetch('/api/standard-items');
      if (standardResponse.ok) {
        const standardData = await standardResponse.json();
        const standardCategories = [...new Set(standardData.data?.map((item: { category: string }) => item.category) || [])];
        const standardUnits = [...new Set(standardData.data?.map((item: { unit: string }) => item.unit) || [])];

        setAvailableCategories(prev => [...new Set([...prev, ...standardCategories])] as string[]);
        setAvailableUnits(prev => [...new Set([...prev, ...standardUnits])] as string[]);
      }
    } catch (error) {
      console.error('載入選項失敗:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      category: "",
      unit: "個"
    });
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.category.trim()) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/custom-items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          category: formData.category.trim(),
          unit: formData.unit.trim()
        })
      });

      if (response.ok) {
        const result = await response.json();
        onCustomItemCreated(result.data);
        resetForm();
        onOpenChange(false);
      } else {
        const error = await response.json();
        alert(error.error || '建立自訂物品失敗');
      }
    } catch (error) {
      console.error('建立自訂物品失敗:', error);
      alert('建立自訂物品失敗');
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新增自訂物品</DialogTitle>
          <DialogDescription>
            建立一個新的自訂物品，將會加入到物品選擇清單中
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="itemName" className="text-sm font-medium">
              物品名稱 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="itemName"
              value={formData.name}
              onChange={(e) => updateFormData("name", e.target.value)}
              placeholder="請輸入物品名稱"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="itemCategory" className="text-sm font-medium">
              分類 <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.category}
              onValueChange={(value) => updateFormData("category", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="請選擇分類" />
              </SelectTrigger>
              <SelectContent>
                {availableCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="itemUnit" className="text-sm font-medium">
              單位 <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.unit}
              onValueChange={(value) => updateFormData("unit", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="請選擇單位" />
              </SelectTrigger>
              <SelectContent>
                {availableUnits.map((unit) => (
                  <SelectItem key={unit} value={unit}>
                    {unit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !formData.name.trim() || !formData.category.trim()}
          >
            {loading ? "建立中..." : "建立"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}