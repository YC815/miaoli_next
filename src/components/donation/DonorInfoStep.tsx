"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { TaxIdInput } from "@/components/ui/tax-id-input";
import { Label } from "@/components/ui/label";

interface DonorInfo {
  name: string;
  phone: string;
  unifiedNumber: string;
  address: string;
}

interface DonorInfoStepProps {
  donorInfo: DonorInfo;
  onDonorInfoChange: (donorInfo: DonorInfo) => void;
}

export function DonorInfoStep({ donorInfo, onDonorInfoChange }: DonorInfoStepProps) {
  const updateDonorInfo = (field: keyof DonorInfo, value: string) => {
    onDonorInfoChange({
      ...donorInfo,
      [field]: value
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="donorName" className="text-sm font-medium">
          姓名/單位名稱 <span className="text-red-500">*</span>
        </Label>
        <Input
          id="donorName"
          type="text"
          value={donorInfo.name}
          onChange={(e) => updateDonorInfo("name", e.target.value)}
          placeholder="請輸入姓名或單位名稱"
          className="w-full"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="donorPhone" className="text-sm font-medium">
          聯絡電話
        </Label>
        <PhoneInput
          id="donorPhone"
          value={donorInfo.phone}
          onChange={(e) => updateDonorInfo("phone", e.target.value)}
          placeholder="請輸入聯絡電話"
          className="w-full"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="donorTaxId" className="text-sm font-medium">
          統一編號
        </Label>
        <TaxIdInput
          id="donorTaxId"
          value={donorInfo.unifiedNumber}
          onChange={(e) => updateDonorInfo("unifiedNumber", e.target.value)}
          placeholder="請輸入統一編號"
          className="w-full"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="donorAddress" className="text-sm font-medium">
          地址
        </Label>
        <Input
          id="donorAddress"
          type="text"
          value={donorInfo.address}
          onChange={(e) => updateDonorInfo("address", e.target.value)}
          placeholder="請輸入地址"
          className="w-full"
        />
      </div>
    </div>
  );
}