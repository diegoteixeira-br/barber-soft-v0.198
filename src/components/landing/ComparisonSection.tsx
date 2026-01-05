import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Check, X, TrendingDown, Calculator } from "lucide-react";

const employeeCosts = [
  { label: "Salário Base", value: "R$ 1.518" },
  { label: "INSS Patronal (20%)", value: "R$ 303,60" },
  { label: "FGTS (8%)", value: "R$ 121,44" },
  { label: "13º Proporcional", value: "R$ 126,50" },
  { label: "Férias Proporcional", value: "R$ 168,67" },
  { label: "Vale Transporte", value: "~R$ 200" },
];

const systemBenefits = [
  "Trabalha 24h por dia, 7 dias por semana",
  "Nunca falta, nunca tira férias",
  "Responde múltiplos clientes simultaneamente",
  "Nunca erra um agendamento",
  "Não pede aumento nem demissão",
  "Sem encargos trabalhistas",
];

export function ComparisonSection() {
  const { ref, isVisible } = useScrollAnimation();

  const totalEmployee = 2438;
  const systemPrice = 199;
  const monthlySavings = totalEmployee - systemPrice;
  const yearlySavings = monthlySavings * 12;

  return (
    <section className="py-20 bg-background relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-charcoal/20 to-transparent" />

      <div className="container mx-auto px-4 relative z-10">
        <div
          ref={ref}
          className={`transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-neon/10 border border-orange-neon/20 mb-6">
              <Calculator className="h-4 w-4 text-orange-neon" />
              <span className="text-sm text-orange-neon">Faça as Contas</span>
            </div>

            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Quanto custa um funcionário de <span className="text-gold">verdade?</span>
            </h2>

            <p className="text-muted-foreground max-w-2xl mx-auto">
              Você pensa que paga só o salário mínimo, mas no fritar dos ovos...
              os encargos trabalhistas fazem o custo real disparar.
            </p>
          </div>

          {/* Comparison Grid */}
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-12">
            {/* Employee Column */}
            <div
              className={`rounded-2xl border border-destructive/30 bg-destructive/5 p-6 transition-all duration-500 ${
                isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"
              }`}
              style={{ transitionDelay: "100ms" }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center">
                  <X className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">Funcionário CLT</h3>
                  <p className="text-sm text-muted-foreground">Recepcionista</p>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                {employeeCosts.map((cost, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center py-2 border-b border-border/30"
                  >
                    <span className="text-sm text-muted-foreground">{cost.label}</span>
                    <span className="text-sm font-medium text-foreground">{cost.value}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t-2 border-destructive/30">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-foreground">Custo Real Mensal</span>
                  <span className="text-2xl font-bold text-destructive">
                    R$ {totalEmployee.toLocaleString("pt-BR")}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  *Sem contar faltas, atrasos e erros humanos
                </p>
              </div>
            </div>

            {/* System Column */}
            <div
              className={`rounded-2xl border border-gold/30 bg-gold/5 p-6 relative transition-all duration-500 ${
                isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
              }`}
              style={{ transitionDelay: "200ms" }}
            >
              {/* Best Choice Badge */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gold text-charcoal text-xs font-bold rounded-full">
                MELHOR ESCOLHA
              </div>

              <div className="flex items-center gap-3 mb-6 mt-2">
                <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center">
                  <Check className="h-6 w-6 text-gold" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">Sistema Jackson</h3>
                  <p className="text-sm text-muted-foreground">Gerente Virtual 24h</p>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                {systemBenefits.map((benefit, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 py-2"
                  >
                    <Check className="h-4 w-4 text-gold flex-shrink-0" />
                    <span className="text-sm text-foreground">{benefit}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t-2 border-gold/30">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-foreground">Investimento Mensal</span>
                  <span className="text-2xl font-bold text-gold">
                    R$ {systemPrice}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  *Tudo incluso, sem surpresas
                </p>
              </div>
            </div>
          </div>

          {/* Savings Highlight */}
          <div
            className={`max-w-3xl mx-auto transition-all duration-500 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
            style={{ transitionDelay: "300ms" }}
          >
            <div className="bg-gradient-to-r from-gold/20 via-gold/10 to-gold/20 rounded-2xl p-8 border border-gold/30 text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <TrendingDown className="h-8 w-8 text-gold" />
                <span className="text-2xl md:text-3xl font-bold text-foreground">
                  Economia de
                </span>
              </div>

              <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8">
                <div>
                  <p className="text-4xl md:text-5xl font-bold text-gold">
                    R$ {monthlySavings.toLocaleString("pt-BR")}
                  </p>
                  <p className="text-sm text-muted-foreground">por mês</p>
                </div>

                <div className="hidden md:block w-px h-16 bg-border" />

                <div>
                  <p className="text-4xl md:text-5xl font-bold text-gold">
                    R$ {yearlySavings.toLocaleString("pt-BR")}
                  </p>
                  <p className="text-sm text-muted-foreground">por ano</p>
                </div>
              </div>

              <p className="mt-6 text-muted-foreground">
                Dinheiro que fica no seu bolso para investir no que realmente importa.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
