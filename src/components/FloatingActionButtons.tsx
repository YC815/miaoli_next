"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Download, Receipt, Package, Menu } from "lucide-react";
import { useState } from "react";
import { Permission } from "@/lib/permissions";

interface FloatingActionButtonsProps {
  onAddSupply: () => void;
  onBatchPickup: () => void;
  onExportExcel: () => void;
  onPrintReceipt: () => void;
  userPermissions: Permission | null;
}

export function FloatingActionButtons({
  onAddSupply,
  onBatchPickup,
  onExportExcel,
  onPrintReceipt,
  userPermissions,
}: FloatingActionButtonsProps) {
  const [isOpen, setIsOpen] = useState(false);

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
      label: "匯出報表", 
      icon: Download, 
      onClick: onExportExcel, 
      variant: "outline" as const,
      description: "匯出物資清單Excel檔案",
      permission: "canExportReports" as keyof Permission
    },
    { 
      label: "收據列印", 
      icon: Receipt, 
      onClick: onPrintReceipt, 
      variant: "outline" as const,
      description: "列印捐贈收據PDF文件",
      permission: "canPrintReceipts" as keyof Permission
    },
  ];

  // Filter actions based on user permissions
  const actions = allActions.filter(action => 
    userPermissions?.[action.permission] === true
  );

  return (
    <>
      {/* Desktop View - Horizontal centered buttons */}
      <div className="hidden md:block">
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2">
          <div className="bg-background/80 backdrop-blur-lg border rounded-2xl p-4 shadow-2xl">
            <div className="flex gap-4 items-center">
              {actions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={index}
                    size="lg"
                    variant={action.variant}
                    className="rounded-xl shadow-md hover:shadow-lg transition-all duration-200 px-6 py-4 text-base font-medium"
                    onClick={action.onClick}
                  >
                    <Icon className="h-5 w-5 mr-2" />
                    {action.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile View - Hamburger menu */}
      <div className="md:hidden">
        <div className="fixed bottom-6 right-6">
          <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                size="lg"
                className="rounded-full h-16 w-16 shadow-2xl bg-primary hover:bg-primary/90 transition-all duration-300"
              >
                <Menu className="h-6 w-6" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              side="top" 
              className="w-64 mb-2 bg-background/95 backdrop-blur-lg border-2"
            >
              {actions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <DropdownMenuItem
                    key={index}
                    className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => {
                      action.onClick();
                      setIsOpen(false);
                    }}
                  >
                    <div className="flex items-start gap-3 w-full">
                      <Icon className="h-5 w-5 mt-1 text-primary" />
                      <div className="flex-1">
                        <div className="font-medium text-base">{action.label}</div>
                        <div className="text-sm text-muted-foreground mt-1">
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