"use client";

import React, { useState, useEffect } from "react";
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
import { AddDonorDialog } from "@/components/donation/AddDonorDialog";

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
          <Select
            value={selectedDonorId || ""}
            onValueChange={handleDonorSelect}
            disabled={loading}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="請選擇捐贈人（可留空）" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="anonymous">
                <span className="text-muted-foreground">匿名捐贈</span>
              </SelectItem>
              {donors.map((donor) => (
                <SelectItem key={donor.id} value={donor.id}>
                  {donor.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
