"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileDown,
  Filter,
  Loader2,
  Package,
  RefreshCw,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { DonationRecordsTable } from "@/components/tables/DonationRecordsTable";
import type { DonationRecord } from "@/types/donation";
import {
  DisbursementRecordsTable,
  DisbursementRecord,
} from "@/components/tables/DisbursementRecordsTable";
import {
  InventoryLogsTable,
  InventoryLog,
} from "@/components/tables/InventoryLogsTable";
import { EditDonationModal } from "@/components/modals/EditDonationModal";
import { EditDisbursementModal } from "@/components/modals/EditDisbursementModal";

type TabType = "donations" | "disbursements" | "inventory";

interface DonationResponse {
  items: DonationRecord[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  summary: {
    totalQuantity: number;
  };
}

interface DisbursementResponse {
  items: DisbursementRecord[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  summary: {
    totalQuantity: number;
  };
}

interface InventoryResponse {
  items: InventoryLog[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  summary: {
    totalIncrease: number;
    totalDecrease: number;
  };
}

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  isBusy?: boolean;
}

interface DonationFilters {
  search: string;
  startDate?: string;
  endDate?: string;
  categories: string[];
  itemType: "all" | "standard" | "custom";
  page: number;
  pageSize: number;
}

interface DisbursementFilters {
  search: string;
  startDate?: string;
  endDate?: string;
  categories: string[];
  page: number;
  pageSize: number;
}

interface InventoryFilters {
  search: string;
  startDate?: string;
  endDate?: string;
  categories: string[];
  changeType: "all" | "INCREASE" | "DECREASE";
  page: number;
  pageSize: number;
}

const arraysEqual = (a: string[], b: string[]) =>
  a.length === b.length && a.every((value, index) => value === b[index]);

const donationFiltersEqual = (a: DonationFilters, b: DonationFilters) =>
  a.search === b.search &&
  a.startDate === b.startDate &&
  a.endDate === b.endDate &&
  a.itemType === b.itemType &&
  a.page === b.page &&
  a.pageSize === b.pageSize &&
  arraysEqual(a.categories, b.categories);

const disbursementFiltersEqual = (
  a: DisbursementFilters,
  b: DisbursementFilters
) =>
  a.search === b.search &&
  a.startDate === b.startDate &&
  a.endDate === b.endDate &&
  a.page === b.page &&
  a.pageSize === b.pageSize &&
  arraysEqual(a.categories, b.categories);

const inventoryFiltersEqual = (a: InventoryFilters, b: InventoryFilters) =>
  a.search === b.search &&
  a.startDate === b.startDate &&
  a.endDate === b.endDate &&
  a.changeType === b.changeType &&
  a.page === b.page &&
  a.pageSize === b.pageSize &&
  arraysEqual(a.categories, b.categories);

const createDefaultDonationFilters = (): DonationFilters => ({
  search: "",
  categories: [],
  itemType: "all",
  page: 1,
  pageSize: 20,
});

const createDefaultDisbursementFilters = (): DisbursementFilters => ({
  search: "",
  categories: [],
  page: 1,
  pageSize: 20,
});

const createDefaultInventoryFilters = (): InventoryFilters => ({
  search: "",
  categories: [],
  changeType: "all",
  page: 1,
  pageSize: 20,
});

type DeletableRecord = (DonationRecord | DisbursementRecord | InventoryLog) & { recordType: TabType };

const RecordDetails = ({ record }: { record: DeletableRecord | null }) => {
  if (!record) return null;

  switch (record.recordType) {
    case "donations":
      const donation = record as DonationRecord;
      return (
        <>
          <p className="font-medium">流水號: {donation.serialNumber}</p>
          <p className="text-sm">捐贈者: {donation.donor ? donation.donor.name : "匿名"}</p>
          <p className="text-sm">
            物品:{" "}
            {donation.donationItems.map((item) => item.itemName).join(", ")}
          </p>
        </>
      );
    case "disbursements":
      const disbursement = record as DisbursementRecord;
      return (
        <>
          <p className="font-medium">流水號: {disbursement.serialNumber}</p>
          <p className="text-sm">受贈單位: {disbursement.recipientUnitName}</p>
          <p className="text-sm">
            物品:{" "}
            {disbursement.disbursementItems
              .map((item) => item.itemName)
              .join(", ")}
          </p>
        </>
      );
    case "inventory":
      const inventory = record as InventoryLog;
      return (
        <>
          <p className="font-medium">調整物資: {inventory.itemStock.itemName}</p>
          <p className="text-sm">
            調整類型:{" "}
            {inventory.changeType === "INCREASE" ? "增加" : "減少"}
          </p>
          <p className="text-sm">調整數量: {inventory.changeAmount}</p>
          <p className="text-sm">原因: {inventory.reason}</p>
        </>
      );
    default:
      return null;
  }
};

export function RecordsView() {
  const [activeTab, setActiveTab] = React.useState<TabType>("donations");

  const [categories, setCategories] = React.useState<string[]>([]);

  const [donationFilters, setDonationFilters] = React.useState<DonationFilters>(
    () => createDefaultDonationFilters()
  );
  const [disbursementFilters, setDisbursementFilters] =
    React.useState<DisbursementFilters>(() =>
      createDefaultDisbursementFilters()
    );
  const [inventoryFilters, setInventoryFilters] =
    React.useState<InventoryFilters>(() => createDefaultInventoryFilters());

  const [donationData, setDonationData] =
    React.useState<DonationResponse | null>(null);
  const [disbursementData, setDisbursementData] =
    React.useState<DisbursementResponse | null>(null);
  const [inventoryData, setInventoryData] =
    React.useState<InventoryResponse | null>(null);

  // Stable empty arrays to prevent infinite re-renders
  const emptyDonationItems = React.useMemo(() => [], []);
  const emptyDisbursementItems = React.useMemo(() => [], []);
  const emptyInventoryItems = React.useMemo(() => [], []);

  const [donationsLoading, setDonationsLoading] = React.useState(false);
  const [disbursementsLoading, setDisbursementsLoading] = React.useState(false);
  const [inventoryLoading, setInventoryLoading] = React.useState(false);

  const [donationsRefreshKey, setDonationsRefreshKey] = React.useState(0);
  const [disbursementsRefreshKey, setDisbursementsRefreshKey] = React.useState(0);
  const [inventoryRefreshKey, setInventoryRefreshKey] = React.useState(0);

  const updateDonationFilters = React.useCallback(
    (action: React.SetStateAction<DonationFilters>) => {
      setDonationFilters((previous) => {
        const next =
          typeof action === "function"
            ? (action as (prev: DonationFilters) => DonationFilters)(previous)
            : action;
        return donationFiltersEqual(previous, next) ? previous : next;
      });
    },
    []
  );

  const updateDisbursementFilters = React.useCallback(
    (action: React.SetStateAction<DisbursementFilters>) => {
      setDisbursementFilters((previous) => {
        const next =
          typeof action === "function"
            ? (action as (prev: DisbursementFilters) => DisbursementFilters)(
                previous
              )
            : action;
        return disbursementFiltersEqual(previous, next) ? previous : next;
      });
    },
    []
  );

  const updateInventoryFilters = React.useCallback(
    (action: React.SetStateAction<InventoryFilters>) => {
      setInventoryFilters((previous) => {
        const next =
          typeof action === "function"
            ? (action as (prev: InventoryFilters) => InventoryFilters)(previous)
            : action;
        return inventoryFiltersEqual(previous, next) ? previous : next;
      });
    },
    []
  );

  const [selectedDonations, setSelectedDonations] = React.useState<
    DonationRecord[]
  >([]);
  const [selectedDisbursements, setSelectedDisbursements] = React.useState<
    DisbursementRecord[]
  >([]);
  const [selectedInventoryLogs, setSelectedInventoryLogs] = React.useState<
    InventoryLog[]
  >([]);

  const [recordToDelete, setRecordToDelete] =
    React.useState<DeletableRecord | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

  const [donationToEdit, setDonationToEdit] = React.useState<DonationRecord | null>(null);
  const [isEditDonationModalOpen, setIsEditDonationModalOpen] = React.useState(false);

  const [disbursementToEdit, setDisbursementToEdit] = React.useState<DisbursementRecord | null>(null);
  const [isEditDisbursementModalOpen, setIsEditDisbursementModalOpen] = React.useState(false);

  React.useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch("/api/categories");
        if (!response.ok) {
          throw new Error(response.statusText);
        }
        const data = await response.json();
        if (Array.isArray(data)) {
          setCategories(
            data
              .map((category) => category.name as string)
              .filter(Boolean)
              .sort((a, b) => a.localeCompare(b, "zh-TW"))
          );
        }
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      }
    };

