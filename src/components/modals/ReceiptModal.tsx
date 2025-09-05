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
import { Button } from "@/components/ui/button";

interface DonationRecord {
  id: string;
  donorName: string;
  donorPhone: string;
  items: string;
  date: string;
  selected: boolean;
}

interface ReceiptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPrint: (selectedRecords: DonationRecord[]) => void;
}

export function ReceiptModal({ open, onOpenChange, onPrint }: ReceiptModalProps) {
  const [donationRecords, setDonationRecords] = useState<DonationRecord[]>([]);

  const mockDonationRecords: DonationRecord[] = [
    { id: "1", donorName: "王小明", donorPhone: "0912345678", items: "牙膏 x10, 食用油 x5", date: "2024-01-15", selected: false },
    { id: "2", donorName: "李大華", donorPhone: "0923456789", items: "毛毯 x3", date: "2024-01-20", selected: false },
    { id: "3", donorName: "陳美玲", donorPhone: "0934567890", items: "罐頭 x20, 麵條 x15", date: "2024-01-25", selected: false },
    { id: "4", donorName: "張志偉", donorPhone: "0945678901", items: "衣物 x8", date: "2024-02-01", selected: false },
  ];

  useEffect(() => {
    setDonationRecords(mockDonationRecords);
  }, []);

  const toggleRecordSelection = (id: string) => {
    setDonationRecords(records =>
      records.map(record =>
        record.id === id ? { ...record, selected: !record.selected } : record
      )
    );
  };

  const handlePrint = () => {
    const selectedRecords = donationRecords.filter(record => record.selected);
    onPrint(selectedRecords);
    onOpenChange(false);
  };

  const resetSelections = () => {
    setDonationRecords(records => records.map(record => ({ ...record, selected: false })));
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetSelections();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>收據列印</DialogTitle>
          <DialogDescription>
            選擇要列印收據的捐贈記錄
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="max-h-96 overflow-y-auto border rounded-lg">
            {donationRecords.map((record) => (
              <div key={record.id} className="flex items-center space-x-3 p-3 hover:bg-muted">
                <input
                  type="checkbox"
                  id={`record-${record.id}`}
                  checked={record.selected}
                  onChange={() => toggleRecordSelection(record.id)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{record.donorName}</p>
                      <p className="text-xs text-muted-foreground">{record.donorPhone}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">{record.date}</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{record.items}</p>
                </div>
              </div>
            ))}
            
            {donationRecords.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>暫無捐贈記錄</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              已選擇 {donationRecords.filter(record => record.selected).length} 筆記錄
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const allSelected = donationRecords.every(record => record.selected);
                setDonationRecords(records =>
                  records.map(record => ({ ...record, selected: !allSelected }))
                );
              }}
            >
              {donationRecords.every(record => record.selected) ? '取消全選' : '全選'}
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button 
            onClick={handlePrint}
            disabled={donationRecords.filter(record => record.selected).length === 0}
          >
            列印收據
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}