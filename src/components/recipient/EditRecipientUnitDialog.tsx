"use client";

import React, { useEffect, useState } from "react";
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
  phone: string | null;
  address: string | null;
  isActive: boolean;
}

interface EditRecipientUnitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientUnit: RecipientUnit | null;
  onRecipientUnitUpdated: (recipientUnit: RecipientUnit) => void;
}

export function EditRecipientUnitDialog({
  open,
  onOpenChange,
  recipientUnit,
  onRecipientUnitUpdated
}: EditRecipientUnitDialogProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    if (recipientUnit && open) {
      setName(recipientUnit.name);
      setPhone(recipientUnit.phone || "");
      setAddress(recipientUnit.address || "");
    }
  }, [recipientUnit, open]);

  const resetForm = () => {
    setName("");
    setPhone("");
    setAddress("");
  };

  const handleSubmit = async () => {
    if (!recipientUnit) return;
    if (!name.trim()) {
      toast.error("單位名稱為必填欄位");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/recipient-units", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: recipientUnit.id,
          name: name.trim(),
          phone: phone.trim() || null,
          address: address.trim() || null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || "領取單位資料已更新");
        onRecipientUnitUpdated(data.data || data);
        onOpenChange(false);
      } else {
        toast.error(data.error || "更新領取單位失敗");
      }
    } catch (error) {
      console.error("更新領取單位失敗:", error);
      toast.error("更新領取單位失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (openState: boolean) => {
    if (!openState) {
      resetForm();
    }
    onOpenChange(openState);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>編輯領取單位資料</DialogTitle>
          <DialogDescription>
            更新單位聯絡資訊
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-recipient-name" className="text-sm font-medium">
              單位名稱 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="edit-recipient-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="請輸入單位名稱"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-recipient-phone" className="text-sm font-medium">
              聯絡電話
            </Label>
            <PhoneInput
              id="edit-recipient-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="請輸入聯絡電話"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-recipient-address" className="text-sm font-medium">
              地址
            </Label>
            <Input
              id="edit-recipient-address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="請輸入地址"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={loading}
          >
            取消
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !name.trim()}
          >
            {loading ? "更新中..." : "確認更新"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
