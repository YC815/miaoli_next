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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { MultiStepWizard, WizardStep } from "@/components/ui/multi-step-wizard";

interface SupplyItem {
  name: string;
  category: string;
  quantity: number;
  expiryDate?: string;
}

interface DonorInfo {
  name: string;
  phone: string;
  address: string;
}

interface AddSupplyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (donorInfo: DonorInfo, supplyItems: SupplyItem[], notes: string) => void;
}

export function AddSupplyModal({ open, onOpenChange, onSubmit }: AddSupplyModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [donorInfo, setDonorInfo] = useState<DonorInfo>({
    name: "",
    phone: "",
    address: "",
  });
  const [supplyItems, setSupplyItems] = useState<SupplyItem[]>([
    { name: "", category: "", quantity: 0, expiryDate: "" }
  ]);
  const [notes, setNotes] = useState("");
  const [availableSupplyNames, setAvailableSupplyNames] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      fetchCategories();
      fetchSupplyNames();
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
      const response = await fetch('/api/supplies');
      if (response.ok) {
        const data = await response.json();
        // Get unique supply names from existing supplies
        const uniqueNames = [...new Set(data.map((supply: { name: string }) => supply.name))] as string[];
        setAvailableSupplyNames(uniqueNames);
      }
    } catch (error) {
      console.error('Error fetching supply names:', error);
    }
  };

  const addSupplyItem = () => {
    setSupplyItems([...supplyItems, { name: "", category: "", quantity: 0, expiryDate: "" }]);
  };

  const removeSupplyItem = (index: number) => {
    if (supplyItems.length > 1) {
      setSupplyItems(supplyItems.filter((_, i) => i !== index));
    }
  };

  const updateSupplyItem = (index: number, field: keyof SupplyItem, value: string | number) => {
    const updatedItems = [...supplyItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setSupplyItems(updatedItems);
  };

  const resetForm = () => {
    setCurrentStep(0);
    setDonorInfo({ name: "", phone: "", address: "" });
    setSupplyItems([{ name: "", category: "", quantity: 0, expiryDate: "" }]);
    setNotes("");
  };

  const handleComplete = () => {
    onSubmit(donorInfo, supplyItems, notes);
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
    return supplyItems.some(item => 
      item.name.trim() !== "" && 
      item.category.trim() !== "" && 
      item.quantity > 0
    );
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <Label htmlFor="donor-phone">電話/統編</Label>
                  <Input 
                    id="donor-phone"
                    value={donorInfo.phone}
                    onChange={(e) => setDonorInfo({...donorInfo, phone: e.target.value})}
                    placeholder="請輸入電話或統編"
                  />
                </div>
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
                <Button type="button" onClick={addSupplyItem} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  新增
                </Button>
              </div>
              
              {supplyItems.map((item, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">物資 {index + 1}</h4>
                    {supplyItems.length > 1 && (
                      <Button 
                        type="button" 
                        onClick={() => removeSupplyItem(index)}
                        variant="ghost" 
                        size="sm"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>物資名稱</Label>
                      <Select 
                        value={item.name}
                        onValueChange={(value) => updateSupplyItem(index, "name", value)}
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
                      {item.name === "new" && (
                        <Input
                          type="text"
                          value={item.name === "new" ? "" : item.name}
                          onChange={(e) => updateSupplyItem(index, "name", e.target.value)}
                          placeholder="輸入新物資名稱"
                        />
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label>品項類別</Label>
                      <Select 
                        value={item.category}
                        onValueChange={(value) => updateSupplyItem(index, "category", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="選擇類別" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableCategories.map((category) => (
                            <SelectItem key={category} value={category}>{category}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                className="w-full py-6 text-base"
              >
                <Plus className="h-5 w-5 mr-2" />
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