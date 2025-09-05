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
import { MoreHorizontal, Search, AlertTriangle, Package } from "lucide-react";
import { useState } from "react";
import { EditSupplyModal } from "@/components/modals/EditSupplyModal";
import { EditQuantityModal } from "@/components/modals/EditQuantityModal";
import { EditSafetyStockModal } from "@/components/modals/EditSafetyStockModal";

interface Supply {
  id: string;
  category: string;
  name: string;
  quantity: number;
  safetyStock: number;
}

interface SuppliesTableProps {
  supplies: Supply[];
  onUpdateSupply: (updatedSupply: Supply) => void;
  onUpdateQuantity: (id: string, newQuantity: number, changeType: string, reason: string) => void;
  onUpdateSafetyStock: (id: string, newSafetyStock: number) => void;
}

export function SuppliesTable({ supplies, onUpdateSupply, onUpdateQuantity, onUpdateSafetyStock }: SuppliesTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isEditSupplyOpen, setIsEditSupplyOpen] = useState(false);
  const [isEditQuantityOpen, setIsEditQuantityOpen] = useState(false);
  const [isEditSafetyStockOpen, setIsEditSafetyStockOpen] = useState(false);
  const [selectedSupply, setSelectedSupply] = useState<Supply | null>(null);

  const filteredSupplies = supplies.filter(supply =>
    supply.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supply.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold mb-1">物資庫存清單</h2>
          <p className="text-sm text-muted-foreground">
            共 {filteredSupplies.length} 項物資
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜尋物資名稱或類別..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 text-base"
          />
        </div>
      </div>

      {/* Table - 固定高度，內容滾動 */}
      <div className="flex-1 rounded-2xl border bg-card shadow-sm overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-muted/30 z-10">
              <TableRow>
                <TableHead className="font-semibold text-base py-4">品項類別</TableHead>
                <TableHead className="font-semibold text-base py-4">物資名稱</TableHead>
                <TableHead className="font-semibold text-base py-4 text-center">當前數量</TableHead>
                <TableHead className="font-semibold text-base py-4 text-center">安全庫存</TableHead>
                <TableHead className="font-semibold text-base py-4 text-center">庫存狀態</TableHead>
                <TableHead className="w-[80px] text-center font-semibold text-base py-4">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSupplies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Package className="h-8 w-8" />
                      <p className="text-lg">找不到符合條件的物資</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredSupplies.map((supply) => {
                  const status = getStockStatus(supply.quantity, supply.safetyStock);
                  return (
                    <TableRow key={supply.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="py-4">
                        <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(supply.category)}`}>
                          {supply.category}
                        </span>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="font-medium text-base">{supply.name}</div>
                      </TableCell>
                      <TableCell className="py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className={`text-lg font-semibold ${supply.quantity === 0 ? 'text-red-600' : ''}`}>
                            {supply.quantity.toLocaleString()}
                          </span>
                          {supply.quantity < supply.safetyStock && (
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-center">
                        <span className="text-base text-muted-foreground">
                          {supply.safetyStock.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="py-4 text-center">
                        <span className={`text-sm font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </TableCell>
                      <TableCell className="py-4 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-muted"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">開啟選單</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem 
                              className="text-base py-2 cursor-pointer"
                              onClick={() => handleEditSupply(supply)}
                            >
                              編輯資訊
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-base py-2 cursor-pointer"
                              onClick={() => handleEditQuantity(supply)}
                            >
                              編輯數量
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-base py-2 cursor-pointer"
                              onClick={() => handleEditSafetyStock(supply)}
                            >
                              編輯安全庫存量
                            </DropdownMenuItem>
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