"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Package, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ItemStock {
  id: string;
  category: string;
  name: string;
  totalStock: number;
  unit: string;
  safetyStock: number;
  isStandard: boolean;
  sortOrder: number;
}

export function InventoryCountView() {
  const [supplies, setSupplies] = useState<ItemStock[]>([]);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchSupplies();
  }, []);

  const fetchSupplies = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/supplies');
      if (response.ok) {
        const data = await response.json();
        setSupplies(data);
      } else {
        toast.error('載入物資清單失敗');
      }
    } catch (error) {
      console.error('Error fetching supplies:', error);
      toast.error('載入物資清單失敗');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (itemId: string, value: string) => {
    setInputValues((prev) => ({
      ...prev,
      [itemId]: value,
    }));
  };

  const handleSubmit = async () => {
    // Collect updates (only items with filled values)
    const updates = supplies
      .filter((supply) => {
        const value = inputValues[supply.id];
        return value !== undefined && value !== '';
      })
      .map((supply) => ({
        itemStockId: supply.id,
        newQuantity: parseInt(inputValues[supply.id], 10),
      }))
      .filter((update) => !isNaN(update.newQuantity));

    if (updates.length === 0) {
      toast.warning('沒有需要更新的物資');
      return;
    }

    // Validate negative numbers
    const hasNegative = updates.some((update) => update.newQuantity < 0);
    if (hasNegative) {
      toast.error('數量不能為負數');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch('/api/inventory-logs/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ updates }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`成功更新 ${result.successCount} 項物資${result.skippedCount > 0 ? `，跳過 ${result.skippedCount} 項無變更` : ''}`);

        // Clear inputs and refresh
        setInputValues({});
        await fetchSupplies();
      } else {
        const errorData = await response.json();
        toast.error(`盤點失敗: ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      console.error('Error submitting inventory:', error);
      toast.error('盤點失敗，請稍後再試');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      '生活用品': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      '食品': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      '衣物': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      '醫療用品': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  };

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <h2 className="text-lg sm:text-xl font-semibold mb-1">盤點管理</h2>
        <p className="text-sm text-muted-foreground">
          填入新數量即可更新庫存。空白欄位將不會修改。
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="flex-1 rounded-2xl border bg-card shadow-sm overflow-hidden mb-4">
            <div className="overflow-auto max-h-[calc(100vh-320px)]">
              <Table>
                <TableHeader className="sticky top-0 bg-muted/30 z-10">
                  <TableRow>
                    <TableHead className="font-semibold text-base py-4">類別</TableHead>
                    <TableHead className="font-semibold text-base py-4">物資名稱</TableHead>
                    <TableHead className="font-semibold text-base py-4 text-center">當前數量</TableHead>
                    <TableHead className="font-semibold text-base py-4 text-center">新數量</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplies.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-32 text-center">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Package className="h-8 w-8" />
                          <p className="text-lg">目前沒有物資</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    supplies.map((supply) => (
                      <TableRow key={supply.id} className="hover:bg-muted/20 transition-colors">
                        <TableCell className="py-2 sm:py-4">
                          <Badge className={`${getCategoryColor(supply.category)} text-xs sm:text-sm`}>
                            {supply.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2 sm:py-4">
                          <div className="font-medium text-sm sm:text-base">{supply.name}</div>
                          <Badge variant={supply.isStandard ? "secondary" : "outline"} className="text-[10px] sm:text-xs mt-1">
                            {supply.isStandard ? '標準品項' : '自訂品項'}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2 sm:py-4 text-center">
                          <span className="text-sm sm:text-base font-medium">
                            {supply.totalStock.toLocaleString()} {supply.unit}
                          </span>
                        </TableCell>
                        <TableCell className="py-2 sm:py-4">
                          <div className="flex items-center justify-center gap-2">
                            <Input
                              type="number"
                              inputMode="numeric"
                              min="0"
                              value={inputValues[supply.id] || ''}
                              onChange={(e) => handleInputChange(supply.id, e.target.value)}
                              placeholder={supply.totalStock.toString()}
                              className="w-24 sm:w-32 text-center min-h-[44px] text-sm sm:text-base"
                            />
                            <span className="text-sm text-muted-foreground">{supply.unit}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || isLoading}
              className="min-h-[44px] px-8"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  處理中...
                </>
              ) : (
                '確認送出'
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
