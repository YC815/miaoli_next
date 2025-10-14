"use client";

import React, { useState } from "react";
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
import { PhoneInput } from "@/components/ui/phone-input";
import { TaxIdInput } from "@/components/ui/tax-id-input";
import { toast } from "sonner";

interface Donor {
  id: string;
  name: string;
  phone: string | null;
  taxId: string | null;
  address: string | null;
}

interface AddDonorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDonorCreated: (donor: Donor) => void;
}

export function AddDonorDialog({ open, onOpenChange, onDonorCreated }: AddDonorDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    taxId: "",
    address: ""
  });

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
      taxId: "",
      address: ""
    });
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("單位名稱為必填欄位");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/donors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || "捐贈人新增成功");
        onDonorCreated(data.data);
        resetForm();
        onOpenChange(false);
      } else {
        toast.error(data.error || "新增捐贈人失敗");
      }
    } catch (error) {
      console.error('新增捐贈人失敗:', error);
      toast.error("新增捐贈人失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>新增捐贈人</DialogTitle>
          <DialogDescription>
            填寫捐贈人資訊，僅單位名稱為必填
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="donor-name" className="text-sm font-medium">
              單位名稱 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="donor-name"
              type="text"
              value={formData.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="請輸入單位名稱"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="donor-phone" className="text-sm font-medium">
              聯絡電話
            </Label>
            <PhoneInput
              id="donor-phone"
              value={formData.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              placeholder="請輸入聯絡電話"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="donor-taxId" className="text-sm font-medium">
              統一編號
            </Label>
            <TaxIdInput
              id="donor-taxId"
              value={formData.taxId}
              onChange={(e) => updateField("taxId", e.target.value)}
              placeholder="請輸入統一編號"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="donor-address" className="text-sm font-medium">
              地址
            </Label>
            <Input
              id="donor-address"
              type="text"
              value={formData.address}
              onChange={(e) => updateField("address", e.target.value)}
              placeholder="請輸入地址"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              resetForm();
              onOpenChange(false);
            }}
            disabled={loading}
          >
            取消
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !formData.name.trim()}
          >
            {loading ? "新增中..." : "確認新增"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