    fetchCategories();
  }, []);

  React.useEffect(() => {
    if (activeTab !== "donations") return;

    const controller = new AbortController();
    const loadDonations = async () => {
      setDonationsLoading(true);
      try {
        const params = buildDonationQueryParams(donationFilters);
        const response = await fetch(`/api/donations?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(response.statusText);
        }
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
  }, [activeTab, donationFilters, donationsRefreshKey]);

  React.useEffect(() => {
    if (activeTab !== "disbursements") return;

    const controller = new AbortController();
    const loadDisbursements = async () => {
      setDisbursementsLoading(true);
      try {
        const params = buildDisbursementQueryParams(disbursementFilters);
        const response = await fetch(
          `/api/disbursements?${params.toString()}`,
          {
            signal: controller.signal,
          }
        );
        if (!response.ok) {
          throw new Error(response.statusText);
        }
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
  }, [activeTab, disbursementFilters, disbursementsRefreshKey]);

  React.useEffect(() => {
    if (activeTab !== "inventory") return;

    const controller = new AbortController();
    const loadInventoryLogs = async () => {
      setInventoryLoading(true);
      try {
        const params = buildInventoryQueryParams(inventoryFilters);
        const response = await fetch(
          `/api/inventory-logs?${params.toString()}`,
          {
            signal: controller.signal,
          }
        );
        if (!response.ok) {
          throw new Error(response.statusText);
        }
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
  }, [activeTab, inventoryFilters, inventoryRefreshKey]);

  React.useEffect(() => {
    setSelectedDonations([]);
  }, [donationData?.items]);

  React.useEffect(() => {
    setSelectedDisbursements([]);
  }, [disbursementData?.items]);

  React.useEffect(() => {
    setSelectedInventoryLogs([]);
  }, [inventoryData?.items]);



  const selectedCount =
    activeTab === "donations"
      ? selectedDonations.length
      : activeTab === "disbursements"
      ? selectedDisbursements.length
      : selectedInventoryLogs.length;

  const handleExport = () => {
    if (activeTab === "donations") {
      handleExportDonations(selectedDonations);
    } else if (activeTab === "disbursements") {
      handleExportDisbursements(selectedDisbursements);
    } else {
      handleExportInventoryLogs(selectedInventoryLogs);
    }
  };

  const handleDeleteRecord = (
    record: DonationRecord | DisbursementRecord | InventoryLog,
    type: TabType
  ) => {
    setRecordToDelete({ ...record, recordType: type });
    setIsDeleteDialogOpen(true);
  };

  const handleEditDonation = (record: DonationRecord) => {
    setDonationToEdit(record);
    setIsEditDonationModalOpen(true);
  };

  const handleEditDisbursement = (record: DisbursementRecord) => {
    setDisbursementToEdit(record);
    setIsEditDisbursementModalOpen(true);
  };

  const handleEditSuccess = () => {
    // Refresh the appropriate list based on active tab
    if (activeTab === "donations") {
      setDonationsRefreshKey((key) => key + 1);
    } else if (activeTab === "disbursements") {
      setDisbursementsRefreshKey((key) => key + 1);
    }
  };

  const confirmDelete = async () => {
    if (!recordToDelete) return;

    const { recordType, id } = recordToDelete;
    const endpointMap: Record<TabType, string> = {
      donations: `/api/donations/${id}`,
      disbursements: `/api/disbursements/${id}`,
      inventory: `/api/inventory-logs/${id}`,
    };

    const successMessages: Record<TabType, string> = {
      donations: "捐贈紀錄已刪除",
      disbursements: "發放紀錄已刪除",
      inventory: "盤點紀錄已刪除",
    };

    try {
      const response = await fetch(endpointMap[recordType], {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success(successMessages[recordType]);
        setIsDeleteDialogOpen(false);
        setRecordToDelete(null);

        switch (recordType) {
          case "donations":
            updateDonationFilters((previous) => {
              if (
                donationData &&
                previous.page > 1 &&
                (donationData.items?.length ?? 0) <= 1
              ) {
                return { ...previous, page: previous.page - 1 };
              }
              return previous;
            });
            setDonationsRefreshKey((key) => key + 1);
            break;
          case "disbursements":
            updateDisbursementFilters((previous) => {
              if (
                disbursementData &&
                previous.page > 1 &&
                (disbursementData.items?.length ?? 0) <= 1
              ) {
                return { ...previous, page: previous.page - 1 };
              }
              return previous;
            });
            setDisbursementsRefreshKey((key) => key + 1);
            break;
          case "inventory":
            updateInventoryFilters((previous) => {
              if (
                inventoryData &&
                previous.page > 1 &&
                (inventoryData.items?.length ?? 0) <= 1
              ) {
                return { ...previous, page: previous.page - 1 };
              }
              return previous;
            });
            setInventoryRefreshKey((key) => key + 1);
            break;
        }
      } else {
        const errorData = await response.json();
        toast.error(`刪除失敗: ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      console.error(`Error deleting ${recordType} record:`, error);
      toast.error("刪除失敗");
    }
  };

  const isLoading =
    activeTab === "donations"
      ? donationsLoading
      : activeTab === "disbursements"
      ? disbursementsLoading
      : inventoryLoading;

  return (
    <div className="flex flex-col flex-1 space-y-8">
      <RecordsViewHeader
        selectedCount={selectedCount}
        onExport={handleExport}
      />

      <RecordTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex-1 space-y-6">
        {activeTab === "donations" && (
          <div className="space-y-4">
            <DonationFiltersSection
              filters={donationFilters}
              categories={categories}
              onChange={updateDonationFilters}
              onReset={() =>
                updateDonationFilters(() => createDefaultDonationFilters())
              }
            />



            <DataSection isLoading={isLoading}>
              <DonationRecordsTable
                key={`donation-${donationData?.page ?? 1}`}
                data={donationData?.items ?? emptyDonationItems}
                onSelectionChange={setSelectedDonations}
                onEdit={handleEditDonation}
                onDelete={(record) => handleDeleteRecord(record, "donations")}
              />
            </DataSection>

            <PaginationControls
              page={donationData?.page ?? donationFilters.page}
              totalPages={donationData?.totalPages ?? 1}
              totalCount={donationData?.totalCount ?? 0}
              onPageChange={(page) =>
                updateDonationFilters((previous) =>
                  previous.page === page ? previous : { ...previous, page }
                )
              }
              isBusy={isLoading}
            />
          </div>
        )}

        {activeTab === "disbursements" && (
          <div className="space-y-4">
            <DisbursementFiltersSection
              filters={disbursementFilters}
              categories={categories}
              onChange={updateDisbursementFilters}
              onReset={() =>
                updateDisbursementFilters(() =>
                  createDefaultDisbursementFilters()
                )
              }
            />



            <DataSection isLoading={isLoading}>
              <DisbursementRecordsTable
                key={`disbursement-${disbursementData?.page ?? 1}`}
                data={disbursementData?.items ?? emptyDisbursementItems}
                onSelectionChange={setSelectedDisbursements}
                onEdit={handleEditDisbursement}
                onDelete={(record) => handleDeleteRecord(record, "disbursements")}
              />
            </DataSection>

            <PaginationControls
              page={disbursementData?.page ?? disbursementFilters.page}
              totalPages={disbursementData?.totalPages ?? 1}
              totalCount={disbursementData?.totalCount ?? 0}
              onPageChange={(page) =>
                updateDisbursementFilters((previous) =>
                  previous.page === page ? previous : { ...previous, page }
                )
              }
              isBusy={isLoading}
            />
          </div>
        )}

        {activeTab === "inventory" && (
          <div className="space-y-4">
            <InventoryFiltersSection
              filters={inventoryFilters}
              categories={categories}
              onChange={updateInventoryFilters}
              onReset={() =>
                updateInventoryFilters(() => createDefaultInventoryFilters())
              }
            />



            <DataSection isLoading={isLoading}>
              <InventoryLogsTable
                key={`inventory-${inventoryData?.page ?? 1}`}
                data={inventoryData?.items ?? emptyInventoryItems}
                onSelectionChange={setSelectedInventoryLogs}
                onDelete={(record) => handleDeleteRecord(record, "inventory")}
              />
            </DataSection>

            <PaginationControls
              page={inventoryData?.page ?? inventoryFilters.page}
              totalPages={inventoryData?.totalPages ?? 1}
              totalCount={inventoryData?.totalCount ?? 0}
              onPageChange={(page) =>
                updateInventoryFilters((previous) =>
                  previous.page === page ? previous : { ...previous, page }
                )
              }
              isBusy={isLoading}
            />
          </div>
        )}
      </div>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p>確定要刪除此筆紀錄嗎？此操作將同步更新庫存，且無法復原。</p>
                <div className="mt-3 space-y-1 rounded-md bg-muted p-3 text-sm text-foreground">
                  <RecordDetails record={recordToDelete} />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              確認刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditDonationModal
        open={isEditDonationModalOpen}
        onOpenChange={setIsEditDonationModalOpen}
        record={donationToEdit}
        onSuccess={handleEditSuccess}
      />

      <EditDisbursementModal
        open={isEditDisbursementModalOpen}
        onOpenChange={setIsEditDisbursementModalOpen}
        record={disbursementToEdit}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
}

const RecordsViewHeader = ({
  selectedCount,
  onExport,
}: {
  selectedCount: number;
  onExport: () => void;
}) => {
  return (
    <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
      <div className="flex items-center space-x-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-gradient-to-br from-primary/20 to-primary/10">
          <Package className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">紀錄調取</h1>
          <p className="text-sm text-muted-foreground">
            查看和匯出物資捐贈、發放及盤點紀錄
          </p>
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={onExport}
        disabled={selectedCount === 0}
        className="h-9 border-primary/20 px-4 hover:bg-primary/5 disabled:opacity-50"
      >
        <FileDown className="mr-2 h-4 w-4" />
        匯出Excel
        {selectedCount > 0 && (
          <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {selectedCount}
          </span>
        )}
      </Button>
    </div>
  );
};

const RecordTabs = ({
  activeTab,
  onTabChange,
}: {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}) => {
  return (
    <div className="flex w-fit rounded-xl border bg-gradient-to-r from-muted/50 to-muted/30 p-1.5 shadow-sm">
      <TabButton
        isActive={activeTab === "donations"}
        label="物資捐贈紀錄"
        onClick={() => onTabChange("donations")}
      />
      <TabButton
        isActive={activeTab === "disbursements"}
        label="物資發放紀錄"
        onClick={() => onTabChange("disbursements")}
      />
      <TabButton
        isActive={activeTab === "inventory"}
        label="盤點紀錄"
        onClick={() => onTabChange("inventory")}
      />
    </div>
  );
};

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

const ItemTypeSelect = ({
  value,
  onChange,
}: {
  value: DonationFilters["itemType"];
  onChange: (value: DonationFilters["itemType"]) => void;
}) => {
  // 在 render 期計算安全值，確保永遠受控
  const safeValue: DonationFilters["itemType"] =
    value === "all" || value === "standard" || value === "custom"
      ? value
      : "all";

  const handleChange = React.useCallback(
    (v: string) => {
      if (v !== value) onChange(v as DonationFilters["itemType"]);
    },
    [onChange, value]
  );

  return (
    <Select value={safeValue} onValueChange={handleChange}>
      <SelectTrigger className="h-9 w-[140px]">
        <SelectValue placeholder="選擇品項類型" />
      </SelectTrigger>
      <SelectContent align="start">
        <SelectItem value="all">全部品項</SelectItem>
        <SelectItem value="standard">標準品項</SelectItem>
        <SelectItem value="custom">自訂品項</SelectItem>
      </SelectContent>
    </Select>
  );
};

const DonationFiltersSection = ({
  filters,
  categories,
  onChange,
  onReset,
}: {
  filters: DonationFilters;
  categories: string[];
  onChange: React.Dispatch<React.SetStateAction<DonationFilters>>;
  onReset: () => void;
}) => {
  const handleCategoryToggle = (category: string) => {
    onChange((previous) => ({
      ...previous,
      page: 1,
      categories: toggleValue(previous.categories, category),
    }));
  };

  const handleItemTypeChange = React.useCallback(
    (v: DonationFilters["itemType"]) =>
      onChange((prev) =>
        prev.itemType === v ? prev : { ...prev, itemType: v, page: 1 }
      ),
    [onChange]
  );

  const hasActiveFilters =
    !!filters.search ||
    !!filters.startDate ||
    !!filters.endDate ||
    filters.categories.length > 0 ||
    filters.itemType !== "all";

  return (
    <FilterContainer>
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end lg:gap-4">
        <SearchInput
          placeholder="搜尋捐贈者、流水號、物資名稱..."
          value={filters.search}
          onChange={(value) =>
            onChange((previous) => ({ ...previous, search: value, page: 1 }))
          }
        />

        <DateRangeInputs
          startDate={filters.startDate}
          endDate={filters.endDate}
          onStartDateChange={(value) =>
            onChange((previous) => ({
              ...previous,
              startDate: value || undefined,
              page: 1,
            }))
          }
          onEndDateChange={(value) =>
            onChange((previous) => ({
              ...previous,
              endDate: value || undefined,
              page: 1,
            }))
          }
        />

        <CategoryDropdown
          categories={categories}
          selected={filters.categories}
          onToggle={handleCategoryToggle}
        />

        <ItemTypeSelect
          value={filters.itemType}
          onChange={handleItemTypeChange}
        />

        <PageSizeSelect
          value={filters.pageSize}
          onChange={(pageSize) =>
            onChange((previous) => ({
              ...previous,
              pageSize,
              page: 1,
            }))
          }
        />

        <ResetFiltersButton
          hasActiveFilters={hasActiveFilters}
          onReset={onReset}
        />
      </div>

      <ActiveFilterChips
        categories={filters.categories}
        itemType={filters.itemType}
        onRemoveCategory={(category) => handleCategoryToggle(category)}
        onClearItemType={() =>
          onChange((previous) => ({ ...previous, itemType: "all", page: 1 }))
        }
      />
    </FilterContainer>
  );
};

const DisbursementFiltersSection = ({
  filters,
  categories,
  onChange,
  onReset,
}: {
  filters: DisbursementFilters;
  categories: string[];
  onChange: React.Dispatch<React.SetStateAction<DisbursementFilters>>;
  onReset: () => void;
}) => {
  const handleCategoryToggle = (category: string) => {
    onChange((previous) => ({
      ...previous,
      page: 1,
      categories: toggleValue(previous.categories, category),
    }));
  };

  const hasActiveFilters =
    !!filters.search ||
    !!filters.startDate ||
    !!filters.endDate ||
    filters.categories.length > 0;

  return (
    <FilterContainer>
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end lg:gap-4">
        <SearchInput
          placeholder="搜尋受贈單位、流水號或用途..."
          value={filters.search}
          onChange={(value) =>
            onChange((previous) => ({ ...previous, search: value, page: 1 }))
          }
        />

        <DateRangeInputs
          startDate={filters.startDate}
          endDate={filters.endDate}
          onStartDateChange={(value) =>
            onChange((previous) => ({
              ...previous,
              startDate: value || undefined,
              page: 1,
            }))
          }
          onEndDateChange={(value) =>
            onChange((previous) => ({
              ...previous,
              endDate: value || undefined,
              page: 1,
            }))
          }
        />

        <CategoryDropdown
          categories={categories}
          selected={filters.categories}
          onToggle={handleCategoryToggle}
        />

        <PageSizeSelect
          value={filters.pageSize}
          onChange={(pageSize) =>
            onChange((previous) => ({
              ...previous,
              pageSize,
              page: 1,
            }))
          }
        />

        <ResetFiltersButton
          hasActiveFilters={hasActiveFilters}
          onReset={onReset}
        />
      </div>

      <ActiveFilterChips
        categories={filters.categories}
        onRemoveCategory={(category) => handleCategoryToggle(category)}
      />
    </FilterContainer>
  );
};

const InventoryFiltersSection = ({
  filters,
  categories,
  onChange,
  onReset,
}: {
  filters: InventoryFilters;
  categories: string[];
  onChange: React.Dispatch<React.SetStateAction<InventoryFilters>>;
  onReset: () => void;
}) => {
  const handleCategoryToggle = (category: string) => {
    onChange((previous) => ({
      ...previous,
      page: 1,
      categories: toggleValue(previous.categories, category),
    }));
  };

  const hasActiveFilters =
    !!filters.search ||
    !!filters.startDate ||
    !!filters.endDate ||
    filters.categories.length > 0 ||
    filters.changeType !== "all";

  return (
    <FilterContainer>
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end lg:gap-4">
        <SearchInput
          placeholder="搜尋物資名稱、操作人員或原因..."
          value={filters.search}
          onChange={(value) =>
            onChange((previous) => ({ ...previous, search: value, page: 1 }))
          }
        />

        <DateRangeInputs
          startDate={filters.startDate}
          endDate={filters.endDate}
          onStartDateChange={(value) =>
            onChange((previous) => ({
              ...previous,
              startDate: value || undefined,
              page: 1,
            }))
          }
          onEndDateChange={(value) =>
            onChange((previous) => ({
              ...previous,
              endDate: value || undefined,
              page: 1,
            }))
          }
        />

        <CategoryDropdown
          categories={categories}
          selected={filters.categories}
          onToggle={handleCategoryToggle}
        />

        <Select
          value={filters.changeType}
          onValueChange={(value: string) =>
            onChange((previous) => ({
              ...previous,
              changeType: value as InventoryFilters["changeType"],
              page: 1,
            }))
          }
        >
          <SelectTrigger className="h-9 w-[140px]">
            <SelectValue placeholder="調整類型" />
          </SelectTrigger>
          <SelectContent align="start">
            <SelectItem value="all">全部調整</SelectItem>
            <SelectItem value="INCREASE">增加</SelectItem>
            <SelectItem value="DECREASE">減少</SelectItem>
          </SelectContent>
        </Select>

        <PageSizeSelect
          value={filters.pageSize}
          onChange={(pageSize) =>
            onChange((previous) => ({
              ...previous,
              pageSize,
              page: 1,
            }))
          }
        />

        <ResetFiltersButton
          hasActiveFilters={hasActiveFilters}
          onReset={onReset}
        />
      </div>

      <ActiveFilterChips
        categories={filters.categories}
        changeType={filters.changeType}
        onRemoveCategory={(category) => handleCategoryToggle(category)}
        onClearChangeType={() =>
          onChange((previous) => ({ ...previous, changeType: "all", page: 1 }))
        }
      />
    </FilterContainer>
  );
};

const FilterContainer = ({ children }: { children: React.ReactNode }) => (
  <div className="space-y-3 rounded-xl border bg-card/60 p-4 shadow-sm">
    {children}
  </div>
);

const SearchInput = ({
  placeholder,
  value,
  onChange,
}: {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) => (
  <div className="relative flex-1 min-w-[220px] lg:min-w-[260px]">
    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    <Input
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-9 w-full pl-10"
    />
  </div>
);

const DateRangeInputs = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: {
  startDate?: string;
  endDate?: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
}) => (
  <div className="flex flex-1 flex-wrap items-center gap-2 lg:flex-none">
    <div className="flex items-center gap-2">
      <Calendar className="hidden h-4 w-4 text-muted-foreground md:inline" />
      <Input
        type="date"
        value={startDate ?? ""}
        onChange={(event) => onStartDateChange(event.target.value)}
        className="h-9 w-[150px]"
      />
      <span className="text-sm text-muted-foreground">至</span>
      <Input
        type="date"
        value={endDate ?? ""}
        onChange={(event) => onEndDateChange(event.target.value)}
        className="h-9 w-[150px]"
      />
    </div>
  </div>
);

const CategoryDropdown = ({
  categories,
  selected,
  onToggle,
}: {
  categories: string[];
  selected: string[];
  onToggle: (category: string) => void;
}) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button
        variant={selected.length ? "default" : "outline"}
        size="sm"
        className="h-9 min-w-[120px] justify-start gap-2"
      >
        <Filter className="h-4 w-4" />
        類別
        {selected.length > 0 && ` (${selected.length})`}
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent className="w-60">
      <DropdownMenuLabel>選擇物資類別</DropdownMenuLabel>
      <DropdownMenuSeparator />
      {categories.length === 0 ? (
        <DropdownMenuCheckboxItem disabled>
          暫無類別資料
        </DropdownMenuCheckboxItem>
      ) : (
        categories.map((category) => (
          <DropdownMenuCheckboxItem
            key={category}
            checked={selected.includes(category)}
            onCheckedChange={() => onToggle(category)}
          >
            {category}
          </DropdownMenuCheckboxItem>
        ))
      )}
    </DropdownMenuContent>
  </DropdownMenu>
);

const PageSizeSelect = ({
  value,
  onChange,
}: {
  value: number;
  onChange: (pageSize: number) => void;
}) => (
  <Select
    value={value.toString()}
    onValueChange={(selected) => onChange(Number.parseInt(selected, 10))}
  >
    <SelectTrigger className="h-9 w-[120px]">
      <SelectValue />
    </SelectTrigger>
    <SelectContent align="start">
      <SelectItem value="20">每頁 20 筆</SelectItem>
      <SelectItem value="50">每頁 50 筆</SelectItem>
      <SelectItem value="100">每頁 100 筆</SelectItem>
    </SelectContent>
  </Select>
);

const ResetFiltersButton = ({
  hasActiveFilters,
  onReset,
}: {
  hasActiveFilters: boolean;
  onReset: () => void;
}) => (
  <Button
    variant="ghost"
    size="sm"
    className="h-9 text-muted-foreground hover:text-foreground"
    onClick={onReset}
    disabled={!hasActiveFilters}
  >
    <RefreshCw className="mr-2 h-4 w-4" />
    重設
  </Button>
);

const ActiveFilterChips = ({
  categories,
  itemType,
  changeType,
  onRemoveCategory,
  onClearItemType,
  onClearChangeType,
}: {
  categories: string[];
  itemType?: DonationFilters["itemType"];
  changeType?: InventoryFilters["changeType"];
  onRemoveCategory: (category: string) => void;
  onClearItemType?: () => void;
  onClearChangeType?: () => void;
}) => {
  if (
    categories.length === 0 &&
    (!itemType || itemType === "all") &&
    (!changeType || changeType === "all")
  ) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {categories.map((category) => (
        <Badge
          key={`category-${category}`}
          variant="secondary"
          className="flex items-center gap-2"
        >
          {category}
          <button
            type="button"
            aria-label={`移除類別 ${category}`}
            className="rounded-full p-0.5 hover:bg-muted/80 transition-colors"
            onClick={() => onRemoveCategory(category)}
          >
            ×
          </button>
        </Badge>
      ))}
      {itemType && itemType !== "all" && onClearItemType ? (
        <Badge variant="outline" className="flex items-center gap-2">
          {itemType === "standard" ? "標準品項" : "自訂品項"}
          <button
            type="button"
            aria-label="移除品項類型篩選"
            className="rounded-full p-0.5 hover:bg-muted transition-colors"
            onClick={onClearItemType}
          >
            ×
          </button>
        </Badge>
      ) : null}
      {changeType && changeType !== "all" && onClearChangeType ? (
        <Badge variant="secondary" className="flex items-center gap-2">
          {changeType === "INCREASE" ? "只看增加" : "只看減少"}
          <button
            type="button"
            aria-label="移除調整類型"
            className="rounded-full p-0.5 hover:bg-muted transition-colors"
            onClick={onClearChangeType}
          >
            ×
          </button>
        </Badge>
      ) : null}
    </div>
  );
};

const DataSection = ({
  isLoading,
  children,
}: {
  isLoading: boolean;
  children: React.ReactNode;
}) => (
  <div className="relative">
    {isLoading && (
      <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/70 backdrop-blur-sm">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )}
    <div className={isLoading ? "pointer-events-none opacity-60" : undefined}>
      {children}
    </div>
  </div>
);



const PaginationControls = ({
  page,
  totalPages,
  totalCount,
  onPageChange,
  isBusy,
}: PaginationControlsProps) => {
  const currentPage = Math.max(page, 1);
  const maxPages = Math.max(totalPages, 1);

  return (
    <div className="flex flex-col items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm md:flex-row">
      <div>
        符合 {totalCount.toLocaleString()} 筆紀錄 · 第 {currentPage}/{maxPages}{" "}
        頁
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={isBusy || currentPage <= 1}
          className="h-8 px-3"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          上一頁
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={isBusy || currentPage >= maxPages}
          className="h-8 px-3"
        >
          下一頁
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

const toggleValue = (list: string[], value: string) =>
  list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];

const formatDateTime = (dateString: string) =>
  new Date(dateString).toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const handleExportDonations = (records: DonationRecord[]) => {
  if (records.length === 0) {
    toast.error("請先勾選要匯出的捐贈紀錄");
    return;
  }

  const exportData = records.flatMap((record) =>
    record.donationItems.map((item, index) => ({
      捐贈日期: index === 0 ? formatDateTime(record.createdAt) : "",
      流水號: index === 0 ? record.serialNumber : "",
      物資名稱: item.itemName,
      數量: `${item.quantity} ${item.itemUnit}`,
      備註: item.notes ?? "",
      捐贈者: index === 0 ? (record.donor ? record.donor.name : "匿名") : "",
      聯絡電話: index === 0 ? (record.donor ? record.donor.phone ?? "" : "") : "",
      地址: index === 0 ? (record.donor ? record.donor.address ?? "" : "") : "",
      操作者: index === 0 ? record.user.nickname ?? "" : "",
    }))
  );

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "捐贈紀錄");

  const now = new Date();
  const filename = `捐贈紀錄_${now.getFullYear()}${`${
    now.getMonth() + 1
  }`.padStart(2, "0")}${`${now.getDate()}`.padStart(2, "0")}.xlsx`;

  XLSX.writeFile(wb, filename);
  toast.success(`已匯出 ${records.length} 筆捐贈紀錄`);
};

const handleExportDisbursements = (records: DisbursementRecord[]) => {
  if (records.length === 0) {
    toast.error("請先勾選要匯出的發放紀錄");
    return;
  }

  const exportData = records.map((record) => ({
    發放日期: formatDateTime(record.createdAt),
    流水號: record.serialNumber,
    物資名稱: record.disbursementItems
      .map((item) => `${item.itemName} x ${item.quantity} ${item.itemUnit}`)
      .join("\n"),
    受贈單位: record.recipientUnitName,
    聯絡電話: record.recipientPhone ?? "",
    用途: record.purpose ?? "",
    操作者: record.user.nickname ?? "",
  }));

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "發放紀錄");

  const now = new Date();
  const filename = `發放紀錄_${now.getFullYear()}${`${
    now.getMonth() + 1
  }`.padStart(2, "0")}${`${now.getDate()}`.padStart(2, "0")}.xlsx`;

  XLSX.writeFile(wb, filename);
  toast.success(`已匯出 ${records.length} 筆發放紀錄`);
};

const handleExportInventoryLogs = (records: InventoryLog[]) => {
  if (records.length === 0) {
    toast.error("請先勾選要匯出的盤點紀錄");
    return;
  }

  const exportData = records.map((record) => ({
    盤點時間: formatDateTime(record.createdAt),
    物資名稱: record.itemStock.itemName,
    物資類別: record.itemStock.itemCategory,
    盤點調整: record.changeType === "INCREASE" ? "增加" : "減少",
    調整數量: record.changeAmount,
    盤點前數量: record.previousQuantity,
    盤點後數量: record.newQuantity,
    單位: record.itemStock.itemUnit,
    盤點原因: record.reason,
    操作人員: record.user.nickname ?? record.user.email.split("@")[0],
  }));

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "盤點紀錄");

  const now = new Date();
  const filename = `盤點紀錄_${now.getFullYear()}${`${
    now.getMonth() + 1
  }`.padStart(2, "0")}${`${now.getDate()}`.padStart(2, "0")}.xlsx`;

  XLSX.writeFile(wb, filename);
  toast.success(`已匯出 ${records.length} 筆盤點紀錄`);
};

const buildDonationQueryParams = (filters: DonationFilters) => {
  const params = new URLSearchParams();
  params.set("page", filters.page.toString());
  params.set("pageSize", filters.pageSize.toString());

  if (filters.search) {
    params.set("search", filters.search);
  }
  if (filters.startDate) {
    params.set("startDate", filters.startDate);
  }
  if (filters.endDate) {
    params.set("endDate", filters.endDate);
  }
  filters.categories.forEach((category) => params.append("category", category));
  if (filters.itemType !== "all") {
    params.append("itemType", filters.itemType);
  }

  return params;
};

const buildDisbursementQueryParams = (filters: DisbursementFilters) => {
  const params = new URLSearchParams();
  params.set("page", filters.page.toString());
  params.set("pageSize", filters.pageSize.toString());

  if (filters.search) {
    params.set("search", filters.search);
  }
  if (filters.startDate) {
    params.set("startDate", filters.startDate);
  }
  if (filters.endDate) {
    params.set("endDate", filters.endDate);
  }
  filters.categories.forEach((category) => params.append("category", category));

  return params;
};

const buildInventoryQueryParams = (filters: InventoryFilters) => {
  const params = new URLSearchParams();
  params.set("page", filters.page.toString());
  params.set("pageSize", filters.pageSize.toString());

  if (filters.search) {
    params.set("search", filters.search);
  }
  if (filters.startDate) {
    params.set("startDate", filters.startDate);
  }
  if (filters.endDate) {
    params.set("endDate", filters.endDate);
  }
  filters.categories.forEach((category) => params.append("category", category));
  if (filters.changeType !== "all") {
    params.set("changeType", filters.changeType);
  }

  return params;
};
