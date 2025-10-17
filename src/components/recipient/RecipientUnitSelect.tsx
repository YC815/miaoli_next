"use client";

import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Plus, Check, ChevronsUpDown } from "lucide-react";
import { AddRecipientUnitDialog, RecipientUnit } from "@/components/recipient/AddRecipientUnitDialog";
import { cn } from "@/lib/utils";

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
  const [open, setOpen] = useState(false);

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
          領取單位 <span className="text-muted-foreground text-xs">(可選)</span>
        </Label>
        <div className="flex gap-2">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="flex-1 justify-between min-h-[44px]"
                disabled={loading}
              >
                {selectedRecipient
                  ? selectedRecipient.name
                  : "請選擇領取單位（可留空）"}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0">
              <Command>
                <CommandInput placeholder="搜尋領取單位..." />
                <CommandList>
                  <CommandEmpty>查無領取單位</CommandEmpty>
                  <CommandGroup>
                    {recipientUnits.map((unit) => (
                      <CommandItem
                        key={unit.id}
                        value={unit.name}
                        onSelect={() => {
                          handleRecipientSelect(unit.id);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedRecipient?.id === unit.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {unit.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
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
        <div className="space-y-2">
          <Label className="text-sm font-medium text-muted-foreground">服務人數</Label>
          <Input
            value={
              selectedRecipient?.serviceCount !== null && selectedRecipient?.serviceCount !== undefined
                ? String(selectedRecipient.serviceCount)
                : "（未提供）"
            }
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
