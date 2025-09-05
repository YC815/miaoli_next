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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

interface SupplyItem {
  name: string;
  category: string;
  quantity: number;
  expiryDate?: string;
}

interface DonorInfo {
  name: string;
  phone: string;
  address: string;
}

interface AddSupplyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (donorInfo: DonorInfo, supplyItems: SupplyItem[], notes: string) => void;
}

export function AddSupplyModal({ open, onOpenChange, onSubmit }: AddSupplyModalProps) {
  const [donorInfo, setDonorInfo] = useState<DonorInfo>({
    name: "",
    phone: "",
    address: "",
  });
  const [supplyItems, setSupplyItems] = useState<SupplyItem[]>([
    { name: "", category: "", quantity: 0, expiryDate: "" }
  ]);
  const [notes, setNotes] = useState("");
  const [availableSupplyNames, setAvailableSupplyNames] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  useEffect(() => {
    // Mock fetching supply names and categories
    const mockSupplyNames = ["牙膏", "食用油", "毛毯", "衣物", "罐頭", "麵條"];
    const mockCategories = ["生活用品", "食品", "衣物", "醫療用品"];
    setAvailableSupplyNames(mockSupplyNames);
    setAvailableCategories(mockCategories);
  }, []);

  const addSupplyItem = () => {
    setSupplyItems([...supplyItems, { name: "", category: "", quantity: 0, expiryDate: "" }]);
  };

  const removeSupplyItem = (index: number) => {
    if (supplyItems.length > 1) {
      setSupplyItems(supplyItems.filter((_, i) => i !== index));
    }
  };

  const updateSupplyItem = (index: number, field: keyof SupplyItem, value: string | number) => {
    const updatedItems = [...supplyItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setSupplyItems(updatedItems);
  };

  const resetForm = () => {
    setDonorInfo({ name: "", phone: "", address: "" });
    setSupplyItems([{ name: "", category: "", quantity: 0, expiryDate: "" }]);
    setNotes("");
  };

  const handleSubmit = () => {
    onSubmit(donorInfo, supplyItems, notes);
    resetForm();
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">新增物資</DialogTitle>
          <DialogDescription className="text-base">
            請填寫捐贈者資訊和物資詳情
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Donor Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">捐贈者資訊</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="donor-name">姓名/抬頭</Label>
                <Input 
                  id="donor-name"
                  value={donorInfo.name}
                  onChange={(e) => setDonorInfo({...donorInfo, name: e.target.value})}
                  placeholder="請輸入姓名或抬頭"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="donor-phone">電話/統編</Label>
                <Input 
                  id="donor-phone"
                  value={donorInfo.phone}
                  onChange={(e) => setDonorInfo({...donorInfo, phone: e.target.value})}
                  placeholder="請輸入電話或統編"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="donor-address">地址</Label>
              <Input 
                id="donor-address"
                value={donorInfo.address}
                onChange={(e) => setDonorInfo({...donorInfo, address: e.target.value})}
                placeholder="請輸入地址"
              />
            </div>
          </div>

          {/* Supply Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">物資</h3>
              <Button type="button" onClick={addSupplyItem} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                新增
              </Button>
            </div>
            
            {supplyItems.map((item, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">物資 {index + 1}</h4>
                  {supplyItems.length > 1 && (
                    <Button 
                      type="button" 
                      onClick={() => removeSupplyItem(index)}
                      variant="ghost" 
                      size="sm"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>物資名稱</Label>
                    <Select 
                      value={item.name}
                      onValueChange={(value) => updateSupplyItem(index, "name", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="選擇物資" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSupplyNames.map((name) => (
                          <SelectItem key={name} value={name}>{name}</SelectItem>
                        ))}
                        <SelectItem value="new">+ 新增物資</SelectItem>
                      </SelectContent>
                    </Select>
                    {item.name === "new" && (
                      <Input
                        type="text"
                        value={item.name === "new" ? "" : item.name}
                        onChange={(e) => updateSupplyItem(index, "name", e.target.value)}
                        placeholder="輸入新物資名稱"
                      />
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label>品項類別</Label>
                    <Select 
                      value={item.category}
                      onValueChange={(value) => updateSupplyItem(index, "category", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="選擇類別" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCategories.map((category) => (
                          <SelectItem key={category} value={category}>{category}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>數量</Label>
                    <Input 
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateSupplyItem(index, "quantity", parseInt(e.target.value) || 0)}
                      placeholder="請輸入數量"
                      min="0"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>有效日期（選填）</Label>
                    <Input 
                      type="date"
                      value={item.expiryDate}
                      onChange={(e) => updateSupplyItem(index, "expiryDate", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">備註</Label>
            <Textarea 
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="請輸入備註"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit}>
            確認新增
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}