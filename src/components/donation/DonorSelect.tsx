"use client";

import React, { useState, useEffect } from "react";
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
import { AddDonorDialog } from "@/components/donation/AddDonorDialog";
import { cn } from "@/lib/utils";

interface Donor {
  id: string;
  name: string;
  phone: string | null;
  taxId: string | null;
  address: string | null;
}

interface DonorSelectProps {
  selectedDonorId: string | null;
  onDonorChange: (donorId: string | null, donor: Donor | null) => void;
}

export function DonorSelect({ selectedDonorId, onDonorChange }: DonorSelectProps) {
  const [donors, setDonors] = useState<Donor[]>([]);
  const [selectedDonor, setSelectedDonor] = useState<Donor | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    loadDonors();
  }, []);

  useEffect(() => {
    if (selectedDonorId && donors.length > 0) {
      const donor = donors.find(d => d.id === selectedDonorId);
      setSelectedDonor(donor || null);
    }
  }, [selectedDonorId, donors]);

  const loadDonors = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/donors');
      if (response.ok) {
        const data = await response.json();
        setDonors(data.data || []);
      }
    } catch (error) {
      console.error('載入捐贈人清單失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDonorSelect = (donorId: string) => {
    if (donorId === "anonymous") {
      setSelectedDonor(null);
      onDonorChange(null, null);
    } else {
      const donor = donors.find(d => d.id === donorId);
      setSelectedDonor(donor || null);
      onDonorChange(donorId, donor || null);
    }
  };

  const handleDonorCreated = (newDonor: Donor) => {
    setDonors(prev => [newDonor, ...prev]);
    setSelectedDonor(newDonor);
    onDonorChange(newDonor.id, newDonor);
    setShowAddDialog(false);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="donor-select" className="text-sm font-medium">
          選擇捐贈人 <span className="text-muted-foreground text-xs">(可選)</span>
        </Label>
        <div className="flex gap-2">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="flex-1 justify-between"
                disabled={loading}
              >
                {selectedDonor
                  ? selectedDonor.name
                  : selectedDonorId === null && selectedDonor === null && !loading
                  ? "匿名捐贈"
                  : "請選擇捐贈人（可留空）"}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0">
              <Command>
                <CommandInput placeholder="搜尋捐贈人..." />
                <CommandList>
                  <CommandEmpty>查無捐贈人</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="anonymous"
                      onSelect={() => {
                        handleDonorSelect("anonymous");
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedDonorId === null ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="text-muted-foreground">匿名捐贈</span>
                    </CommandItem>
                    {donors.map((donor) => (
                      <CommandItem
                        key={donor.id}
                        value={donor.name}
                        onSelect={() => {
                          handleDonorSelect(donor.id);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedDonorId === donor.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {donor.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setShowAddDialog(true)}
            title="快速新增捐贈人"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 選擇捐贈人後顯示詳細資訊（唯讀） */}
      {selectedDonor && (
        <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">聯絡電話</Label>
            <Input
              value={selectedDonor.phone || "（未提供）"}
              disabled
              className="bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">統一編號</Label>
            <Input
              value={selectedDonor.taxId || "（未提供）"}
              disabled
              className="bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">地址</Label>
            <Input
              value={selectedDonor.address || "（未提供）"}
              disabled
              className="bg-background"
            />
          </div>
        </div>
      )}

      {/* 快速新增捐贈人對話框 */}
      <AddDonorDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onDonorCreated={handleDonorCreated}
      />
    </div>
  );
}
