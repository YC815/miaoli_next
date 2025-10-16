"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, RefreshCcw, ChevronLeft, ChevronRight } from "lucide-react";
import type { ExpiryItemDetail, ExpiryPagination } from "@/types/expiry";
import { toast } from "sonner";

interface ExpiryStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expiringItems: ExpiryItemDetail[];
  expiredItems: ExpiryItemDetail[];
  loading: boolean;
  errorMessage: string | null;
  lastUpdatedAt: string | null;
  pagination: ExpiryPagination | null;
  currentPage: number;
  onRetry: () => void;
  onPageChange: (page: number) => void;
}

export function ExpiryStatusModal({
  open,
  onOpenChange,
  expiringItems,
  expiredItems,
  loading,
  errorMessage,
  lastUpdatedAt,
  pagination,
  currentPage,
  onRetry,
  onPageChange,
}: ExpiryStatusModalProps) {
  const [activeTab, setActiveTab] = React.useState<"expiring" | "expired">(
    "expiring"
  );
  const [handlingIds, setHandlingIds] = useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (!open) return;
    if (activeTab === "expiring" && expiringItems.length === 0 && expiredItems.length > 0) {
      setActiveTab("expired");
    }
    if (activeTab === "expired" && expiredItems.length === 0 && expiringItems.length > 0) {
      setActiveTab("expiring");
    }
  }, [open, expiringItems.length, expiredItems.length, activeTab]);

  const formattedUpdatedAt = lastUpdatedAt
    ? new Date(lastUpdatedAt).toLocaleString("zh-TW", {
        hour12: false,
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "尚未更新";

  const handleToggleHandled = async (itemId: string, currentHandled: boolean) => {
    setHandlingIds((prev) => new Set(prev).add(itemId));

    try {
      const response = await fetch(`/api/donation-items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isHandled: !currentHandled }),
      });

      if (!response.ok) {
        throw new Error("Failed to update item status");
      }

      toast.success(currentHandled ? "已標記為未處理" : "已標記為已處理");
      onRetry(); // Refresh data
    } catch (error) {
      console.error("Error updating handled status:", error);
      toast.error("更新失敗，請稍後再試");
    } finally {
      setHandlingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  const renderStatusTable = (items: ExpiryItemDetail[], tabType: "expiring" | "expired") => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-14 text-muted-foreground gap-3">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">正在載入效期資訊…</p>
        </div>
      );
    }

    if (errorMessage) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
          <p className="text-sm text-destructive">{errorMessage}</p>
          <Button variant="outline" onClick={onRetry}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            重新載入
          </Button>
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-14 text-muted-foreground space-y-3">
          <p className="text-sm">目前沒有符合條件的品項。</p>
          <p className="text-xs">請持續留意庫存變化，確保即時處理。</p>
        </div>
      );
    }

    const totalPages =
      tabType === "expiring"
        ? pagination?.totalPagesExpiring ?? 1
        : pagination?.totalPagesExpired ?? 1;

    return (
      <div className="flex flex-col gap-3">
        <div className="overflow-auto rounded-lg border max-h-[60vh]">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-12 text-center">處理</TableHead>
                <TableHead className="min-w-[180px]">品項</TableHead>
                <TableHead>類別</TableHead>
                <TableHead className="text-center">數量</TableHead>
                <TableHead className="text-center">效期日期</TableHead>
                <TableHead className="text-center">提醒</TableHead>
                <TableHead>捐贈編號</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={item.isHandled}
                        disabled={handlingIds.has(item.id)}
                        onCheckedChange={() => handleToggleHandled(item.id, item.isHandled)}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{item.itemName}</span>
                      <span className="text-xs text-muted-foreground">
                        單位:{item.itemUnit}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{item.itemCategory}</TableCell>
                  <TableCell className="text-center">
                    {item.quantity.toLocaleString()} {item.itemUnit}
                  </TableCell>
                  <TableCell className="text-center">
                    {item.expiryDate
                      ? new Date(item.expiryDate).toLocaleDateString("zh-TW")
                      : "未登錄"}
                  </TableCell>
                  <TableCell className="text-center">
                    {renderExpiryBadge(item.daysUntilExpiry)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {item.serialNumber ?? "未編號"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-2">
            <div className="text-sm text-muted-foreground">
              第 {currentPage} 頁，共 {totalPages} 頁
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
                上一頁
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
              >
                下一頁
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-none sm:max-w-none lg:max-w-7xl h-[90vh] max-h-[90vh]">
        <div className="flex h-full flex-col gap-3">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle>效期提醒</DialogTitle>
            <DialogDescription>
              以下品項需要優先盤點與處理。更新時間：{formattedUpdatedAt}
            </DialogDescription>
          </DialogHeader>

          <Tabs
            value={activeTab}
            onValueChange={(value) =>
              setActiveTab(value as "expiring" | "expired")
            }
            className="flex flex-1 flex-col overflow-hidden"
          >
            <TabsList className="grid grid-cols-2 max-w-xs sm:max-w-md self-start mt-1">
              <TabsTrigger value="expiring">
                即將過期（{pagination?.totalExpiring ?? expiringItems.length}）
              </TabsTrigger>
              <TabsTrigger value="expired">
                已過期（{pagination?.totalExpired ?? expiredItems.length}）
              </TabsTrigger>
            </TabsList>

            <div className="mt-3 flex-1 overflow-hidden">
              <TabsContent
                value="expiring"
                className="flex-1 overflow-hidden data-[state=inactive]:hidden"
              >
                <div className="h-full">
                  {renderStatusTable(expiringItems, "expiring")}
                </div>
              </TabsContent>
              <TabsContent
                value="expired"
                className="flex-1 overflow-hidden data-[state=inactive]:hidden"
              >
                <div className="h-full">
                  {renderStatusTable(expiredItems, "expired")}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function renderExpiryBadge(daysUntilExpiry: number | null) {
  if (daysUntilExpiry === null) {
    return (
      <Badge variant="outline" className="bg-muted/30 text-muted-foreground">
        無效期資訊
      </Badge>
    );
  }

  if (daysUntilExpiry < 0) {
    return (
      <Badge variant="destructive">
        逾期 {Math.abs(daysUntilExpiry)} 天
      </Badge>
    );
  }

  if (daysUntilExpiry === 0) {
    return <Badge variant="secondary">今日到期</Badge>;
  }

  if (daysUntilExpiry <= 7) {
    return (
      <Badge className="bg-amber-100 text-amber-800">
        剩餘 {daysUntilExpiry} 天
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="text-foreground">
      剩餘 {daysUntilExpiry} 天
    </Badge>
  );
}
