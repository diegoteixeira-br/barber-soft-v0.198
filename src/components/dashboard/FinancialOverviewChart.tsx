import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Minus, DollarSign, Receipt, Wallet } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/hooks/useDashboardData";
import { useState, useMemo } from "react";

export interface DailyFinancialData {
  date: string;
  label: string;
  revenue: number;
  expenses: number;
  profit: number;
}

interface FinancialOverviewChartProps {
  weekData: DailyFinancialData[];
  monthData: DailyFinancialData[];
  isLoading?: boolean;
}

const chartConfig = {
  revenue: {
    label: "Receita",
    color: "hsl(142, 71%, 45%)",
  },
  expenses: {
    label: "Despesas",
    color: "hsl(0, 72%, 51%)",
  },
  profit: {
    label: "Lucro Líquido",
    color: "hsl(43, 56%, 52%)",
  },
};

function SummaryCard({ 
  label, 
  value, 
  icon: Icon, 
  colorClass 
}: { 
  label: string; 
  value: number; 
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
}) {
  return (
    <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50">
      <div className={`flex items-center gap-1.5 ${colorClass}`}>
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <span className={`text-lg font-bold mt-1 ${colorClass}`}>
        {formatCurrency(value)}
      </span>
    </div>
  );
}

function CustomTooltipContent({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <p className="font-medium mb-2">{label}</p>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-sm" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">
              {chartConfig[entry.dataKey as keyof typeof chartConfig]?.label}:
            </span>
          </div>
          <span className="font-medium">
            {formatCurrency(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function FinancialOverviewChart({ weekData, monthData, isLoading }: FinancialOverviewChartProps) {
  const [period, setPeriod] = useState<"week" | "month">("week");

  const data = period === "week" ? weekData : monthData;

  const totals = useMemo(() => {
    const revenue = data.reduce((sum, d) => sum + d.revenue, 0);
    const expenses = data.reduce((sum, d) => sum + d.expenses, 0);
    const profit = revenue - expenses;
    return { revenue, expenses, profit };
  }, [data]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Receitas vs Despesas</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const hasData = data.some(d => d.revenue > 0 || d.expenses > 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <TrendingUp className="h-5 w-5 text-primary" />
          Receitas vs Despesas
        </CardTitle>
        <Select value={period} onValueChange={(v) => setPeriod(v as "week" | "month")}>
          <SelectTrigger className="w-[140px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Esta Semana</SelectItem>
            <SelectItem value="month">Este Mês</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="pt-0">
        {!hasData ? (
          <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
            <DollarSign className="h-12 w-12 mb-2 opacity-50" />
            <p>Nenhum dado financeiro no período</p>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <ComposedChart data={data} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="label" 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v.toString()}
              />
              <ChartTooltip content={<CustomTooltipContent />} />
              <Bar 
                dataKey="revenue" 
                fill="var(--color-revenue)" 
                radius={[4, 4, 0, 0]} 
                maxBarSize={40}
              />
              <Bar 
                dataKey="expenses" 
                fill="var(--color-expenses)" 
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
              <Line 
                type="monotone" 
                dataKey="profit" 
                stroke="var(--color-profit)" 
                strokeWidth={2.5}
                dot={{ fill: "var(--color-profit)", strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </ComposedChart>
          </ChartContainer>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t">
          <SummaryCard 
            label="Receita Total" 
            value={totals.revenue} 
            icon={DollarSign}
            colorClass="text-green-600 dark:text-green-400" 
          />
          <SummaryCard 
            label="Despesas Totais" 
            value={totals.expenses} 
            icon={Receipt}
            colorClass="text-red-600 dark:text-red-400" 
          />
          <SummaryCard 
            label="Lucro Líquido" 
            value={totals.profit} 
            icon={Wallet}
            colorClass={totals.profit >= 0 ? "text-primary" : "text-red-600 dark:text-red-400"} 
          />
        </div>
      </CardContent>
    </Card>
  );
}
