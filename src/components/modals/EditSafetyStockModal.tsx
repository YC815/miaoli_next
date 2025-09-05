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

interface EditSafetyStockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (id: string, newSafetyStock: number) => void;
  supply: Supply | null;
}

export function EditSafetyStockModal({ open, onOpenChange, onSubmit, supply }: EditSafetyStockModalProps) {
  const [safetyStock, setSafetyStock] = useState<number>(0);

  useEffect(() => {
    if (supply) {
      setSafetyStock(supply.safetyStock);
    }
  }, [supply]);

  const handleSubmit = () => {
    if (supply && safetyStock >= 0) {
      onSubmit(supply.id, safetyStock);
      onOpenChange(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && supply) {
      // Reset to original value when closing
      setSafetyStock(supply.safetyStock);
    }
    onOpenChange(newOpen);
  };

  const getStockStatus = () => {
    if (!supply) return null;
    
    if (supply.quantity === 0) return { label: '無庫存', color: 'text-red-600' };
    if (supply.quantity < safetyStock) return { label: '將顯示庫存不足', color: 'text-orange-600' };
    if (supply.quantity === safetyStock) return { label: '將顯示剛好達標', color: 'text-yellow-600' };
    return { label: '將顯示庫存充足', color: 'text-green-600' };
  };

  const status = getStockStatus();

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">編輯安全庫存量</DialogTitle>
          <DialogDescription className="text-sm">
            {supply && `${supply.name} - 目前庫存：${supply.quantity} 個`}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="safety-stock">安全庫存量</Label>
            <Input
              id="safety-stock"
              type="number"
              min="0"
              value={safetyStock}
              onChange={(e) => setSafetyStock(parseInt(e.target.value) || 0)}
              placeholder="請輸入安全庫存量"
            />
            <p className="text-xs text-muted-foreground">
              當庫存數量低於安全庫存量時，系統會顯示庫存不足警示
            </p>
          </div>

          {/* 狀態預覽 */}
          {supply && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm">
                <p className="font-medium mb-2">設定預覽：</p>
                <div className="space-y-1">
                  <p>目前庫存：{supply.quantity} 個</p>
                  <p>
                    安全庫存：{supply.safetyStock} → {safetyStock} 個
                  </p>
                  {status && (
                    <p className={`font-medium ${status.color}`}>
                      狀態：{status.label}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 建議提示 */}
          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
            <p className="text-xs text-blue-800 dark:text-blue-200">
              💡 建議將安全庫存量設為平均月消耗量的 1-2 倍，以確保不會缺貨
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={safetyStock < 0}>
            確認修改
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}