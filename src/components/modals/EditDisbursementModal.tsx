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
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DisbursementRecord } from "@/components/tables/DisbursementRecordsTable";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface RecipientUnit {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
}

interface EditDisbursementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: DisbursementRecord | null;
  onSuccess: () => void;
}

export function EditDisbursementModal({
  open,
  onOpenChange,
  record,
  onSuccess,
}: EditDisbursementModalProps) {
  const [units, setUnits] = useState<RecipientUnit[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<RecipientUnit | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingUnits, setLoadingUnits] = useState(false);

  useEffect(() => {
    if (open && record) {
      setSelectedUnitId(record.recipientUnitId || null);
      loadUnits();
    }
  }, [open, record]);

  useEffect(() => {
    if (selectedUnitId && units.length > 0) {
      const unit = units.find(u => u.id === selectedUnitId);
      setSelectedUnit(unit || null);
    } else {
      setSelectedUnit(null);
    }
  }, [selectedUnitId, units]);

  const loadUnits = async () => {
    setLoadingUnits(true);
    try {
      const response = await fetch('/api/recipient-units');
      if (response.ok) {
        const data = await response.json();
        setUnits(data || []);
      }
    } catch (error) {
      console.error('載入領取單位清單失敗:', error);
    } finally {
      setLoadingUnits(false);
    }
  };

  const handleUnitSelect = (unitId: string) => {
    setSelectedUnitId(unitId);
  };

  const handleSubmit = async () => {
    if (!record) return;

    if (!selectedUnitId) {
      toast.error('請選擇領取單位');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        recipientUnitId: selectedUnitId,
      };

      // DEBUG: 記錄前端送出的資料
      console.log('🚀 [EditDisbursementModal] 準備送出 PATCH request');
      console.log('🚀 Record ID:', record.id);
      console.log('🚀 Payload:', payload);

      const response = await fetch(`/api/disbursements/${record.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      // DEBUG: 記錄回應狀態
      console.log('📨 Response status:', response.status);
      console.log('📨 Response ok:', response.ok);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ API 回傳錯誤:', errorData);
        throw new Error(errorData.error || '更新失敗');
      }

      const responseData = await response.json();
      console.log('✅ API 回傳成功，資料:', responseData);

      toast.success('發放紀錄已更新');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('更新發放紀錄失敗:', error);
      toast.error(error instanceof Error ? error.message : '更新失敗');
    } finally {
      setLoading(false);
    }
  };

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>編輯發放紀錄</DialogTitle>
          <DialogDescription>
            流水號: {record.serialNumber} | 發放日期: {new Date(record.createdAt).toLocaleDateString('zh-TW')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 領取單位選擇 */}
          <div className="space-y-2">
            <Label>選擇領取單位 <span className="text-red-500">*</span></Label>
            <Select
              value={selectedUnitId || ""}
              onValueChange={handleUnitSelect}
              disabled={loadingUnits}
            >
              <SelectTrigger>
                <SelectValue placeholder="請選擇領取單位" />
              </SelectTrigger>
              <SelectContent>
                {units.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id}>
                    {unit.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 選擇領取單位後顯示詳細資訊（唯讀） */}
          {selectedUnit && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">聯絡電話</Label>
                <Input
                  value={selectedUnit.phone || "（未提供）"}
                  disabled
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">地址</Label>
                <Input
                  value={selectedUnit.address || "（未提供）"}
                  disabled
                  className="bg-background"
                />
              </div>
            </div>
          )}

          {/* 物資清單（唯讀） */}
          <div className="space-y-2">
            <Label>物資清單（不可編輯）</Label>
            <div className="border rounded-lg divide-y bg-muted/30">
              {record.disbursementItems.map((item) => (
                <div key={item.id} className="p-3 flex justify-between items-center">
                  <div>
                    <div className="font-medium">{item.itemName}</div>
                    <div className="text-sm text-muted-foreground">
                      類別: {item.itemCategory}
                    </div>
                  </div>
                  <div className="text-sm font-medium">
                    {item.quantity} {item.itemUnit}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-sm text-muted-foreground bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded-lg">
            <strong>提示：</strong>為了維護庫存一致性，物資數量不可修改。如需調整請刪除紀錄後重新建立。
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            儲存變更
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
