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
import { TaxIdInput } from "@/components/ui/tax-id-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { MultiStepWizard, WizardStep } from "@/components/ui/multi-step-wizard";
import { usePermissions } from "@/hooks/usePermissions";
import type { User } from "@/components/auth/AuthGuard";

interface SupplyItem {
  name: string;
  category: string;
  quantity: number;
  unit: string;
  expiryDate?: string;
  isNewSupplyName?: boolean;
  isNewCategory?: boolean;
  isNewUnit?: boolean;
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
  onSubmit: (donorInfo: DonorInfo, supplyItems: SupplyItem[], notes: string) => void;
  dbUser?: User | null;
}

export function AddSupplyModal({ open, onOpenChange, onSubmit, dbUser }: AddSupplyModalProps) {
  const { hasPermission } = usePermissions(dbUser || null);
  const [currentStep, setCurrentStep] = useState(0);
  const [donorInfo, setDonorInfo] = useState<DonorInfo>({
    name: "",
    phone: "",
    unifiedNumber: "",
    address: "",
  });
  const [supplyItems, setSupplyItems] = useState<SupplyItem[]>([
    { name: "", category: "", quantity: 0, unit: "個", expiryDate: "", isNewSupplyName: false, isNewCategory: false, isNewUnit: false }
  ]);
  const [notes, setNotes] = useState("");
  const [availableSupplyNames, setAvailableSupplyNames] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availableUnits, setAvailableUnits] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      fetchCategories();
      fetchSupplyNames();
      fetchUnits();
    }
  }, [open]);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        setAvailableCategories(data.map((category: { name: string }) => category.name));
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchSupplyNames = async () => {
    try {
      const response = await fetch('/api/supply-names');
      if (response.ok) {
        const data = await response.json();
        setAvailableSupplyNames(data.map((item: { name: string }) => item.name));
      }
    } catch (error) {
      console.error('Error fetching supply names:', error);
    }
  };

  const fetchUnits = async () => {
    try {
      const response = await fetch('/api/units');
      if (response.ok) {
        const data = await response.json();
        setAvailableUnits(data.map((unit: { name: string }) => unit.name));
      }
    } catch (error) {
      console.error('Error fetching units:', error);
    }
  };

  const addSupplyItem = () => {
    setSupplyItems([...supplyItems, { name: "", category: "", quantity: 0, unit: "個", expiryDate: "", isNewSupplyName: false, isNewCategory: false, isNewUnit: false }]);
  };

  const removeSupplyItem = (index: number) => {
    if (supplyItems.length > 1) {
      setSupplyItems(supplyItems.filter((_, i) => i !== index));
    }
  };

  const updateSupplyItem = (index: number, field: keyof SupplyItem, value: string | number) => {
    console.log('⚡ updateSupplyItem called:', { index, field, value });
    const updatedItems = [...supplyItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    console.log('📊 After update:', updatedItems[index]);
    setSupplyItems(updatedItems);
  };

  const handleSupplyNameSelect = (index: number, value: string) => {
    console.log('🎯 handleSupplyNameSelect called:', { index, value });
    const updatedItems = [...supplyItems];
    if (value === "new") {
      console.log('📝 Setting new supply name mode for index:', index);
      updatedItems[index] = { 
        ...updatedItems[index], 
        name: "", 
        isNewSupplyName: true 
      };
    } else {
      // 這裡是當選擇現有物資或確認新物資名稱時
      console.log('✅ Setting supply name for index:', index, 'value:', value);
      updatedItems[index] = { 
        ...updatedItems[index], 
        name: value, 
        isNewSupplyName: false 
      };
    }
    console.log('📊 Updated supplyItems:', updatedItems);
    setSupplyItems(updatedItems);
  };

  const confirmNewSupplyName = async (index: number) => {
    console.log('✨ Confirming new supply name for index:', index);
    const item = supplyItems[index];
    if (!item.name.trim()) return;

    try {
      // 呼叫 API 新增物資名稱到資料庫
      const response = await fetch('/api/supply-names', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: item.name.trim(),
        }),
      });

      if (response.ok || response.status === 409) { // 409 表示已存在，也是正常情況
        // 添加到本地可用清單
        const newName = item.name.trim();
        if (!availableSupplyNames.includes(newName)) {
          setAvailableSupplyNames(prev => [...prev, newName]);
        }
        
        // 更新 UI 狀態，退出新增模式
        const updatedItems = [...supplyItems];
        updatedItems[index] = { 
          ...updatedItems[index], 
          name: newName,
          isNewSupplyName: false 
        };
        setSupplyItems(updatedItems);
        console.log('✅ New supply name confirmed and added:', newName);
      } else {
        console.error('Failed to create supply name');
      }
    } catch (error) {
      console.error('Error creating supply name:', error);
    }
  };

  const handleCategorySelect = (index: number, value: string) => {
    const updatedItems = [...supplyItems];
    if (value === "new") {
      updatedItems[index] = { 
        ...updatedItems[index], 
        category: "", 
        isNewCategory: true 
      };
    } else {
      updatedItems[index] = { 
        ...updatedItems[index], 
        category: value, 
        isNewCategory: false 
      };
    }
    setSupplyItems(updatedItems);
  };

  const createNewCategory = async (categoryName: string) => {
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: categoryName,
        }),
      });

      if (response.ok) {
        await fetchCategories(); // Refresh the categories list
        return true;
      } else {
        console.error('Failed to create category');
        return false;
      }
    } catch (error) {
      console.error('Error creating category:', error);
      return false;
    }
  };

  const handleUnitSelect = (index: number, value: string) => {
    const updatedItems = [...supplyItems];
    if (value === "new") {
      updatedItems[index] = { 
        ...updatedItems[index], 
        unit: "", 
        isNewUnit: true 
      };
    } else {
      updatedItems[index] = { 
        ...updatedItems[index], 
        unit: value, 
        isNewUnit: false 
      };
    }
    setSupplyItems(updatedItems);
  };

  const createNewUnit = async (unitName: string) => {
    try {
      const response = await fetch('/api/units', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: unitName,
        }),
      });

      if (response.ok) {
        await fetchUnits(); // Refresh the units list
        return true;
      } else {
        console.error('Failed to create unit');
        return false;
      }
    } catch (error) {
      console.error('Error creating unit:', error);
      return false;
    }
  };

  const resetForm = () => {
    setCurrentStep(0);
    setDonorInfo({ name: "", phone: "", unifiedNumber: "", address: "" });
    setSupplyItems([{ name: "", category: "", quantity: 0, unit: "個", expiryDate: "", isNewSupplyName: false, isNewCategory: false, isNewUnit: false }]);
    setNotes("");
  };

  const handleComplete = () => {
    console.log('🚀 handleComplete called');
    console.log('📋 Current supplyItems:', supplyItems);
    console.log('👤 Current donorInfo:', donorInfo);
    console.log('📝 Current notes:', notes);
    
    // Clean the supply items to remove internal tracking properties
    const cleanedSupplyItems = supplyItems.map(item => ({
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      expiryDate: item.expiryDate
    }));
    
    console.log('🧹 Cleaned supplyItems:', cleanedSupplyItems);
    
    onSubmit(donorInfo, cleanedSupplyItems, notes);
    resetForm();
  };

  const handleCancel = () => {
    resetForm();
    onOpenChange(false);
  };

  // Validation functions
  const isDonorInfoFilled = () => {
    return donorInfo.name.trim() !== "" || donorInfo.phone.trim() !== "" || donorInfo.address.trim() !== "";
  };

  const hasValidSupplyItems = () => {
    return supplyItems.some(item => {
      const hasValidName = item.name.trim() !== "";
      const hasValidCategory = item.category.trim() !== "";
      const hasValidQuantity = item.quantity > 0;
      
      return hasValidName && hasValidCategory && hasValidQuantity;
    });
  };

  // Step validation
  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 0: // Donor info step - always can proceed
        return true;
      case 1: // Supply items step - need at least one valid item
        return hasValidSupplyItems();
      case 2: // Notes step - always can proceed
        return true;
      default:
        return false;
    }
  };

  const getStepOneButtonText = () => {
    return isDonorInfoFilled() ? "下一步" : "略過";
  };

  // Custom buttons for step 1
  const getCustomButtons = () => {
    if (currentStep === 0) {
      return (
        <>
          <Button variant="outline" onClick={handleCancel}>
            取消
          </Button>
          <Button
            onClick={() => setCurrentStep(1)}
          >
            {getStepOneButtonText()}
          </Button>
        </>
      );
    }
    return null;
  };

  const stepTitles = [
    "捐贈者資訊",
    "物資清單", 
    "備註"
  ];

  return (
    <Dialog open={open} onOpenChange={() => onOpenChange(false)}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[95vh] overflow-y-auto sm:w-full">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">新增物資</DialogTitle>
          <DialogDescription className="text-base">
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
          completeButtonText="確認新增"
          customButtons={getCustomButtons()}
        >
          {/* Step 1: Donor Information */}
          <WizardStep title="捐贈者資訊">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">捐贈者資訊</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="donor-name">姓名/抬頭</Label>
                  <Input 
                    id="donor-name"
                    value={donorInfo.name}
                    onChange={(e) => setDonorInfo({...donorInfo, name: e.target.value})}
                    placeholder="請輸入姓名或抬頭"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="donor-phone">電話</Label>
                  <PhoneInput 
                    id="donor-phone"
                    value={donorInfo.phone}
                    onChange={(e) => setDonorInfo({...donorInfo, phone: e.target.value})}
                    placeholder="請輸入電話號碼"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="donor-unified-number">統一編號（選填）</Label>
                <TaxIdInput 
                  id="donor-unified-number"
                  value={donorInfo.unifiedNumber}
                  onChange={(e) => setDonorInfo({...donorInfo, unifiedNumber: e.target.value})}
                  placeholder="請輸入統一編號"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="donor-address">地址</Label>
                <Input 
                  id="donor-address"
                  value={donorInfo.address}
                  onChange={(e) => setDonorInfo({...donorInfo, address: e.target.value})}
                  placeholder="請輸入地址"
                />
              </div>
            </div>
          </WizardStep>

          {/* Step 2: Supply Items */}
          <WizardStep title="物資清單">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">物資</h3>
                <Button 
                  type="button" 
                  onClick={addSupplyItem} 
                  variant="outline" 
                  size="sm"
                  className="min-h-[44px] px-4"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  新增
                </Button>
              </div>
              
              {supplyItems.map((item, index) => (
                <div key={index} className="p-3 sm:p-4 border rounded-lg space-y-3 sm:space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm sm:text-base">物資 {index + 1}</h4>
                    {supplyItems.length > 1 && (
                      <Button 
                        type="button" 
                        onClick={() => removeSupplyItem(index)}
                        variant="ghost" 
                        size="sm"
                        className="min-h-[44px] min-w-[44px] p-2"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>物資名稱</Label>
                      {item.isNewSupplyName ? (
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Input
                            type="text"
                            value={item.name}
                            onChange={(e) => updateSupplyItem(index, "name", e.target.value)}
                            placeholder="輸入新物資名稱"
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              console.log('🔥 確認按鈕被點擊！index:', index);
                              confirmNewSupplyName(index);
                            }}
                            className="sm:w-auto w-full min-h-[44px]"
                          >
                            確認
                          </Button>
                        </div>
                      ) : (
                        <Select 
                          value={item.name}
                          onValueChange={(value) => handleSupplyNameSelect(index, value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="選擇物資" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableSupplyNames.map((name) => (
                              <SelectItem key={name} value={name}>{name}</SelectItem>
                            ))}
                            <SelectItem value="new">+ 新增物資</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label>品項類別</Label>
                      {!item.isNewCategory ? (
                        <Select 
                          value={item.category}
                          onValueChange={(value) => handleCategorySelect(index, value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="選擇類別" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableCategories.map((category) => (
                              <SelectItem key={category} value={category}>{category}</SelectItem>
                            ))}
                            {hasPermission('canAddCategories') && (
                              <SelectItem value="new">+ 新增類別</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Input
                            type="text"
                            value={item.category}
                            onChange={(e) => updateSupplyItem(index, "category", e.target.value)}
                            placeholder="輸入新類別名稱"
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              if (item.category.trim()) {
                                const success = await createNewCategory(item.category.trim());
                                if (success) {
                                  handleCategorySelect(index, item.category.trim());
                                }
                              }
                            }}
                            className="sm:w-auto w-full min-h-[44px]"
                          >
                            確認
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label>數量</Label>
                      <Input 
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateSupplyItem(index, "quantity", parseInt(e.target.value) || 0)}
                        placeholder="請輸入數量"
                        min="0"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>單位</Label>
                      {!item.isNewUnit ? (
                        <Select 
                          value={item.unit}
                          onValueChange={(value) => handleUnitSelect(index, value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="選擇單位" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableUnits.map((unit) => (
                              <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                            ))}
                            {hasPermission('canAddUnits') && (
                              <SelectItem value="new">+ 新增單位</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Input
                            type="text"
                            value={item.unit}
                            onChange={(e) => updateSupplyItem(index, "unit", e.target.value)}
                            placeholder="輸入新單位名稱"
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              if (item.unit.trim()) {
                                const success = await createNewUnit(item.unit.trim());
                                if (success) {
                                  handleUnitSelect(index, item.unit.trim());
                                }
                              }
                            }}
                            className="sm:w-auto w-full min-h-[44px]"
                          >
                            確認
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label>有效日期（選填）</Label>
                      <Input 
                        type="date"
                        value={item.expiryDate}
                        onChange={(e) => updateSupplyItem(index, "expiryDate", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Long Add Supply Button */}
              <Button 
                type="button" 
                onClick={addSupplyItem} 
                variant="outline" 
                className="w-full py-4 sm:py-6 text-sm sm:text-base min-h-[44px]"
              >
                <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                新增物資
              </Button>
            </div>
          </WizardStep>

          {/* Step 3: Notes */}
          <WizardStep title="備註">
            <div className="space-y-4">
              <div className="space-y-2">
                <Textarea 
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="請輸入備註"
                  rows={6}
                />
              </div>
            </div>
          </WizardStep>
        </MultiStepWizard>
      </DialogContent>
    </Dialog>
  );
}