import { useQuery } from "@tanstack/react-query";
import { format, addDays, startOfDay } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Clock, CalendarDays } from "lucide-react";

interface Label {
  id: number;
  productId: number;
  portionId: number;
  responsibleId: number;
  date: string;
  expiryDate: string;
  storageMethod: string;
  identifier: string;
  createdAt: string;
  updatedAt: string;
}

interface LabelStatusCardsProps {
  onFilterChange?: (filter: 'all' | 'expiring_today' | 'expiring_tomorrow' | 'valid_week') => void;
  activeFilter?: 'all' | 'expiring_today' | 'expiring_tomorrow' | 'valid_week';
  compact?: boolean;
}

export default function LabelStatusCards({ 
  onFilterChange, 
  activeFilter = 'all', 
  compact = false 
}: LabelStatusCardsProps) {
  const { data: labels = [] } = useQuery<Label[]>({
    queryKey: ["/api/labels"],
  });

  // Filter functions
  const isExpiringToday = (expiryDate: string) => {
    const expiry = startOfDay(new Date(expiryDate));
    const today = startOfDay(new Date());
    return expiry.getTime() <= today.getTime();
  };

  const isExpiringTomorrow = (expiryDate: string) => {
    const expiry = startOfDay(new Date(expiryDate));
    const tomorrow = startOfDay(addDays(new Date(), 1));
    return expiry.getTime() === tomorrow.getTime();
  };

  const isValidMoreThan7Days = (expiryDate: string) => {
    const expiry = startOfDay(new Date(expiryDate));
    const weekFromNow = startOfDay(addDays(new Date(), 7));
    return expiry.getTime() > weekFromNow.getTime();
  };

  // Count labels by category
  const expiringTodayCount = labels.filter(label => isExpiringToday(label.expiryDate)).length;
  const expiringTomorrowCount = labels.filter(label => isExpiringTomorrow(label.expiryDate)).length;
  const validMoreThan7DaysCount = labels.filter(label => isValidMoreThan7Days(label.expiryDate)).length;

  const handleCardClick = (filter: 'expiring_today' | 'expiring_tomorrow' | 'valid_week') => {
    if (onFilterChange) {
      onFilterChange(activeFilter === filter ? 'all' : filter);
    }
  };

  const cards = [
    {
      id: 'expiring_today',
      title: compact ? "Vencendo Hoje" : "Vencendo Hoje",
      count: expiringTodayCount,
      icon: AlertTriangle,
      colors: {
        border: "border-l-red-500",
        bg: activeFilter === 'expiring_today' ? "bg-red-50 dark:bg-red-950" : "",
        ring: activeFilter === 'expiring_today' ? "ring-2 ring-red-500" : "",
        hover: "hover:bg-red-50 dark:hover:bg-red-950",
        text: "text-red-700 dark:text-red-300",
        icon: "text-red-600",
        description: "text-red-600 dark:text-red-400"
      },
      description: expiringTodayCount === 1 ? 'etiqueta vencendo' : 'etiquetas vencendo'
    },
    {
      id: 'expiring_tomorrow',
      title: compact ? "Vencendo Amanhã" : "Vencendo Amanhã",
      count: expiringTomorrowCount,
      icon: Clock,
      colors: {
        border: "border-l-yellow-500",
        bg: activeFilter === 'expiring_tomorrow' ? "bg-yellow-50 dark:bg-yellow-950" : "",
        ring: activeFilter === 'expiring_tomorrow' ? "ring-2 ring-yellow-500" : "",
        hover: "hover:bg-yellow-50 dark:hover:bg-yellow-950",
        text: "text-yellow-700 dark:text-yellow-300",
        icon: "text-yellow-600",
        description: "text-yellow-600 dark:text-yellow-400"
      },
      description: expiringTomorrowCount === 1 ? 'etiqueta vencendo' : 'etiquetas vencendo'
    },
    {
      id: 'valid_week',
      title: compact ? "Válidas +7d" : "Válidas por +7 Dias",
      count: validMoreThan7DaysCount,
      icon: CalendarDays,
      colors: {
        border: "border-l-green-500",
        bg: activeFilter === 'valid_week' ? "bg-green-50 dark:bg-green-950" : "",
        ring: activeFilter === 'valid_week' ? "ring-2 ring-green-500" : "",
        hover: "hover:bg-green-50 dark:hover:bg-green-950",
        text: "text-green-700 dark:text-green-300",
        icon: "text-green-600",
        description: "text-green-600 dark:text-green-400"
      },
      description: validMoreThan7DaysCount === 1 ? 'etiqueta válida' : 'etiquetas válidas'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const isClickable = !!onFilterChange;
        
        return (
          <Card 
            key={card.id}
            className={`
              transition-all border-l-4 
              ${card.colors.border}
              ${card.colors.bg}
              ${card.colors.ring}
              ${isClickable ? `cursor-pointer hover:shadow-md ${card.colors.hover}` : ''}
            `}
            onClick={() => isClickable && handleCardClick(card.id as any)}
          >
            <CardHeader className={`flex flex-row items-center justify-between space-y-0 ${compact ? 'pb-1' : 'pb-2'}`}>
              <CardTitle className={`${compact ? 'text-xs' : 'text-sm'} font-medium ${card.colors.text}`}>
                {card.title}
              </CardTitle>
              <Icon className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} ${card.colors.icon}`} />
            </CardHeader>
            <CardContent className={compact ? 'pt-1' : ''}>
              <div className={`${compact ? 'text-lg' : 'text-2xl'} font-bold ${card.colors.text}`}>
                {card.count}
              </div>
              {!compact && (
                <p className={`text-xs ${card.colors.description}`}>
                  {card.description}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}