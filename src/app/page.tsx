"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { StatisticsCards } from "@/components/StatisticsCards";
import { SuppliesTable } from "@/components/SuppliesTable";
import { FloatingActionButtons } from "@/components/FloatingActionButtons";
import { AddSupplyModal } from "@/components/modals/AddSupplyModal";
import { BatchPickupModal } from "@/components/modals/BatchPickupModal";
import { ReceiptModal } from "@/components/modals/ReceiptModal";
import { ModeToggle } from "@/components/theme-toggle";
import { StaffManagement } from "@/components/admin/StaffManagement";
import { UserProfile } from "@/components/auth/UserProfile";
import * as XLSX from 'xlsx';
import { User } from "@/components/auth/AuthGuard";
import { toast } from "sonner";
import { getPermissions } from "@/lib/permissions";
import { useUser, SignOutButton } from "@clerk/nextjs";

type TabType = "supplies" | "records" | "staff";

interface Supply {
  id: string;
  category: string;
  name: string;
  quantity: number;
  safetyStock: number;
}

interface SupplyItem {
  name: string;
  category: string;
  quantity: number;
  expiryDate?: string;
}

interface DonorInfo {
  name: string;
  phone: string;
  address: string;
}

interface BatchPickupInfo {
  unit: string;
  phone: string;
  purpose: string;
}

interface PickupItem {
  id: string;
  name: string;
  category: string;
  availableQuantity: number;
  requestedQuantity: number;
}

interface DonationRecord {
  id: string;
  donorName: string;
  donorPhone?: string;
  address?: string;
  notes?: string;
  createdAt: string;
  donationItems: {
    quantity: number;
    supply: {
      name: string;
    };
  }[];
  selected: boolean;
  items: string;
  date: string;
}

