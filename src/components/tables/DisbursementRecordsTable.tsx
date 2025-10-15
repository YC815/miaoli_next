"use client"

import * as React from "react"
import { Package, Trash2 } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export interface DisbursementRecord {
  id: string
  serialNumber: string
  recipientUnitName: string
  recipientPhone: string | null
  recipientAddress: string | null
  createdAt: string
  user: {
    id: string
    nickname: string | null
  }
  disbursementItems: {
    id: string
    itemName: string
    itemCategory: string
    itemUnit: string
    quantity: number
  }[]
  purpose?: string | null
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatSupplyItemTooltip = (
  items: { itemName: string; itemUnit: string; quantity: number }[]
) => {
  return items
    .map(item => `${item.itemName} x ${item.quantity} ${item.itemUnit}`)
    .join(', ');
};

interface DisbursementRecordsTableProps {
  data: DisbursementRecord[]
  onSelectionChange?: (selectedRecords: DisbursementRecord[]) => void
  onDelete?: (record: DisbursementRecord) => void
}

export function DisbursementRecordsTable({ 
  data, 
  onSelectionChange, 
  onDelete
}: DisbursementRecordsTableProps) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedRecordIds, setSelectedRecordIds] = React.useState<Set<string>>(new Set());

  const filteredData = React.useMemo(() => {
    if (!searchTerm) return data;
    const lower = searchTerm.toLowerCase();
    return data.filter(record => {
      const matchesUnit = record.recipientUnitName.toLowerCase().includes(lower);
      const matchesSerial = record.serialNumber.toLowerCase().includes(lower);
      const matchesPhone = record.recipientPhone?.toLowerCase().includes(lower) ?? false;
      const matchesPurpose = record.purpose?.toLowerCase().includes(lower) ?? false;
      return matchesUnit || matchesSerial || matchesPhone || matchesPurpose;
    });
  }, [data, searchTerm]);

  React.useEffect(() => {
    if (!onSelectionChange) return;
    const selectedRecords = data.filter(record => selectedRecordIds.has(record.id));
    onSelectionChange(selectedRecords);
  }, [data, onSelectionChange, selectedRecordIds]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRecordIds(new Set(filteredData.map(r => r.id)));
    } else {
      setSelectedRecordIds(new Set());
    }
  };

  const handleSelectRecord = (recordId: string, checked: boolean) => {
    const next = new Set(selectedRecordIds);
    if (checked) {
      next.add(recordId);
    } else {
      next.delete(recordId);
    }
    setSelectedRecordIds(next);
  };

  const allSelected = filteredData.length > 0 && filteredData.every(r => selectedRecordIds.has(r.id));
  const someSelected = filteredData.some(r => selectedRecordIds.has(r.id)) && !allSelected;

  return (
    <Card className="border-0 shadow-md bg-card">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center space-x-3 text-lg">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <span className="font-semibold text-foreground">物資發放紀錄</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <div className="mb-4">
          <Input
            placeholder="搜尋受贈單位、流水號或用途..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="max-w-sm"
          />
        </div>

        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="h-12 px-4 text-left align-middle font-medium">
                  <Checkbox
                    checked={allSelected || (someSelected && "indeterminate")}
                    onCheckedChange={handleSelectAll}
                    aria-label="全選"
                  />
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium">發放日期</th>
                <th className="h-12 px-4 text-left align-middle font-medium">流水號</th>
                <th className="h-12 px-4 text-left align-middle font-medium">物資名稱</th>
                <th className="h-12 px-4 text-left align-middle font-medium">數量</th>
                <th className="h-12 px-4 text-left align-middle font-medium">受贈單位</th>
                <th className="h-12 px-4 text-left align-middle font-medium">聯絡電話</th>
                <th className="h-12 px-4 text-left align-middle font-medium">用途</th>
                <th className="h-12 px-4 text-left align-middle font-medium">操作者</th>
                <th className="h-12 px-4 text-center align-middle font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={10} className="h-24 text-center">
                    沒有找到任何紀錄
                  </td>
                </tr>
              ) : (
                filteredData.map(record => {
                  const items = record.disbursementItems;

                  return items.map((item, itemIndex) => (
                    <tr key={`${record.id}-${itemIndex}`} className="border-b" title={formatSupplyItemTooltip(items)}>
                      {itemIndex === 0 ? (
                        <td className="p-4 align-top" rowSpan={items.length}>
                          <Checkbox
                            checked={selectedRecordIds.has(record.id)}
                            onCheckedChange={(checked) => handleSelectRecord(record.id, !!checked)}
                            aria-label="選擇行"
                          />
                        </td>
                      ) : null}

                      {itemIndex === 0 ? (
                        <td className="p-4 align-top font-mono text-sm" rowSpan={items.length}>
                          {formatDate(record.createdAt)}
                        </td>
                      ) : null}

                      {itemIndex === 0 ? (
                        <td className="p-4 align-top" rowSpan={items.length}>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 font-mono tracking-wide">
                            {record.serialNumber}
                          </span>
                        </td>
                      ) : null}

                      <td className="p-4 align-top">
                        {item.itemName}
                      </td>

                      <td className="p-4 align-top">
                        {item.quantity} {item.itemUnit}
                      </td>

                      {itemIndex === 0 ? (
                        <td className="p-4 align-top" rowSpan={items.length}>
                          {record.recipientUnitName}
                        </td>
                      ) : null}

                      {itemIndex === 0 ? (
                        <td className="p-4 align-top" rowSpan={items.length}>
                          {record.recipientPhone || "-"}
                        </td>
                      ) : null}

                      {itemIndex === 0 ? (
                        <td className="p-4 align-top max-w-xs" rowSpan={items.length}>
                          <div className="truncate" title={record.purpose || ""}>
                            {record.purpose || "-"}
                          </div>
                        </td>
                      ) : null}

                      {itemIndex === 0 ? (
                        <td className="p-4 align-top" rowSpan={items.length}>
                          {record.user.nickname || "-"}
                        </td>
                      ) : null}
                      {itemIndex === 0 ? (
                        <td className="p-4 align-top text-center" rowSpan={items.length}>
                          {onDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDelete(record)}
                              className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                              title="刪除"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">刪除</span>
                            </Button>
                          )}
                        </td>
                      ) : null}
                    </tr>
                  ));
                })
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
