"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Package } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from 'xlsx';
import { DonationRecordsTable } from "@/components/tables/DonationRecordsTable";
import type { DonationRecord } from "@/types/donation";
import { DisbursementRecordsTable, DisbursementRecord } from "@/components/tables/DisbursementRecordsTable";
import { InventoryLogsTable, InventoryLog } from "@/components/tables/InventoryLogsTable";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type TabType = "donations" | "disbursements" | "inventory";

export function RecordsView() {
  const [activeTab, setActiveTab] = useState<TabType>("donations");
  const [donationRecords, setDonationRecords] = useState<DonationRecord[]>([]);
  const [disbursementRecords, setDisbursementRecords] = useState<DisbursementRecord[]>([]);
  const [inventoryLogs, setInventoryLogs] = useState<InventoryLog[]>([]);
  const [selectedDonations, setSelectedDonations] = useState<DonationRecord[]>([]);
  const [selectedDisbursements, setSelectedDisbursements] = useState<DisbursementRecord[]>([]);
  const [selectedInventoryLogs, setSelectedInventoryLogs] = useState<InventoryLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<DonationRecord | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    fetchDonationRecords();
    fetchDisbursementRecords();
    fetchInventoryLogs();
  }, []);

  const fetchDonationRecords = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/donations');
      if (response.ok) {
        const data = await response.json();
        setDonationRecords(data);
      } else {
        toast.error("載入捐贈紀錄失敗");
      }
    } catch (error) {
      console.error("Error fetching donation records:", error);
      toast.error("載入捐贈紀錄失敗");
    } finally {
      setLoading(false);
    }
  };

  const fetchDisbursementRecords = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/disbursements');
      if (response.ok) {
        const data = await response.json();
        setDisbursementRecords(data);
      } else {
        toast.error("載入發放紀錄失敗");
      }
    } catch (error) {
      console.error("Error fetching disbursement records:", error);
      toast.error("載入發放紀錄失敗");
    } finally {
      setLoading(false);
    }
  };

  const fetchInventoryLogs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/inventory-logs');
      if (response.ok) {
        const data = await response.json();
        setInventoryLogs(data);
      } else {
        toast.error("載入異動紀錄失敗");
      }
    } catch (error) {
      console.error("Error fetching inventory logs:", error);
      toast.error("載入異動紀錄失敗");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };


  const formatDisbursementItems = (items: { quantity: number; supply: { name: string } }[]) => {
    return items
      .filter(item => item.supply?.name)
      .map(item => `${item.supply.name} x ${item.quantity}`)
      .join(', ');
  };

  const handleExportDonations = () => {
    if (selectedDonations.length === 0) {
      toast.error("請選擇至少一筆捐贈紀錄");
      return;
    }

    // Expand each donation record to show one row per item
    const exportData = selectedDonations.flatMap(record =>
      record.donationItems.map((item, index) => ({
        '捐贈日期': index === 0 ? formatDate(record.createdAt) : '',
        '流水號': index === 0 ? record.serialNumber : '',
        '物資名稱': item.itemName,
        '數量': `${item.quantity} ${item.itemUnit}`,
        '備註': item.notes || '',
        '捐贈者': index === 0 ? record.donor.name : '',
        '聯絡電話': index === 0 ? (record.donor.phone || '') : '',
        '地址': index === 0 ? (record.donor.address || '') : '',
        '操作者': index === 0 ? (record.user.nickname || '') : '',
      }))
    );

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "捐贈紀錄");

    const now = new Date();
    const filename = `捐贈紀錄_${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}.xlsx`;

    XLSX.writeFile(wb, filename);
    toast.success(`已匯出 ${selectedDonations.length} 筆捐贈紀錄`);
  };

  const handleExportDisbursements = () => {
    if (selectedDisbursements.length === 0) {
      toast.error("請選擇至少一筆發放紀錄");
      return;
    }

    const exportData = selectedDisbursements.map(record => ({
      '發放日期': formatDate(record.createdAt),
      '流水號': record.serialNumber,
      '物資名稱': formatDisbursementItems(record.disbursementItems),
      '受贈單位': record.recipientUnit,
      '聯絡電話': record.recipientPhone || '',
      '用途': record.purpose || '',
      '操作者': record.user.nickname || '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "發放紀錄");
    
    const now = new Date();
    const filename = `發放紀錄_${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}.xlsx`;
    
    XLSX.writeFile(wb, filename);
    toast.success(`已匯出 ${selectedDisbursements.length} 筆發放紀錄`);
  };

  const handleExportInventoryLogs = () => {
    if (selectedInventoryLogs.length === 0) {
      toast.error("請選擇至少一筆異動紀錄");
      return;
    }

    const exportData = selectedInventoryLogs.map(record => ({
      '異動時間': formatDate(record.createdAt),
      '物資名稱': record.supply.name,
      '物資類別': record.supply.category,
      '異動類型': record.changeType === 'INCREASE' ? '增加' : '減少',
      '異動數量': record.changeAmount,
      '異動後數量': record.newQuantity,
      '單位': record.supply.unit,
      '異動原因': record.reason,
      '操作人員': record.user.nickname || record.user.email.split('@')[0],
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "異動紀錄");
    
    const now = new Date();
    const filename = `資料異動紀錄_${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}.xlsx`;
    
    XLSX.writeFile(wb, filename);
    toast.success(`已匯出 ${selectedInventoryLogs.length} 筆異動紀錄`);
  };

  const selectedCount = activeTab === "donations"
    ? selectedDonations.length
    : activeTab === "disbursements"
    ? selectedDisbursements.length
    : selectedInventoryLogs.length;

  const handleExport = () => {
    if (activeTab === "donations") {
      handleExportDonations();
    } else if (activeTab === "disbursements") {
      handleExportDisbursements();
    } else {
      handleExportInventoryLogs();
    }
  };

  const handleDeleteDonation = (record: DonationRecord) => {
    setRecordToDelete(record);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!recordToDelete) return;

    try {
      const response = await fetch(`/api/donations/${recordToDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success("捐贈紀錄已刪除");
        fetchDonationRecords(); // Refresh the list
        setIsDeleteDialogOpen(false);
        setRecordToDelete(null);
      } else {
        const errorData = await response.json();
        toast.error(`刪除失敗: ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      console.error("Error deleting donation record:", error);
      toast.error("刪除失敗");
    }
  };
  
  return (
    <div className="flex flex-col flex-1 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">紀錄調取</h1>
            <p className="text-sm text-muted-foreground">查看和匯出物資捐贈、發放及異動紀錄</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={selectedCount === 0}
            className="h-9 px-4 border-primary/20 hover:bg-primary/5 disabled:opacity-50"
          >
            <FileDown className="h-4 w-4 mr-2" />
            匯出Excel {selectedCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded-full">
                {selectedCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-gradient-to-r from-muted/50 to-muted/30 backdrop-blur-sm rounded-xl p-1.5 w-fit shadow-sm border">
        <Button
          variant={activeTab === "donations" ? "default" : "ghost"}
          onClick={() => setActiveTab("donations")}
          className={`rounded-lg text-sm px-6 py-2.5 font-medium transition-all ${
            activeTab === "donations"
              ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
              : "text-muted-foreground hover:bg-white/50 dark:hover:bg-card/50 hover:text-foreground"
          }`}
          size="sm"
        >
          物資捐贈紀錄
        </Button>
        <Button
          variant={activeTab === "disbursements" ? "default" : "ghost"}
          onClick={() => setActiveTab("disbursements")}
          className={`rounded-lg text-sm px-6 py-2.5 font-medium transition-all ${
            activeTab === "disbursements"
              ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
              : "text-muted-foreground hover:bg-white/50 dark:hover:bg-card/50 hover:text-foreground"
          }`}
          size="sm"
        >
          物資發放紀錄
        </Button>
        <Button
          variant={activeTab === "inventory" ? "default" : "ghost"}
          onClick={() => setActiveTab("inventory")}
          className={`rounded-lg text-sm px-6 py-2.5 font-medium transition-all ${
            activeTab === "inventory"
              ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
              : "text-muted-foreground hover:bg-white/50 dark:hover:bg-card/50 hover:text-foreground"
          }`}
          size="sm"
        >
          資料異動紀錄
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center items-center py-16 min-h-[400px]">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin h-8 w-8 border-3 border-primary/30 border-t-primary rounded-full"></div>
            <p className="text-sm text-muted-foreground">載入紀錄中...</p>
          </div>
        </div>
      ) : (
        <div className="flex-1">
          {activeTab === "donations" ? (
            <DonationRecordsTable
              data={donationRecords}
              onSelectionChange={setSelectedDonations}
              onDelete={handleDeleteDonation}
            />
          ) : activeTab === "disbursements" ? (
            <DisbursementRecordsTable
              data={disbursementRecords}
              onSelectionChange={setSelectedDisbursements}
            />
          ) : (
            <InventoryLogsTable
              data={inventoryLogs}
              onSelectionChange={setSelectedInventoryLogs}
            />
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除</AlertDialogTitle>
            <AlertDialogDescription>
              確定要刪除此捐贈紀錄嗎？此操作無法復原。
              {recordToDelete && (
                <div className="mt-3 p-3 bg-muted rounded-md">
                  <p className="font-medium">流水號: {recordToDelete.serialNumber}</p>
                  <p className="text-sm">捐贈者: {recordToDelete.donor.name}</p>
                  <p className="text-sm">
                    物品: {recordToDelete.donationItems.map(item => item.itemName).join(', ')}
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              確認刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}