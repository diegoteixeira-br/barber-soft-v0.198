import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUnit } from "@/contexts/UnitContext";
import { 
  startOfDay, endOfDay, startOfWeek, endOfWeek, 
  startOfMonth, endOfMonth, subDays, format, 
  isSameDay, subMonths, eachDayOfInterval 
} from "date-fns";
import { ptBR } from "date-fns/locale";

export interface DashboardMetrics {
  todayRevenue: number;
  yesterdayRevenue: number;
  todayAppointments: number;
  yesterdayAppointments: number;
  monthRevenue: number;
  lastMonthRevenue: number;
  monthAppointments: number;
  lastMonthAppointments: number;
  averageTicket: number;
  lastMonthAverageTicket: number;
}

export interface DailyRevenue {
  day: string;
  dayShort: string;
  revenue: number;
}

export interface ServicePopularity {
  name: string;
  count: number;
  fill: string;
}

export interface TopBarber {
  id: string;
  name: string;
  revenue: number;
  appointments: number;
}

export interface UpcomingAppointment {
  id: string;
  clientName: string;
  serviceName: string;
  barberName: string;
  time: string;
  status: string;
}

export interface DailyFinancialData {
  date: string;
  label: string;
  revenue: number;
  expenses: number;
  profit: number;
}

const SERVICE_COLORS = [
  "hsl(43, 56%, 52%)",   // Gold
  "hsl(25, 100%, 50%)",  // Orange
  "hsl(199, 89%, 48%)",  // Info blue
  "hsl(142, 71%, 45%)",  // Success green
  "hsl(280, 65%, 60%)",  // Purple
  "hsl(0, 72%, 51%)",    // Red
];

