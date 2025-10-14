"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";

interface SelectedItem {
  itemName: string;
  itemCategory: string;
  itemUnit: string;
  expiryDate?: string;
  isStandard: boolean;
  quantity: number;
  notes?: string;
}

interface ItemSummaryStepProps {
  selectedItems: SelectedItem[];
}

export function ItemSummaryStep({ selectedItems }: ItemSummaryStepProps) {
  if (selectedItems.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>請先在上一步選擇物品</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-2">捐贈確認</h3>
        <p className="text-sm text-muted-foreground">
          請確認以下捐贈物品資訊，確認無誤後即可提交捐贈申請。
        </p>
      </div>

      <div className="space-y-4">
        {selectedItems.map((item, index) => (
          <div key={index} className="border rounded-lg p-4 bg-muted/20">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h4 className="font-medium text-lg">{item.itemName}</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  分類：{item.itemCategory}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="text-sm font-medium">
                    數量：{item.quantity} {item.itemUnit}
                  </Badge>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Badge variant={item.isStandard ? "default" : "secondary"}>
                  {item.isStandard ? "標準物品" : "自訂物品"}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              {item.expiryDate && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">有效日期：</span>
                  <span className="text-sm">{item.expiryDate}</span>
                </div>
              )}

              {item.notes && item.notes.trim() && (
                <div className="space-y-1">
                  <span className="text-sm font-medium text-muted-foreground">備註：</span>
                  <div className="bg-background/80 border rounded p-3 text-sm">
                    {item.notes}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 捐贈總結 */}
      <div className="bg-muted/50 rounded-lg p-4 mt-6">
        <h4 className="font-medium mb-3">捐贈總結</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">物品種類：</span>
            <span className="font-medium">{selectedItems.length} 項</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">總數量：</span>
            <span className="font-medium">
              {selectedItems.reduce((sum, item) => sum + item.quantity, 0)} 件
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">標準物品：</span>
            <span className="font-medium">
              {selectedItems.filter(item => item.isStandard).length} 項
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">自訂物品：</span>
            <span className="font-medium">
              {selectedItems.filter(item => !item.isStandard).length} 項
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">包含備註：</span>
            <span className="font-medium">
              {selectedItems.filter(item => item.notes && item.notes.trim()).length} 項
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">設定有效期：</span>
            <span className="font-medium">
              {selectedItems.filter(item => item.expiryDate).length} 項
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}