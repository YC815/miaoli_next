import { Plus, Download, Receipt, Package, ChevronRight } from "lucide-react";

interface Statistics {
  totalCategories: number;
  monthlyDonations: number;
  monthlyDistributions: number;
  lowStock: number;
  expiringCount: number;
  expiredCount: number;
  expiryUpdatedAt: string | null;
}

interface StatisticsCardsProps {
  stats: Statistics;
  onShowExpiry: () => void;
}

export function StatisticsCards({ stats, onShowExpiry }: StatisticsCardsProps) {
  const cards = [
    {
      title: "總物資種類數",
      value: stats.totalCategories,
      icon: Package,
      color: "text-blue-600"
    },
    {
      title: "本月捐贈數",
      value: stats.monthlyDonations,
      icon: Plus,
      color: "text-green-600"
    },
    {
      title: "本月發放數",
      value: stats.monthlyDistributions,
      icon: Download,
      color: "text-purple-600"
    },
    {
      title: "庫存不足品項數",
      value: stats.lowStock,
      icon: Receipt,
      color: "text-red-600"
    },
  ];

  const formattedUpdatedAt = stats.expiryUpdatedAt
    ? new Date(stats.expiryUpdatedAt).toLocaleString("zh-TW", {
        hour12: false,
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "尚未更新";

  return (
    <div className="max-w-6xl mx-auto">
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-2 sm:gap-3 lg:gap-4">
        {cards.map((card, index) => {
          const Icon = card.icon;
          
          return (
            <div
              key={index}
              className="bg-card border border-border/60 rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm hover:shadow-md transition-all duration-200 text-center"
              data-card-type={card.title}
            >
              <div className="flex flex-col items-center space-y-1 sm:space-y-2">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted/60">
                  <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${card.color}`} />
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground font-medium leading-tight text-center">
                  {card.title}
                </p>
                <p className={`text-lg sm:text-2xl font-semibold ${index === 3 ? 'text-destructive' : 'text-foreground'}`}>
                  {card.value.toLocaleString()}
                </p>
              </div>
            </div>
          );
        })}

        <button
          type="button"
          onClick={onShowExpiry}
          className="col-span-2 sm:col-span-2 lg:col-span-2 bg-card border border-border/60 rounded-lg sm:rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
          aria-label="查看效期提醒"
        >
          <div className="flex h-full min-h-[120px] sm:min-h-[132px] overflow-hidden rounded-t-lg sm:rounded-t-xl">
            <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 to-amber-100 text-amber-900 px-4 py-5 sm:px-5 sm:py-6">
              <p className="text-[11px] sm:text-xs font-medium tracking-wide uppercase">即將過期</p>
              <p className="text-xl sm:text-3xl font-semibold mt-1">{stats.expiringCount.toLocaleString()}</p>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-rose-50 to-rose-100 text-rose-900 px-4 py-5 sm:px-5 sm:py-6 border-l border-rose-100/60">
              <p className="text-[11px] sm:text-xs font-medium tracking-wide uppercase">已過期</p>
              <p className="text-xl sm:text-3xl font-semibold mt-1">{stats.expiredCount.toLocaleString()}</p>
            </div>
            <div className="flex items-center justify-center px-4 sm:px-6 bg-muted text-foreground">
              <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
          </div>
          <div className="px-4 sm:px-6 py-2.5 border-t border-border/60 text-right rounded-b-lg sm:rounded-b-xl bg-muted/30">
            <p className="text-[11px] sm:text-xs text-muted-foreground">更新：{formattedUpdatedAt}</p>
          </div>
        </button>
      </div>
    </div>
  );
}
