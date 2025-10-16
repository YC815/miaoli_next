"use client"

import * as React from "react"
import { CellContext, ColumnDef, HeaderContext } from "@tanstack/react-table";
import { ArrowUpDown, TrendingUp, TrendingDown, MoreHorizontal, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTable } from "@/components/ui/data-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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

const createColumns = (onDelete?: (record: InventoryLog) => void): ColumnDef<InventoryLog>[] => [
  {
    id: "select",
    header: (context: HeaderContext<InventoryLog, unknown>) => {
      const { table } = context;

      return (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="選擇全部"
          className="translate-y-0.5"
        />
      );
    },
    cell: (context: CellContext<InventoryLog, unknown>) => {
      const { row } = context;

      return (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="選擇行"
          className="translate-y-0.5"
        />
      );
    },
    enableSorting: false,
    enableHiding: false,
    size: 40,
  },
  {
    accessorKey: "createdAt",
    header: (context: HeaderContext<InventoryLog, InventoryLog["createdAt"]>) => {
      const { column } = context;

      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 lg:px-3"
        >
          盤點時間
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: (context: CellContext<InventoryLog, InventoryLog["createdAt"]>) => {
      const value = context.getValue();

      return (
        <div className="text-sm font-medium">
          {formatDate(value)}
        </div>
      );
    },
    size: 150,
  },
  {
    id: "itemStockName",
    accessorFn: (row: InventoryLog) => row.itemStock.itemName,
    header: "物資資訊",
    cell: (context: CellContext<InventoryLog, string>) => {
      const { itemStock } = context.row.original;
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
    header: (context: HeaderContext<InventoryLog, InventoryLog["changeType"]>) => {
      const { column } = context;

      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 lg:px-3"
        >
          盤點調整
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: (context: CellContext<InventoryLog, InventoryLog["changeType"]>) => {
      const changeType = context.getValue();
      const changeAmount = context.row.original.changeAmount;
      const display = getChangeTypeDisplay(changeType, changeAmount);
      const Icon = display.icon;
      
      return (
        <div className={`flex items-center gap-2 px-2 py-1 rounded-md ${display.bgColor} w-fit`}>
          <Icon className={`h-4 w-4 ${display.color}`} />
          <span className={`text-sm font-medium ${display.color}`}>
            {display.text} {context.row.original.itemStock.itemUnit}
          </span>
        </div>
      );
    },
    size: 120,
  },
  {
    accessorKey: "previousQuantity",
    header: (context: HeaderContext<InventoryLog, InventoryLog["previousQuantity"]>) => {
      const { column } = context;

      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 lg:px-3"
        >
          盤點前
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: (context: CellContext<InventoryLog, InventoryLog["previousQuantity"]>) => {
      const value = context.getValue();

      return (
        <div className="text-sm font-medium">
          {value} {context.row.original.itemStock.itemUnit}
        </div>
      );
    },
    size: 110,
  },
  {
    accessorKey: "newQuantity",
    header: (context: HeaderContext<InventoryLog, InventoryLog["newQuantity"]>) => {
      const { column } = context;

      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 lg:px-3"
        >
          盤點後
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: (context: CellContext<InventoryLog, InventoryLog["newQuantity"]>) => {
      const value = context.getValue();

      return (
        <div className="text-sm font-medium">
          {value} {context.row.original.itemStock.itemUnit}
        </div>
      );
    },
    size: 100,
  },
  {
    accessorKey: "reason",
    header: "盤點原因",
    cell: (context: CellContext<InventoryLog, InventoryLog["reason"]>) => {
      const value = context.getValue();

      return (
        <div className="text-sm max-w-[200px] truncate" title={value}>
          {value}
        </div>
      );
    },
    size: 200,
  },
  {
    accessorKey: "user",
    header: "操作人員",
    cell: (context: CellContext<InventoryLog, InventoryLog["user"]>) => {
      const user = context.row.original.user;
      return (
        <div className="text-sm">
          {user.nickname || user.email.split('@')[0]}
        </div>
      );
    },
    size: 100,
  },
  {
    id: "actions",
    cell: (context: CellContext<InventoryLog, unknown>) => {
      const { row } = context;

      if (!onDelete) return null;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">開啟選單</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => onDelete(row.original)}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              刪除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    size: 50,
  },
];

interface InventoryLogsTableProps {
  data: InventoryLog[]
  onSelectionChange: (selectedRows: InventoryLog[]) => void
  onDelete?: (record: InventoryLog) => void
}

export function InventoryLogsTable({ data, onSelectionChange, onDelete }: InventoryLogsTableProps) {
  const columns = React.useMemo(() => createColumns(onDelete), [onDelete]);

  return (
    <Card className="border-0 shadow-md bg-card">
      <CardHeader className="px-6 pb-4">
        <CardTitle className="flex items-center space-x-3 text-lg">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30">
            <TrendingUp className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <span className="font-semibold text-foreground">盤點紀錄</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <DataTable
          columns={columns}
          data={data}
          onSelectionChange={onSelectionChange}
          searchKey="itemStockName"
          searchPlaceholder="搜尋物資名稱..."
          showFooter={false}
        />
      </CardContent>
    </Card>
  );
}
