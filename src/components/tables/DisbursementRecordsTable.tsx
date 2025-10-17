"use client"

import * as React from "react"
import { Package, Trash2, Edit, ArrowUpDown, MoreHorizontal } from "lucide-react"
import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RecordsDataTable } from "@/components/ui/records-data-table"
import { ItemRecordsDataTable } from "@/components/ui/item-records-data-table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export interface DisbursementRecord {
  id: string
  serialNumber: string
  recipientUnitId: string | null
  recipientUnitName: string
  recipientUnit?: {
    id: string
    name: string
    serviceCount: number | null
  } | null
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

// Flattened row type for table display
interface DisbursementTableRow {
  id: string // unique row id
  recordId: string // original record id
  serialNumber: string
  createdAt: string
  itemName: string
  itemCategory: string
  itemUnit: string
  quantity: number
  recipientUnitName: string
  recipientPhone: string | null
  recipientAddress: string | null
  purpose: string | null
  operatorName: string | null
  isFirstItem: boolean
  itemCount: number
  originalRecord: DisbursementRecord
}

interface DisbursementRecordsTableProps {
  data: DisbursementRecord[]
  onSelectionChange?: (selectedRecords: DisbursementRecord[]) => void
  onDelete?: (record: DisbursementRecord) => void
  onEdit?: (record: DisbursementRecord) => void
  showFooter?: boolean
  variant?: "records" | "item-dialog"
  selectionMode?: "single" | "multiple"
}

const createColumns = (
  onDelete?: (record: DisbursementRecord) => void,
  onEdit?: (record: DisbursementRecord) => void
): ColumnDef<DisbursementTableRow>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="選擇全部"
        className="translate-y-0.5"
      />
    ),
    cell: ({ row }) => {
      if (!row.original.isFirstItem) return null
      return (
        <div className={row.original.itemCount > 1 ? "pb-2" : ""}>
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="選擇行"
            className="translate-y-0.5"
          />
        </div>
      )
    },
    enableSorting: false,
    enableHiding: false,
    size: 40,
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-8 px-2 lg:px-3"
      >
        發放日期
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      if (!row.original.isFirstItem) return null
      return (
        <div className={`text-sm font-mono ${row.original.itemCount > 1 ? "pb-2" : ""}`}>
          {formatDate(row.getValue("createdAt"))}
        </div>
      )
    },
    size: 150,
  },
  {
    accessorKey: "serialNumber",
    header: "流水號",
    cell: ({ row }) => {
      if (!row.original.isFirstItem) return null
      return (
        <div className={row.original.itemCount > 1 ? "pb-2" : ""}>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 font-mono tracking-wide">
            {row.getValue("serialNumber")}
          </span>
        </div>
      )
    },
    size: 120,
  },
  {
    accessorKey: "itemName",
    header: "物資名稱",
    cell: ({ row }) => (
      <div className="text-sm">{row.getValue("itemName")}</div>
    ),
    size: 150,
  },
  {
    accessorKey: "quantity",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-8 px-2 lg:px-3"
      >
        數量
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-sm">
        {row.getValue("quantity")} {row.original.itemUnit}
      </div>
    ),
    size: 100,
  },
  {
    accessorKey: "recipientUnitName",
    header: "受贈單位",
    cell: ({ row }) => {
      if (!row.original.isFirstItem) return null
      return (
        <div className={`text-sm ${row.original.itemCount > 1 ? "pb-2" : ""}`}>
          {row.getValue("recipientUnitName")}
        </div>
      )
    },
    size: 150,
  },
  {
    accessorKey: "recipientPhone",
    header: "聯絡電話",
    cell: ({ row }) => {
      if (!row.original.isFirstItem) return null
      const phone = row.getValue("recipientPhone") as string | null
      return (
        <div className={`text-sm ${row.original.itemCount > 1 ? "pb-2" : ""}`}>
          {phone || "-"}
        </div>
      )
    },
    size: 120,
  },
  {
    accessorKey: "purpose",
    header: "用途",
    cell: ({ row }) => {
      if (!row.original.isFirstItem) return null
      const purpose = row.getValue("purpose") as string | null
      return (
        <div className={`text-sm max-w-[200px] truncate ${row.original.itemCount > 1 ? "pb-2" : ""}`} title={purpose || ""}>
          {purpose || "-"}
        </div>
      )
    },
    size: 200,
  },
  {
    accessorKey: "operatorName",
    header: "操作者",
    cell: ({ row }) => {
      if (!row.original.isFirstItem) return null
      return (
        <div className={`text-sm ${row.original.itemCount > 1 ? "pb-2" : ""}`}>
          {row.getValue("operatorName") || "-"}
        </div>
      )
    },
    size: 100,
  },
  {
    id: "actions",
    cell: ({ row }) => {
      if (!row.original.isFirstItem) return null
      if (!onDelete && !onEdit) return null

      return (
        <div className={row.original.itemCount > 1 ? "pb-2" : ""}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">開啟選單</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(row.original.originalRecord)}>
                  <Edit className="mr-2 h-4 w-4" />
                  編輯
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(row.original.originalRecord)}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  刪除
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    },
    size: 50,
  },
]

export function DisbursementRecordsTable({
  data,
  onSelectionChange,
  onDelete,
  onEdit,
  variant = "records",
  selectionMode = "multiple",
}: DisbursementRecordsTableProps) {
  // Flatten disbursement records into individual rows
  const flattenedData = React.useMemo(() => {
    const rows: DisbursementTableRow[] = []
    data.forEach((record) => {
      const items = record.disbursementItems
      items.forEach((item, index) => {
        rows.push({
          id: `${record.id}-${index}`,
          recordId: record.id,
          serialNumber: record.serialNumber,
          createdAt: record.createdAt,
          itemName: item.itemName,
          itemCategory: item.itemCategory,
          itemUnit: item.itemUnit,
          quantity: item.quantity,
          recipientUnitName: record.recipientUnitName,
          recipientPhone: record.recipientPhone,
          recipientAddress: record.recipientAddress,
          purpose: record.purpose || null,
          operatorName: record.user.nickname,
          isFirstItem: index === 0,
          itemCount: items.length,
          originalRecord: record,
        })
      })
    })
    return rows
  }, [data])

  const columns = React.useMemo(() => createColumns(onDelete, onEdit), [onDelete, onEdit])

  // Handle selection changes - group by recordId
  const handleSelectionChange = React.useCallback((selectedRows: DisbursementTableRow[]) => {
    if (!onSelectionChange) return

    // Get unique records from selected rows
    const uniqueRecordIds = new Set(selectedRows.map(row => row.recordId))
    const selectedRecords = data.filter(record => uniqueRecordIds.has(record.id))
    onSelectionChange(selectedRecords)
  }, [data, onSelectionChange])

  const DataTableComponent = variant === "item-dialog" ? ItemRecordsDataTable : RecordsDataTable

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
        <DataTableComponent
          columns={columns}
          data={flattenedData}
          searchKey={variant === "records" ? "recipientUnitName" : undefined}
          searchPlaceholder="搜尋受贈單位..."
          onSelectionChange={handleSelectionChange}
          selectionMode={selectionMode}
        />
      </CardContent>
    </Card>
  )
}