export default function HomePage() {
  const { isLoaded, isSignedIn, user: clerkUser } = useUser();
  const [dbUser, setDbUser] = useState<User | null>(null);
  
  console.log('🔍 HomePage Debug:', { isLoaded, isSignedIn, clerkUser: clerkUser?.id });
  const [activeTab, setActiveTab] = useState<TabType>("supplies");
  
  // Calculate user permissions
  const userPermissions = dbUser ? getPermissions(dbUser.role) : null;
  const [isAddSupplyOpen, setIsAddSupplyOpen] = useState(false);
  const [isBatchPickupOpen, setIsBatchPickupOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);

  const [supplies, setSupplies] = useState<Supply[]>([]);

  const fetchSupplies = async () => {
    try {
      const response = await fetch('/api/supplies');
      if (response.ok) {
        const data = await response.json();
        setSupplies(data);
      } else {
        toast.error("載入物資失敗");
      }
    } catch (error) {
      console.error("Error fetching supplies:", error);
      toast.error("載入物資失敗");
    }
  };

  // Sync user to database when Clerk loads
  useEffect(() => {
    const syncUser = async () => {
      if (isLoaded && isSignedIn && clerkUser && !dbUser) {
        console.log('🔄 開始同步用戶資料');
        try {
          const response = await fetch('/api/users/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: clerkUser.emailAddresses[0]?.emailAddress,
            }),
          });
          
          if (response.ok) {
            const userData = await response.json();
            console.log('✅ 用戶資料同步成功:', userData);
            setDbUser(userData);
          }
        } catch (error) {
          console.error('❌ 用戶同步錯誤:', error);
        }
      }
    };
    
    syncUser();
  }, [isLoaded, isSignedIn, clerkUser, dbUser]);

  useEffect(() => {
    if (dbUser) { // Only fetch supplies if dbUser is available
      fetchSupplies();
    }
  }, [dbUser]); // Add dbUser to dependency array

  const stats = {
    totalCategories: supplies.length,
    monthlyDonations: 0, // Will be fetched from records later
    monthlyDistributions: 0, // Will be fetched from records later
    lowStock: supplies.filter(s => s.quantity < s.safetyStock).length,
  };

  const handleUserUpdate = (updatedUser: User) => {
    setDbUser(updatedUser);
  };

  const handleAddSupply = async (donorInfo: DonorInfo, supplyItems: SupplyItem[], notes: string) => {
    console.log('🎯 handleAddSupply called with:');
    console.log('👤 donorInfo:', donorInfo);
    console.log('📦 supplyItems:', supplyItems);
    console.log('📝 notes:', notes);
    
    try {
      const requestBody = { donorInfo, supplyItems, notes };
      console.log('📤 Sending request body:', requestBody);
      
      const response = await fetch('/api/donations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📥 Response status:', response.status);
      
      if (response.ok) {
        const responseData = await response.json();
        console.log('✅ Success response:', responseData);
        toast.success("物資新增成功！");
        fetchSupplies(); // Refresh supplies list
        setIsAddSupplyOpen(false);
      } else {
        const errorData = await response.json();
        console.error('❌ Error response:', errorData);
        toast.error(`新增物資失敗: ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      console.error("💥 Error adding supply:", error);
      toast.error("新增物資失敗");
    }
  };

  const handleBatchPickup = async (pickupInfo: BatchPickupInfo, selectedItems: PickupItem[]) => {
    try {
      const response = await fetch('/api/disbursements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pickupInfo, selectedItems }),
      });

      if (response.ok) {
        toast.success("批量領取成功！");
        fetchSupplies(); // Refresh supplies list
        setIsBatchPickupOpen(false);
      } else {
        const errorData = await response.json();
        toast.error(`批量領取失敗: ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      console.error("Error batch pickup:", error);
      toast.error("批量領取失敗");
    }
  };

  const handleUpdateSupply = async (updatedSupply: Supply) => {
    try {
      const response = await fetch(`/api/supplies/${updatedSupply.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedSupply),
      });

      if (response.ok) {
        toast.success("物資資訊更新成功！");
        fetchSupplies(); // Refresh supplies list
      } else {
        const errorData = await response.json();
        toast.error(`更新物資失敗: ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      console.error("Error updating supply:", error);
      toast.error("更新物資失敗");
    }
  };

  const handleUpdateQuantity = async (id: string, newQuantity: number, changeType: string, reason: string) => {
    try {
      const response = await fetch('/api/inventory-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ supplyId: id, changeType, changeAmount: Math.abs(newQuantity - (supplies.find(s => s.id === id)?.quantity || 0)), newQuantity, reason }),
      });

      if (response.ok) {
        toast.success("庫存數量更新成功！");
        fetchSupplies(); // Refresh supplies list
      } else {
        const errorData = await response.json();
        toast.error(`更新庫存失敗: ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      console.error("Error updating quantity:", error);
      toast.error("更新庫存失敗");
    }
  };

  const handleUpdateSafetyStock = async (id: string, newSafetyStock: number) => {
    try {
      const response = await fetch(`/api/supplies/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ safetyStock: newSafetyStock }),
      });

      if (response.ok) {
        toast.success("安全庫存量更新成功！");
        fetchSupplies(); // Refresh supplies list
      } else {
        const errorData = await response.json();
        toast.error(`更新安全庫存失敗: ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      console.error("Error updating safety stock:", error);
      toast.error("更新安全庫存失敗");
    }
  };

  const handleExportExcel = () => {
    const exportData = supplies.map(supply => ({
      '品項類別': supply.category,
      '物資名稱': supply.name,
      '數量': supply.quantity,
      '安全庫存量': supply.safetyStock,
      '庫存狀態': supply.quantity < supply.safetyStock ? '不足' : '充足'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "物資清單");
    
    const now = new Date();
    const filename = `物資清單_${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}.xlsx`;
    
    XLSX.writeFile(wb, filename);
  };

  const handlePrintReceipts = (selectedRecords: DonationRecord[]) => {
    if (selectedRecords.length === 0) return;

    const receiptContent = selectedRecords.map(record => `
      <div style="margin-bottom: 30px; page-break-inside: avoid; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="margin: 0; color: #333;">苗栗社福促進協會</h2>
          <h3 style="margin: 5px 0; color: #666;">物資捐贈收據</h3>
        </div>
        <div style="margin-bottom: 15px;">
          <p><strong>捐贈者：</strong>${record.donorName}</p>
          <p><strong>聯絡電話：</strong>${record.donorPhone}</p>
          <p><strong>捐贈日期：</strong>${record.date}</p>
        </div>
        <div style="margin-bottom: 15px;">
          <p><strong>捐贈物資：</strong></p>
          <p style="margin-left: 20px;">${record.items}</p>
        </div>
        <div style="text-align: center; margin-top: 30px;">
          <p style="margin: 5px 0;">謝謝您的愛心捐贈！</p>
          <p style="margin: 5px 0; font-size: 12px; color: #666;">本收據為愛心證明，請妥善保管</p>
        </div>
      </div>
    `).join('');

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>捐贈收據</title>
            <style>
              body { font-family: 'Microsoft JhengHei', sans-serif; line-height: 1.6; }
              @media print { 
                body { margin: 0; padding: 20px; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <div style="max-width: 600px; margin: 0 auto;">
              ${receiptContent}
            </div>
            <div class="no-print" style="text-align: center; margin: 20px;">
              <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">列印收據</button>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const roleMapping = {
    ADMIN: '管理員',
    STAFF: '工作人員',
    VOLUNTEER: '志工',
  }

  // Handle loading state
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          <p className="text-muted-foreground">載入中...</p>
        </div>
      </div>
    );
  }

  // Handle not signed in
  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4 text-center max-w-md">
          <div className="text-4xl mb-4">🔒</div>
          <h2 className="text-2xl font-semibold">需要登入</h2>
          <p className="text-muted-foreground mb-6">
            請登入您的帳戶以使用物資管理系統
          </p>
          <button 
            onClick={() => window.location.href = '/sign-in'}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-lg font-medium"
          >
            前往登入
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex flex-col">
      {/* Navigation Bar */}
      <nav className="border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 flex-shrink-0">
        <div className="container flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left: Brand */}
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">苗</span>
            </div>
            <h1 className="hidden sm:block text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              苗栗社福物資管理平台
            </h1>
          </div>

          {/* Center: Navigation Tabs */}
          <div className="flex-1 flex justify-center max-w-lg mx-4">
            <div className="flex bg-muted/30 rounded-lg p-1">
              <Button
                variant={activeTab === "supplies" ? "default" : "ghost"}
                onClick={() => setActiveTab("supplies")}
                className="rounded-md text-sm px-3 py-2"
                size="sm"
              >
                物資管理
              </Button>
              {userPermissions?.canViewRecords && (
                <Button
                  variant={activeTab === "records" ? "default" : "ghost"}
                  onClick={() => setActiveTab("records")}
                  className="rounded-md text-sm px-3 py-2"
                  size="sm"
                >
                  紀錄調取
                </Button>
              )}
              {userPermissions?.canManageUsers && (
                <Button
                  variant={activeTab === "staff" ? "default" : "ghost"}
                  onClick={() => setActiveTab("staff")}
                  className="rounded-md text-sm px-3 py-2"
                  size="sm"
                >
                  人員管理
                </Button>
              )}
            </div>
          </div>

          {/* Right: User Info & Settings */}
          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <ModeToggle />
            
            {dbUser && (
              <>
                {/* Divider */}
                <div className="h-6 w-px bg-border" />
                
                <div className="flex items-center gap-3">
                  {/* Role Badge */}
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border">
                    {roleMapping[dbUser.role]}
                  </span>

                  {/* User Avatar */}
                  <div 
                    className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all"
                    onClick={() => setIsUserProfileOpen(true)}
                    title="點擊編輯個人資料"
                  >
                    <span className="text-white font-medium text-sm">{dbUser.nickname?.[0]}</span>
                  </div>

                  {/* User Name */}
                  <button 
                    className="hidden sm:block text-sm font-medium text-foreground hover:text-primary transition-colors cursor-pointer"
                    onClick={() => setIsUserProfileOpen(true)}
                    title="點擊編輯個人資料"
                  >
                    {dbUser.nickname}
                  </button>

                  {/* Sign Out Button */}
                  <SignOutButton>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-sm text-muted-foreground hover:text-foreground"
                    >
                      登出
                    </Button>
                  </SignOutButton>
                </div>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex flex-col flex-1 pb-32 md:pb-24">
        {activeTab === "supplies" && (
          <div className="flex flex-col flex-1 container px-2 sm:px-4 lg:px-6 max-w-7xl mx-auto">
            <div className="py-6">
              <StatisticsCards stats={stats} />
            </div>
            <div className="flex-1 pb-6">
              <SuppliesTable 
                supplies={supplies}
                onUpdateSupply={handleUpdateSupply}
                onUpdateQuantity={handleUpdateQuantity}
                onUpdateSafetyStock={handleUpdateSafetyStock}
                userPermissions={userPermissions}
              />
            </div>
          </div>
        )}

        {activeTab === "records" && (
          <div className="flex flex-col items-center justify-center flex-1 space-y-4">
            <div className="text-6xl">🚧</div>
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-semibold">功能開發中</h3>
              <p className="text-lg text-muted-foreground">紀錄調取功能即將上線，敬請期待</p>
            </div>
          </div>
        )}

        {activeTab === "staff" && (
          <div className="flex flex-col flex-1 container px-2 sm:px-4 lg:px-6 max-w-7xl mx-auto py-6">
            <StaffManagement />
          </div>
        )}
      </main>

      {/* Modals */}
      <AddSupplyModal 
        open={isAddSupplyOpen}
        onOpenChange={setIsAddSupplyOpen}
        onSubmit={handleAddSupply}
      />
      
      <BatchPickupModal
        open={isBatchPickupOpen}
        onOpenChange={setIsBatchPickupOpen}
        onSubmit={handleBatchPickup}
        supplies={supplies}
      />
      
      <ReceiptModal
        open={isReceiptOpen}
        onOpenChange={setIsReceiptOpen}
        onPrint={handlePrintReceipts}
      />

      <UserProfile
        open={isUserProfileOpen}
        onOpenChange={setIsUserProfileOpen}
        dbUser={dbUser}
        onUserUpdate={handleUserUpdate}
      />

      {/* Floating Action Buttons */}
      {activeTab === "supplies" && (
        <FloatingActionButtons
          onAddSupply={() => setIsAddSupplyOpen(true)}
          onBatchPickup={() => setIsBatchPickupOpen(true)}
          onExportExcel={handleExportExcel}
          onPrintReceipt={() => setIsReceiptOpen(true)}
          userPermissions={userPermissions}
        />
      )}
    </div>
  );
}


