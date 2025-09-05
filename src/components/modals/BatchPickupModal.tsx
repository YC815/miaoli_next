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

interface BatchPickupInfo {
  unit: string;
  phone: string;
  purpose: string;
}

interface PickupItem {
  id: string;
  name: string;
  category: string;
  availableQuantity: number;
  requestedQuantity: number;
}

interface Supply {
  id: string;
  category: string;
  name: string;
  quantity: number;
  safetyStock: number;
}

interface BatchPickupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (pickupInfo: BatchPickupInfo, selectedItems: PickupItem[]) => void;
  supplies: Supply[];
}

export function BatchPickupModal({ open, onOpenChange, onSubmit, supplies }: BatchPickupModalProps) {
  const [batchPickupInfo, setBatchPickupInfo] = useState<BatchPickupInfo>({
    unit: "",
    phone: "",
    purpose: "",
  });
  const [pickupItems, setPickupItems] = useState<PickupItem[]>([]);
  const [availablePickupUnits, setAvailablePickupUnits] = useState<string[]>([]);

  useEffect(() => {
    const mockPickupUnits = ["慈濟基金會", "紅十字會", "世界展望會", "創世基金會"];
    setAvailablePickupUnits(mockPickupUnits);

    const availableItems: PickupItem[] = supplies.map(supply => ({
      id: supply.id,
      name: supply.name,
      category: supply.category,
      availableQuantity: supply.quantity,
      requestedQuantity: 0,
    }));
    setPickupItems(availableItems);
  }, [supplies]);

  const updatePickupQuantity = (id: string, quantity: number) => {
    setPickupItems(items => 
      items.map(item => 
        item.id === id 
          ? { ...item, requestedQuantity: Math.min(quantity, item.availableQuantity) }
          : item
      )
    );
  };

  const resetForm = () => {
    setBatchPickupInfo({ unit: "", phone: "", purpose: "" });
    setPickupItems(items => items.map(item => ({ ...item, requestedQuantity: 0 })));
  };

  const handleSubmit = () => {
    if (batchPickupInfo.unit === "new" && !batchPickupInfo.unit.trim()) {
      // Handle error for empty new unit
      return;
    }
    const selectedItems = pickupItems.filter(item => item.requestedQuantity > 0);
    onSubmit(batchPickupInfo, selectedItems);
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>批量物資領取</DialogTitle>
          <DialogDescription>
            請填寫領取單位資訊並選擇所需物資
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Unit Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">領取單位資訊</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>領取單位</Label>
                <Select 
                  value={batchPickupInfo.unit}
                  onValueChange={(value) => setBatchPickupInfo({...batchPickupInfo, unit: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="選擇領取單位" />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePickupUnits.map((unit) => (
                      <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                    ))}
                    <SelectItem value="new">+ 新增單位</SelectItem>
                  </SelectContent>
                </Select>
                {batchPickupInfo.unit === "new" && (
                  <Input
                    type="text"
                    value={batchPickupInfo.unit === "new" ? "" : batchPickupInfo.unit}
                    onChange={(e) => setBatchPickupInfo({...batchPickupInfo, unit: e.target.value})}
                    placeholder="輸入新領取單位名稱"
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit-phone">聯絡電話</Label>
                <Input 
                  id="unit-phone"
                  value={batchPickupInfo.phone}
                  onChange={(e) => setBatchPickupInfo({...batchPickupInfo, phone: e.target.value})}
                  placeholder="請輸入聯絡電話"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit-purpose">領取用途/備註（選填）</Label>
              <Textarea 
                id="unit-purpose"
                value={batchPickupInfo.purpose}
                onChange={(e) => setBatchPickupInfo({...batchPickupInfo, purpose: e.target.value})}
                placeholder="請輸入領取用途或備註"
                rows={2}
              />
            </div>
          </div>

          {/* Supply Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">選擇物資</h3>
            <div className="space-y-3">
              {pickupItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.category}</p>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        庫存：{item.availableQuantity} 個
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`quantity-${item.id}`} className="text-sm">領取數量：</Label>
                    <Input
                      id={`quantity-${item.id}`}
                      type="number"
                      min="0"
                      max={item.availableQuantity}
                      value={item.requestedQuantity}
                      onChange={(e) => updatePickupQuantity(item.id, parseInt(e.target.value) || 0)}
                      className="w-20"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">領取清單預覽</h4>
              <div className="space-y-1 text-sm">
                {pickupItems
                  .filter(item => item.requestedQuantity > 0)
                  .map((item) => (
                    <div key={item.id} className="flex justify-between">
                      <span>{item.name}</span>
                      <span>{item.requestedQuantity} 個</span>
                    </div>
                  ))
                }
                {pickupItems.filter(item => item.requestedQuantity > 0).length === 0 && (
                  <p className="text-muted-foreground">尚未選擇任何物資</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            取消
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={pickupItems.filter(item => item.requestedQuantity > 0).length === 0}
          >
            確認批量領取
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}