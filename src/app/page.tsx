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
import { DataManagement } from "@/components/admin/DataManagement";
import { RecordsView } from "@/components/RecordsView";
import { UserProfile } from "@/components/auth/UserProfile";
import * as XLSX from 'xlsx';
import { generateReceiptsPDF } from '@/lib/receipt-generator';
import { User, AuthGuard } from "@/components/auth/AuthGuard";
import { toast } from "sonner";
import { getPermissions } from "@/lib/permissions";
import { SignOutButton } from "@clerk/nextjs";
import { Menu, X } from "lucide-react";

type TabType = "supplies" | "records" | "staff" | "data";

interface Supply {
  id: string;
  category: string;
  name: string;
  quantity: number;
  unit: string;
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

interface HomePageProps {
  dbUser?: User | null;
}

function HomePage({ dbUser = null }: HomePageProps) {
  console.log('🔍 HomePage Debug:', { dbUser: dbUser?.id });
  const [activeTab, setActiveTab] = useState<TabType>("supplies");
  const [currentDbUser, setCurrentDbUser] = useState<User | null>(dbUser);
  
  // Sync dbUser prop changes to local state
  useEffect(() => {
    setCurrentDbUser(dbUser);
  }, [dbUser]);
  
  // Calculate user permissions
  const userPermissions = currentDbUser ? getPermissions(currentDbUser.role) : null;
  const [isAddSupplyOpen, setIsAddSupplyOpen] = useState(false);
  const [isBatchPickupOpen, setIsBatchPickupOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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


  useEffect(() => {
    if (currentDbUser) { // Only fetch supplies if currentDbUser is available
      fetchSupplies();
    }
  }, [currentDbUser]); // Add currentDbUser to dependency array

  // Handle user profile updates
  const handleUserUpdate = (updatedUser: User) => {
    console.log('[HomePage] Updating user data:', updatedUser);
    setCurrentDbUser(updatedUser);
  };

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    // Cleanup function to restore scroll on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  const stats = {
    totalCategories: supplies.length,
    monthlyDonations: 0, // Will be fetched from records later
    monthlyDistributions: 0, // Will be fetched from records later
    lowStock: supplies.filter(s => s.quantity < s.safetyStock).length,
  };

  // Note: User updates are now handled by AuthGuard

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

  const handlePrintReceipts = async (selectedRecords: DonationRecord[]) => {
    if (selectedRecords.length === 0) return;

    try {
      toast.loading('正在生成收據 PDF...');
      
      // 使用新的 PDF 生成器
      const pdfBlob = await generateReceiptsPDF(selectedRecords);
      
      // 創建下載連結
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `收據_${new Date().toLocaleDateString('zh-TW').replace(/\//g, '')}.pdf`;
      
      // 觸發下載
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // 清理 URL
      URL.revokeObjectURL(url);
      
      toast.success(`已生成 ${selectedRecords.length} 份收據 PDF`);
    } catch (error) {
      console.error('生成收據失敗:', error);
      toast.error('生成收據失敗，請稍後再試');
    }
  };

  const roleMapping = {
    ADMIN: '管理員',
    STAFF: '工作人員',
    VOLUNTEER: '志工',
  }

  // Auth handling is now managed by AuthGuard

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex flex-col">
      {/* Navigation Bar */}
      <nav className="border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 flex-shrink-0">
        <div className="container flex h-14 sm:h-16 items-center justify-between px-2 sm:px-4 lg:px-6 xl:px-8">
          {/* Left: Brand */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs sm:text-sm">苗</span>
            </div>
            <h1 className="hidden sm:block text-lg sm:text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              苗栗社福物資管理平台
            </h1>
          </div>

          {/* Desktop Navigation Tabs */}
          <div className="hidden md:flex flex-1 justify-center max-w-lg mx-4">
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
              {userPermissions?.canManageUsers && (
                <Button
                  variant={activeTab === "data" ? "default" : "ghost"}
                  onClick={() => setActiveTab("data")}
                  className="rounded-md text-sm px-3 py-2"
                  size="sm"
                >
                  資料管理
                </Button>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex-1 flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(true)}
              className="min-h-[44px] px-3 flex items-center gap-2"
            >
              <Menu className="h-4 w-4" />
              <span className="text-sm">選單</span>
            </Button>
          </div>

          {/* Right: User Info & Settings */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <ModeToggle />
            
            {currentDbUser && (
              <>
                {/* Divider */}
                <div className="hidden md:block h-6 w-px bg-border" />
                
                <div className="flex items-center gap-1 sm:gap-2 lg:gap-3">
                  {/* Role Badge */}
                  <span className="hidden sm:inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border">
                    {roleMapping[currentDbUser.role]}
                  </span>

                  {/* User Avatar */}
                  <div 
                    className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all"
                    onClick={() => setIsUserProfileOpen(true)}
                    title="點擊編輯個人資料"
                  >
                    <span className="text-white font-medium text-xs sm:text-sm">{currentDbUser.nickname?.[0]}</span>
                  </div>

                  {/* User Name */}
                  <button 
                    className="hidden lg:block text-sm font-medium text-foreground hover:text-primary transition-colors cursor-pointer"
                    onClick={() => setIsUserProfileOpen(true)}
                    title="點擊編輯個人資料"
                  >
                    {currentDbUser.nickname}
                  </button>

                  {/* Sign Out Button */}
                  <SignOutButton>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="hidden md:block text-sm text-muted-foreground hover:text-foreground px-4"
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
      <main className="flex flex-col flex-1 pb-20 sm:pb-24 md:pb-32">
        {activeTab === "supplies" && (
          <div className="flex flex-col flex-1 container px-2 sm:px-4 lg:px-6 max-w-7xl mx-auto">
            <div className="py-3 sm:py-6">
              <StatisticsCards stats={stats} />
            </div>
            <div className="flex-1 pb-3 sm:pb-6">
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
          <div className="flex flex-col flex-1 container px-2 sm:px-4 lg:px-6 max-w-7xl mx-auto py-3 sm:py-6">
            <RecordsView />
          </div>
        )}

        {activeTab === "staff" && (
          <div className="flex flex-col flex-1 container px-2 sm:px-4 lg:px-6 max-w-7xl mx-auto py-3 sm:py-6">
            <StaffManagement />
          </div>
        )}

        {activeTab === "data" && (
          <div className="flex flex-col flex-1 container px-2 sm:px-4 lg:px-6 max-w-7xl mx-auto py-3 sm:py-6">
            <DataManagement />
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
        dbUser={currentDbUser}
        onUserUpdate={handleUserUpdate}
      />

      {/* Mobile Sidebar */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-50 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Sidebar */}
          <div className="fixed left-0 top-0 h-full w-80 bg-background border-r z-50 md:hidden transform transition-transform duration-300">
            {/* Sidebar Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-sm">苗</span>
                </div>
                <h2 className="font-semibold text-lg">物資管理</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(false)}
                className="min-h-[44px] min-w-[44px] p-2"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Navigation Links */}
            <div className="p-4 space-y-2">
              <Button
                variant={activeTab === "supplies" ? "default" : "ghost"}
                onClick={() => {
                  setActiveTab("supplies");
                  setIsMobileMenuOpen(false);
                }}
                className="w-full justify-start text-left min-h-[48px] px-4"
              >
                物資管理
              </Button>
              
              {userPermissions?.canViewRecords && (
                <Button
                  variant={activeTab === "records" ? "default" : "ghost"}
                  onClick={() => {
                    setActiveTab("records");
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full justify-start text-left min-h-[48px] px-4"
                >
                  紀錄調取
                </Button>
              )}
              
              {userPermissions?.canManageUsers && (
                <Button
                  variant={activeTab === "staff" ? "default" : "ghost"}
                  onClick={() => {
                    setActiveTab("staff");
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full justify-start text-left min-h-[48px] px-4"
                >
                  人員管理
                </Button>
              )}
              
              {userPermissions?.canManageUsers && (
                <Button
                  variant={activeTab === "data" ? "default" : "ghost"}
                  onClick={() => {
                    setActiveTab("data");
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full justify-start text-left min-h-[48px] px-4"
                >
                  資料管理
                </Button>
              )}
            </div>

            {/* User Section in Mobile Sidebar */}
            {currentDbUser && (
              <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-muted/30">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                    <span className="text-white font-medium text-sm">{currentDbUser.nickname?.[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm break-words">{currentDbUser.nickname}</p>
                    <p className="text-xs text-muted-foreground">{roleMapping[currentDbUser.role]}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsUserProfileOpen(true);
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex-1 min-h-[44px]"
                  >
                    編輯資料
                  </Button>
                  <SignOutButton>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="min-h-[44px] px-4"
                    >
                      登出
                    </Button>
                  </SignOutButton>
                </div>
              </div>
            )}
          </div>
        </>
      )}

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

// Wrap HomePage with AuthGuard for authentication management
export default function App() {
  return (
    <AuthGuard>
      <HomePage />
    </AuthGuard>
  );
}


