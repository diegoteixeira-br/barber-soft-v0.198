import { useState, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Gift, Calendar, User, Scissors, Phone, FileText } from "lucide-react";
import { useFinancialData, getMonthRange, getDateRanges } from "@/hooks/useFinancialData";
import { useBarbers } from "@/hooks/useBarbers";
import { useCurrentUnit } from "@/contexts/UnitContext";
import { RevenueCard } from "./RevenueCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export function CourtesyReportTab() {
  const { currentUnitId } = useCurrentUnit();
  const { barbers } = useBarbers(currentUnitId);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedBarberId, setSelectedBarberId] = useState<string | null>(null);

  const dateRange = useMemo(
    () => getMonthRange(selectedYear, selectedMonth),
    [selectedYear, selectedMonth]
  );

  const { appointments, isLoading } = useFinancialData(dateRange, selectedBarberId);

  // Filter only courtesy appointments
  const courtesyAppointments = useMemo(() => {
    return appointments.filter((apt) => apt.payment_method === "courtesy");
  }, [appointments]);

  // Calculate stats
  const stats = useMemo(() => {
    const byBarber: Record<string, { name: string; count: number; originalValue: number }> = {};
    let totalOriginalValue = 0;

    courtesyAppointments.forEach((apt) => {
      const barberId = apt.barber?.id || "unknown";
      const barberName = apt.barber?.name || "Desconhecido";
      
      // Get original service price (since courtesy sets total_price to 0)
      const originalPrice = apt.service?.price || 0;
      totalOriginalValue += originalPrice;

      if (!byBarber[barberId]) {
        byBarber[barberId] = { name: barberName, count: 0, originalValue: 0 };
      }
      byBarber[barberId].count += 1;
      byBarber[barberId].originalValue += originalPrice;
    });

    return {
      total: courtesyAppointments.length,
      totalOriginalValue,
      byBarber: Object.values(byBarber).sort((a, b) => b.count - a.count),
    };
  }, [courtesyAppointments]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Extract courtesy reason from notes
  const extractCourtesyReason = (notes: string | null) => {
    if (!notes) return "-";
    const match = notes.match(/\[Cortesia\]\s*(.+?)(?:\n|$)/);
    return match ? match[1].trim() : notes;
  };

  // Generate month options
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: format(new Date(2024, i, 1), "MMMM", { locale: ptBR }),
  }));

  // Generate year options (last 3 years)
  const years = Array.from({ length: 3 }, (_, i) => currentYear - i);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 rounded-lg bg-pink-500/10 border border-pink-500/20">
        <Gift className="h-6 w-6 text-pink-500" />
        <div>
          <h3 className="font-semibold text-foreground">Relatório de Cortesias</h3>
          <p className="text-sm text-muted-foreground">
            Acompanhe todos os serviços oferecidos como cortesia
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 p-4 rounded-lg bg-muted/30 border border-border">
        <div className="space-y-2">
          <Label>Mês</Label>
          <Select
            value={String(selectedMonth)}
            onValueChange={(v) => setSelectedMonth(Number(v))}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month.value} value={String(month.value)}>
                  {month.label.charAt(0).toUpperCase() + month.label.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Ano</Label>
          <Select
            value={String(selectedYear)}
            onValueChange={(v) => setSelectedYear(Number(v))}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Barbeiro</Label>
          <Select
            value={selectedBarberId || "all"}
            onValueChange={(v) => setSelectedBarberId(v === "all" ? null : v)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Barbeiros</SelectItem>
              {barbers.map((barber) => (
                <SelectItem key={barber.id} value={barber.id}>
                  {barber.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <RevenueCard
          title="Total de Cortesias"
          value={String(stats.total)}
          subtitle={`${format(new Date(selectedYear, selectedMonth), "MMMM/yyyy", { locale: ptBR })}`}
          icon={Gift}
          variant="default"
        />
        <RevenueCard
          title="Valor Original"
          value={formatCurrency(stats.totalOriginalValue)}
          subtitle="Se fossem cobrados"
          icon={FileText}
          variant="warning"
        />
        <RevenueCard
          title="Média por Cortesia"
          value={formatCurrency(stats.total > 0 ? stats.totalOriginalValue / stats.total : 0)}
          subtitle="Valor médio original"
          icon={Scissors}
          variant="info"
        />
      </div>

      {/* Breakdown by Barber */}
      {stats.byBarber.length > 0 && (
        <div className="p-4 rounded-lg border border-border bg-card">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Cortesias por Profissional</h4>
          <div className="flex flex-wrap gap-3">
            {stats.byBarber.map((barber) => (
              <div
                key={barber.name}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-pink-500/10 border border-pink-500/20"
              >
                <User className="h-4 w-4 text-pink-500" />
                <span className="text-sm font-medium text-foreground">{barber.name}</span>
                <Badge variant="secondary">{barber.count}</Badge>
                <span className="text-xs text-muted-foreground">
                  ({formatCurrency(barber.originalValue)})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Courtesy Table */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-foreground">Detalhamento de Cortesias</h3>
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Profissional</TableHead>
                <TableHead>Serviço</TableHead>
                <TableHead>Valor Original</TableHead>
                <TableHead>Motivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : courtesyAppointments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Gift className="h-8 w-8" />
                      <p>Nenhuma cortesia registrada neste período</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                courtesyAppointments.map((apt) => (
                  <TableRow key={apt.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">
                            {format(new Date(apt.start_time), "dd/MM/yyyy")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(apt.start_time), "HH:mm")}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{apt.client_name}</p>
                        {apt.client_phone && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {apt.client_phone}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: apt.barber?.calendar_color || "#FF6B00" }}
                        />
                        <span className="text-sm">{apt.barber?.name || "-"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{apt.service?.name || "-"}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium text-muted-foreground line-through">
                        {formatCurrency(apt.service?.price || 0)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-muted-foreground max-w-[200px] truncate" title={extractCourtesyReason(apt.notes)}>
                        {extractCourtesyReason(apt.notes)}
                      </p>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
