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
    safetyStock: 0,
  });

  const categories = ["生活用品", "食品", "衣物", "醫療用品"];

  useEffect(() => {
    if (supply) {
      setFormData(supply);
    }
  }, [supply]);

  const handleSubmit = () => {
    if (formData.name && formData.category) {
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
        safetyStock: 0,
      });
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">編輯物資資訊</DialogTitle>
          <DialogDescription className="text-sm">
            修改物資的基本資訊
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="supply-name">物資名稱</Label>
            <Input
              id="supply-name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="請輸入物資名稱"
            />
          </div>
          
          <div className="space-y-2">
            <Label>品項類別</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({...formData, category: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="選擇類別" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit}>
            確認修改
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}