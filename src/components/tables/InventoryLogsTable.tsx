"use client"

import * as React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, TrendingUp, TrendingDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTable } from "@/components/ui/data-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export interface InventoryLog {
  id: string
  changeType: 'INCREASE' | 'DECREASE'
  changeAmount: number
  previousQuantity: number
  newQuantity: number
  reason: string
  createdAt: string
  user: {
    id: string
    nickname: string | null
    email: string
  }
  itemStock: {
    id: string
    itemName: string
    itemCategory: string
    itemUnit: string
  }
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

const getChangeTypeDisplay = (changeType: 'INCREASE' | 'DECREASE', changeAmount: number) => {
  const isIncrease = changeType === 'INCREASE';
  return {
    icon: isIncrease ? TrendingUp : TrendingDown,
    text: isIncrease ? `+${changeAmount}` : `-${changeAmount}`,
    color: isIncrease ? 'text-green-600' : 'text-red-600',
    bgColor: isIncrease ? 'bg-green-50' : 'bg-red-50',
  };
};

const getCategoryColor = (category: string) => {
  const colors = {
    '生活用品': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    '食品': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    '衣物': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    '醫療用品': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };
  return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
};

const columns: ColumnDef<InventoryLog>[] = [
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
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="選擇行"
        className="translate-y-0.5"
      />
    ),
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
        盤點時間
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-sm font-medium">
        {formatDate(row.getValue("createdAt"))}
      </div>
    ),
    size: 150,
  },
  {
    id: "itemStockName",
    accessorFn: (row) => row.itemStock.itemName,
    header: "物資資訊",
    cell: ({ row }) => {
      const { itemStock } = row.original;
      return (
        <div className="flex flex-col gap-1">
          <div className="font-medium text-sm">{itemStock.itemName}</div>
          <Badge
            variant="secondary"
            className={`w-fit text-xs ${getCategoryColor(itemStock.itemCategory)}`}
          >
            {itemStock.itemCategory}
          </Badge>
        </div>
      );
    },
    size: 200,
  },
  {
    accessorKey: "changeType",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-8 px-2 lg:px-3"
      >
        盤點調整
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const changeType = row.getValue("changeType") as 'INCREASE' | 'DECREASE';
      const changeAmount = row.original.changeAmount;
      const display = getChangeTypeDisplay(changeType, changeAmount);
      const Icon = display.icon;
      
      return (
        <div className={`flex items-center gap-2 px-2 py-1 rounded-md ${display.bgColor} w-fit`}>
          <Icon className={`h-4 w-4 ${display.color}`} />
          <span className={`text-sm font-medium ${display.color}`}>
            {display.text} {row.original.itemStock.itemUnit}
          </span>
        </div>
      );
    },
    size: 120,
  },
  {
    accessorKey: "previousQuantity",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-8 px-2 lg:px-3"
      >
        盤點前
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-sm font-medium">
        {row.getValue("previousQuantity")} {row.original.itemStock.itemUnit}
      </div>
    ),
    size: 110,
  },
  {
    accessorKey: "newQuantity",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-8 px-2 lg:px-3"
      >
        盤點後
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-sm font-medium">
        {row.getValue("newQuantity")} {row.original.itemStock.itemUnit}
      </div>
    ),
    size: 100,
  },
  {
    accessorKey: "reason",
    header: "盤點原因",
    cell: ({ row }) => (
      <div className="text-sm max-w-[200px] truncate" title={row.getValue("reason")}>
        {row.getValue("reason")}
      </div>
    ),
    size: 200,
  },
  {
    accessorKey: "user",
    header: "操作人員",
    cell: ({ row }) => {
      const user = row.getValue("user") as InventoryLog['user'];
      return (
        <div className="text-sm">
          {user.nickname || user.email.split('@')[0]}
        </div>
      );
    },
    size: 100,
  },
];

interface InventoryLogsTableProps {
  data: InventoryLog[]
  onSelectionChange: (selectedRows: InventoryLog[]) => void
}

export function InventoryLogsTable({ data, onSelectionChange }: InventoryLogsTableProps) {
  return (
    <Card className="border-0 shadow-none bg-transparent">
      <CardHeader className="px-0 pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          盤點紀錄
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <DataTable
          columns={columns}
          data={data}
          onSelectionChange={onSelectionChange}
          searchKey="itemStockName"
          searchPlaceholder="搜尋物資名稱..."
        />
      </CardContent>
    </Card>
  );
}
