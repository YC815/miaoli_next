"use client";

import React from "react";
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
import { Loader2, RefreshCcw } from "lucide-react";
import type { ExpiryItemDetail } from "@/types/expiry";

interface ExpiryStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expiringItems: ExpiryItemDetail[];
  expiredItems: ExpiryItemDetail[];
  loading: boolean;
  errorMessage: string | null;
  lastUpdatedAt: string | null;
  onRetry: () => void;
}

export function ExpiryStatusModal({
  open,
  onOpenChange,
  expiringItems,
  expiredItems,
  loading,
  errorMessage,
  lastUpdatedAt,
  onRetry,
}: ExpiryStatusModalProps) {
  const [activeTab, setActiveTab] = React.useState<"expiring" | "expired">(
    "expiring"
  );

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

  const renderStatusTable = (items: ExpiryItemDetail[]) => {
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

    return (
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[180px]">品項</TableHead>
              <TableHead>類別</TableHead>
              <TableHead className="text-center">庫存</TableHead>
              <TableHead className="text-center">最早到期日</TableHead>
              <TableHead className="text-center">提醒</TableHead>
              <TableHead>相關捐贈紀錄</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.itemStockId}>
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span>{item.itemName}</span>
                    <span className="text-xs text-muted-foreground">
                      單位：{item.itemUnit}
                    </span>
                  </div>
                </TableCell>
                <TableCell>{item.itemCategory}</TableCell>
                <TableCell className="text-center">
                  {item.totalStock.toLocaleString()} {item.itemUnit}
                </TableCell>
                <TableCell className="text-center">
                  {item.soonestExpiry
                    ? new Date(item.soonestExpiry).toLocaleDateString("zh-TW")
                    : "未登錄"}
                </TableCell>
                <TableCell className="text-center">
                  {renderExpiryBadge(item.daysUntilExpiry)}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    {item.donationRecords.map((record) => (
                      <Badge
                        key={`${record.donationId}-${record.expiryDate}`}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        <span>{record.serialNumber ?? "未編號"}</span>
                        <span className="text-[11px] text-muted-foreground">
                          x{record.quantity}
                        </span>
                      </Badge>
                    ))}
                    {item.donationRecords.length === 0 && (
                      <span className="text-xs text-muted-foreground">
                        尚無對應捐贈紀錄
                      </span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
                即將過期（{expiringItems.length}）
              </TabsTrigger>
              <TabsTrigger value="expired">
                已過期（{expiredItems.length}）
              </TabsTrigger>
            </TabsList>

            <div className="mt-3 flex-1 overflow-hidden">
              <TabsContent
                value="expiring"
                className="flex-1 overflow-hidden data-[state=inactive]:hidden"
              >
                <div className="h-full overflow-y-auto pr-1">
                  {renderStatusTable(expiringItems)}
                </div>
              </TabsContent>
              <TabsContent
                value="expired"
                className="flex-1 overflow-hidden data-[state=inactive]:hidden"
              >
                <div className="h-full overflow-y-auto pr-1">
                  {renderStatusTable(expiredItems)}
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
