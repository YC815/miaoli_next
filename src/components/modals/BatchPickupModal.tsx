"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MultiStepWizard, WizardStep } from "@/components/ui/multi-step-wizard";
import { usePermissions } from "@/hooks/usePermissions";
import type { User } from "@/components/auth/AuthGuard";
import { RecipientUnitSelect } from "@/components/recipient/RecipientUnitSelect";
import type { RecipientUnit } from "@/components/recipient/AddRecipientUnitDialog";

interface BatchPickupInfo {
  unitId: string | null;
  unitName: string;
  phone: string | null;
  address: string | null;
  purpose: string;
}

interface PickupItem {
  id: string;
  name: string;
  category: string;
  availableQuantity: number;
  requestedQuantity: number;
  unit: string;
}

interface ItemStock {
  id: string;
  category: string;
  name: string;
  totalStock: number;
  unit: string;
}

interface SelectedPickupItem {
  id: string;
  itemName: string;
  itemCategory: string;
  itemUnit: string;
  quantity: number;
}

interface BatchPickupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (pickupInfo: BatchPickupInfo, selectedItems: SelectedPickupItem[]) => void;
  items: ItemStock[];
  dbUser?: User | null;
}

export function BatchPickupModal({ open, onOpenChange, onSubmit, items, dbUser }: BatchPickupModalProps) {
  const { hasPermission } = usePermissions(dbUser || null);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedRecipient, setSelectedRecipient] = useState<RecipientUnit | null>(null);
  const [purpose, setPurpose] = useState("");
  const [pickupItems, setPickupItems] = useState<PickupItem[]>([]);

  useEffect(() => {
    const availableItems: PickupItem[] = items.map(item => ({
      id: item.id,
      name: item.name,
      category: item.category,
      availableQuantity: item.totalStock,
      requestedQuantity: 0,
      unit: item.unit,
    }));
    setPickupItems(availableItems);
  }, [items]);

  const updatePickupQuantity = (id: string, quantity: number) => {
    setPickupItems(items => 
      items.map(item => 
        item.id === id 
          ? { ...item, requestedQuantity: Math.min(quantity, item.availableQuantity) }
          : item
      )
    );
  };

  const resetForm = () => {
    setCurrentStep(0);
    setSelectedRecipient(null);
    setPurpose("");
    setPickupItems(items => items.map(item => ({ ...item, requestedQuantity: 0 })));
  };

  const handleComplete = () => {
    const finalPickupInfo: BatchPickupInfo = {
      unitId: selectedRecipient?.id ?? null,
      unitName: selectedRecipient?.name ?? "臨時領取",
      phone: selectedRecipient?.phone ?? null,
      address: selectedRecipient?.address ?? null,
      purpose,
    };
    const selectedItems: SelectedPickupItem[] = pickupItems
      .filter(item => item.requestedQuantity > 0)
      .map(item => ({
        id: item.id,
        itemName: item.name,
        itemCategory: item.category,
        itemUnit: item.unit,
        quantity: item.requestedQuantity,
      }));
    onSubmit(finalPickupInfo, selectedItems);
    resetForm();
  };

  const handleCancel = () => {
    resetForm();
    onOpenChange(false);
  };

  // Validation functions
  const isPickupInfoValid = () => true; // 領取單位可選，不強制要求

  const hasSelectedItems = () => {
    return pickupItems.some(item => item.requestedQuantity > 0);
  };

  // Step validation
  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 0: // Pickup info step - need unit and phone
        return isPickupInfoValid();
      case 1: // Items step - need at least one item selected
        return hasSelectedItems();
      case 2: // Confirmation step - always can proceed
        return true;
      default:
        return false;
    }
  };

  const getPickupUnitDisplayName = () => {
    return selectedRecipient?.name || "未選擇";
  };

  const stepTitles = [
    "領取單位資訊",
    "庫存清單", 
    "確認領取"
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          onOpenChange(true);
        } else {
          handleCancel();
        }
      }}
    >
      <DialogContent className="w-[95vw] max-w-3xl max-h-[95vh] overflow-y-auto sm:w-full">
        <DialogHeader>
          <DialogTitle>批量物資領取</DialogTitle>
          <DialogDescription>
            {stepTitles[currentStep]}
          </DialogDescription>
        </DialogHeader>
        
        <MultiStepWizard
          currentStep={currentStep}
          totalSteps={3}
          onStepChange={setCurrentStep}
          onCancel={handleCancel}
          onComplete={handleComplete}
          canGoNext={canProceedToNextStep()}
          completeButtonText="批量領取物資"
        >
          {/* Step 1: Pickup Unit Information */}
          <WizardStep title="領取單位資訊">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">領取單位資訊</h3>
              <RecipientUnitSelect
                selectedRecipientId={selectedRecipient?.id || null}
                onRecipientChange={setSelectedRecipient}
                canCreate={hasPermission('canAddRecipientUnits')}
              />
              <div className="space-y-2">
                <Label htmlFor="unit-purpose">領取用途/備註（選填）</Label>
                <Textarea 
                  id="unit-purpose"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="請輸入領取用途或備註"
                  rows={2}
                />
              </div>
            </div>
          </WizardStep>

          {/* Step 2: Inventory Selection */}
          <WizardStep title="庫存清單">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">選擇物資</h3>
              <div className="space-y-3">
                {pickupItems.map((item) => (
                  <div key={item.id} className="p-3 border rounded-lg space-y-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.category}</p>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        庫存：{item.availableQuantity} {item.unit}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`quantity-${item.id}`} className="text-sm whitespace-nowrap">領取數量：</Label>
                      <Input
                        id={`quantity-${item.id}`}
                        type="number"
                        min="0"
                        max={item.availableQuantity}
                        value={item.requestedQuantity}
                        onChange={(e) => updatePickupQuantity(item.id, parseInt(e.target.value) || 0)}
                        className="w-20 min-h-[44px]"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </WizardStep>

          {/* Step 3: Confirmation */}
          <WizardStep title="確認領取">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">領取確認</h3>
              
              {/* Unit Info Summary */}
              <div className="p-3 sm:p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2 text-sm sm:text-base">領取單位資訊</h4>
                <div className="space-y-1 text-xs sm:text-sm">
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                    <span className="font-medium sm:font-normal">領取單位：</span>
                    <span className="break-words">{getPickupUnitDisplayName()}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                    <span className="font-medium sm:font-normal">聯絡電話：</span>
                    <span className="break-all">{selectedRecipient?.phone || "—"}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                    <span className="font-medium sm:font-normal">地址：</span>
                    <span className="break-words">{selectedRecipient?.address || "—"}</span>
                  </div>
                  {purpose && (
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                      <span className="font-medium sm:font-normal">領取用途：</span>
                      <span className="break-words">{purpose}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Items Summary */}
              <div className="p-3 sm:p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2 text-sm sm:text-base">領取物資清單</h4>
                <div className="space-y-1 text-xs sm:text-sm">
                  {pickupItems
                    .filter(item => item.requestedQuantity > 0)
                    .map((item) => (
                      <div key={item.id} className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                        <span className="font-medium sm:font-normal break-words">{item.name}</span>
                        <span className="text-right">{item.requestedQuantity} {item.unit}</span>
                      </div>
                    ))
                  }
                  {pickupItems.filter(item => item.requestedQuantity > 0).length === 0 && (
                    <p className="text-muted-foreground">尚未選擇任何物資</p>
                  )}
                </div>
              </div>
              
              <div className="text-center p-3 sm:p-4 text-muted-foreground text-xs sm:text-sm">
                請確認以上資訊無誤後，點擊「批量領取物資」完成領取。
              </div>
            </div>
          </WizardStep>
        </MultiStepWizard>
      </DialogContent>
    </Dialog>
  );
}
