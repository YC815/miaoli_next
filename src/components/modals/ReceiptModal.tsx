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
import { toast } from "sonner";

interface DonationItem {
  quantity: number;
  supply: {
    name: string;
  };
}

interface DonationRecord {
  id: string;
  donorName: string;
  donorPhone?: string;
  address?: string;
  notes?: string;
  createdAt: string;
  donationItems: DonationItem[];
  selected: boolean;
}

interface ReceiptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPrint: (selectedRecords: DonationRecord[]) => void;
}

interface FetchedDonationRecord {
  id: string;
  donorName: string;
  donorPhone?: string;
  address?: string;
  notes?: string;
  createdAt: string;
  donationItems: {
    quantity: number;
    supply: {
      name: string;
    };
  }[];
}

export function ReceiptModal({ open, onOpenChange, onPrint }: ReceiptModalProps) {
  const [donationRecords, setDonationRecords] = useState<DonationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchDonationRecords = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/donations');
      if (response.ok) {
        const data = await response.json();
        setDonationRecords(data.map((record: FetchedDonationRecord) => ({
          ...record,
          selected: false,
          // Format items for display
          items: record.donationItems.map((item) => `${item.supply.name} x${item.quantity}`).join(', '),
          date: new Date(record.createdAt).toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' }),
        })));
      } else {
        toast.error("載入捐贈記錄失敗");
      }
    } catch (error) {
      console.error("Error fetching donation records:", error);
      toast.error("載入捐贈記錄失敗");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchDonationRecords();
    }
  }, [open]);

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
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : (
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
        )}

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