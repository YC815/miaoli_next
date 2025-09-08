"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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

interface Supply {
  id: string;
  category: string;
  name: string;
  quantity: number;
  unit: string;
  safetyStock: number;
}

interface EditSupplyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (updatedSupply: Supply) => void;
  supply: Supply | null;
}

export function EditSupplyModal({ open, onOpenChange, onSubmit, supply }: EditSupplyModalProps) {
  const [formData, setFormData] = useState<Supply>({
    id: "",
    category: "",
    name: "",
    quantity: 0,
    unit: "個",
    safetyStock: 0,
  });
  const [supplyNames, setSupplyNames] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [units, setUnits] = useState<string[]>([]);
  const [isNewSupplyName, setIsNewSupplyName] = useState(false);
  const [newSupplyName, setNewSupplyName] = useState("");
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isNewUnit, setIsNewUnit] = useState(false);
  const [newUnitName, setNewUnitName] = useState("");

  // Fetch supply names, categories and units when modal opens
  useEffect(() => {
    if (open) {
      fetchSupplyNames();
      fetchCategories();
      fetchUnits();
    }
  }, [open]);

  useEffect(() => {
    if (supply) {
      setFormData(supply);
    }
  }, [supply]);

  const fetchSupplyNames = async () => {
    try {
      const response = await fetch('/api/supplies?activeOnly=true&sortBy=sortOrder&namesOnly=true');
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
        setCategories(data.map((category: { name: string }) => category.name));
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchUnits = async () => {
    try {
      const response = await fetch('/api/units');
      if (response.ok) {
        const data = await response.json();
        setUnits(data.map((unit: { name: string }) => unit.name));
      }
    } catch (error) {
      console.error('Error fetching units:', error);
    }
  };

  const handleSupplyNameSelect = (value: string) => {
    if (value === "new") {
      setIsNewSupplyName(true);
      setNewSupplyName("");
      setFormData({...formData, name: ""});
    } else {
      setIsNewSupplyName(false);
      setFormData({...formData, name: value});
    }
  };

  const confirmNewSupplyName = async () => {
    if (!newSupplyName.trim()) return;

    // 添加到本地可用清單（新的物資名稱會在提交時一併處理）
    const supplyName = newSupplyName.trim();
    if (!supplyNames.includes(supplyName)) {
      setSupplyNames(prev => [...prev, supplyName]);
    }
    setFormData({...formData, name: supplyName});
    setIsNewSupplyName(false);
    setNewSupplyName("");
  };

  const handleCategorySelect = (value: string) => {
    if (value === "new") {
      setIsNewCategory(true);
      setNewCategoryName("");
      setFormData({...formData, category: ""});
    } else {
      setIsNewCategory(false);
      setFormData({...formData, category: value});
    }
  };

  const confirmNewCategory = async () => {
    if (!newCategoryName.trim()) return;

    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newCategoryName.trim(),
        }),
      });

      if (response.ok || response.status === 409) {
        const categoryName = newCategoryName.trim();
        if (!categories.includes(categoryName)) {
          setCategories(prev => [...prev, categoryName]);
        }
        setFormData({...formData, category: categoryName});
        setIsNewCategory(false);
        setNewCategoryName("");
      } else {
        console.error('Failed to create category');
      }
    } catch (error) {
      console.error('Error creating category:', error);
    }
  };

  const handleUnitSelect = (value: string) => {
    if (value === "new") {
      setIsNewUnit(true);
      setNewUnitName("");
      setFormData({...formData, unit: ""});
    } else {
      setIsNewUnit(false);
      setFormData({...formData, unit: value});
    }
  };

  const confirmNewUnit = async () => {
    if (!newUnitName.trim()) return;

    try {
      const response = await fetch('/api/units', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newUnitName.trim(),
        }),
      });

      if (response.ok || response.status === 409) {
        const unitName = newUnitName.trim();
        if (!units.includes(unitName)) {
          setUnits(prev => [...prev, unitName]);
        }
        setFormData({...formData, unit: unitName});
        setIsNewUnit(false);
        setNewUnitName("");
      } else {
        console.error('Failed to create unit');
      }
    } catch (error) {
      console.error('Error creating unit:', error);
    }
  };

  const handleSubmit = () => {
    if (formData.name && formData.category && formData.unit) {
      onSubmit(formData);
      onOpenChange(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset form when closing
      setFormData({
        id: "",
        category: "",
        name: "",
        quantity: 0,
        unit: "個",
        safetyStock: 0,
      });
      setIsNewSupplyName(false);
      setNewSupplyName("");
      setIsNewCategory(false);
      setNewCategoryName("");
      setIsNewUnit(false);
      setNewUnitName("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[95vw] max-w-md max-h-[95vh] overflow-y-auto sm:w-full">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">編輯物資資訊</DialogTitle>
          <DialogDescription className="text-sm">
            修改物資的基本資訊
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>物資名稱</Label>
            {!isNewSupplyName ? (
              <Select
                value={formData.name}
                onValueChange={handleSupplyNameSelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder="選擇物資名稱" />
                </SelectTrigger>
                <SelectContent>
                  {supplyNames.map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                  <SelectItem value="new">+ 新增物資名稱</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="text"
                  value={newSupplyName}
                  onChange={(e) => setNewSupplyName(e.target.value)}
                  placeholder="輸入新物資名稱"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={confirmNewSupplyName}
                  className="sm:w-auto w-full min-h-[44px]"
                >
                  確認
                </Button>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label>品項類別</Label>
            {!isNewCategory ? (
              <Select
                value={formData.category}
                onValueChange={handleCategorySelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder="選擇類別" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                  <SelectItem value="new">+ 新增類別</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="輸入新類別名稱"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={confirmNewCategory}
                  className="sm:w-auto w-full min-h-[44px]"
                >
                  確認
                </Button>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label>單位</Label>
            {!isNewUnit ? (
              <Select
                value={formData.unit}
                onValueChange={handleUnitSelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder="選擇單位" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((unit) => (
                    <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                  ))}
                  <SelectItem value="new">+ 新增單位</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="text"
                  value={newUnitName}
                  onChange={(e) => setNewUnitName(e.target.value)}
                  placeholder="輸入新單位名稱"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={confirmNewUnit}
                  className="sm:w-auto w-full min-h-[44px]"
                >
                  確認
                </Button>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto min-h-[44px]"
          >
            取消
          </Button>
          <Button 
            onClick={handleSubmit}
            className="w-full sm:w-auto min-h-[44px]"
          >
            確認修改
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}