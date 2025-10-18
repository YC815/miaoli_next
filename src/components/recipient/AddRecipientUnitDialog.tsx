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
import { toast } from "sonner";

export interface RecipientUnit {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  address: string | null;
  serviceCount: number | null;
  isActive: boolean;
}

interface AddRecipientUnitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecipientCreated: (unit: RecipientUnit) => void;
}

export function AddRecipientUnitDialog({ open, onOpenChange, onRecipientCreated }: AddRecipientUnitDialogProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [serviceCount, setServiceCount] = useState("");

  const resetForm = () => {
    setName("");
    setContactPerson("");
    setPhone("");
    setAddress("");
    setServiceCount("");
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("單位名稱為必填欄位");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/recipient-units", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          contactPerson: contactPerson.trim() || null,
          phone: phone.trim() || null,
          address: address.trim() || null,
          serviceCount: serviceCount.trim() ? Number(serviceCount) : null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("領取單位新增成功");
        onRecipientCreated(data);
        resetForm();
        onOpenChange(false);
      } else {
        toast.error(data.error || "新增領取單位失敗");
      }
    } catch (error) {
      console.error("新增領取單位失敗:", error);
      toast.error("新增領取單位失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (openState: boolean) => {
    if (!openState) {
      resetForm();
    }
    onOpenChange(openState);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>新增領取單位</DialogTitle>
          <DialogDescription>
            建立新的領取單位資料
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="recipient-name" className="text-sm font-medium">
              單位名稱 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="recipient-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="請輸入單位名稱"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipient-contact-person" className="text-sm font-medium">
              窗口/聯絡人
            </Label>
            <Input
              id="recipient-contact-person"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              placeholder="請輸入窗口姓名"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipient-phone" className="text-sm font-medium">
              聯絡電話
            </Label>
            <PhoneInput
              id="recipient-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="請輸入聯絡電話"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipient-address" className="text-sm font-medium">
              地址
            </Label>
            <Input
              id="recipient-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="請輸入地址"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipient-service-count" className="text-sm font-medium">
              服務人數
            </Label>
            <Input
              id="recipient-service-count"
              type="number"
              min={0}
              value={serviceCount}
              onChange={(e) => setServiceCount(e.target.value)}
              placeholder="請輸入服務人數"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={loading}
          >
            取消
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !name.trim()}
          >
            {loading ? "新增中..." : "確認新增"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
