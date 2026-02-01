import { useState, useEffect } from "react";
import { Gift, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Unit } from "@/hooks/useUnits";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface UnitSettingsModalProps {
  open: boolean;
  onClose: () => void;
  unit: Unit | null;
}

export function UnitSettingsModal({ open, onClose, unit }: UnitSettingsModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  
  const [fidelityEnabled, setFidelityEnabled] = useState(false);
  const [cutsThreshold, setCutsThreshold] = useState(10);
  const [minValue, setMinValue] = useState(30);

  useEffect(() => {
    if (unit) {
      loadSettings();
    }
  }, [unit]);

  const loadSettings = async () => {
    if (!unit) return;
    
    const { data, error } = await supabase
      .from("units")
      .select("fidelity_program_enabled, fidelity_cuts_threshold, fidelity_min_value")
      .eq("id", unit.id)
      .single();

    if (error) {
      console.error("Error loading unit settings:", error);
      return;
    }

    setFidelityEnabled(data.fidelity_program_enabled ?? false);
    setCutsThreshold(data.fidelity_cuts_threshold ?? 10);
    setMinValue(data.fidelity_min_value ?? 30);
  };

  const handleSave = async () => {
    if (!unit) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("units")
        .update({
          fidelity_program_enabled: fidelityEnabled,
          fidelity_cuts_threshold: cutsThreshold,
          fidelity_min_value: minValue,
        })
        .eq("id", unit.id);

      if (error) throw error;

      toast({
        title: "Configurações salvas!",
        description: "As configurações da unidade foram atualizadas.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["units"] });
      onClose();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Configurações - {unit?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Fidelity Program Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base font-medium">Programa de Fidelidade</Label>
                <p className="text-sm text-muted-foreground">
                  Recompense clientes fiéis com cortesias
                </p>
              </div>
              <Switch
                checked={fidelityEnabled}
                onCheckedChange={setFidelityEnabled}
              />
            </div>

            <div className={`space-y-4 ${!fidelityEnabled ? 'opacity-50' : ''}`}>
              <div className="space-y-2">
                <Label>Cortes para ganhar cortesia</Label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={cutsThreshold}
                  onChange={(e) => setCutsThreshold(Number(e.target.value))}
                  disabled={!fidelityEnabled}
                />
                <p className="text-xs text-muted-foreground">
                  A cada {cutsThreshold} cortes pagos, o cliente ganha 1 corte grátis
                </p>
              </div>

              <div className="space-y-2">
                <Label>Valor mínimo do serviço (R$)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={minValue}
                  onChange={(e) => setMinValue(Number(e.target.value))}
                  disabled={!fidelityEnabled}
                />
                <p className="text-xs text-muted-foreground">
                  Serviços a partir de R$ {minValue.toFixed(2)} contam para fidelidade
                </p>
              </div>
            </div>

            {/* Info Card */}
            <Card className="bg-muted/50 border-muted">
              <CardContent className="p-3">
                <div className="flex gap-2">
                  <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p><strong>Como funciona:</strong></p>
                    <ul className="list-disc list-inside space-y-0.5">
                      <li>Serviços ≥ R$ {minValue.toFixed(2)} contam como corte</li>
                      <li>Cortesias e cancelamentos não contam</li>
                      <li>Ao atingir {cutsThreshold} cortes, cliente ganha 1 cortesia</li>
                      <li>A cortesia deve ser usada antes de continuar acumulando</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