export function useDashboardData() {
  const { currentUnitId } = useCurrentUnit();

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const yesterdayStart = startOfDay(subDays(now, 1));
  const yesterdayEnd = endOfDay(subDays(now, 1));
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  // Fetch completed appointments for metrics
  const { data: completedAppointments = [], isLoading: isLoadingCompleted } = useQuery({
    queryKey: ["dashboard-completed", currentUnitId],
    queryFn: async () => {
      if (!currentUnitId) return [];

      const { data, error } = await supabase
        .from("appointments")
        .select(`
          id,
          client_name,
          start_time,
          total_price,
          status,
          barber:barbers(id, name),
          service:services(id, name)
        `)
        .eq("unit_id", currentUnitId)
        .eq("status", "completed")
        .gte("start_time", lastMonthStart.toISOString())
        .order("start_time", { ascending: false });

      if (error) throw error;

      return (data || []).map(item => ({
        ...item,
        barber: Array.isArray(item.barber) ? item.barber[0] : item.barber,
        service: Array.isArray(item.service) ? item.service[0] : item.service,
      }));
    },
    enabled: !!currentUnitId,
  });

  // Fetch expenses for financial overview
  const { data: recentExpenses = [], isLoading: isLoadingExpenses } = useQuery({
    queryKey: ["dashboard-expenses", currentUnitId],
    queryFn: async () => {
      if (!currentUnitId) return [];

      const thirtyDaysAgo = subDays(now, 30);

      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("unit_id", currentUnitId)
        .gte("expense_date", format(thirtyDaysAgo, "yyyy-MM-dd"))
        .order("expense_date", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentUnitId,
  });

  // Fetch upcoming appointments (pending/confirmed for today)
  const { data: upcomingAppointments = [], isLoading: isLoadingUpcoming } = useQuery({
    queryKey: ["dashboard-upcoming", currentUnitId],
    queryFn: async () => {
      if (!currentUnitId) return [];

      const { data, error } = await supabase
        .from("appointments")
        .select(`
          id,
          client_name,
          start_time,
          status,
          barber:barbers(id, name),
          service:services(id, name)
        `)
        .eq("unit_id", currentUnitId)
        .in("status", ["pending", "confirmed"])
        .gte("start_time", todayStart.toISOString())
        .lte("start_time", todayEnd.toISOString())
        .order("start_time", { ascending: true })
        .limit(5);

      if (error) throw error;

      return (data || []).map(item => ({
        ...item,
        barber: Array.isArray(item.barber) ? item.barber[0] : item.barber,
        service: Array.isArray(item.service) ? item.service[0] : item.service,
      }));
    },
    enabled: !!currentUnitId,
  });

  // Calculate metrics
  const metrics: DashboardMetrics = {
    todayRevenue: completedAppointments
      .filter(a => {
        const date = new Date(a.start_time);
        return date >= todayStart && date <= todayEnd;
      })
      .reduce((sum, a) => sum + Number(a.total_price), 0),

    yesterdayRevenue: completedAppointments
      .filter(a => {
        const date = new Date(a.start_time);
        return date >= yesterdayStart && date <= yesterdayEnd;
      })
      .reduce((sum, a) => sum + Number(a.total_price), 0),

    todayAppointments: completedAppointments
      .filter(a => {
        const date = new Date(a.start_time);
        return date >= todayStart && date <= todayEnd;
      }).length,

    yesterdayAppointments: completedAppointments
      .filter(a => {
        const date = new Date(a.start_time);
        return date >= yesterdayStart && date <= yesterdayEnd;
      }).length,

    monthRevenue: completedAppointments
      .filter(a => {
        const date = new Date(a.start_time);
        return date >= monthStart && date <= monthEnd;
      })
      .reduce((sum, a) => sum + Number(a.total_price), 0),

    lastMonthRevenue: completedAppointments
      .filter(a => {
        const date = new Date(a.start_time);
        return date >= lastMonthStart && date <= lastMonthEnd;
      })
      .reduce((sum, a) => sum + Number(a.total_price), 0),

    monthAppointments: completedAppointments
      .filter(a => {
        const date = new Date(a.start_time);
        return date >= monthStart && date <= monthEnd;
      }).length,

    lastMonthAppointments: completedAppointments
      .filter(a => {
        const date = new Date(a.start_time);
        return date >= lastMonthStart && date <= lastMonthEnd;
      }).length,

    averageTicket: 0,
    lastMonthAverageTicket: 0,
  };

  metrics.averageTicket = metrics.monthAppointments > 0 
    ? metrics.monthRevenue / metrics.monthAppointments 
    : 0;

  metrics.lastMonthAverageTicket = metrics.lastMonthAppointments > 0 
    ? metrics.lastMonthRevenue / metrics.lastMonthAppointments 
    : 0;

  // Calculate last 7 days revenue
  const last7DaysRevenue: DailyRevenue[] = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(now, 6 - i);
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    const revenue = completedAppointments
      .filter(a => {
        const aptDate = new Date(a.start_time);
        return aptDate >= dayStart && aptDate <= dayEnd;
      })
      .reduce((sum, a) => sum + Number(a.total_price), 0);

    return {
      day: format(date, "dd/MM", { locale: ptBR }),
      dayShort: format(date, "EEE", { locale: ptBR }).slice(0, 3),
      revenue,
    };
  });

  // Calculate popular services (this month)
  const serviceStats = completedAppointments
    .filter(a => {
      const date = new Date(a.start_time);
      return date >= monthStart && date <= monthEnd;
    })
    .reduce((acc, apt) => {
      const serviceName = apt.service?.name || "Outros";
      acc[serviceName] = (acc[serviceName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  const popularServices: ServicePopularity[] = Object.entries(serviceStats)
    .map(([name, count], index) => ({
      name,
      count,
      fill: SERVICE_COLORS[index % SERVICE_COLORS.length],
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Calculate top barbers (this month)
  const barberStats = completedAppointments
    .filter(a => {
      const date = new Date(a.start_time);
      return date >= monthStart && date <= monthEnd;
    })
    .reduce((acc, apt) => {
      const barberId = apt.barber?.id;
      if (barberId) {
        if (!acc[barberId]) {
          acc[barberId] = {
            id: barberId,
            name: apt.barber.name,
            revenue: 0,
            appointments: 0,
          };
        }
        acc[barberId].revenue += Number(apt.total_price);
        acc[barberId].appointments += 1;
      }
      return acc;
    }, {} as Record<string, TopBarber>);

  const topBarbers: TopBarber[] = Object.values(barberStats)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 3);

  // Format upcoming appointments
  const formattedUpcoming: UpcomingAppointment[] = upcomingAppointments.map(apt => ({
    id: apt.id,
    clientName: apt.client_name,
    serviceName: apt.service?.name || "Serviço",
    barberName: apt.barber?.name || "Barbeiro",
    time: format(new Date(apt.start_time), "HH:mm"),
    status: apt.status,
  }));

  // Calculate financial overview for the week (last 7 days)
  const financialOverviewWeek: DailyFinancialData[] = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(now, 6 - i);
    const dateStr = format(date, "yyyy-MM-dd");
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    const dayRevenue = completedAppointments
      .filter(a => {
        const aptDate = new Date(a.start_time);
        return aptDate >= dayStart && aptDate <= dayEnd;
      })
      .reduce((sum, a) => sum + Number(a.total_price), 0);

    const dayExpenses = recentExpenses
      .filter(e => e.expense_date === dateStr)
      .reduce((sum, e) => sum + Number(e.amount), 0);

    return {
      date: dateStr,
      label: format(date, "EEE", { locale: ptBR }).slice(0, 3),
      revenue: dayRevenue,
      expenses: dayExpenses,
      profit: dayRevenue - dayExpenses,
    };
  });

  // Calculate financial overview for the current month
  const monthDays = eachDayOfInterval({ start: monthStart, end: now > monthEnd ? monthEnd : now });
  const financialOverviewMonth: DailyFinancialData[] = monthDays.map(date => {
    const dateStr = format(date, "yyyy-MM-dd");
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    const dayRevenue = completedAppointments
      .filter(a => {
        const aptDate = new Date(a.start_time);
        return aptDate >= dayStart && aptDate <= dayEnd;
      })
      .reduce((sum, a) => sum + Number(a.total_price), 0);

    const dayExpenses = recentExpenses
      .filter(e => e.expense_date === dateStr)
      .reduce((sum, e) => sum + Number(e.amount), 0);

    return {
      date: dateStr,
      label: format(date, "dd", { locale: ptBR }),
      revenue: dayRevenue,
      expenses: dayExpenses,
      profit: dayRevenue - dayExpenses,
    };
  });

  return {
    metrics,
    last7DaysRevenue,
    popularServices,
    topBarbers,
    upcomingAppointments: formattedUpcoming,
    financialOverviewWeek,
    financialOverviewMonth,
    isLoading: isLoadingCompleted || isLoadingUpcoming || isLoadingExpenses,
  };
}

// Helper functions for percentage calculations
export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}
