"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Download, Package, Menu, FileText } from "lucide-react";
import { useState } from "react";
import { Permission } from "@/lib/permissions";

interface FloatingActionButtonsProps {
  onAddSupply: () => void;
  onBatchPickup: () => void;
  onExportExcel: () => void;
  onGenerateDisbursementReceipt: () => void;
  onPrintReceipt: () => void; // Kept for backward compatibility
  userPermissions: Permission | null;
}

export function FloatingActionButtons({
  onAddSupply,
  onBatchPickup,
  onExportExcel,
  onGenerateDisbursementReceipt,
  onPrintReceipt: _onPrintReceipt,
  userPermissions,
}: FloatingActionButtonsProps) {
  const [isOpen, setIsOpen] = useState(false);
  void _onPrintReceipt;

  const allActions = [
    {
      label: "新增物資",
      icon: Plus,
      onClick: onAddSupply,
      variant: "default" as const,
      description: "新增捐贈物資到庫存",
      permission: "canAddSupplies" as keyof Permission
    },
    {
      label: "批量物資領取",
      icon: Package,
      onClick: onBatchPickup,
      variant: "secondary" as const,
      description: "批量分發物資給受助單位",
      permission: "canAddSupplies" as keyof Permission // 批量領取也算是物資操作
    },
    {
      label: "物資領取單",
      icon: FileText,
      onClick: onGenerateDisbursementReceipt,
      variant: "outline" as const,
      description: "從發放紀錄生成領取單 PDF",
      permission: "canPrintReceipts" as keyof Permission
    },
    {
      label: "匯出報表",
      icon: Download,
      onClick: onExportExcel,
      variant: "outline" as const,
      description: "匯出物資清單Excel檔案",
      permission: "canExportReports" as keyof Permission
    },
    // Receipt printing temporarily disabled - see README.md for restoration instructions
    // {
    //   label: "收據列印",
    //   icon: Receipt,
    //   onClick: onPrintReceipt,
    //   variant: "outline" as const,
    //   description: "列印捐贈收據PDF文件",
    //   permission: "canPrintReceipts" as keyof Permission
    // },
  ];

  // Filter actions based on user permissions
  const actions = allActions.filter(action => 
    userPermissions?.[action.permission] === true
  );

  return (
    <>
      {/* Desktop View - Horizontal centered buttons */}
      <div className="hidden md:block">
        <div className="fixed bottom-6 sm:bottom-8 left-1/2 transform -translate-x-1/2 z-40">
          <div className="bg-background/80 backdrop-blur-lg border rounded-2xl p-3 sm:p-4 shadow-2xl">
            <div className="flex gap-2 sm:gap-4 items-center">
              {actions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={index}
                    size="sm"
                    variant={action.variant}
                    className="rounded-xl shadow-md hover:shadow-lg transition-all duration-200 px-3 sm:px-6 py-2 sm:py-4 text-sm sm:text-base font-medium min-h-[44px]"
                    onClick={action.onClick}
                  >
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                    <span className="hidden lg:inline">{action.label}</span>
                    <span className="lg:hidden">{action.label.split('物')[0]}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile View - Hamburger menu */}
      <div className="md:hidden">
        <div className="fixed bottom-4 right-4 z-40">
          <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                size="lg"
                className="rounded-full h-14 w-14 shadow-2xl bg-primary hover:bg-primary/90 transition-all duration-300"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              side="top" 
              className="w-72 mb-2 mr-2 bg-background/95 backdrop-blur-lg border-2"
            >
              {actions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <DropdownMenuItem
                    key={index}
                    className="p-3 cursor-pointer hover:bg-accent/50 transition-colors min-h-[56px]"
                    onClick={() => {
                      action.onClick();
                      setIsOpen(false);
                    }}
                  >
                    <div className="flex items-start gap-3 w-full">
                      <Icon className="h-5 w-5 mt-1 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm sm:text-base break-words">{action.label}</div>
                        <div className="text-xs sm:text-sm text-muted-foreground mt-1 break-words">
                          {action.description}
                        </div>
                      </div>
                    </div>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </>
  );
}
