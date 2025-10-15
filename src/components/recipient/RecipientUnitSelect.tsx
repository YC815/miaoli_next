"use client";

import React, { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AddRecipientUnitDialog, RecipientUnit } from "@/components/recipient/AddRecipientUnitDialog";

interface RecipientUnitSelectProps {
  selectedRecipientId: string | null;
  onRecipientChange: (recipient: RecipientUnit | null) => void;
  canCreate?: boolean;
}

export function RecipientUnitSelect({ selectedRecipientId, onRecipientChange, canCreate = true }: RecipientUnitSelectProps) {
  const [recipientUnits, setRecipientUnits] = useState<RecipientUnit[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<RecipientUnit | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadRecipientUnits = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/recipient-units");
      if (response.ok) {
        const data = await response.json();
        setRecipientUnits(data);
      }
    } catch (error) {
      console.error("載入領取單位清單失敗:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecipientUnits();
  }, []);

  useEffect(() => {
    if (selectedRecipientId && recipientUnits.length > 0) {
      const match = recipientUnits.find(unit => unit.id === selectedRecipientId) || null;
      setSelectedRecipient(match);
      onRecipientChange(match || null);
    } else if (!selectedRecipientId) {
      setSelectedRecipient(null);
      onRecipientChange(null);
    }
  }, [selectedRecipientId, recipientUnits, onRecipientChange]);

  const handleRecipientSelect = (recipientId: string) => {
    const recipient = recipientUnits.find(unit => unit.id === recipientId) || null;
    setSelectedRecipient(recipient);
    onRecipientChange(recipient);
  };

  const handleRecipientCreated = (recipient: RecipientUnit) => {
    setRecipientUnits(prev => [recipient, ...prev]);
    setSelectedRecipient(recipient);
    onRecipientChange(recipient);
    setShowAddDialog(false);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          領取單位 <span className="text-red-500">*</span>
        </Label>
        <div className="flex gap-2">
          <Select
            value={selectedRecipient?.id || ""}
            onValueChange={handleRecipientSelect}
            disabled={loading}
          >
            <SelectTrigger className="flex-1 min-h-[44px]">
              <SelectValue placeholder="請選擇領取單位" />
            </SelectTrigger>
            <SelectContent>
              {recipientUnits.map(unit => (
                <SelectItem key={unit.id} value={unit.id}>
                  {unit.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canCreate && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="min-h-[44px]"
              onClick={() => setShowAddDialog(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-muted-foreground">聯絡電話</Label>
          <Input
            value={selectedRecipient?.phone || "（未提供）"}
            disabled
            className="bg-background"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium text-muted-foreground">地址</Label>
          <Input
            value={selectedRecipient?.address || "（未提供）"}
            disabled
            className="bg-background"
          />
        </div>
      </div>

      {canCreate && (
        <AddRecipientUnitDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          onRecipientCreated={handleRecipientCreated}
        />
      )}
    </div>
  );
}
