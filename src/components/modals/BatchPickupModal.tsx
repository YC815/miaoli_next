"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { MultiStepWizard, WizardStep } from "@/components/ui/multi-step-wizard";
import { usePermissions } from "@/hooks/usePermissions";
import type { User } from "@/components/auth/AuthGuard";

interface BatchPickupInfo {
  unit: string;
  phone: string;
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

interface Supply {
  id: string;
  category: string;
  name: string;
  quantity: number;
  unit: string;
  safetyStock: number;
}

interface BatchPickupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (pickupInfo: BatchPickupInfo, selectedItems: PickupItem[]) => void;
  supplies: Supply[];
  dbUser?: User | null;
}

export function BatchPickupModal({ open, onOpenChange, onSubmit, supplies, dbUser }: BatchPickupModalProps) {
  const { hasPermission } = usePermissions(dbUser || null);
  const [currentStep, setCurrentStep] = useState(0);
  const [batchPickupInfo, setBatchPickupInfo] = useState<BatchPickupInfo>({
    unit: "",
    phone: "",
    purpose: "",
  });
  const [pickupItems, setPickupItems] = useState<PickupItem[]>([]);
  const [availablePickupUnits, setAvailablePickupUnits] = useState<string[]>([]);
  const [newUnitName, setNewUnitName] = useState("");
  const [isNewUnit, setIsNewUnit] = useState(false);

  useEffect(() => {
    if (open) {
      fetchRecipientUnits();
    }
  }, [open]);

  useEffect(() => {
    const availableItems: PickupItem[] = supplies.map(supply => ({
      id: supply.id,
      name: supply.name,
      category: supply.category,
      availableQuantity: supply.quantity,
      requestedQuantity: 0,
      unit: supply.unit,
    }));
    setPickupItems(availableItems);
  }, [supplies]);

  const fetchRecipientUnits = async () => {
    try {
      const response = await fetch('/api/recipient-units');
      if (response.ok) {
        const data = await response.json();
        setAvailablePickupUnits(data.map((unit: { name: string }) => unit.name));
      }
    } catch (error) {
      console.error('Error fetching recipient units:', error);
    }
  };

  const handleUnitSelect = (value: string) => {
    if (value === "new") {
      setIsNewUnit(true);
      setNewUnitName("");
      setBatchPickupInfo({...batchPickupInfo, unit: ""});
    } else {
      setIsNewUnit(false);
      setBatchPickupInfo({...batchPickupInfo, unit: value});
    }
  };

  const confirmNewUnit = async () => {
    if (!newUnitName.trim()) return;

    try {
      const response = await fetch('/api/recipient-units', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newUnitName.trim(),
        }),
      });

      if (response.ok || response.status === 409) {
        const unitName = newUnitName.trim();
        if (!availablePickupUnits.includes(unitName)) {
          setAvailablePickupUnits(prev => [...prev, unitName]);
        }
        
        setBatchPickupInfo({...batchPickupInfo, unit: unitName});
        setIsNewUnit(false);
        setNewUnitName("");
        console.log('✅ New recipient unit confirmed and added:', unitName);
      } else {
        console.error('Failed to create recipient unit');
      }
    } catch (error) {
      console.error('Error creating recipient unit:', error);
    }
  };

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
    setBatchPickupInfo({ unit: "", phone: "", purpose: "" });
    setPickupItems(items => items.map(item => ({ ...item, requestedQuantity: 0 })));
    setNewUnitName("");
    setIsNewUnit(false);
  };

  const handleComplete = () => {
    const finalPickupInfo = {
      ...batchPickupInfo,
      unit: batchPickupInfo.unit === "new" ? newUnitName : batchPickupInfo.unit
    };
    const selectedItems = pickupItems.filter(item => item.requestedQuantity > 0).map(item => ({
      ...item,
      unit: item.unit // 確保傳送正確的單位
    }));
    onSubmit(finalPickupInfo, selectedItems);
    resetForm();
  };

  const handleCancel = () => {
    resetForm();
    onOpenChange(false);
  };

  // Validation functions
  const isPickupInfoValid = () => {
    const unitValid = isNewUnit 
      ? newUnitName.trim() !== ""
      : batchPickupInfo.unit.trim() !== "";
    return unitValid;
  };

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
    return isNewUnit ? newUnitName : batchPickupInfo.unit;
  };

  const stepTitles = [
    "領取單位資訊",
    "庫存清單", 
    "確認領取"
  ];

  return (
    <Dialog open={open} onOpenChange={() => onOpenChange(false)}>
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>領取單位 <span className="text-red-500">*</span></Label>
                  {isNewUnit ? (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        type="text"
                        value={newUnitName}
                        onChange={(e) => setNewUnitName(e.target.value)}
                        placeholder="輸入新領取單位名稱"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={confirmNewUnit}
                        className="sm:w-auto w-full min-h-[44px]"
                      >
                        確認
                      </Button>
                    </div>
                  ) : (
                    <Select 
                      value={batchPickupInfo.unit}
                      onValueChange={handleUnitSelect}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="選擇領取單位" />
                      </SelectTrigger>
                      <SelectContent>
                        {availablePickupUnits.map((unit) => (
                          <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                        ))}
                        {hasPermission('canAddRecipientUnits') && (
                          <SelectItem value="new">+ 新增單位</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit-phone">聯絡電話（選填）</Label>
                  <PhoneInput 
                    id="unit-phone"
                    value={batchPickupInfo.phone}
                    onChange={(e) => setBatchPickupInfo({...batchPickupInfo, phone: e.target.value})}
                    placeholder="請輸入聯絡電話"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit-purpose">領取用途/備註（選填）</Label>
                <Textarea 
                  id="unit-purpose"
                  value={batchPickupInfo.purpose}
                  onChange={(e) => setBatchPickupInfo({...batchPickupInfo, purpose: e.target.value})}
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
                    <span className="break-all">{batchPickupInfo.phone}</span>
                  </div>
                  {batchPickupInfo.purpose && (
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                      <span className="font-medium sm:font-normal">領取用途：</span>
                      <span className="break-words">{batchPickupInfo.purpose}</span>
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