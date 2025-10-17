"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DisbursementRecord } from "@/components/tables/DisbursementRecordsTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { DisbursementReceiptGenerator } from "@/lib/disbursement-receipt-generator";

interface DisbursementResponse {
  items: DisbursementRecord[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

interface DisbursementReceiptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? "苗栗站";
const PAGE_SIZE = 5;

export function DisbursementReceiptModal({
  open,
  onOpenChange,
}: DisbursementReceiptModalProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [data, setData] = React.useState<DisbursementResponse | null>(null);
  const [selectedRecord, setSelectedRecord] =
    React.useState<DisbursementRecord | null>(null);
  const records = data?.items ?? [];

  React.useEffect(() => {
    if (!open) return;
    const handler = window.setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 300);
    return () => window.clearTimeout(handler);
  }, [searchTerm, open]);

  React.useEffect(() => {
    if (!open) return;
    setPage(1);
  }, [debouncedSearch, open]);

  React.useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const fetchDisbursements = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(PAGE_SIZE),
        });
        if (debouncedSearch) {
          params.set("search", debouncedSearch);
        }
        const response = await fetch(
          `/api/disbursements?${params.toString()}`,
          {
            signal: controller.signal,
          }
        );
        if (!response.ok) {
          throw new Error(response.statusText);
        }
        const payload: DisbursementResponse = await response.json();
        setData(payload);
        if (payload.items.length === 0) {
          setSelectedRecord(null);
        } else if (selectedRecord) {
          const stillExists = payload.items.find(
            (item) => item.id === selectedRecord.id
          );
          if (!stillExists) {
            setSelectedRecord(null);
          }
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Failed to load disbursement records:", error);
        toast.error("載入物資發放紀錄失敗");
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchDisbursements();
    return () => controller.abort();
  }, [open, page, debouncedSearch, selectedRecord]);

  React.useEffect(() => {
    if (!open) {
      setSearchTerm("");
      setDebouncedSearch("");
      setData(null);
      setSelectedRecord(null);
      setPage(1);
    }
  }, [open]);

  const handleSelectRecord = (record: DisbursementRecord) => {
    setSelectedRecord(record);
  };

  const formatDateTime = (value: string) =>
    new Date(value).toLocaleString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  const handlePageChange = (direction: "prev" | "next") => {
    if (!data) return;
    if (direction === "prev" && page > 1) {
      setPage((prev) => prev - 1);
    }
    if (direction === "next" && page < (data.totalPages || 1)) {
      setPage((prev) => prev + 1);
    }
  };

  const buildFileName = (issuedAt: Date) => {
    const year = issuedAt.getFullYear();
    const month = String(issuedAt.getMonth() + 1).padStart(2, "0");
    const day = String(issuedAt.getDate()).padStart(2, "0");
    return `${year}${month}${day}_${SITE_NAME}_物資領取單.pdf`;
  };

  const resolveSealDataUrl = (seal?: {
    imageData?: string | null;
    mimeType?: string | null;
  }) => {
    if (!seal?.imageData) return null;
    const mime = seal.mimeType || "image/png";
    return `data:${mime};base64,${seal.imageData}`;
  };

  const handleGenerateReceipt = async () => {
    if (!selectedRecord) {
      toast.error("請先選擇一筆物資發放紀錄");
      return;
    }
    if (selectedRecord.disbursementItems.length === 0) {
      toast.error("這筆發放紀錄沒有物資項目，無法生成領取單");
      return;
    }

    setIsGenerating(true);
    try {
      const profileResponse = await fetch("/api/users/profile");
      if (!profileResponse.ok) {
        throw new Error("Failed to load current user profile");
      }
      const profile = await profileResponse.json();

      const handlerSealImage = resolveSealDataUrl(profile.seal);
      const issuedAt = new Date(selectedRecord.createdAt);

      const generator = new DisbursementReceiptGenerator();
      await generator.generate(
        {
          recipientUnitName: selectedRecord.recipientUnitName,
          serviceCount: selectedRecord.recipientUnit?.serviceCount ?? null,
          issuedAt,
          items: selectedRecord.disbursementItems.map((item) => ({
            name: item.itemName,
            unit: item.itemUnit,
            quantity: item.quantity,
          })),
          handlerSealImage,
          chairmanSealImage: undefined,
          notes: undefined,
        },
        buildFileName(issuedAt)
      );

      toast.success("物資領取單已生成");
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to generate disbursement receipt:", error);
      toast.error("生成物資領取單時發生錯誤");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>生成物資領取單</DialogTitle>
          <DialogDescription>
            請選擇一筆物資發放紀錄，系統會依照紀錄內容生成正式的領取單 PDF。
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 overflow-hidden">
          <div className="flex-1 min-h-0 space-y-4 overflow-y-auto pr-1 md:pr-2">
            <div className="flex items-center gap-3 sticky top-0 pb-2 bg-background/90 backdrop-blur">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="搜尋流水號、受贈單位、操作者或物資項目..."
                  className="pl-9"
                />
              </div>
            </div>

            <div className="rounded-xl border bg-card/80 shadow-sm">
              <div className="overflow-x-auto">
                <div className="max-h-[45vh] overflow-y-auto">
                  <table className="w-full min-w-[880px] border-separate border-spacing-0 text-sm">
                    <thead className="sticky top-0 z-10 bg-card">
                      <tr>
                        <th className="w-14 px-4 py-3 text-left font-medium text-muted-foreground">
                          選擇
                        </th>
                        <th className="w-44 px-4 py-3 text-left font-medium text-muted-foreground">
                          發放日期
                        </th>
                        <th className="w-36 px-4 py-3 text-left font-medium text-muted-foreground">
                          流水號
                        </th>
                        <th className="w-64 px-4 py-3 text-left font-medium text-muted-foreground">
                          受贈單位
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          物資項目
                        </th>
                        <th className="w-32 px-4 py-3 text-left font-medium text-muted-foreground">
                          操作者
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-4 py-10 text-center text-muted-foreground"
                          >
                            {isLoading ? "載入中..." : "目前沒有資料"}
                          </td>
                        </tr>
                      ) : (
                        records.map((record) => {
                          const isSelected = selectedRecord?.id === record.id;
                          const itemsSummary = record.disbursementItems
                            .map(
                              (item) =>
                                `${item.itemName} × ${item.quantity} ${item.itemUnit}`.trim()
                            )
                            .join("、");

                          return (
                            <tr
                              key={record.id}
                              className={`cursor-pointer transition-colors ${
                                isSelected ? "bg-primary/10" : "hover:bg-muted/60"
                              }`}
                              onClick={() => handleSelectRecord(record)}
                            >
                              <td className="px-4 py-3 align-top">
                                <input
                                  type="radio"
                                  name="disbursement"
                                  className="h-4 w-4"
                                  checked={isSelected}
                                  onChange={() => handleSelectRecord(record)}
                                  aria-label={`選擇流水號 ${record.serialNumber}`}
                                />
                              </td>
                              <td className="px-4 py-3 align-top whitespace-nowrap text-sm font-mono">
                                {formatDateTime(record.createdAt)}
                              </td>
                              <td className="px-4 py-3 align-top">
                                <span className="inline-flex items-center rounded-md bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-600">
                                  {record.serialNumber}
                                </span>
                              </td>
                              <td className="px-4 py-3 align-top">
                                <div className="font-medium text-sm">
                                  {record.recipientUnitName}
                                </div>
                                <div className="mt-1 text-xs text-muted-foreground">
                                  {record.recipientPhone ?? "未提供電話"}
                                </div>
                                {record.recipientAddress && (
                                  <div className="mt-1 text-xs text-muted-foreground">
                                    {record.recipientAddress}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 align-top">
                                <div className="max-h-[4.5rem] overflow-hidden text-sm text-muted-foreground">
                                  {itemsSummary}
                                </div>
                              </td>
                              <td className="px-4 py-3 align-top">
                                <div className="text-sm">
                                  {record.user.nickname ?? "—"}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm text-muted-foreground sticky bottom-0 pt-2 bg-background/90 backdrop-blur">
              <div>
                {data
                  ? `第 ${data.page} / ${Math.max(data.totalPages, 1)} 頁，共 ${
                      data.totalCount
                    } 筆`
                  : "載入中..."}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange("prev")}
                  disabled={isLoading || page <= 1}
                >
                  上一頁
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange("next")}
                  disabled={isLoading || !data || page >= data.totalPages}
                >
                  下一頁
                </Button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
          >
            取消
          </Button>
          <Button
            type="button"
            onClick={handleGenerateReceipt}
            disabled={isGenerating || isLoading || !selectedRecord}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                生成中…
              </>
            ) : (
              "確認生成"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
