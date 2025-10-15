"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AddRecipientUnitDialog, RecipientUnit } from "@/components/recipient/AddRecipientUnitDialog";
import { EditRecipientUnitDialog } from "@/components/recipient/EditRecipientUnitDialog";
import { Search, Users, RefreshCcw, Edit3, EyeOff, Eye, Plus } from "lucide-react";
import { toast } from "sonner";

export function RecipientUnitsManagement() {
  const [recipientUnits, setRecipientUnits] = useState<RecipientUnit[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingRecipientUnit, setEditingRecipientUnit] = useState<RecipientUnit | null>(null);

  const fetchRecipientUnits = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/recipient-units?includeInactive=true");
      const data = await response.json();
      if (response.ok) {
        setRecipientUnits(Array.isArray(data) ? data : data.data || []);
      } else {
        toast.error(data.error || "載入領取單位資料失敗");
      }
    } catch (error) {
      console.error("載入領取單位資料失敗:", error);
      toast.error("載入領取單位資料失敗");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecipientUnits();
  }, []);

  const filteredRecipientUnits = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return recipientUnits.filter(unit => {
      const matchesStatus = showInactive ? true : unit.isActive;
      if (!matchesStatus) return false;
      if (!keyword) return true;
      const haystack = [
        unit.name,
        unit.phone || "",
        unit.address || "",
      ].join(" ").toLowerCase();
      return haystack.includes(keyword);
    });
  }, [recipientUnits, showInactive, searchTerm]);

  const handleRecipientUnitCreated = (newUnit: RecipientUnit) => {
    setRecipientUnits(prev => [newUnit, ...prev]);
  };

  const handleRecipientUnitUpdated = (updatedUnit: RecipientUnit) => {
    setRecipientUnits(prev =>
      prev.map(unit => unit.id === updatedUnit.id ? updatedUnit : unit)
    );
  };

  const toggleRecipientUnitStatus = async (unit: RecipientUnit) => {
    try {
      const requestOptions: RequestInit = unit.isActive
        ? {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: unit.id }),
          }
        : {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: unit.id,
              name: unit.name,
              phone: unit.phone,
              address: unit.address,
              isActive: true,
            }),
          };

      const response = await fetch("/api/recipient-units", requestOptions);
      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || (unit.isActive ? "領取單位已停用" : "領取單位已啟用"));
        handleRecipientUnitUpdated(data.data || data);
      } else {
        toast.error(data.error || "更新領取單位狀態失敗");
      }
    } catch (error) {
      console.error("更新領取單位狀態失敗:", error);
      toast.error("更新領取單位狀態失敗");
    }
  };

  const handleEditClick = (unit: RecipientUnit) => {
    setEditingRecipientUnit(unit);
    setIsEditDialogOpen(true);
  };

  if (loading) {
    return (
      <Card className="border-none shadow-none">
        <CardHeader>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <div className="border rounded-xl overflow-hidden">
            <div className="space-y-3 p-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-none">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>領取單位管理</span>
            </div>
            <CardTitle className="text-2xl font-semibold mt-1">領取單位清單</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              管理領取單位聯絡資訊，支援快速搜尋、編輯與停用。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchRecipientUnits}
              disabled={loading}
              className="min-h-[40px]"
            >
              <RefreshCcw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              重新整理
            </Button>
            <Button
              size="sm"
              onClick={() => setIsAddDialogOpen(true)}
              className="min-h-[40px]"
            >
              <Plus className="h-4 w-4 mr-2" />
              新增領取單位
            </Button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜尋單位名稱、電話或地址..."
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="show-inactive-recipients"
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="h-4 w-4 rounded border-muted-foreground"
            />
            <Label htmlFor="show-inactive-recipients" className="text-sm text-muted-foreground">
              顯示已停用的領取單位
            </Label>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="border rounded-xl overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[120px]">狀態</TableHead>
                <TableHead>單位名稱</TableHead>
                <TableHead>聯絡電話</TableHead>
                <TableHead>地址</TableHead>
                <TableHead className="w-[140px] text-center">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecipientUnits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    尚未找到符合條件的領取單位
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecipientUnits.map((unit) => (
                  <TableRow key={unit.id} className="hover:bg-muted/30">
                    <TableCell>
                      <Badge variant={unit.isActive ? "default" : "outline"}>
                        {unit.isActive ? "啟用中" : "已停用"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{unit.name}</div>
                    </TableCell>
                    <TableCell>{unit.phone || "—"}</TableCell>
                    <TableCell>{unit.address || "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditClick(unit)}
                          title="編輯"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleRecipientUnitStatus(unit)}
                          title={unit.isActive ? "停用" : "啟用"}
                        >
                          {unit.isActive ? (
                            <EyeOff className="h-4 w-4 text-red-500" />
                          ) : (
                            <Eye className="h-4 w-4 text-green-600" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <AddRecipientUnitDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onRecipientCreated={handleRecipientUnitCreated}
      />

      <EditRecipientUnitDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        recipientUnit={editingRecipientUnit}
        onRecipientUnitUpdated={handleRecipientUnitUpdated}
      />
    </Card>
  );
}
