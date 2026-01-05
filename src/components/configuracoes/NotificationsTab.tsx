import { useState, useEffect } from "react";
import { Volume2, Save, Loader2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useMarketingSettings } from "@/hooks/useMarketingSettings";
import { Skeleton } from "@/components/ui/skeleton";

export function NotificationsTab() {
  const { settings, isLoading, updateSettings } = useMarketingSettings();
  const [vocalNotificationEnabled, setVocalNotificationEnabled] = useState(true);
  const [vocalCancellationEnabled, setVocalCancellationEnabled] = useState(true);

  useEffect(() => {
    if (settings) {
      setVocalNotificationEnabled(settings.vocal_notification_enabled ?? true);
      setVocalCancellationEnabled(settings.vocal_cancellation_enabled ?? true);
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate({
      vocal_notification_enabled: vocalNotificationEnabled,
      vocal_cancellation_enabled: vocalCancellationEnabled,
    });
  };

  if (isLoading) {
    return <Skeleton className="h-[200px] w-full" />;
  }

  return (
    <div className="space-y-6">
      {/* New Appointment Notification */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                <Volume2 className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <CardTitle className="text-lg">Novo Agendamento</CardTitle>
                <CardDescription>
                  Anunciar por voz quando um novo agendamento for criado via WhatsApp
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={vocalNotificationEnabled}
              onCheckedChange={setVocalNotificationEnabled}
            />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Quando ativado, o sistema irá anunciar por voz novos agendamentos feitos pelo WhatsApp enquanto você estiver na página de Agenda.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Exemplo: "Diego agendou com Bruno o serviço pezinho para hoje às 14 e 30"
          </p>
        </CardContent>
      </Card>

      {/* Cancellation Notification */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                <VolumeX className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <CardTitle className="text-lg">Cancelamento de Agendamento</CardTitle>
                <CardDescription>
                  Anunciar por voz quando um agendamento for cancelado via WhatsApp
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={vocalCancellationEnabled}
              onCheckedChange={setVocalCancellationEnabled}
            />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Quando ativado, o sistema irá anunciar por voz cancelamentos de agendamentos feitos pelo WhatsApp enquanto você estiver na página de Agenda.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Exemplo: "O agendamento de Diego às 14 e 30 foi cancelado"
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updateSettings.isPending}>
          {updateSettings.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Salvar
        </Button>
      </div>
    </div>
  );
}