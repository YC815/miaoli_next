"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2, Package } from "lucide-react";
import { DonationRecordsTable } from "@/components/tables/DonationRecordsTable";
import { DisbursementRecordsTable } from "@/components/tables/DisbursementRecordsTable";
import { InventoryLogsTable } from "@/components/tables/InventoryLogsTable";
import { toast } from "sonner";
import type { DonationRecord } from "@/types/donation";
import type { DisbursementRecord } from "@/components/tables/DisbursementRecordsTable";
import type { InventoryLog } from "@/components/tables/InventoryLogsTable";

type TabType = "donations" | "disbursements" | "inventory";

interface ItemRecordsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemStockId: string | null;
  itemName: string | null;
}

interface DonationResponse {
  items: DonationRecord[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

interface DisbursementResponse {
  items: DisbursementRecord[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

interface InventoryResponse {
  items: InventoryLog[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export function ItemRecordsDialog({
  open,
  onOpenChange,
  itemStockId,
  itemName,
}: ItemRecordsDialogProps) {
  const [activeTab, setActiveTab] = React.useState<TabType>("donations");
  const [donationPage, setDonationPage] = React.useState(1);
  const [disbursementPage, setDisbursementPage] = React.useState(1);
  const [inventoryPage, setInventoryPage] = React.useState(1);

  const [donationData, setDonationData] =
    React.useState<DonationResponse | null>(null);
  const [disbursementData, setDisbursementData] =
    React.useState<DisbursementResponse | null>(null);
  const [inventoryData, setInventoryData] =
    React.useState<InventoryResponse | null>(null);

  const [donationsLoading, setDonationsLoading] = React.useState(false);
  const [disbursementsLoading, setDisbursementsLoading] = React.useState(false);
  const [inventoryLoading, setInventoryLoading] = React.useState(false);

  // Reset pages when dialog opens with new item
  React.useEffect(() => {
    if (open && itemStockId) {
      setDonationPage(1);
      setDisbursementPage(1);
      setInventoryPage(1);
    }
  }, [open, itemStockId]);

  // Fetch donations
  React.useEffect(() => {
    if (!open || !itemStockId || activeTab !== "donations") return;

    const controller = new AbortController();
    const loadDonations = async () => {
      setDonationsLoading(true);
      try {
        const params = new URLSearchParams({
          itemStockId,
          page: donationPage.toString(),
          pageSize: "25",
        });
        const response = await fetch(`/api/donations?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(response.statusText);
        const data: DonationResponse = await response.json();
        setDonationData(data);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Error fetching donation records:", error);
        toast.error("載入捐贈紀錄失敗");
      } finally {
        if (!controller.signal.aborted) {
          setDonationsLoading(false);
        }
      }
    };

    loadDonations();
    return () => controller.abort();
  }, [open, itemStockId, activeTab, donationPage]);

  // Fetch disbursements
  React.useEffect(() => {
    if (!open || !itemStockId || activeTab !== "disbursements") return;

    const controller = new AbortController();
    const loadDisbursements = async () => {
      setDisbursementsLoading(true);
      try {
        const params = new URLSearchParams({
          itemStockId,
          page: disbursementPage.toString(),
          pageSize: "25",
        });
        const response = await fetch(
          `/api/disbursements?${params.toString()}`,
          {
            signal: controller.signal,
          }
        );
        if (!response.ok) throw new Error(response.statusText);
        const data: DisbursementResponse = await response.json();
        setDisbursementData(data);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Error fetching disbursement records:", error);
        toast.error("載入發放紀錄失敗");
      } finally {
        if (!controller.signal.aborted) {
          setDisbursementsLoading(false);
        }
      }
    };

    loadDisbursements();
    return () => controller.abort();
  }, [open, itemStockId, activeTab, disbursementPage]);

  // Fetch inventory logs
  React.useEffect(() => {
    if (!open || !itemStockId || activeTab !== "inventory") return;

    const controller = new AbortController();
    const loadInventoryLogs = async () => {
      setInventoryLoading(true);
      try {
        const params = new URLSearchParams({
          itemStockId,
          page: inventoryPage.toString(),
          pageSize: "25",
        });
        const response = await fetch(
          `/api/inventory-logs?${params.toString()}`,
          {
            signal: controller.signal,
          }
        );
        if (!response.ok) throw new Error(response.statusText);
        const data: InventoryResponse = await response.json();
        setInventoryData(data);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Error fetching inventory logs:", error);
        toast.error("載入盤點紀錄失敗");
      } finally {
        if (!controller.signal.aborted) {
          setInventoryLoading(false);
        }
      }
    };

    loadInventoryLogs();
    return () => controller.abort();
  }, [open, itemStockId, activeTab, inventoryPage]);

  const isLoading =
    activeTab === "donations"
      ? donationsLoading
      : activeTab === "disbursements"
      ? disbursementsLoading
      : inventoryLoading;

  const currentPage =
    activeTab === "donations"
      ? donationPage
      : activeTab === "disbursements"
      ? disbursementPage
      : inventoryPage;

  const totalPages =
    activeTab === "donations"
      ? donationData?.totalPages ?? 1
      : activeTab === "disbursements"
      ? disbursementData?.totalPages ?? 1
      : inventoryData?.totalPages ?? 1;

  const totalCount =
    activeTab === "donations"
      ? donationData?.totalCount ?? 0
      : activeTab === "disbursements"
      ? disbursementData?.totalCount ?? 0
      : inventoryData?.totalCount ?? 0;

  const handlePageChange = (newPage: number) => {
    if (activeTab === "donations") {
      setDonationPage(newPage);
    } else if (activeTab === "disbursements") {
      setDisbursementPage(newPage);
    } else {
      setInventoryPage(newPage);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!w-[95vw] sm:!w-[90vw] md:!w-[80vw] lg:!w-[70vw] !max-w-none max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-gradient-to-br from-primary/20 to-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <span className="text-xl">{itemName} - 紀錄調取</span>
              <p className="text-sm font-normal text-muted-foreground">
                查看此物資的所有捐贈、發放及盤點紀錄
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex w-fit rounded-xl border bg-gradient-to-r from-muted/50 to-muted/30 p-1.5 shadow-sm">
          <TabButton
            isActive={activeTab === "donations"}
            label="捐贈紀錄"
            onClick={() => setActiveTab("donations")}
          />
          <TabButton
            isActive={activeTab === "disbursements"}
            label="發放紀錄"
            onClick={() => setActiveTab("disbursements")}
          />
          <TabButton
            isActive={activeTab === "inventory"}
            label="盤點紀錄"
            onClick={() => setActiveTab("inventory")}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 relative">
          {isLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/70 backdrop-blur-sm">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
          <div
            className={`h-full w-full overflow-x-auto overflow-y-auto ${
              isLoading ? "pointer-events-none opacity-60" : ""
            }`}
          >
            <div className="min-w-max">
              {activeTab === "donations" && (
                <DonationRecordsTable
                  key={`donation-${donationPage}`}
                  data={donationData?.items ?? []}
                  onSelectionChange={() => {}}
                  onDelete={() => {}}
                  onEdit={() => {}}
                />
              )}
              {activeTab === "disbursements" && (
                <DisbursementRecordsTable
                  key={`disbursement-${disbursementPage}`}
                  data={disbursementData?.items ?? []}
                  onSelectionChange={() => {}}
                  onDelete={() => {}}
                  onEdit={() => {}}
                />
              )}
              {activeTab === "inventory" && (
                <InventoryLogsTable
                  key={`inventory-${inventoryPage}`}
                  data={inventoryData?.items ?? []}
                  onSelectionChange={() => {}}
                  onDelete={() => {}}
                />
              )}
            </div>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
          <div>
            符合 {totalCount.toLocaleString()} 筆紀錄 · 第 {currentPage}/
            {totalPages} 頁
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={isLoading || currentPage <= 1}
              className="h-8 px-3"
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              上一頁
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={isLoading || currentPage >= totalPages}
              className="h-8 px-3"
            >
              下一頁
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const TabButton = ({
  isActive,
  label,
  onClick,
}: {
  isActive: boolean;
  label: string;
  onClick: () => void;
}) => (
  <Button
    variant={isActive ? "default" : "ghost"}
    onClick={onClick}
    className={`rounded-lg px-6 py-2.5 text-sm font-medium transition-all ${
      isActive
        ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
        : "text-muted-foreground hover:bg-white/50 hover:text-foreground dark:hover:bg-card/50"
    }`}
    size="sm"
  >
    {label}
  </Button>
);
