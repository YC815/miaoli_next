"use client"

import * as React from "react"
import { Calendar, Trash2, Edit } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { DonationRecord } from "@/types/donation"

export type { DonationRecord }

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

interface DonationRecordsTableProps {
  data: DonationRecord[]
  onSelectionChange?: (selectedRecords: DonationRecord[]) => void
  onDelete?: (record: DonationRecord) => void
  onEdit?: (record: DonationRecord) => void
}

export function DonationRecordsTable({
  data,
  onSelectionChange,
  onDelete,
  onEdit
}: DonationRecordsTableProps) {
  const [selectedRecordIds, setSelectedRecordIds] = React.useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = React.useState("");

  // Filter data based on search term
  const filteredData = React.useMemo(() => {
    if (!searchTerm) return data;
    const lowerSearch = searchTerm.toLowerCase();
    return data.filter(record =>
      (record.donor && record.donor.name.toLowerCase().includes(lowerSearch)) ||
      (record.donor && record.donor.phone?.toLowerCase().includes(lowerSearch)) ||
      record.serialNumber.toLowerCase().includes(lowerSearch)
    );
  }, [data, searchTerm]);

  // Handle selection changes
  React.useEffect(() => {
    if (onSelectionChange) {
      const selectedRecords = data.filter(record => selectedRecordIds.has(record.id));
      onSelectionChange(selectedRecords);
    }
  }, [selectedRecordIds, data, onSelectionChange]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRecordIds(new Set(filteredData.map(r => r.id)));
    } else {
      setSelectedRecordIds(new Set());
    }
  };

  const handleSelectRecord = (recordId: string, checked: boolean) => {
    const newSelection = new Set(selectedRecordIds);
    if (checked) {
      newSelection.add(recordId);
    } else {
      newSelection.delete(recordId);
    }
    setSelectedRecordIds(newSelection);
  };

  const allSelected = filteredData.length > 0 && filteredData.every(r => selectedRecordIds.has(r.id));
  const someSelected = filteredData.some(r => selectedRecordIds.has(r.id)) && !allSelected;

  return (
    <Card className="border-0 shadow-md bg-card">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center space-x-3 text-lg">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
            <Calendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <span className="font-semibold text-foreground">物資捐贈紀錄</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        {/* Search Input */}
        <div className="mb-4">
          <Input
            placeholder="搜尋捐贈者..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>

        {/* Custom Table */}
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm min-w-max">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="h-12 px-4 text-left align-middle font-medium">
                  <Checkbox
                    checked={allSelected || (someSelected && "indeterminate")}
                    onCheckedChange={handleSelectAll}
                    aria-label="全選"
                  />
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium">捐贈日期</th>
                <th className="h-12 px-4 text-left align-middle font-medium">流水號</th>
                <th className="h-12 px-4 text-left align-middle font-medium">物資名稱</th>
                <th className="h-12 px-4 text-left align-middle font-medium">數量</th>
                <th className="h-12 px-4 text-left align-middle font-medium">備註</th>
                <th className="h-12 px-4 text-left align-middle font-medium">捐贈者</th>
                <th className="h-12 px-4 text-left align-middle font-medium">聯絡電話</th>
                <th className="h-12 px-4 text-left align-middle font-medium">地址</th>
                <th className="h-12 px-4 text-left align-middle font-medium">操作者</th>
                <th className="h-12 px-4 text-center align-middle font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={11} className="h-24 text-center">
                    沒有找到任何紀錄
                  </td>
                </tr>
              ) : (
                filteredData.map((record) => {
                  const items = record.donationItems;
                  return items.map((item, itemIndex) => (
                    <tr key={`${record.id}-${itemIndex}`} className="border-b">
                      {/* Checkbox - only show on first row */}
                      {itemIndex === 0 ? (
                        <td className="p-4 align-top" rowSpan={items.length}>
                          <Checkbox
                            checked={selectedRecordIds.has(record.id)}
                            onCheckedChange={(checked) => handleSelectRecord(record.id, !!checked)}
                            aria-label="選擇行"
                          />
                        </td>
                      ) : null}

                      {/* Date - only show on first row */}
                      {itemIndex === 0 ? (
                        <td className="p-4 align-top font-mono text-sm" rowSpan={items.length}>
                          {formatDate(record.createdAt)}
                        </td>
                      ) : null}

                      {/* Serial Number - only show on first row */}
                      {itemIndex === 0 ? (
                        <td className="p-4 align-top" rowSpan={items.length}>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 font-mono tracking-wide">
                            {record.serialNumber}
                          </span>
                        </td>
                      ) : null}

                      {/* Item Name */}
                      <td className="p-4 align-top">
                        {item.itemName}
                      </td>

                      {/* Quantity */}
                      <td className="p-4 align-top">
                        {item.quantity} {item.itemUnit}
                      </td>

                      {/* Item Notes */}
                      <td className="p-4 align-top max-w-xs">
                        <div className="truncate" title={item.notes || ""}>
                          {item.notes || "-"}
                        </div>
                      </td>

                      {/* Donor Name - only show on first row */}
                      {itemIndex === 0 ? (
                        <td className="p-4 align-top" rowSpan={items.length}>
                          {record.donor ? (
                            record.donor.name
                          ) : (
                            <span className="text-muted-foreground italic">匿名</span>
                          )}
                        </td>
                      ) : null}

                      {/* Donor Phone - only show on first row */}
                      {itemIndex === 0 ? (
                        <td className="p-4 align-top" rowSpan={items.length}>
                          {record.donor ? (record.donor.phone || "-") : "-"}
                        </td>
                      ) : null}

                      {/* Donor Address - only show on first row */}
                      {itemIndex === 0 ? (
                        <td className="p-4 align-top max-w-xs" rowSpan={items.length}>
                          {record.donor ? (
                            <div className="truncate" title={record.donor.address || ""}>
                              {record.donor.address || "-"}
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                      ) : null}

                      {/* Operator - only show on first row */}
                      {itemIndex === 0 ? (
                        <td className="p-4 align-top" rowSpan={items.length}>
                          {record.user.nickname || "-"}
                        </td>
                      ) : null}

                      {/* Actions - only show on first row */}
                      {itemIndex === 0 ? (
                        <td className="p-4 align-top text-center" rowSpan={items.length}>
                          <div className="flex items-center justify-center gap-1">
                            {onEdit && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onEdit(record)}
                                className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"
                                title="編輯"
                              >
                                <Edit className="h-4 w-4" />
                                <span className="sr-only">編輯</span>
                              </Button>
                            )}
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
                          </div>
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