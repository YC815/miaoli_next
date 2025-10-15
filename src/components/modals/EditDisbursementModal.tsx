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
  const [customUnitName, setCustomUnitName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingUnits, setLoadingUnits] = useState(false);

  useEffect(() => {
    if (open && record) {
      setSelectedUnitId(record.recipientUnitId || null);
      setCustomUnitName(record.recipientUnitName || "");
      setPhone(record.recipientPhone || "");
      setAddress(record.recipientAddress || "");
      loadUnits();
    }
  }, [open, record]);

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
    if (unitId === "custom") {
      setSelectedUnitId(null);
      setCustomUnitName("");
      setPhone("");
      setAddress("");
    } else {
      const unit = units.find(u => u.id === unitId);
      if (unit) {
        setSelectedUnitId(unit.id);
        setCustomUnitName(unit.name);
        setPhone(unit.phone || "");
        setAddress(unit.address || "");
      }
    }
  };

  const handleSubmit = async () => {
    if (!record) return;

    if (!customUnitName.trim()) {
      toast.error('請填寫領取單位名稱');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/disbursements/${record.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientUnitId: selectedUnitId,
          recipientUnitName: customUnitName.trim(),
          recipientPhone: phone.trim() || null,
          recipientAddress: address.trim() || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '更新失敗');
      }

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
            <Label>選擇領取單位</Label>
            <Select
              value={selectedUnitId || "custom"}
              onValueChange={handleUnitSelect}
              disabled={loadingUnits}
            >
              <SelectTrigger>
                <SelectValue placeholder="自訂單位" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">
                  <span className="text-muted-foreground">自訂單位</span>
                </SelectItem>
                {units.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id}>
                    {unit.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 單位資訊 */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>單位名稱 <span className="text-red-500">*</span></Label>
              <Input
                value={customUnitName}
                onChange={(e) => setCustomUnitName(e.target.value)}
                placeholder="請輸入領取單位名稱"
              />
            </div>

            <div className="space-y-2">
              <Label>聯絡電話</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="請輸入聯絡電話"
              />
            </div>

            <div className="space-y-2">
              <Label>地址</Label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="請輸入地址"
              />
            </div>
          </div>

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
