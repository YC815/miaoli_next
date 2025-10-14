"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MultiStepWizard, WizardStep } from "@/components/ui/multi-step-wizard";
import type { User } from "@/components/auth/AuthGuard";

import { DonorInfoStep } from "@/components/donation/DonorInfoStep";
import { ItemSelectionStep } from "@/components/donation/ItemSelectionStep";
import { ItemSummaryStep } from "@/components/donation/ItemSummaryStep";

interface DonationItemData {
  itemName: string;
  itemCategory: string;
  itemUnit: string;
  expiryDate?: string;
  isStandard: boolean;
  quantity: number;
  notes?: string;
}

interface DonorInfo {
  name: string;
  phone: string;
  unifiedNumber: string;
  address: string;
}

interface AddSupplyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (donorInfo: DonorInfo, donationItems: DonationItemData[]) => void;
  dbUser?: User | null;
}

export function AddSupplyModal({ open, onOpenChange, onSubmit }: Omit<AddSupplyModalProps, 'dbUser'>) {
  const [currentStep, setCurrentStep] = useState(0);
  const [donorInfo, setDonorInfo] = useState<DonorInfo>({
    name: "",
    phone: "",
    unifiedNumber: "",
    address: "",
  });

  // 選中的物品清單
  const [selectedItems, setSelectedItems] = useState<Array<{
    itemName: string;
    itemCategory: string;
    itemUnit: string;
    expiryDate?: string;
    isStandard: boolean;
    quantity: number;
    notes?: string;
  }>>([]);

  const canAdvanceToStep = (stepIndex: number): boolean => {
    switch (stepIndex) {
      case 0: // 捐贈者資訊
        return donorInfo.name.trim() !== "";
      case 1: // 物品選擇
        return selectedItems.length > 0 && selectedItems.every(item =>
          item.itemName.trim() !== "" && item.quantity > 0
        );
      case 2: // 確認頁面
        return true;
      default:
        return true;
    }
  };

  const handleStepChange = (step: number) => {
    setCurrentStep(step);
  };

  const resetForm = () => {
    setCurrentStep(0);
    setDonorInfo({
      name: "",
      phone: "",
      unifiedNumber: "",
      address: "",
    });
    setSelectedItems([]);
  };

  const handleSubmit = () => {
    // 構建提交資料
    const donationItems: DonationItemData[] = selectedItems.map(item => ({
      itemName: item.itemName,
      itemCategory: item.itemCategory,
      itemUnit: item.itemUnit,
      expiryDate: item.expiryDate,
      isStandard: item.isStandard,
      quantity: item.quantity,
      notes: item.notes
    }));

    onSubmit(donorInfo, donationItems);
    resetForm();
    onOpenChange(false);
  };


  useEffect(() => {
    if (open && selectedItems.length === 0) {
      // 在 modal 開啟且沒有物品時，添加一個預設物品
      setSelectedItems([{
        itemName: "",
        itemCategory: "",
        itemUnit: "個",
        expiryDate: "",
        isStandard: false,
        quantity: 1,
        notes: ""
      }]);
    } else if (!open) {
      resetForm();
    }
  }, [open, selectedItems.length]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>新增物資捐贈</DialogTitle>
          <DialogDescription>
            請填寫捐贈者資訊、選擇物品並確認捐贈詳情
          </DialogDescription>
        </DialogHeader>

        <MultiStepWizard
          currentStep={currentStep}
          totalSteps={3}
          onStepChange={handleStepChange}
          onCancel={() => onOpenChange(false)}
          onComplete={handleSubmit}
          canGoNext={canAdvanceToStep(currentStep)}
          completeButtonText="確認捐贈"
        >
          {/* 步驟1：捐贈者資訊 */}
          <WizardStep title="捐贈者資訊">
            <DonorInfoStep
              donorInfo={donorInfo}
              onDonorInfoChange={setDonorInfo}
            />
          </WizardStep>

          {/* 步驟2：物品選擇 */}
          <WizardStep title="物品選擇">
            <ItemSelectionStep
              selectedItems={selectedItems}
              onItemsChange={setSelectedItems}
            />
          </WizardStep>

          {/* 步驟3：確認資訊 */}
          <WizardStep title="確認資訊">
            <ItemSummaryStep
              selectedItems={selectedItems}
            />
          </WizardStep>
        </MultiStepWizard>
      </DialogContent>
    </Dialog>
  );
}