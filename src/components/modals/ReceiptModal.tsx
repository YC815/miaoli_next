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

import type { DonationRecord as BaseDonationRecord } from "@/types/donation";

interface DonationRecord extends BaseDonationRecord {
  selected: boolean;
  items: string;  // Transformed display string
  date: string;   // Formatted date string
}

interface ReceiptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPrint: (selectedRecords: DonationRecord[]) => void;
}

type FetchedDonationRecord = BaseDonationRecord;

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
          items: record.donationItems.map((item) => `${item.itemName} x${item.quantity}`).join(', '),
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
    setDonationRecords(records => {
      const targetRecord = records.find(record => record.id === id);
      if (!targetRecord) return records;

      // 如果要取消勾選，直接取消
      if (targetRecord.selected) {
        return records.map(record =>
          record.id === id ? { ...record, selected: false } : record
        );
      }

      // 如果要勾選，需要檢查邏輯互鎖
      const selectedRecords = records.filter(record => record.selected);
      const targetDonorName = targetRecord.donor?.name?.trim();
      const isTargetAnonymous = !targetRecord.donor || !targetDonorName || targetDonorName === '';

      if (selectedRecords.length === 0) {
        // 沒有已選記錄，可以自由勾選
        return records.map(record =>
          record.id === id ? { ...record, selected: true } : record
        );
      }

      // 找出已選記錄的捐贈者類型
      const selectedDonorNames = selectedRecords.map(r => r.donor?.name?.trim()).filter((name): name is string => Boolean(name));
      const hasNamedDonor = selectedDonorNames.length > 0;
      const uniqueDonorNames = [...new Set(selectedDonorNames)];

      if (isTargetAnonymous) {
        // 目標是無名氏，可以加入任何組合
        return records.map(record =>
          record.id === id ? { ...record, selected: true } : record
        );
      } else {
        // 目標有姓名
        if (!hasNamedDonor) {
          // 目前只有無名氏被選中，可以加入具名捐贈者
          return records.map(record =>
            record.id === id ? { ...record, selected: true } : record
          );
        } else if (uniqueDonorNames.length === 1 && uniqueDonorNames[0] === targetDonorName) {
          // 目前只有同一個具名捐贈者被選中，可以加入
          return records.map(record =>
            record.id === id ? { ...record, selected: true } : record
          );
        } else {
          // 已經有不同的具名捐贈者被選中，不能加入
          toast.error(`無法選擇不同捐贈者的記錄，目前已選擇：${uniqueDonorNames.join(', ')}`);
          return records;
        }
      }
    });
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

  // 檢查記錄是否可以被選擇
  const isRecordSelectable = (record: DonationRecord): boolean => {
    if (record.selected) return true; // 已選中的總是可以操作（用於取消選擇）

    const selectedRecords = donationRecords.filter(r => r.selected);
    if (selectedRecords.length === 0) return true; // 沒有選中任何記錄時都可以選

    const recordDonorName = record.donor?.name?.trim();
    const isRecordAnonymous = !record.donor || !recordDonorName || recordDonorName === '';

    // 無名氏記錄總是可以加入
    if (isRecordAnonymous) return true;

    // 檢查已選記錄的捐贈者
    const selectedDonorNames = selectedRecords
      .map(r => r.donor?.name?.trim())
      .filter((name): name is string => Boolean(name));

    if (selectedDonorNames.length === 0) {
      // 只選了無名氏記錄，可以加入具名捐贈者
      return true;
    }

    const uniqueDonorNames = [...new Set(selectedDonorNames)];
    // 只有當選中的是同一個捐贈者時才能加入
    return uniqueDonorNames.length === 1 && uniqueDonorNames[0] === recordDonorName;
  };

  // 智能全選邏輯
  const handleSelectAll = () => {
    const allSelected = donationRecords.every(record => record.selected);
    
    if (allSelected) {
      // 如果全部已選，則取消全選
      resetSelections();
      return;
    }

    // 智能全選邏輯：
    // 1. 如果沒有選中任何記錄，選中第一個記錄（如果有的話）
    // 2. 如果已經選中某些記錄，嘗試選中所有兼容的記錄
    
    const selectedRecords = donationRecords.filter(record => record.selected);
    
    if (selectedRecords.length === 0) {
      // 沒有選中記錄，選中第一個
      if (donationRecords.length > 0) {
        setDonationRecords(records => 
          records.map((record, index) => 
            index === 0 ? { ...record, selected: true } : record
          )
        );
      }
    } else {
      // 選中所有兼容的記錄
      setDonationRecords(records => 
        records.map(record => ({
          ...record,
          selected: record.selected || isRecordSelectable(record)
        }))
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto sm:w-full">
        <DialogHeader>
          <DialogTitle>收據列印</DialogTitle>
          <DialogDescription>
            選擇要列印收據的捐贈記錄。一張收據只能包含同一捐贈者的記錄（無名氏記錄可與任何捐贈者組合）。
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="max-h-[60vh] sm:max-h-96 overflow-y-auto border rounded-lg">
              {donationRecords.map((record) => {
                const isSelectable = isRecordSelectable(record);
                const isDisabled = !isSelectable;
                
                return (
                  <div 
                    key={record.id} 
                    className={`flex items-start sm:items-center space-x-3 p-3 transition-colors ${
                      isDisabled 
                        ? 'bg-muted/50 opacity-60' 
                        : 'hover:bg-muted'
                    }`}
                  >
                    <input
                      type="checkbox"
                      id={`record-${record.id}`}
                      checked={record.selected}
                      disabled={isDisabled}
                      onChange={() => toggleRecordSelection(record.id)}
                      className={`h-5 w-5 sm:h-4 sm:w-4 rounded border-gray-300 mt-1 sm:mt-0 flex-shrink-0 ${
                        isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm break-words">{record.donor?.name || "匿名"}</p>
                          <p className="text-xs text-muted-foreground break-all">{record.donor?.phone || "-"}</p>
                        </div>
                        <div className="text-left sm:text-right flex-shrink-0">
                          <p className="text-xs sm:text-sm font-medium sm:font-normal">{record.date}</p>
                        </div>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-words">{record.items}</p>
                    </div>
                  </div>
                );
              })}
              
              {donationRecords.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>暫無捐贈記錄</p>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 text-xs sm:text-sm text-muted-foreground">
              <span>
                已選擇 {donationRecords.filter(record => record.selected).length} 筆記錄
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="min-h-[44px] px-4"
              >
                {donationRecords.every(record => record.selected) ? '取消全選' : '智能全選'}
              </Button>
            </div>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto min-h-[44px]"
          >
            取消
          </Button>
          <Button 
            onClick={handlePrint}
            disabled={donationRecords.filter(record => record.selected).length === 0}
            className="w-full sm:w-auto min-h-[44px]"
          >
            列印收據
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}