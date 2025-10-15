"use client";

import React, { useEffect, useMemo, useState } from "react";
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
type ChangeType = "INCREASE" | "DECREASE";

interface ItemStock {
  id: string;
  category: string;
  name: string;
  totalStock: number;
  unit: string;
  safetyStock: number;
}

interface InventoryReason {
  id: string;
  reason: string;
  changeType: ChangeType;
}

interface InventoryCountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    id: string,
    newQuantity: number,
    changeType: ChangeType,
    reason: string
  ) => void;
  supply: ItemStock | null;
}

export function InventoryCountModal({
  open,
  onOpenChange,
  onSubmit,
  supply,
}: InventoryCountModalProps) {
  const [increaseAmount, setIncreaseAmount] = useState<string>("");
  const [decreaseAmount, setDecreaseAmount] = useState<string>("");
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [customReason, setCustomReason] = useState<string>("");
  const [increaseReasons, setIncreaseReasons] = useState<InventoryReason[]>([]);
  const [decreaseReasons, setDecreaseReasons] = useState<InventoryReason[]>([]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setIncreaseAmount("");
    setDecreaseAmount("");
    setSelectedReason("");
    setCustomReason("");
    fetchReasons();
  }, [open]);

  const fetchReasons = async () => {
    try {
      const increaseResponse = await fetch(
        "/api/inventory-reasons?changeType=INCREASE"
      );
      if (increaseResponse.ok) {
        const increaseData = await increaseResponse.json();
        setIncreaseReasons(increaseData);
      }

      const decreaseResponse = await fetch(
        "/api/inventory-reasons?changeType=DECREASE"
      );
      if (decreaseResponse.ok) {
        const decreaseData = await decreaseResponse.json();
        setDecreaseReasons(decreaseData);
      }
    } catch (error) {
      console.error("Error fetching inventory reasons:", error);
    }
  };

  const increaseValue = Number.parseInt(increaseAmount, 10) || 0;
  const decreaseValue = Number.parseInt(decreaseAmount, 10) || 0;

  const activeChangeType: ChangeType | null = useMemo(() => {
    if (increaseValue > 0) return "INCREASE";
    if (decreaseValue > 0) return "DECREASE";
    return null;
  }, [increaseValue, decreaseValue]);

  const changeAmount = activeChangeType === "INCREASE" ? increaseValue : decreaseValue;

  const previewQuantity = useMemo(() => {
    if (!supply || !activeChangeType || changeAmount <= 0) return supply?.totalStock ?? 0;

    if (activeChangeType === "INCREASE") {
      return supply.totalStock + changeAmount;
    }

    return Math.max(0, supply.totalStock - changeAmount);
  }, [supply, activeChangeType, changeAmount]);

  const isDecreaseOverLimit =
    supply && activeChangeType === "DECREASE" && changeAmount > supply.totalStock;

  const displayReasonOptions =
    activeChangeType === "INCREASE" ? increaseReasons : decreaseReasons;

  const isCustomReason = selectedReason === "其他（請說明）";

  const summaryText = supply && activeChangeType && changeAmount > 0
    ? `${supply.name} ${activeChangeType === "INCREASE" ? "增加" : "減少"} ${changeAmount} ${supply.unit}`
    : "請輸入盤點數量與原因";

  const canSubmit =
    Boolean(supply) &&
    Boolean(activeChangeType) &&
    changeAmount > 0 &&
    Boolean(selectedReason) &&
    !(isCustomReason && !customReason.trim()) &&
    !isDecreaseOverLimit;

  const handleIncreaseChange = (value: string) => {
    setIncreaseAmount(value);
    if (value) {
      setDecreaseAmount("");
    }
  };

  const handleDecreaseChange = (value: string) => {
    setDecreaseAmount(value);
    if (value) {
      setIncreaseAmount("");
    }
  };

  const handleSubmit = () => {
    if (!canSubmit || !supply || !activeChangeType) return;

    const finalReason = isCustomReason ? customReason.trim() : selectedReason;
    const nextQuantity =
      activeChangeType === "INCREASE"
        ? supply.totalStock + changeAmount
        : Math.max(0, supply.totalStock - changeAmount);

    onSubmit(supply.id, nextQuantity, activeChangeType, finalReason);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">物資盤點</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {supply
              ? `${supply.name}（目前庫存：${supply.totalStock} ${supply.unit}）`
              : "選取欲盤點的物資"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="increase-amount">增加</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="increase-amount"
                  type="number"
                  min="0"
                  value={increaseAmount}
                  onChange={(event) => handleIncreaseChange(event.target.value)}
                  placeholder="輸入增加數量"
                  className="text-sm"
                />
                <span className="text-sm text-muted-foreground">
                  {supply?.unit ?? "單位"}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="decrease-amount">減少</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="decrease-amount"
                  type="number"
                  min="0"
                  value={decreaseAmount}
                  onChange={(event) => handleDecreaseChange(event.target.value)}
                  placeholder="輸入減少數量"
                  className="text-sm"
                />
                <span className="text-sm text-muted-foreground">
                  {supply?.unit ?? "單位"}
                </span>
              </div>
            </div>
          </div>

          {activeChangeType === null && (
            <p className="text-sm text-muted-foreground">
              請在「增加」或「減少」欄位其中一處填寫數量。
            </p>
          )}

          {isDecreaseOverLimit && (
            <p className="text-sm text-destructive">
              減少數量不能超過目前庫存（{supply?.totalStock} {supply?.unit}）。
            </p>
          )}

          <div className="space-y-2">
            <Label>變更原因</Label>
            <Select
              value={selectedReason}
              onValueChange={setSelectedReason}
              disabled={!activeChangeType || displayReasonOptions.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="選擇變更原因" />
              </SelectTrigger>
              <SelectContent>
                {displayReasonOptions.map((reason) => (
                  <SelectItem key={reason.id} value={reason.reason}>
                    {reason.reason}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isCustomReason && (
            <div className="space-y-2">
              <Label htmlFor="custom-reason">請補充原因</Label>
              <Textarea
                id="custom-reason"
                value={customReason}
                onChange={(event) => setCustomReason(event.target.value)}
                placeholder="例：到期報廢、盤點差異、單位交接等"
                rows={3}
              />
            </div>
          )}

          <div className="border-t border-border" />

          <div className="space-y-3 rounded-lg bg-muted/60 p-4">
            <div className="text-sm font-medium text-muted-foreground">
              盤點摘要
            </div>
            <div className="flex flex-col gap-2 text-sm">
              <div className="font-semibold text-base text-foreground">
                {summaryText}
              </div>
              {supply && activeChangeType && changeAmount > 0 && (
                <div className="text-sm text-muted-foreground">
                  盤點結果：{supply.totalStock} → {previewQuantity} {supply.unit}
                </div>
              )}
              {selectedReason && (
                <div className="text-sm text-muted-foreground">
                  原因：{isCustomReason ? customReason.trim() || "—" : selectedReason}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            取消
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full sm:w-auto"
          >
            確認修改
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
