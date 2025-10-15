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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DonationRecord } from "@/types/donation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Donor {
  id: string;
  name: string;
  phone: string | null;
  taxId: string | null;
  address: string | null;
}

interface EditDonationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: DonationRecord | null;
  onSuccess: () => void;
}

export function EditDonationModal({
  open,
  onOpenChange,
  record,
  onSuccess,
}: EditDonationModalProps) {
  const [donors, setDonors] = useState<Donor[]>([]);
  const [selectedDonorId, setSelectedDonorId] = useState<string | null>(null);
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingDonors, setLoadingDonors] = useState(false);

  useEffect(() => {
    if (open && record) {
      setSelectedDonorId(record.donorId || null);
      const notes: Record<string, string> = {};
      record.donationItems.forEach(item => {
        notes[item.id] = item.notes || "";
      });
      setItemNotes(notes);
      loadDonors();
    }
  }, [open, record]);

  const loadDonors = async () => {
    setLoadingDonors(true);
    try {
      const response = await fetch('/api/donors');
      if (response.ok) {
        const data = await response.json();
        setDonors(data.data || []);
      }
    } catch (error) {
      console.error('載入捐贈人清單失敗:', error);
    } finally {
      setLoadingDonors(false);
    }
  };

  const handleSubmit = async () => {
    if (!record) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/donations/${record.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          donorId: selectedDonorId || null,
          itemNotes,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '更新失敗');
      }

      toast.success('捐贈紀錄已更新');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('更新捐贈紀錄失敗:', error);
      toast.error(error instanceof Error ? error.message : '更新失敗');
    } finally {
      setLoading(false);
    }
  };

  if (!record) return null;

  const selectedDonor = donors.find(d => d.id === selectedDonorId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>編輯捐贈紀錄</DialogTitle>
          <DialogDescription>
            流水號: {record.serialNumber} | 捐贈日期: {new Date(record.createdAt).toLocaleDateString('zh-TW')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 捐贈人選擇 */}
          <div className="space-y-2">
            <Label>捐贈人 <span className="text-muted-foreground text-xs">(可選)</span></Label>
            <Select
              value={selectedDonorId || "anonymous"}
              onValueChange={(value) => setSelectedDonorId(value === "anonymous" ? null : value)}
              disabled={loadingDonors}
            >
              <SelectTrigger>
                <SelectValue placeholder="匿名捐贈" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="anonymous">
                  <span className="text-muted-foreground">匿名捐贈</span>
                </SelectItem>
                {donors.map((donor) => (
                  <SelectItem key={donor.id} value={donor.id}>
                    {donor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 捐贈人詳細資訊（唯讀） */}
            {selectedDonor && (
              <div className="mt-3 p-3 bg-muted/50 rounded-lg space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">聯絡電話：</span>
                  <span>{selectedDonor.phone || "（未提供）"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">統一編號：</span>
                  <span>{selectedDonor.taxId || "（未提供）"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">地址：</span>
                  <span>{selectedDonor.address || "（未提供）"}</span>
                </div>
              </div>
            )}
          </div>

          {/* 物資清單（唯讀，但可編輯備註） */}
          <div className="space-y-3">
            <Label>物資清單</Label>
            <div className="border rounded-lg divide-y">
              {record.donationItems.map((item) => (
                <div key={item.id} className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{item.itemName}</div>
                      <div className="text-sm text-muted-foreground">
                        數量: {item.quantity} {item.itemUnit} | 類別: {item.itemCategory}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">備註</Label>
                    <Textarea
                      value={itemNotes[item.id] || ""}
                      onChange={(e) => setItemNotes(prev => ({
                        ...prev,
                        [item.id]: e.target.value,
                      }))}
                      placeholder="可選擇性填寫備註..."
                      className="min-h-[60px]"
                    />
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
