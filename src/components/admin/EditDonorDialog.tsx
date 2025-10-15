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
import { TaxIdInput } from "@/components/ui/tax-id-input";
import { toast } from "sonner";

export interface Donor {
  id: string;
  name: string;
  phone: string | null;
  taxId: string | null;
  address: string | null;
  isActive: boolean;
}

interface EditDonorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  donor: Donor | null;
  onDonorUpdated: (donor: Donor) => void;
}

export function EditDonorDialog({ open, onOpenChange, donor, onDonorUpdated }: EditDonorDialogProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [taxId, setTaxId] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    if (donor && open) {
      setName(donor.name);
      setPhone(donor.phone || "");
      setTaxId(donor.taxId || "");
      setAddress(donor.address || "");
    }
  }, [donor, open]);

  const resetForm = () => {
    setName("");
    setPhone("");
    setTaxId("");
    setAddress("");
  };

  const handleSubmit = async () => {
    if (!donor) return;
    if (!name.trim()) {
      toast.error("單位名稱為必填欄位");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/donors", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: donor.id,
          name: name.trim(),
          phone: phone.trim() || null,
          taxId: taxId.trim() || null,
          address: address.trim() || null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || "捐贈人資料已更新");
        onDonorUpdated(data.data);
        onOpenChange(false);
      } else {
        toast.error(data.error || "更新捐贈人失敗");
      }
    } catch (error) {
      console.error("更新捐贈人失敗:", error);
      toast.error("更新捐贈人失敗，請稍後再試");
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
          <DialogTitle>編輯捐贈人資料</DialogTitle>
          <DialogDescription>
            更新單位聯絡資訊
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-donor-name" className="text-sm font-medium">
              單位名稱 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="edit-donor-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="請輸入單位名稱"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-donor-phone" className="text-sm font-medium">
              聯絡電話
            </Label>
            <PhoneInput
              id="edit-donor-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="請輸入聯絡電話"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-donor-taxId" className="text-sm font-medium">
              統一編號
            </Label>
            <TaxIdInput
              id="edit-donor-taxId"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
              placeholder="請輸入統一編號"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-donor-address" className="text-sm font-medium">
              地址
            </Label>
            <Input
              id="edit-donor-address"
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
