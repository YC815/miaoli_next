"use client"

import * as React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTable } from "@/components/ui/data-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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

const formatSupplyItems = (items: { itemName: string; quantity: number }[]) => {
  return items.map(item => `${item.itemName} x ${item.quantity}`).join(', ');
};

const columns: ColumnDef<DisbursementRecord>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="全選"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="選擇行"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium"
        >
          發放日期
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      return (
        <div className="font-mono text-sm">
          {formatDate(row.getValue("createdAt"))}
        </div>
      )
    },
  },
  {
    accessorKey: "serialNumber",
    header: "流水號",
    cell: ({ row }) => {
      const serialNumber = row.getValue("serialNumber") as string;
      return (
        <div className="flex items-center">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 font-mono tracking-wide">
            {serialNumber}
          </span>
        </div>
      )
    },
  },
  {
    id: "supplyItems",
    header: "物資名稱",
    cell: ({ row }) => {
      const items = row.original.disbursementItems;
      return (
        <div className="max-w-xs">
          <div className="truncate" title={formatSupplyItems(items)}>
            {formatSupplyItems(items)}
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: "recipientUnitName",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium"
        >
          受贈單位
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
  },
  {
    accessorKey: "recipientPhone",
    header: "聯絡電話",
    cell: ({ row }) => {
      return row.getValue("recipientPhone") || "-";
    },
  },
  {
    accessorKey: "purpose",
    header: "用途",
    cell: ({ row }) => {
      const purpose = row.getValue("purpose") as string;
      return (
        <div className="max-w-xs">
          <div className="truncate" title={purpose || ""}>
            {purpose || "-"}
          </div>
        </div>
      )
    },
  },
  {
    id: "operator",
    header: "操作者",
    cell: ({ row }) => {
      return row.original.user.nickname || "-";
    },
  },
]

interface DisbursementRecordsTableProps {
  data: DisbursementRecord[]
  onSelectionChange?: (selectedRecords: DisbursementRecord[]) => void
}

export function DisbursementRecordsTable({ 
  data, 
  onSelectionChange 
}: DisbursementRecordsTableProps) {
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
        <DataTable
          columns={columns}
          data={data}
          searchKey="recipientUnitName"
          searchPlaceholder="搜尋受贈單位..."
          onSelectionChange={onSelectionChange}
        />
      </CardContent>
    </Card>
  )
}