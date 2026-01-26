import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Gift, Info, Loader2 } from "lucide-react";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function FidelityTab() {
  const { settings, isLoading, updateSettings } = useBusinessSettings();
  
  const [enabled, setEnabled] = useState(false);
  const [threshold, setThreshold] = useState(10);

  useEffect(() => {
    if (settings) {
      setEnabled(settings.fidelity_program_enabled ?? false);
      setThreshold(settings.fidelity_cuts_threshold ?? 10);
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate({
      fidelity_program_enabled: enabled,
      fidelity_cuts_threshold: threshold,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary" />
          Programa de Fidelidade
        </CardTitle>
        <CardDescription>
          Configure o programa de fidelidade para recompensar clientes frequentes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="fidelity-enabled" className="text-base">
              Ativar programa de fidelidade
            </Label>
            <p className="text-sm text-muted-foreground">
              Clientes acumulam cortes e ganham cortesias automaticamente
            </p>
          </div>
          <Switch
            id="fidelity-enabled"
            checked={enabled}
            onCheckedChange={setEnabled}
          />
        </div>

        {enabled && (
          <>
            <div className="space-y-2">
              <Label htmlFor="threshold">Cortes para ganhar cortesia</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="threshold"
                  type="number"
                  min={2}
                  max={50}
                  value={threshold}
                  onChange={(e) => setThreshold(Math.max(2, parseInt(e.target.value) || 10))}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">cortes</span>
              </div>
              <p className="text-sm text-muted-foreground">
                A cada {threshold} cortes, o cliente ganha 1 cortesia grátis
              </p>
            </div>

            <Alert className="border-primary/50 bg-primary/5">
              <Info className="h-4 w-4 text-primary" />
              <AlertDescription className="text-sm">
                <strong>Como funciona:</strong>
                <ul className="mt-2 ml-4 list-disc space-y-1">
                  <li>A cada corte concluído, o contador do cliente aumenta</li>
                  <li>Cortes de dependentes (filhos, familiares) contam para o cliente titular</li>
                  <li>Ao atingir {threshold} cortes, 1 cortesia é creditada automaticamente</li>
                  <li>O contador zera e recomeça a contagem</li>
                  <li>As cortesias ficam disponíveis para uso no checkout</li>
                </ul>
              </AlertDescription>
            </Alert>
          </>
        )}

        <div className="flex justify-end">
          <Button 
            onClick={handleSave} 
            disabled={updateSettings.isPending}
          >
            {updateSettings.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Salvar Alterações
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
