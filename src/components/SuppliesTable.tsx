import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoreHorizontal, Search, AlertTriangle, Package, Copy, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useState } from "react";
import { EditSupplyModal } from "@/components/modals/EditSupplyModal";
import { EditQuantityModal } from "@/components/modals/EditQuantityModal";
import { EditSafetyStockModal } from "@/components/modals/EditSafetyStockModal";
import { Permission } from "@/lib/permissions";

interface Supply {
  id: string;
  category: string;
  name: string;
  quantity: number;
  unit: string;
  safetyStock: number;
}

interface SuppliesTableProps {
  supplies: Supply[];
  onUpdateSupply: (updatedSupply: Supply) => void;
  onUpdateQuantity: (id: string, newQuantity: number, changeType: string, reason: string) => void;
  onUpdateSafetyStock: (id: string, newSafetyStock: number) => void;
  userPermissions: Permission | null;
}

type SortField = 'category' | 'name' | 'quantity' | 'safetyStock' | 'status';
type SortDirection = 'asc' | 'desc' | null;

export function SuppliesTable({ supplies, onUpdateSupply, onUpdateQuantity, onUpdateSafetyStock, userPermissions }: SuppliesTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isEditSupplyOpen, setIsEditSupplyOpen] = useState(false);
  const [isEditQuantityOpen, setIsEditQuantityOpen] = useState(false);
  const [isEditSafetyStockOpen, setIsEditSafetyStockOpen] = useState(false);
  const [selectedSupply, setSelectedSupply] = useState<Supply | null>(null);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const filteredAndSortedSupplies = (() => {
    const filtered = supplies.filter(supply =>
      supply.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supply.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!sortField || !sortDirection) return filtered;

    return [...filtered].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case 'category':
          aValue = a.category;
          bValue = b.category;
          break;
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'quantity':
          aValue = a.quantity;
          bValue = b.quantity;
          break;
        case 'safetyStock':
          aValue = a.safetyStock;
          bValue = b.safetyStock;
          break;
        case 'status':
          const aStatus = getStockStatus(a.quantity, a.safetyStock);
          const bStatus = getStockStatus(b.quantity, b.safetyStock);
          aValue = aStatus.label;
          bValue = bStatus.label;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  })();

  const getCategoryColor = (category: string) => {
    const colors = {
      '生活用品': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      '食品': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      '衣物': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      '醫療用品': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  };

  const getStockStatus = (quantity: number, safetyStock: number) => {
    if (quantity === 0) return { label: '無庫存', color: 'text-red-600 font-bold' };
    if (quantity < safetyStock) return { label: '庫存不足', color: 'text-orange-600 font-medium' };
    if (quantity === safetyStock) return { label: '剛好達標', color: 'text-yellow-600 font-medium' };
    return { label: '庫存充足', color: 'text-green-600' };
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortField(null);
        setSortDirection(null);
      } else {
        setSortDirection('asc');
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />;
    if (sortDirection === 'asc') return <ArrowUp className="h-4 w-4" />;
    if (sortDirection === 'desc') return <ArrowDown className="h-4 w-4" />;
    return <ArrowUpDown className="h-4 w-4" />;
  };

  const copyAvailableItemsToClipboard = () => {
    const availableItems = filteredAndSortedSupplies
      .filter(supply => supply.quantity > 1)
      .map(supply => `• ${supply.name}`)
      .join('\n');
    
    if (availableItems) {
      navigator.clipboard.writeText(availableItems);
      // You could add a toast notification here if you have one set up
    }
  };

  const handleEditSupply = (supply: Supply) => {
    setSelectedSupply(supply);
    setIsEditSupplyOpen(true);
  };

  const handleEditQuantity = (supply: Supply) => {
    setSelectedSupply(supply);
    setIsEditQuantityOpen(true);
  };

  const handleEditSafetyStock = (supply: Supply) => {
    setSelectedSupply(supply);
    setIsEditSafetyStockOpen(true);
  };

  return (
    <div className="flex flex-col h-full max-w-full mx-auto">
      {/* Search and Header */}
      <div className="flex flex-col gap-3 sm:gap-4 mb-3 sm:mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold mb-1">物資庫存清單</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              共 {filteredAndSortedSupplies.length} 項物資
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={copyAvailableItemsToClipboard}
            className="flex items-center gap-2 self-start sm:self-auto min-h-[44px] px-3 sm:px-4"
            disabled={filteredAndSortedSupplies.filter(s => s.quantity > 1).length === 0}
          >
            <Copy className="h-4 w-4" />
            <span className="text-xs sm:text-sm">複製有庫存品項</span>
          </Button>
        </div>
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜尋物資名稱或類別..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 text-sm sm:text-base min-h-[44px]"
          />
        </div>
      </div>

      {/* Table - 固定高度，內容滾動 */}
      <div className="flex-1 rounded-2xl border bg-card shadow-sm overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-muted/30 z-10">
              <TableRow>
                <TableHead className="font-semibold text-base py-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-2 hover:bg-transparent p-0 h-auto font-semibold text-base"
                    onClick={() => handleSort('category')}
                  >
                    品項類別
                    {getSortIcon('category')}
                  </Button>
                </TableHead>
                <TableHead className="font-semibold text-base py-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-2 hover:bg-transparent p-0 h-auto font-semibold text-base"
                    onClick={() => handleSort('name')}
                  >
                    物資名稱
                    {getSortIcon('name')}
                  </Button>
                </TableHead>
                <TableHead className="font-semibold text-base py-4 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-2 hover:bg-transparent p-0 h-auto font-semibold text-base mx-auto"
                    onClick={() => handleSort('quantity')}
                  >
                    當前數量
                    {getSortIcon('quantity')}
                  </Button>
                </TableHead>
                <TableHead className="font-semibold text-base py-4 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-2 hover:bg-transparent p-0 h-auto font-semibold text-base mx-auto"
                    onClick={() => handleSort('safetyStock')}
                  >
                    安全庫存
                    {getSortIcon('safetyStock')}
                  </Button>
                </TableHead>
                <TableHead className="font-semibold text-base py-4 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-2 hover:bg-transparent p-0 h-auto font-semibold text-base mx-auto"
                    onClick={() => handleSort('status')}
                  >
                    庫存狀態
                    {getSortIcon('status')}
                  </Button>
                </TableHead>
                <TableHead className="w-[80px] text-center font-semibold text-base py-4">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedSupplies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Package className="h-8 w-8" />
                      <p className="text-lg">找不到符合條件的物資</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedSupplies.map((supply) => {
                  const status = getStockStatus(supply.quantity, supply.safetyStock);
                  return (
                    <TableRow key={supply.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="py-2 sm:py-4">
                        <span className={`inline-flex px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-medium ${getCategoryColor(supply.category)}`}>
                          {supply.category}
                        </span>
                      </TableCell>
                      <TableCell className="py-2 sm:py-4">
                        <div className="font-medium text-sm sm:text-base break-words">{supply.name}</div>
                      </TableCell>
                      <TableCell className="py-2 sm:py-4 text-center">
                        <div className="flex items-center justify-center gap-1 sm:gap-2">
                          <span className={`text-sm sm:text-lg font-semibold ${supply.quantity === 0 ? 'text-red-600' : ''}`}>
                            {supply.quantity.toLocaleString()} {supply.unit}
                          </span>
                          {supply.quantity < supply.safetyStock && (
                            <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-orange-500 flex-shrink-0" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-2 sm:py-4 text-center">
                        <span className="text-sm sm:text-base text-muted-foreground">
                          {supply.safetyStock.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="py-2 sm:py-4 text-center">
                        <span className={`text-xs sm:text-sm font-medium ${status.color} break-words`}>
                          {status.label}
                        </span>
                      </TableCell>
                      <TableCell className="py-2 sm:py-4 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-muted min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px]"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">開啟選單</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-36 sm:w-40">
                            {userPermissions?.canEditSupplyInfo && (
                              <DropdownMenuItem 
                                className="text-sm sm:text-base py-2 cursor-pointer"
                                onClick={() => handleEditSupply(supply)}
                              >
                                編輯資訊
                              </DropdownMenuItem>
                            )}
                            {userPermissions?.canEditQuantity && (
                              <DropdownMenuItem 
                                className="text-sm sm:text-base py-2 cursor-pointer"
                                onClick={() => handleEditQuantity(supply)}
                              >
                                編輯數量
                              </DropdownMenuItem>
                            )}
                            {userPermissions?.canEditSafetyStock && (
                              <DropdownMenuItem 
                                className="text-sm sm:text-base py-2 cursor-pointer"
                                onClick={() => handleEditSafetyStock(supply)}
                              >
                                編輯安全庫存
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Modals */}
      <EditSupplyModal
        open={isEditSupplyOpen}
        onOpenChange={setIsEditSupplyOpen}
        onSubmit={onUpdateSupply}
        supply={selectedSupply}
      />

      <EditQuantityModal
        open={isEditQuantityOpen}
        onOpenChange={setIsEditQuantityOpen}
        onSubmit={onUpdateQuantity}
        supply={selectedSupply}
      />

      <EditSafetyStockModal
        open={isEditSafetyStockOpen}
        onOpenChange={setIsEditSafetyStockOpen}
        onSubmit={onUpdateSafetyStock}
        supply={selectedSupply}
      />
    </div>
  );
}