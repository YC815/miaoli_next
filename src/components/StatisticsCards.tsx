import { Plus, Download, Receipt, Package } from "lucide-react";

interface Statistics {
  totalCategories: number;
  monthlyDonations: number;
  monthlyDistributions: number;
  lowStock: number;
}

interface StatisticsCardsProps {
  stats: Statistics;
}

export function StatisticsCards({ stats }: StatisticsCardsProps) {
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

  return (
    <div className="max-w-5xl mx-auto">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
        {cards.map((card, index) => {
          const Icon = card.icon;
          
          return (
            <div
              key={index}
              className="bg-card border rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm hover:shadow-md transition-all duration-200 text-center"
            >
              <div className="flex flex-col items-center space-y-1 sm:space-y-2">
                <Icon className={`h-6 w-6 sm:h-8 sm:w-8 ${card.color}`} />
                <p className="text-xs sm:text-sm text-muted-foreground font-medium leading-tight text-center">
                  {card.title}
                </p>
                <p className={`text-lg sm:text-2xl font-bold ${index === 3 ? 'text-destructive' : card.color}`}>
                  {card.value.toLocaleString()}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}