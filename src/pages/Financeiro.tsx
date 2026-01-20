import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CashFlowTab } from "@/components/financeiro/CashFlowTab";
import { CommissionReportTab } from "@/components/financeiro/CommissionReportTab";
import { ExpensesTab } from "@/components/financeiro/ExpensesTab";
import { InventoryTab } from "@/components/financeiro/InventoryTab";
import { CourtesyReportTab } from "@/components/financeiro/CourtesyReportTab";
import { DollarSign, FileText, TrendingDown, Package, Gift } from "lucide-react";

export default function Financeiro() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Financeiro</h1>
          <p className="mt-1 text-muted-foreground">Controle de caixa, despesas, estoque e comissões</p>
        </div>

        <Tabs defaultValue="cash-flow" className="space-y-6">
          <TabsList className="bg-muted">
            <TabsTrigger value="cash-flow" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Fluxo de Caixa
            </TabsTrigger>
            <TabsTrigger value="expenses" className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Despesas
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Estoque
            </TabsTrigger>
            <TabsTrigger value="commission" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Comissões
            </TabsTrigger>
            <TabsTrigger value="courtesy" className="flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Cortesias
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cash-flow" className="mt-6">
            <CashFlowTab />
          </TabsContent>

          <TabsContent value="expenses" className="mt-6">
            <ExpensesTab />
          </TabsContent>

          <TabsContent value="inventory" className="mt-6">
            <InventoryTab />
          </TabsContent>

          <TabsContent value="commission" className="mt-6">
            <CommissionReportTab />
          </TabsContent>

          <TabsContent value="courtesy" className="mt-6">
            <CourtesyReportTab />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
