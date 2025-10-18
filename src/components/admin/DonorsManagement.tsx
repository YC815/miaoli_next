"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AddDonorDialog } from "@/components/donation/AddDonorDialog";
import { EditDonorDialog, Donor } from "@/components/admin/EditDonorDialog";
import { Search, Users, RefreshCcw, Edit3, EyeOff, Eye, Plus } from "lucide-react";
import { toast } from "sonner";
import { apiGet, apiPut, apiDelete } from "@/lib/api-client";

export function DonorsManagement() {
  const [donors, setDonors] = useState<Donor[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingDonor, setEditingDonor] = useState<Donor | null>(null);

  const fetchDonors = async () => {
    setLoading(true);
    try {
      const data = await apiGet<{ data: Donor[] }>("/api/donors?includeInactive=true");
      setDonors(data.data || []);
    } catch (error) {
      console.error("載入捐贈人資料失敗:", error);
      // Error toast is already shown by apiGet
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonors();
  }, []);

  const filteredDonors = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return donors.filter(donor => {
      const matchesStatus = showInactive ? true : donor.isActive;
      if (!matchesStatus) return false;
      if (!keyword) return true;
      const haystack = [
        donor.name,
        donor.phone || "",
        donor.taxId || "",
        donor.address || "",
      ].join(" ").toLowerCase();
      return haystack.includes(keyword);
    });
  }, [donors, showInactive, searchTerm]);

  const handleDonorCreated = (newDonor: Donor) => {
    setDonors(prev => [newDonor, ...prev]);
  };

  const handleDonorUpdated = (updatedDonor: Donor) => {
    setDonors(prev =>
      prev.map(donor => donor.id === updatedDonor.id ? updatedDonor : donor)
    );
  };

  const toggleDonorStatus = async (donor: Donor) => {
    try {
      const data = donor.isActive
        ? await apiDelete<{ message: string; data: Donor }>("/api/donors", { id: donor.id })
        : await apiPut<{ message: string; data: Donor }>("/api/donors", {
            id: donor.id,
            name: donor.name,
            phone: donor.phone,
            taxId: donor.taxId,
            address: donor.address,
            isActive: true,
          });

      toast.success(data.message || (donor.isActive ? "捐贈人已停用" : "捐贈人已啟用"));
      handleDonorUpdated(data.data);
    } catch (error) {
      console.error("更新捐贈人狀態失敗:", error);
      // Error toast is already shown by apiDelete/apiPut
    }
  };

  const handleEditClick = (donor: Donor) => {
    setEditingDonor(donor);
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
              <span>捐贈單位管理</span>
            </div>
            <CardTitle className="text-2xl font-semibold mt-1">捐贈人清單</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              管理捐贈單位聯絡資訊，支援快速搜尋、編輯與停用。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDonors}
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
              新增捐贈人
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
                placeholder="搜尋單位名稱、電話、統編或地址..."
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="show-inactive"
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="h-4 w-4 rounded border-muted-foreground"
            />
            <Label htmlFor="show-inactive" className="text-sm text-muted-foreground">
              顯示已停用的捐贈單位
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
                <TableHead>統一編號</TableHead>
                <TableHead>地址</TableHead>
                <TableHead className="w-[140px] text-center">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDonors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    尚未找到符合條件的捐贈單位
                  </TableCell>
                </TableRow>
              ) : (
                filteredDonors.map((donor) => (
                  <TableRow key={donor.id} className="hover:bg-muted/30">
                    <TableCell>
                      <Badge variant={donor.isActive ? "default" : "outline"}>
                        {donor.isActive ? "啟用中" : "已停用"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{donor.name}</div>
                    </TableCell>
                    <TableCell>{donor.phone || "—"}</TableCell>
                    <TableCell>{donor.taxId || "—"}</TableCell>
                    <TableCell>{donor.address || "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditClick(donor)}
                          title="編輯"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleDonorStatus(donor)}
                          title={donor.isActive ? "停用" : "啟用"}
                        >
                          {donor.isActive ? (
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

      <AddDonorDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onDonorCreated={handleDonorCreated}
      />

      <EditDonorDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        donor={editingDonor}
        onDonorUpdated={handleDonorUpdated}
      />
    </Card>
  );
}
