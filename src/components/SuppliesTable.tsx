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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  MoreHorizontal,
  Search,
  AlertTriangle,
  Package,
  Copy,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Check,
  Filter,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { EditSupplyModal } from "@/components/modals/EditSupplyModal";
import { EditSafetyStockModal } from "@/components/modals/EditSafetyStockModal";
import { InventoryCountModal } from "@/components/modals/InventoryCountModal";
import { ItemRecordsDialog } from "@/components/modals/ItemRecordsDialog";
import { Permission } from "@/lib/permissions";

interface ItemStock {
  id: string;
  category: string;
  name: string;
  totalStock: number;
  unit: string;
  safetyStock: number;
  isStandard: boolean;
}

interface SuppliesTableProps {
  supplies: ItemStock[];
  onUpdateSupply: (updatedSupply: ItemStock) => void;
  onPerformInventory: (id: string, newQuantity: number, changeType: 'INCREASE' | 'DECREASE', reason: string) => void;
  onUpdateSafetyStock: (id: string, newSafetyStock: number) => void;
  userPermissions: Permission | null;
}

type SortField = 'category' | 'name' | 'quantity';
type SortDirection = 'asc' | 'desc' | null;

export function SuppliesTable({ supplies, onUpdateSupply, onPerformInventory, onUpdateSafetyStock, userPermissions }: SuppliesTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isEditSupplyOpen, setIsEditSupplyOpen] = useState(false);
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  const [isEditSafetyStockOpen, setIsEditSafetyStockOpen] = useState(false);
  const [isItemRecordsOpen, setIsItemRecordsOpen] = useState(false);
  const [selectedSupply, setSelectedSupply] = useState<ItemStock | null>(null);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
  const [stockTypeFilter, setStockTypeFilter] = useState<"all" | "standard" | "custom">("all");
  const [showOnlyBelowSafetyStock, setShowOnlyBelowSafetyStock] = useState(false);

  const uniqueCategories = useMemo(
    () => Array.from(new Set(supplies.map((supply) => supply.category))).sort(),
    [supplies]
  );

  const uniqueUnits = useMemo(
    () => Array.from(new Set(supplies.map((supply) => supply.unit))).sort(),
    [supplies]
  );

  const stockStatusOptions = useMemo(
    () => ["庫存充足", "庫存不足", "剛好達標", "無庫存"],
    []
  );

  const filteredAndSortedSupplies = (() => {
    const loweredSearch = searchTerm.toLowerCase();

    const filtered = supplies.filter((supply) => {
      const matchesSearch =
        loweredSearch.length === 0 ||
        supply.name.toLowerCase().includes(loweredSearch) ||
        supply.category.toLowerCase().includes(loweredSearch) ||
        supply.unit.toLowerCase().includes(loweredSearch);

      if (!matchesSearch) return false;

      if (selectedCategories.length > 0 && !selectedCategories.includes(supply.category)) {
        return false;
      }

      if (selectedUnits.length > 0 && !selectedUnits.includes(supply.unit)) {
        return false;
      }

      if (stockTypeFilter !== "all") {
        const shouldShowStandard = stockTypeFilter === "standard";
        if (shouldShowStandard !== supply.isStandard) {
          return false;
        }
      }

      if (showOnlyBelowSafetyStock && supply.totalStock >= supply.safetyStock) {
        return false;
      }

      if (selectedStatuses.length > 0) {
        const statusLabel = getStockStatus(supply.totalStock, supply.safetyStock).label;
        if (!selectedStatuses.includes(statusLabel)) {
          return false;
        }
      }

      return true;
    });

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
          aValue = a.totalStock;
          bValue = b.totalStock;
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
      .filter(supply => {
        const status = getStockStatus(supply.totalStock, supply.safetyStock);
        return status.label === '庫存充足';
      })
      .map(supply => `• ${supply.name}`)
      .join('\n');
    
    if (availableItems) {
      navigator.clipboard.writeText(availableItems);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };


  const toggleSelection = (value: string, selections: string[], setter: (next: string[]) => void) => {
    setter(
      selections.includes(value)
        ? selections.filter((item) => item !== value)
        : [...selections, value]
    );
  };

  const removeFilter = (value: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter((prev: string[]) => prev.filter((item: string) => item !== value));
  };

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setSelectedStatuses([]);
    setSelectedUnits([]);
    setStockTypeFilter("all");
    setShowOnlyBelowSafetyStock(false);
  };

  const hasActiveFilters =
    selectedCategories.length > 0 ||
    selectedStatuses.length > 0 ||
    selectedUnits.length > 0 ||
    stockTypeFilter !== "all" ||
    showOnlyBelowSafetyStock;

  const handleEditSupply = (supply: ItemStock) => {
    setSelectedSupply(supply);
    setIsEditSupplyOpen(true);
  };

  const handleInventory = (supply: ItemStock) => {
    setSelectedSupply(supply);
    setIsInventoryModalOpen(true);
  };

  const handleEditSafetyStock = (supply: ItemStock) => {
    setSelectedSupply(supply);
    setIsEditSafetyStockOpen(true);
  };

  const handleOpenItemRecords = (supply: ItemStock) => {
    setSelectedSupply(supply);
    setIsItemRecordsOpen(true);
  };

  return (
    <div className="flex flex-col h-full max-w-full mx-auto">
      {/* Search and Header */}
      <div className="flex flex-col gap-3 sm:gap-4 mb-3 sm:mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
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
            className={`flex items-center gap-2 min-h-[40px] px-3 sm:px-4 transition-colors ${
              isCopied ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' : ''
            }`}
            disabled={filteredAndSortedSupplies.filter(s => s.totalStock > 0).length === 0}
          >
            {isCopied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            <span className="text-xs sm:text-sm">
              {isCopied ? '已複製' : '複製「庫存充足」品相清單'}
            </span>
          </Button>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px] sm:min-w-[260px] sm:max-w-xs lg:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜尋物資名稱、類別或單位..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 text-sm sm:text-base min-h-[40px]"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="min-h-[40px] sm:hidden flex items-center gap-2"
              onClick={() => setIsFilterDialogOpen(true)}
            >
              <SlidersHorizontal className="h-4 w-4" />
              篩選條件
            </Button>
          </div>
          <div className="hidden sm:flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={selectedCategories.length ? "default" : "outline"}
                  size="sm"
                  className="flex items-center gap-2 min-h-[40px]"
                >
                  <Filter className="h-4 w-4" />
                  分類
                  {selectedCategories.length > 0 && ` (${selectedCategories.length})`}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48">
                <DropdownMenuLabel>選擇分類</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {uniqueCategories.length === 0 ? (
                  <DropdownMenuItem disabled>沒有分類資料</DropdownMenuItem>
                ) : (
                  uniqueCategories.map((category) => (
                    <DropdownMenuCheckboxItem
                      key={category}
                      checked={selectedCategories.includes(category)}
                      onCheckedChange={() =>
                        toggleSelection(category, selectedCategories, setSelectedCategories)
                      }
                    >
                      {category}
                    </DropdownMenuCheckboxItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={selectedStatuses.length ? "default" : "outline"}
                  size="sm"
                  className="flex items-center gap-2 min-h-[40px]"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  庫存狀態
                  {selectedStatuses.length > 0 && ` (${selectedStatuses.length})`}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48">
                <DropdownMenuLabel>選擇狀態</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {stockStatusOptions.map((status) => (
                  <DropdownMenuCheckboxItem
                    key={status}
                    checked={selectedStatuses.includes(status)}
                    onCheckedChange={() =>
                      toggleSelection(status, selectedStatuses, setSelectedStatuses)
                    }
                  >
                    {status}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={selectedUnits.length ? "default" : "outline"}
                  size="sm"
                  className="flex items-center gap-2 min-h-[40px]"
                >
                  單位
                  {selectedUnits.length > 0 && ` (${selectedUnits.length})`}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48">
                <DropdownMenuLabel>選擇單位</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {uniqueUnits.length === 0 ? (
                  <DropdownMenuItem disabled>沒有單位資料</DropdownMenuItem>
                ) : (
                  uniqueUnits.map((unit) => (
                    <DropdownMenuCheckboxItem
                      key={unit}
                      checked={selectedUnits.includes(unit)}
                      onCheckedChange={() =>
                        toggleSelection(unit, selectedUnits, setSelectedUnits)
                      }
                    >
                      {unit}
                    </DropdownMenuCheckboxItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={stockTypeFilter === "all" ? "outline" : "default"}
                  size="sm"
                  className="flex items-center gap-2 min-h-[40px]"
                >
                  品項類型
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-44">
                <DropdownMenuLabel>顯示項目</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                  value={stockTypeFilter}
                  onValueChange={(value) =>
                    setStockTypeFilter(value as "all" | "standard" | "custom")
                  }
                >
                  <DropdownMenuRadioItem value="all">全部</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="standard">只看標準品項</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="custom">只看自訂品項</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant={showOnlyBelowSafetyStock ? "default" : "outline"}
              size="sm"
              className="min-h-[40px]"
              onClick={() => setShowOnlyBelowSafetyStock((prev) => !prev)}
            >
              低於安全庫存
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="min-h-[40px] text-muted-foreground hover:text-foreground"
              onClick={clearAllFilters}
              disabled={!hasActiveFilters}
            >
              清除篩選
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {selectedCategories.map((category) => (
              <Badge key={`category-${category}`} className="flex items-center gap-2">
                {category}
                <button
                  type="button"
                  aria-label={`移除分類 ${category}`}
                  className="rounded-full p-0.5 hover:bg-muted transition-colors"
                  onClick={() => removeFilter(category, setSelectedCategories)}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {selectedStatuses.map((status) => (
              <Badge key={`status-${status}`} variant="secondary" className="flex items-center gap-2">
                {status}
                <button
                  type="button"
                  aria-label={`移除狀態 ${status}`}
                  className="rounded-full p-0.5 hover:bg-muted transition-colors"
                  onClick={() => removeFilter(status, setSelectedStatuses)}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {selectedUnits.map((unit) => (
              <Badge key={`unit-${unit}`} variant="outline" className="flex items-center gap-2">
                {unit}
                <button
                  type="button"
                  aria-label={`移除單位 ${unit}`}
                  className="rounded-full p-0.5 hover:bg-muted transition-colors"
                  onClick={() => removeFilter(unit, setSelectedUnits)}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {stockTypeFilter !== "all" && (
              <Badge variant="destructive" className="flex items-center gap-2">
                {stockTypeFilter === "standard" ? "標準品項" : "自訂品項"}
                <button
                  type="button"
                  aria-label="移除品項類型篩選"
                  className="rounded-full p-0.5 hover:bg-muted/80 transition-colors"
                  onClick={() => setStockTypeFilter("all")}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {showOnlyBelowSafetyStock && (
              <Badge variant="secondary" className="flex items-center gap-2">
                只看低於安全庫存
                <button
                  type="button"
                  aria-label="移除安全庫存篩選"
                  className="rounded-full p-0.5 hover:bg-muted transition-colors"
                  onClick={() => setShowOnlyBelowSafetyStock(false)}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {!hasActiveFilters && (
              <span className="text-xs sm:text-sm text-muted-foreground">
                尚未套用篩選條件
              </span>
            )}
          </div>
          <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
              <DialogHeader className="text-left">
                <DialogTitle>篩選條件</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <section className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground">分類</h3>
                  <div className="space-y-2">
                    {uniqueCategories.length === 0 ? (
                      <p className="text-sm text-muted-foreground">目前沒有分類資料</p>
                    ) : (
                      uniqueCategories.map((category) => (
                        <Label
                          key={`mobile-category-${category}`}
                          className="justify-between rounded-md border px-3 py-2"
                        >
                          <span>{category}</span>
                          <Checkbox
                            checked={selectedCategories.includes(category)}
                            onCheckedChange={() =>
                              toggleSelection(category, selectedCategories, setSelectedCategories)
                            }
                          />
                        </Label>
                      ))
                    )}
                  </div>
                </section>

                <section className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground">庫存狀態</h3>
                  <div className="space-y-2">
                    {stockStatusOptions.map((status) => (
                      <Label
                        key={`mobile-status-${status}`}
                        className="justify-between rounded-md border px-3 py-2"
                      >
                        <span>{status}</span>
                        <Checkbox
                          checked={selectedStatuses.includes(status)}
                          onCheckedChange={() =>
                            toggleSelection(status, selectedStatuses, setSelectedStatuses)
                          }
                        />
                      </Label>
                    ))}
                  </div>
                </section>

                <section className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground">單位</h3>
                  <div className="space-y-2">
                    {uniqueUnits.length === 0 ? (
                      <p className="text-sm text-muted-foreground">目前沒有單位資料</p>
                    ) : (
                      uniqueUnits.map((unit) => (
                        <Label
                          key={`mobile-unit-${unit}`}
                          className="justify-between rounded-md border px-3 py-2"
                        >
                          <span>{unit}</span>
                          <Checkbox
                            checked={selectedUnits.includes(unit)}
                            onCheckedChange={() =>
                              toggleSelection(unit, selectedUnits, setSelectedUnits)
                            }
                          />
                        </Label>
                      ))
                    )}
                  </div>
                </section>

                <section className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground">品項類型</h3>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: "全部", value: "all" },
                      { label: "標準品項", value: "standard" },
                      { label: "自訂品項", value: "custom" },
                    ].map((option) => (
                      <Button
                        key={`mobile-type-${option.value}`}
                        variant={stockTypeFilter === option.value ? "default" : "outline"}
                        size="sm"
                        className="flex-1 min-h-[38px]"
                        onClick={() => setStockTypeFilter(option.value as typeof stockTypeFilter)}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </section>

                <section className="space-y-2">
                  <Label className="justify-between rounded-md border px-3 py-2">
                    <span>只顯示低於安全庫存</span>
                    <Checkbox
                      checked={showOnlyBelowSafetyStock}
                      onCheckedChange={() =>
                        setShowOnlyBelowSafetyStock((prev) => !prev)
                      }
                    />
                  </Label>
                </section>
              </div>
              <DialogFooter className="sm:justify-between sm:flex-row">
                <Button
                  type="button"
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={clearAllFilters}
                >
                  清除全部
                </Button>
                <Button type="button" onClick={() => setIsFilterDialogOpen(false)}>
                  套用篩選
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
                <TableHead className="font-semibold text-base py-4 text-center">安全庫存</TableHead>
                <TableHead className="font-semibold text-base py-4 text-center">庫存狀態</TableHead>
                <TableHead className="font-semibold text-base py-4 text-center">盤點</TableHead>
                <TableHead className="w-[80px] text-center font-semibold text-base py-4">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedSupplies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Package className="h-8 w-8" />
                      <p className="text-lg">找不到符合條件的物資</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedSupplies.map((supply) => {
                  const status = getStockStatus(supply.totalStock, supply.safetyStock);
                  return (
                    <TableRow key={supply.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="py-2 sm:py-4">
                        <span className={`inline-flex px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-medium ${getCategoryColor(supply.category)}`}>
                          {supply.category}
                        </span>
                      </TableCell>
                      <TableCell
                        className="py-2 sm:py-4 cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => handleOpenItemRecords(supply)}
                      >
                        <div className="font-medium text-sm sm:text-base break-words">{supply.name}</div>
                        <div className="mt-1">
                          <Badge variant={supply.isStandard ? "secondary" : "outline"} className="text-[10px] sm:text-xs">
                            {supply.isStandard ? '標準品項' : '自訂品項'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell
                        className="py-2 sm:py-4 text-center cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => handleOpenItemRecords(supply)}
                      >
                        <div className="flex items-center justify-center gap-1 sm:gap-2">
                          <span className={`text-sm sm:text-lg font-semibold ${supply.totalStock === 0 ? 'text-red-600' : ''}`}>
                            {supply.totalStock.toLocaleString()} {supply.unit}
                          </span>
                          {supply.totalStock < supply.safetyStock && (
                            <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-orange-500 flex-shrink-0" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-2 sm:py-4 text-center">
                        <span className="text-sm sm:text-base text-muted-foreground">
                          {supply.safetyStock.toLocaleString()} {supply.unit}
                        </span>
                      </TableCell>
                      <TableCell className="py-2 sm:py-4 text-center">
                        <span className={`inline-flex px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </TableCell>
                      <TableCell className="py-2 sm:py-4 text-center">
                        {userPermissions?.canEditQuantity ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="min-h-[36px] min-w-[72px]"
                            onClick={() => handleInventory(supply)}
                          >
                            盤點
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">無權限</span>
                        )}
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

      <InventoryCountModal
        open={isInventoryModalOpen}
        onOpenChange={setIsInventoryModalOpen}
        onSubmit={onPerformInventory}
        supply={selectedSupply}
      />

      <EditSafetyStockModal
        open={isEditSafetyStockOpen}
        onOpenChange={setIsEditSafetyStockOpen}
        onSubmit={onUpdateSafetyStock}
        supply={selectedSupply}
      />

      <ItemRecordsDialog
        open={isItemRecordsOpen}
        onOpenChange={setIsItemRecordsOpen}
        itemStockId={selectedSupply?.id ?? null}
        itemName={selectedSupply?.name ?? null}
      />
    </div>
  );
}
