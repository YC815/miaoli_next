"use client";

/* eslint-disable @next/next/no-img-element */

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MultiStepWizard,
  WizardStep,
} from "@/components/ui/multi-step-wizard";
import { toast } from "sonner";
import { Plus, Search, Trash2, Upload } from "lucide-react";
import { DonationRecord } from "@/types/donation";
import {
  ReceiptDraft,
  ReceiptDraftSubmission,
  ReceiptItemDraft,
  ReceiptSealAsset,
  ReceiptSealCategory,
} from "@/types/receipt";
import { SealCropperDialog } from "@/components/receipt/SealCropperDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ReceiptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFinalize: (draft: ReceiptDraftSubmission) => void;
}

interface DonorOption {
  id: string;
  name: string;
  phone?: string | null;
  address?: string | null;
}

interface SealCropState {
  open: boolean;
  imageSrc?: string;
  category?: ReceiptSealCategory;
}

type RecordFilters = {
  search: string;
  donorId: string;
};

const ALL_DONORS_OPTION = "ALL";
const SEAL_CATEGORIES: ReceiptSealCategory[] = ["ORG", "CHAIRMAN", "HANDLER"];
const SEAL_LABELS: Record<ReceiptSealCategory, string> = {
  ORG: "機構印章",
  CHAIRMAN: "理事長印章",
  HANDLER: "經手人印章",
};

interface SealOptionSelectorProps {
  category: ReceiptSealCategory;
  assets: ReceiptSealAsset[];
  onSelect: (selection: {
    sealId?: string;
    name?: string;
    imageUrl?: string;
    imageDataUrl?: string;
  }) => void;
}

