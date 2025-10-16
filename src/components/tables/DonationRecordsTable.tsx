"use client"

import * as React from "react"
import { Calendar, Trash2, Edit, ArrowUpDown } from "lucide-react"
import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RecordsDataTable } from "@/components/ui/records-data-table"
import { ItemRecordsDataTable } from "@/components/ui/item-records-data-table"
import { DonationRecord } from "@/types/donation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react"

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

// Flattened row type for table display
interface DonationTableRow {
  id: string // unique row id
  recordId: string // original record id
  serialNumber: string
  createdAt: string
  itemName: string
  itemUnit: string
  quantity: number
  expiryDate: string | null
  notes: string | null
  donorName: string | null
  donorPhone: string | null
  donorAddress: string | null
  operatorName: string | null
  isFirstItem: boolean
  itemCount: number
  originalRecord: DonationRecord
}

interface DonationRecordsTableProps {
  data: DonationRecord[]
  onSelectionChange?: (selectedRecords: DonationRecord[]) => void
  onDelete?: (record: DonationRecord) => void
  onEdit?: (record: DonationRecord) => void
  showFooter?: boolean
  variant?: "records" | "item-dialog"
}

const createColumns = (
  onDelete?: (record: DonationRecord) => void,
  onEdit?: (record: DonationRecord) => void
): ColumnDef<DonationTableRow>[] => [
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
        捐贈日期
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
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 font-mono tracking-wide">
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
    accessorKey: "expiryDate",
    header: "有效期限",
    cell: ({ row }) => {
      const expiryDate = row.getValue("expiryDate") as string | null
      if (!expiryDate) {
        return <div className="text-sm text-muted-foreground">-</div>
      }
      const formattedDate = new Date(expiryDate).toLocaleDateString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
      return <div className="text-sm">{formattedDate}</div>
    },
    size: 110,
  },
  {
    accessorKey: "notes",
    header: "備註",
    cell: ({ row }) => {
      const notes = row.getValue("notes") as string | null
      return (
        <div className="text-sm max-w-[200px] truncate" title={notes || ""}>
          {notes || "-"}
        </div>
      )
    },
    size: 200,
  },
  {
    accessorKey: "donorName",
    header: "捐贈者",
    cell: ({ row }) => {
      if (!row.original.isFirstItem) return null
      const donorName = row.getValue("donorName") as string | null
      return (
        <div className={`text-sm ${row.original.itemCount > 1 ? "pb-2" : ""}`}>
          {donorName || <span className="text-muted-foreground italic">匿名</span>}
        </div>
      )
    },
    size: 120,
  },
  {
    accessorKey: "donorPhone",
    header: "聯絡電話",
    cell: ({ row }) => {
      if (!row.original.isFirstItem) return null
      const phone = row.getValue("donorPhone") as string | null
      return (
        <div className={`text-sm ${row.original.itemCount > 1 ? "pb-2" : ""}`}>
          {phone || "-"}
        </div>
      )
    },
    size: 120,
  },
  {
    accessorKey: "donorAddress",
    header: "地址",
    cell: ({ row }) => {
      if (!row.original.isFirstItem) return null
      const address = row.getValue("donorAddress") as string | null
      return (
        <div className={`text-sm max-w-[200px] truncate ${row.original.itemCount > 1 ? "pb-2" : ""}`} title={address || ""}>
          {address || "-"}
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

export function DonationRecordsTable({
  data,
  onSelectionChange,
  onDelete,
  onEdit,
  variant = "records"
}: DonationRecordsTableProps) {
  // Flatten donation records into individual rows
  const flattenedData = React.useMemo(() => {
    const rows: DonationTableRow[] = []
    data.forEach((record) => {
      const items = record.donationItems
      items.forEach((item, index) => {
        rows.push({
          id: `${record.id}-${index}`,
          recordId: record.id,
          serialNumber: record.serialNumber,
          createdAt: record.createdAt,
          itemName: item.itemName,
          itemUnit: item.itemUnit,
          quantity: item.quantity,
          expiryDate: item.expiryDate,
          notes: item.notes,
          donorName: record.donor?.name || null,
          donorPhone: record.donor?.phone || null,
          donorAddress: record.donor?.address || null,
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
  const handleSelectionChange = React.useCallback((selectedRows: DonationTableRow[]) => {
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
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
            <Calendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <span className="font-semibold text-foreground">物資捐贈紀錄</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <DataTableComponent
          columns={columns}
          data={flattenedData}
          searchKey={variant === "records" ? "donorName" : undefined}
          searchPlaceholder="搜尋捐贈者..."
          onSelectionChange={handleSelectionChange}
        />
      </CardContent>
    </Card>
  )
}
