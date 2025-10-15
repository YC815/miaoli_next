"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Plus, Minus } from "lucide-react";

interface ItemStock {
  id: string;
  category: string;
  name: string;
  totalStock: number;
  unit: string;
  safetyStock: number;
}

interface EditQuantityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (id: string, newQuantity: number, changeType: "INCREASE" | "DECREASE", reason: string) => void;
  supply: ItemStock | null;
}

export function EditQuantityModal({ open, onOpenChange, onSubmit, supply }: EditQuantityModalProps) {
  const [changeType, setChangeType] = useState<"increase" | "decrease">("increase");
  const [changeAmount, setChangeAmount] = useState<number>(0);
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [increaseReasons, setIncreaseReasons] = useState<string[]>([]);
  const [decreaseReasons, setDecreaseReasons] = useState<string[]>([]);

  useEffect(() => {
    // Reset form when modal opens and fetch reasons
    if (open) {
      setChangeType("increase");
      setChangeAmount(0);
      setReason("");
      setCustomReason("");
      fetchReasons();
    }
  }, [open]);

  const fetchReasons = async () => {
    try {
      // Fetch increase reasons
      const increaseResponse = await fetch('/api/inventory-reasons?changeType=INCREASE');
      if (increaseResponse.ok) {
        const increaseData = await increaseResponse.json();
        setIncreaseReasons(increaseData.map((reason: { reason: string }) => reason.reason));
      }

      // Fetch decrease reasons
      const decreaseResponse = await fetch('/api/inventory-reasons?changeType=DECREASE');
      if (decreaseResponse.ok) {
        const decreaseData = await decreaseResponse.json();
        setDecreaseReasons(decreaseData.map((reason: { reason: string }) => reason.reason));
      }
    } catch (error) {
      console.error('Error fetching inventory reasons:', error);
    }
  };

  const handleSubmit = () => {
    if (supply && changeAmount > 0 && (reason !== "其他（請說明）" ? reason : customReason)) {
      const finalReason = reason === "其他（請說明）" ? customReason : reason;
      const newQuantity = changeType === "increase" 
        ? supply.totalStock + changeAmount 
        : Math.max(0, supply.totalStock - changeAmount);
      
      onSubmit(supply.id, newQuantity, changeType.toUpperCase() as "INCREASE" | "DECREASE", finalReason);
      onOpenChange(false);
    }
  };

  const getCurrentReasons = () => {
    return changeType === "increase" ? increaseReasons : decreaseReasons;
  };

  const getNewQuantity = () => {
    if (!supply) return 0;
    return changeType === "increase" 
      ? supply.totalStock + changeAmount 
      : Math.max(0, supply.totalStock - changeAmount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md max-h-[95vh] overflow-y-auto sm:w-full">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">修改庫存數量</DialogTitle>
          <DialogDescription className="text-sm">
            {supply && `${supply.name} - 目前庫存：${supply.totalStock} ${supply.unit}`}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* 增減選擇 */}
          <div className="space-y-2">
            <Label>操作類型</Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant={changeType === "increase" ? "default" : "outline"}
                onClick={() => setChangeType("increase")}
                className="flex-1 min-h-[44px]"
              >
                <Plus className="h-4 w-4 mr-2" />
                增加庫存
              </Button>
              <Button
                type="button"
                variant={changeType === "decrease" ? "default" : "outline"}
                onClick={() => setChangeType("decrease")}
                className="flex-1 min-h-[44px]"
              >
                <Minus className="h-4 w-4 mr-2" />
                減少庫存
              </Button>
            </div>
          </div>

          {/* 數量輸入 */}
          <div className="space-y-2">
            <Label htmlFor="change-amount">
              {changeType === "increase" ? "增加數量" : "減少數量"}
            </Label>
            <Input
              id="change-amount"
              type="number"
              min="1"
              max={changeType === "decrease" ? supply?.totalStock : undefined}
              value={changeAmount}
              onChange={(e) => setChangeAmount(parseInt(e.target.value) || 0)}
              placeholder={`請輸入要${changeType === "increase" ? "增加" : "減少"}的數量`}
            />
            {changeType === "decrease" && supply && changeAmount > supply.totalStock && (
              <p className="text-sm text-destructive">
                減少數量不能超過目前庫存數量
              </p>
            )}
          </div>

          {/* 原因選擇 */}
          <div className="space-y-2">
            <Label>變更原因</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="選擇變更原因" />
              </SelectTrigger>
              <SelectContent>
                {getCurrentReasons().map((reasonOption) => (
                  <SelectItem key={reasonOption} value={reasonOption}>
                    {reasonOption}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 自定義原因 */}
          {reason === "其他（請說明）" && (
            <div className="space-y-2">
              <Label htmlFor="custom-reason">請說明原因</Label>
              <Textarea
                id="custom-reason"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="請詳細說明變更原因..."
                rows={3}
              />
            </div>
          )}

          {/* 預覽結果 */}
          {changeAmount > 0 && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-xs sm:text-sm">
                <p className="font-medium mb-1">變更預覽：</p>
                <p className="text-muted-foreground break-words">
                  {supply?.totalStock} → {getNewQuantity()} 個
                  <span className={`ml-2 font-medium ${
                    changeType === "increase" ? "text-green-600" : "text-red-600"
                  }`}>
                    ({changeType === "increase" ? "+" : "-"}{changeAmount})
                  </span>
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto min-h-[44px]"
          >
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !changeAmount ||
              changeAmount <= 0 ||
              !reason ||
              (reason === "其他（請說明）" && !customReason.trim()) ||
              !!(changeType === "decrease" && supply && changeAmount > supply.totalStock)
            }
            className="w-full sm:w-auto min-h-[44px]"
          >
            確認修改
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