const SealOptionSelector: React.FC<SealOptionSelectorProps> = ({
  category,
  assets,
  onSelect,
}) => {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const filteredAssets = React.useMemo(
    () =>
      assets.filter((asset) =>
        asset.nickname.toLowerCase().includes(search.toLowerCase())
      ),
    [assets, search]
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          切換印章
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72">
        <div className="px-2 py-2">
          <Input
            placeholder={`搜尋${SEAL_LABELS[category]}`}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => event.stopPropagation()}
          />
        </div>
        {filteredAssets.length === 0 && (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            沒有符合條件的印章
          </div>
        )}
        {filteredAssets.map((asset) => (
          <DropdownMenuItem
            key={asset.id}
            onSelect={() => {
              onSelect({
                sealId: asset.id,
                name: asset.nickname,
                imageUrl: asset.imageUrl,
              });
            }}
            className="flex items-center gap-3"
          >
            <img
              src={asset.imageUrl}
              alt={asset.nickname}
              className="h-10 w-10 rounded border object-contain"
            />
            <div className="flex flex-col">
              <span className="text-sm font-medium">{asset.nickname}</span>
              {asset.updatedAt && (
                <span className="text-xs text-muted-foreground">
                  更新：{new Date(asset.updatedAt).toLocaleDateString("zh-TW")}
                </span>
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export function ReceiptModal({
  open,
  onOpenChange,
  onFinalize,
}: ReceiptModalProps) {
  const [currentStep, setCurrentStep] = React.useState(0);
  const [donationRecords, setDonationRecords] = React.useState<DonationRecord[]>(
    []
  );
  const [filteredRecords, setFilteredRecords] = React.useState<
    DonationRecord[]
  >([]);
  const [filters, setFilters] = React.useState<RecordFilters>({
    search: "",
    donorId: ALL_DONORS_OPTION,
  });
  const [donors, setDonors] = React.useState<DonorOption[]>([]);
  const [donorSearch, setDonorSearch] = React.useState("");
  const [selectedRecordIds, setSelectedRecordIds] = React.useState<string[]>(
    []
  );
  const [draft, setDraft] = React.useState<ReceiptDraft | null>(null);
  const [memo, setMemo] = React.useState("");
  const [sealAssets, setSealAssets] = React.useState<ReceiptSealAsset[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = React.useState(false);
  const [isLoadingSeals, setIsLoadingSeals] = React.useState(false);
  const [cropState, setCropState] = React.useState<SealCropState>({
    open: false,
  });
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const resetState = React.useCallback(() => {
    setCurrentStep(0);
    setFilters({ search: "", donorId: ALL_DONORS_OPTION });
    setSelectedRecordIds([]);
    setDraft(null);
    setMemo("");
    setDonorSearch("");
    setCropState({ open: false });
  }, []);

  const normalizeDonationRecords = React.useCallback(
    (payload: unknown): DonationRecord[] => {
      if (Array.isArray(payload)) {
        return payload as DonationRecord[];
      }
      if (payload && typeof payload === "object") {
        const container = payload as {
          items?: unknown;
          data?: unknown;
          results?: unknown;
        };
        if (Array.isArray(container.items)) {
          return container.items as DonationRecord[];
        }
        if (Array.isArray(container.data)) {
          return container.data as DonationRecord[];
        }
        if (Array.isArray(container.results)) {
          return container.results as DonationRecord[];
        }
      }
      return [];
    },
    []
  );

  const loadDonationRecords = React.useCallback(async () => {
    setIsLoadingRecords(true);
    try {
      const response = await fetch("/api/donations?includeItems=true");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = await response.json();
      const records = normalizeDonationRecords(payload);
      setDonationRecords(records);
      setFilteredRecords(records);
    } catch (error) {
      console.error("Failed to load donation records:", error);
      toast.error("載入捐贈紀錄失敗");
      setDonationRecords([]);
      setFilteredRecords([]);
    } finally {
      setIsLoadingRecords(false);
    }
  }, [normalizeDonationRecords]);

  const loadDonors = React.useCallback(async () => {
    try {
      const response = await fetch("/api/donors?includeInactive=true");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = await response.json();
      const donorList: DonorOption[] = Array.isArray(payload)
        ? payload
        : payload.data || [];
      setDonors(
        donorList
          .filter((donor) => donor.name && donor.name.trim())
          .map((donor) => ({
            id: donor.id,
            name: donor.name.trim(),
            phone: donor.phone ?? null,
            address: donor.address ?? null,
          }))
          .sort((a, b) => a.name.localeCompare(b.name, "zh-TW"))
      );
    } catch (error) {
      console.error("Failed to load donors:", error);
    }
  }, []);

  const loadSealAssets = React.useCallback(async () => {
    setIsLoadingSeals(true);
    try {
      const response = await fetch("/api/seals");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data: ReceiptSealAsset[] = await response.json();
      setSealAssets(data);
    } catch (error) {
      console.error("Failed to load seal assets:", error);
    } finally {
      setIsLoadingSeals(false);
    }
  }, []);

  React.useEffect(() => {
    if (open) {
      loadDonationRecords();
      loadDonors();
      loadSealAssets();
    } else {
      resetState();
    }
  }, [open, loadDonationRecords, loadDonors, loadSealAssets, resetState]);

  React.useEffect(() => {
    const nextRecords = donationRecords.filter((record) => {
      const donorFilter =
        filters.donorId === ALL_DONORS_OPTION ||
        (record.donor && record.donor.id === filters.donorId);

      if (!donorFilter) {
        return false;
      }

      if (!filters.search.trim()) {
        return true;
      }

      const searchTerm = filters.search.trim().toLowerCase();
      const matchedDonor =
        record.donor?.name?.toLowerCase().includes(searchTerm) ?? false;
      const matchedSerial = record.serialNumber
        ?.toLowerCase()
        ?.includes(searchTerm);
      const matchedItems = record.donationItems.some((item) =>
        item.itemName.toLowerCase().includes(searchTerm)
      );

      return matchedDonor || matchedSerial || matchedItems;
    });

    setFilteredRecords(nextRecords);
  }, [donationRecords, filters]);

  const selectedRecords = React.useMemo(
    () =>
      donationRecords.filter((record) =>
        selectedRecordIds.includes(record.id)
      ),
    [donationRecords, selectedRecordIds]
  );

  const selectedDonorName = React.useMemo(() => {
    if (selectedRecords.length === 0) return null;
    const named = selectedRecords.find(
      (record) => record.donor && record.donor.name?.trim()
    );
    return named?.donor?.name?.trim() ?? null;
  }, [selectedRecords]);

  const isRecordSelectable = React.useCallback(
    (record: DonationRecord) => {
      if (selectedRecordIds.includes(record.id)) return true;
      if (selectedRecords.length === 0) return true;

      const recordDonorName = record.donor?.name?.trim();
      const recordHasName = Boolean(recordDonorName);

      if (!recordHasName) {
        return true;
      }

      if (!selectedDonorName) {
        return true;
      }

      return selectedDonorName === recordDonorName;
    },
    [selectedDonorName, selectedRecordIds, selectedRecords.length]
  );

  const toggleRecordSelection = (recordId: string) => {
    setSelectedRecordIds((prev) => {
      if (prev.includes(recordId)) {
        return prev.filter((id) => id !== recordId);
      }
      return [...prev, recordId];
    });
  };

  const handleSelectAll = () => {
    if (filteredRecords.length === 0) return;
    const allIds = filteredRecords
      .filter((record) => isRecordSelectable(record))
      .map((record) => record.id);

    if (allIds.length === selectedRecordIds.length) {
      setSelectedRecordIds([]);
    } else {
      setSelectedRecordIds(allIds);
    }
  };

  const createDraftFromSelection = React.useCallback(
    (records: DonationRecord[]): ReceiptDraft => {
      const donor = records.find(
        (record) => record.donor && record.donor.name?.trim()
      )?.donor;
      const firstRecord = records[0];

      const items: ReceiptItemDraft[] = records.flatMap((record) =>
        record.donationItems.map((item) => ({
          id: crypto.randomUUID?.() ?? `${record.id}-${item.id}`,
          name: item.itemName,
          quantity: item.quantity,
          unit: item.itemUnit,
          notes: item.notes ?? undefined,
          sourceRecordId: record.id,
          sourceDonationItemId: item.id,
        }))
      );

      return {
        recordIds: records.map((record) => record.id),
        donor: {
          name: donor?.name?.trim() || "無名氏",
          phone: donor?.phone ?? undefined,
          address: donor?.address ?? undefined,
        },
        items,
        receiptDate: new Date(firstRecord.createdAt).toISOString().slice(0, 10),
        seals: {
          ORG: {},
          CHAIRMAN: {},
          HANDLER: {},
        },
      };
    },
    []
  );

  const handleProceedFromSelection = () => {
    if (selectedRecords.length === 0) {
      toast.error("請先選擇至少一筆捐贈紀錄");
      return false;
    }

    const nextDraft = createDraftFromSelection(selectedRecords);
    setDraft(nextDraft);
    return true;
  };

  const handleUpdateDonor = (field: keyof ReceiptDraft["donor"], value: string) => {
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            donor: {
              ...prev.donor,
              [field]: value,
            },
          }
        : prev
    );
  };

  const handleUpdateItem = (
    itemId: string,
    field: keyof ReceiptItemDraft,
    value: string
  ) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const items = prev.items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              [field]:
                field === "quantity"
                  ? Number(value) || 0
                  : field === "notes"
                  ? value || undefined
                  : value,
            }
          : item
      );
      return {
        ...prev,
        items,
      };
    });
  };

  const handleRemoveItem = (itemId: string) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.filter((item) => item.id !== itemId),
      };
    });
  };

  const handleAddItem = () => {
    setDraft((prev) => {
      if (!prev) return prev;
      const newItem: ReceiptItemDraft = {
        id: crypto.randomUUID?.() ?? `manual-${Date.now()}`,
        name: "",
        quantity: 1,
        unit: "",
        notes: "",
      };
      return {
        ...prev,
        items: [...prev.items, newItem],
      };
    });
  };

  const handleUpdateSealSelection = (
    category: ReceiptSealCategory,
    selection: { sealId?: string; imageUrl?: string; imageDataUrl?: string; name?: string }
  ) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        seals: {
          ...prev.seals,
          [category]: selection,
        },
      };
    });
  };

  const handleUploadSeal = async (
    category: ReceiptSealCategory,
    dataUrl: string,
    name: string
  ) => {
    try {
      const response = await fetch("/api/seals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          category,
          name,
          imageDataUrl: dataUrl,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const created: ReceiptSealAsset = await response.json();
      setSealAssets((prev) => [...prev, created]);
      handleUpdateSealSelection(category, {
        sealId: created.id,
        name: created.nickname,
        imageUrl: created.imageUrl,
        imageDataUrl: dataUrl,
      });
      toast.success("印章已儲存");
    } catch (error) {
      console.error("Failed to upload seal:", error);
      toast.error("上傳印章失敗");
    }
  };

  const openFilePicker = (category: ReceiptSealCategory) => {
    setCropState({ open: false, category });
    if (!fileInputRef.current) return;
    fileInputRef.current.value = "";
    fileInputRef.current.click();
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("請選擇圖片檔案");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCropState((prev) => ({
        ...prev,
        open: true,
        imageSrc: reader.result as string,
      }));
    };
    reader.onerror = () => toast.error("讀取圖片失敗");
    reader.readAsDataURL(file);
  };

  const handleCropConfirm = (result: { dataUrl: string; name: string }) => {
    if (!cropState.category) return;
    setCropState({ open: false, category: cropState.category });
    handleUploadSeal(cropState.category, result.dataUrl, result.name);
  };

  const isDetailsStepValid = React.useMemo(() => {
    if (!draft) return false;
    if (!draft.donor.name.trim()) return false;
    if (draft.items.length === 0) return false;
    return draft.items.every((item) => item.name.trim() && item.unit.trim());
  }, [draft]);

  const isSealStepValid = React.useMemo(() => {
    if (!draft) return false;
    return SEAL_CATEGORIES.every((category) => {
      const seal = draft.seals[category];
      return Boolean(seal?.imageDataUrl || seal?.sealId || seal?.imageUrl);
    });
  }, [draft]);

  const handleFinalize = () => {
    if (!draft) {
      toast.error("尚未完成收據設定");
      return;
    }

    const submission: ReceiptDraftSubmission = {
      ...draft,
      memo: memo.trim() || undefined,
    };

    onFinalize(submission);
    onOpenChange(false);
  };

  const renderRecordsTable = () => {
    if (isLoadingRecords) {
      return (
        <div className="flex h-56 items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <span className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <span>載入捐贈紀錄中...</span>
          </div>
        </div>
      );
    }

    if (filteredRecords.length === 0) {
      return (
        <div className="flex h-56 items-center justify-center rounded-lg border border-dashed">
          <p className="text-sm text-muted-foreground">沒有符合條件的捐贈紀錄</p>
        </div>
      );
    }

    return (
      <div className="max-h-[50vh] overflow-y-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
            <tr>
              <th className="w-12 px-4 py-2">
                <input
                  type="checkbox"
                  checked={
                    filteredRecords.length > 0 &&
                    filteredRecords.every((record) =>
                      selectedRecordIds.includes(record.id)
                    )
                  }
                  onChange={handleSelectAll}
                />
              </th>
              <th className="px-4 py-2 text-left">捐贈者</th>
              <th className="px-4 py-2 text-left">品項摘要</th>
              <th className="px-4 py-2 text-left">建立時間</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.map((record) => {
              const isSelectable = isRecordSelectable(record);
              const summary = record.donationItems
                .map((item) => `${item.itemName} x${item.quantity}${item.itemUnit}`)
                .join("、");
              return (
                <tr
                  key={record.id}
                  className={`border-b transition-colors ${
                    isSelectable ? "hover:bg-muted/50" : "opacity-50"
                  }`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedRecordIds.includes(record.id)}
                      disabled={!isSelectable}
                      onChange={() => toggleRecordSelection(record.id)}
                    />
                  </td>
                  <td className="max-w-[200px] px-4 py-3 align-top">
                    <div className="font-medium">
                      {record.donor?.name || "無名氏"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {record.donor?.phone || "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {summary}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {new Date(record.createdAt).toLocaleString("zh-TW")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderRecordsFilter = () => (
    <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="搜尋捐贈者、品項或序號"
          className="pl-9"
          value={filters.search}
          onChange={(event) =>
            setFilters((prev) => ({ ...prev, search: event.target.value }))
          }
        />
      </div>

      <Select
        value={filters.donorId}
        onValueChange={(value) => {
          setFilters((prev) => ({ ...prev, donorId: value }));
          setDonorSearch("");
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="篩選捐贈者" />
        </SelectTrigger>
        <SelectContent className="w-60">
          <div className="px-2 py-2">
            <Input
              placeholder="輸入關鍵字篩選"
              value={donorSearch}
              onChange={(event) => setDonorSearch(event.target.value)}
              onKeyDown={(event) => event.stopPropagation()}
            />
          </div>
          <SelectItem value={ALL_DONORS_OPTION}>全部捐贈者</SelectItem>
          {donors
            .filter((donor) =>
              donor.name.toLowerCase().includes(donorSearch.toLowerCase())
            )
            .map((donor) => (
              <SelectItem key={donor.id} value={donor.id}>
                {donor.name}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  );

  const renderRecordSelectionStep = () => (
    <WizardStep title="選擇捐贈紀錄">
      <div className="space-y-4">
        {renderRecordsFilter()}
        {renderRecordsTable()}
        <div className="rounded-lg border bg-muted/30 p-4 text-sm">
          <div className="font-medium">
            已選擇 {selectedRecordIds.length} 筆捐贈紀錄
          </div>
          <div className="text-muted-foreground">
            一張收據僅能包含同一位具名捐贈者或任意匿名者的紀錄。如需組合不同捐贈者，請分次生成。
          </div>
        </div>
      </div>
    </WizardStep>
  );

  const renderDonorForm = () => (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <label className="text-sm font-medium">捐贈者姓名</label>
        <Input
          value={draft?.donor.name ?? ""}
          onChange={(event) => handleUpdateDonor("name", event.target.value)}
          placeholder="請輸入捐贈者姓名"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">聯絡電話</label>
        <Input
          value={draft?.donor.phone ?? ""}
          onChange={(event) => handleUpdateDonor("phone", event.target.value)}
          placeholder="可留空"
        />
      </div>
      <div className="space-y-2 md:col-span-2">
        <label className="text-sm font-medium">聯絡地址</label>
        <Input
          value={draft?.donor.address ?? ""}
          onChange={(event) =>
            handleUpdateDonor("address", event.target.value)
          }
          placeholder="可留空"
        />
      </div>
      <div className="space-y-2 md:col-span-2">
        <label className="text-sm font-medium">收據日期</label>
        <Input
          type="date"
          value={draft?.receiptDate ?? ""}
          onChange={(event) =>
            setDraft((prev) =>
              prev ? { ...prev, receiptDate: event.target.value } : prev
            )
          }
        />
      </div>
    </div>
  );

  const renderItemsTable = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">物資明細</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddItem}
          className="min-h-[36px]"
        >
          <Plus className="mr-2 h-4 w-4" />
          新增列
        </Button>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30%]">品名</TableHead>
              <TableHead className="w-[15%]">數量</TableHead>
              <TableHead className="w-[15%]">單位</TableHead>
              <TableHead>備註</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {draft?.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Input
                    value={item.name}
                    onChange={(event) =>
                      handleUpdateItem(item.id, "name", event.target.value)
                    }
                    placeholder="物資名稱"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={item.quantity}
                    min={0}
                    onChange={(event) =>
                      handleUpdateItem(item.id, "quantity", event.target.value)
                    }
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={item.unit}
                    onChange={(event) =>
                      handleUpdateItem(item.id, "unit", event.target.value)
                    }
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={item.notes ?? ""}
                    onChange={(event) =>
                      handleUpdateItem(item.id, "notes", event.target.value)
                    }
                    placeholder="可留空"
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveItem(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {draft && draft.items.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-6 text-center text-sm text-muted-foreground"
                >
                  尚未新增任何物資項目
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  const renderDetailsStep = () => (
    <WizardStep title="確認與調整收據內容">
      <div className="space-y-6">
        {renderDonorForm()}
        {renderItemsTable()}
        <div className="space-y-2">
          <label className="text-sm font-medium">備註（選填）</label>
          <Textarea
            placeholder="如需保留內部備註，可在此記錄"
            value={memo}
            onChange={(event) => setMemo(event.target.value)}
          />
        </div>
      </div>
    </WizardStep>
  );

  const renderSealPreview = (category: ReceiptSealCategory) => {
    const seal = draft?.seals[category];
    if (!seal || (!seal.imageDataUrl && !seal.imageUrl)) {
      return (
        <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          尚未選擇印章
        </div>
      );
    }

    return (
      <div className="flex h-32 items-center justify-center rounded-lg border bg-white">
        <img
          src={seal.imageDataUrl ?? seal.imageUrl}
          alt={`${SEAL_LABELS[category]}預覽`}
          className="h-24 w-24 object-contain"
        />
      </div>
    );
  };

  const renderSealStep = () => (
    <WizardStep title="設定印章">
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">
          請確認收據上要呈現的印章。若需要新增，可立即上傳並裁切成正方形。
        </p>
        {isLoadingSeals && (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            正在載入印章清單...
          </div>
        )}
        <div className="grid gap-6 md:grid-cols-3">
          {SEAL_CATEGORIES.map((category) => (
            <div key={category} className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold">
                  {SEAL_LABELS[category]}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {draft?.seals[category]?.name
                    ? `已選：${draft.seals[category]?.name}`
                    : "尚未設定"}
                </p>
              </div>
              {renderSealPreview(category)}
              <div className="flex items-center gap-2">
                <SealOptionSelector
                  category={category}
                  assets={sealAssets}
                  onSelect={(selection) =>
                    handleUpdateSealSelection(category, selection)
                  }
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openFilePicker(category)}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  上傳
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </WizardStep>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] max-w-4xl">
          <DialogHeader>
            <DialogTitle>收據列印流程</DialogTitle>
            <DialogDescription>
              依序選擇捐贈紀錄、調整收據內容並確認印章，完成後即可生成正式收據。
            </DialogDescription>
          </DialogHeader>

          <MultiStepWizard
            currentStep={currentStep}
            totalSteps={3}
            onStepChange={setCurrentStep}
            onCancel={() => onOpenChange(false)}
            onComplete={handleFinalize}
            canGoNext={
              currentStep === 0
                ? selectedRecordIds.length > 0
                : currentStep === 1
                ? isDetailsStepValid
                : currentStep === 2
                ? isSealStepValid
                : true
            }
            onNextStep={() => {
              if (currentStep === 0) {
                return handleProceedFromSelection();
              }
              return true;
            }}
            completeButtonText="生成收據"
          >
            {renderRecordSelectionStep()}
            {renderDetailsStep()}
            {renderSealStep()}
          </MultiStepWizard>
        </DialogContent>
      </Dialog>

      <SealCropperDialog
        open={cropState.open}
        imageSrc={cropState.imageSrc}
        defaultName={SEAL_LABELS[cropState.category ?? "ORG"]}
        onOpenChange={(openState) =>
          setCropState((prev) => ({ ...prev, open: openState }))
        }
        onConfirm={handleCropConfirm}
      />
    </>
  );
}
