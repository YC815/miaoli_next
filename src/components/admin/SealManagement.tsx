"use client";

/* eslint-disable @next/next/no-img-element */

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  ReceiptSealAsset,
  ReceiptSealCategory,
} from "@/types/receipt";
import { SealCropperDialog } from "@/components/receipt/SealCropperDialog";
import { Edit, Trash2, Crop, Plus, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type FilterCategory = ReceiptSealCategory | "ALL";

interface CropState {
  open: boolean;
  mode: "create" | "update";
  category: ReceiptSealCategory;
  seal?: ReceiptSealAsset;
  imageSrc?: string;
}

const CATEGORY_LABELS: Record<ReceiptSealCategory, string> = {
  ORG: "機構印章",
  CHAIRMAN: "理事長印章",
  HANDLER: "經手人印章",
};

export function SealManagement() {
  const [seals, setSeals] = React.useState<ReceiptSealAsset[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState<FilterCategory>("ALL");
  const [editingSealId, setEditingSealId] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState("");
  const [cropState, setCropState] = React.useState<CropState>({
    open: false,
    mode: "create",
    category: "ORG",
  });
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const filteredSeals = React.useMemo(() => {
    return seals.filter((seal) => {
      const matchesCategory =
        categoryFilter === "ALL" || seal.category === categoryFilter;
      const matchesSearch = seal.name
        .toLowerCase()
        .includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [seals, search, categoryFilter]);

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

  const handleBeginEdit = (seal: ReceiptSealAsset) => {
    setEditingSealId(seal.id);
    setEditName(seal.name);
  };

  const handleCancelEdit = () => {
    setEditingSealId(null);
    setEditName("");
  };

  const handleSaveEdit = async (seal: ReceiptSealAsset) => {
    if (!editName.trim()) {
      toast.error("請輸入印章名稱");
      return;
    }

    try {
      const response = await fetch(`/api/seals/${seal.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: editName.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.error || `HTTP ${response.status}`);
      }

      toast.success("印章名稱已更新");
      setEditingSealId(null);
      setEditName("");
      loadSeals();
    } catch (error) {
      console.error("Failed to update seal:", error);
      toast.error("更新印章名稱失敗");
    }
  };

  const handleDelete = async (seal: ReceiptSealAsset) => {
    if (!confirm(`確定要刪除「${seal.name}」嗎？刪除後將無法復原。`)) {
      return;
    }

    try {
      const response = await fetch(`/api/seals/${seal.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.error || `HTTP ${response.status}`);
      }
      toast.success("印章已刪除");
      loadSeals();
    } catch (error) {
      console.error("Failed to delete seal:", error);
      toast.error("刪除印章失敗");
    }
  };

  const openUploadForCategory = (category: ReceiptSealCategory) => {
    setCropState({
      open: false,
      mode: "create",
      category,
    });
    if (!fileInputRef.current) return;
    fileInputRef.current.value = "";
    fileInputRef.current.click();
  };

  const openRecrop = async (seal: ReceiptSealAsset) => {
    try {
      const response = await fetch(seal.imageUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onload = () => {
        setCropState({
          open: true,
          mode: "update",
          category: seal.category,
          seal,
          imageSrc: reader.result as string,
        });
      };
      reader.onerror = () => toast.error("讀取印章圖片失敗");
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error("Failed to fetch seal image:", error);
      toast.error("無法取得原始印章圖片");
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleCropConfirm = async (payload: {
    dataUrl: string;
    name: string;
  }) => {
    if (!cropState.category) {
      setCropState((prev) => ({ ...prev, open: false }));
      return;
    }

    const { dataUrl, name } = payload;

    try {
      if (cropState.mode === "create") {
        const response = await fetch("/api/seals", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            category: cropState.category,
            name,
            imageDataUrl: dataUrl,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData?.error || `HTTP ${response.status}`);
        }
        toast.success("印章已新增");
      } else if (cropState.mode === "update" && cropState.seal) {
        const response = await fetch(`/api/seals/${cropState.seal.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            imageDataUrl: dataUrl,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData?.error || `HTTP ${response.status}`);
        }
        toast.success("印章已更新");
      }

      setCropState({ open: false, mode: "create", category: "ORG" });
      loadSeals();
    } catch (error) {
      console.error("Failed to save seal:", error);
      toast.error("儲存印章失敗");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <Filter className="hidden h-5 w-5 text-muted-foreground md:block" />
          <Input
            placeholder="搜尋印章名稱"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="md:max-w-xs"
          />
          <Select
            value={categoryFilter}
            onValueChange={(value) => setCategoryFilter(value as FilterCategory)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="篩選印章類型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">所有類型</SelectItem>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="min-h-[44px]">
              <Plus className="mr-2 h-4 w-4" />
              新增印章
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <DropdownMenuItem
                key={key}
                onSelect={() => openUploadForCategory(key as ReceiptSealCategory)}
              >
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {loading ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          正在載入印章資料...
        </div>
      ) : filteredSeals.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {search || categoryFilter !== "ALL"
            ? "沒有符合條件的印章"
            : "尚未建立任何印章，請使用右上角按鈕新增。"}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSeals.map((seal) => (
            <Card key={seal.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-base">
                    {editingSealId === seal.id ? (
                      <Input
                        value={editName}
                        onChange={(event) => setEditName(event.target.value)}
                        className="h-9"
                        autoFocus
                      />
                    ) : (
                      seal.name
                    )}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {CATEGORY_LABELS[seal.category]}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {editingSealId === seal.id ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSaveEdit(seal)}
                      >
                        儲存
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCancelEdit}
                      >
                        取消
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleBeginEdit(seal)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openRecrop(seal)}
                      >
                        <Crop className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(seal)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-center">
                  <img
                    src={seal.imageUrl}
                    alt={seal.name}
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

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <SealCropperDialog
        open={cropState.open}
        imageSrc={cropState.imageSrc}
        defaultName={
          cropState.mode === "update"
            ? cropState.seal?.name ?? ""
            : CATEGORY_LABELS[cropState.category]
        }
        onOpenChange={(openState) =>
          setCropState((prev) => ({ ...prev, open: openState }))
        }
        onConfirm={handleCropConfirm}
      />
    </div>
  );
}
