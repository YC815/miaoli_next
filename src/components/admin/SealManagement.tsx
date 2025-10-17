"use client";

/* eslint-disable @next/next/no-img-element */

import React from "react";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { ReceiptSealAsset } from "@/types/receipt";
import { Search } from "lucide-react";

export function SealManagement() {
  const [seals, setSeals] = React.useState<ReceiptSealAsset[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const filteredSeals = React.useMemo(() => {
    return seals.filter((seal) => {
      const matchesSearch = seal.nickname
        .toLowerCase()
        .includes(search.toLowerCase());
      return matchesSearch;
    });
  }, [seals, search]);

  const loadSeals = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/seals");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data: ReceiptSealAsset[] = await response.json();
      setSeals(data);
    } catch (error) {
      console.error("Failed to load seals:", error);
      toast.error("載入印章列表失敗");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadSeals();
  }, [loadSeals]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜尋使用者暱稱"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          此頁面僅供查看所有使用者的印章。若要管理您自己的印章，請前往「個人設定」。
        </div>
      </div>

      {loading ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          正在載入印章資料...
        </div>
      ) : filteredSeals.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {search
            ? "沒有符合條件的印章"
            : "目前尚無使用者上傳印章"}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredSeals.map((seal) => (
            <Card key={seal.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{seal.nickname}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  使用者 ID: {seal.userId.slice(0, 8)}...
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-center">
                  <img
                    src={seal.imageUrl}
                    alt={`${seal.nickname}的印章`}
                    className="h-32 w-32 rounded border bg-white object-contain"
                  />
                </div>
                {seal.updatedAt && (
                  <p className="text-xs text-muted-foreground text-right">
                    更新：{new Date(seal.updatedAt).toLocaleString("zh-TW")}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
