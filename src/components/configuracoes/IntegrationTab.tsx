import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, CheckCircle2, Loader2, XCircle, RefreshCw, AlertCircle } from "lucide-react";
import { useCompany } from "@/hooks/useCompany";
import { useEvolutionWhatsApp } from "@/hooks/useEvolutionWhatsApp";

export function IntegrationTab() {
  const { company, isLoading: companyLoading } = useCompany();
  const {
    connectionState,
    qrCode,
    pairingCode,
    isLoading,
    error,
    createInstance,
    disconnect,
    refreshQRCode,
  } = useEvolutionWhatsApp();

  const isConnected = connectionState === "open";
  const isConnecting = connectionState === "connecting" || connectionState === "loading";
  const hasQRCode = !!qrCode;
  const hasError = connectionState === "error";

  if (companyLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className={`border-2 transition-colors ${isConnected ? 'border-green-500/50 bg-green-500/5' : hasError ? 'border-destructive/50 bg-destructive/5' : 'border-border bg-card'}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className={`h-5 w-5 ${isConnected ? 'text-green-500' : hasError ? 'text-destructive' : 'text-muted-foreground'}`} />
            <CardTitle>Conexão WhatsApp</CardTitle>
          </div>
          {isConnected && (
            <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Ativo
            </Badge>
          )}
          {isConnecting && (
            <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Conectando
            </Badge>
          )}
          {hasError && (
            <Badge variant="destructive">
              <AlertCircle className="h-3 w-3 mr-1" />
              Erro
            </Badge>
          )}
        </div>
        <CardDescription>
          {isConnected 
            ? "Seu WhatsApp está conectado e pronto para enviar notificações" 
            : isConnecting
            ? "Aguardando você escanear o QR Code..."
            : hasError
            ? "Ocorreu um erro na conexão"
            : "Conecte seu WhatsApp para enviar notificações automáticas"
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Estado: Conectado */}
        {isConnected && (
          <div className="flex flex-col items-center gap-6 py-4">
            <div className="relative">
              <div className="h-20 w-20 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-green-500 animate-pulse" />
              </div>
            </div>
            
            <div className="text-center space-y-1">
              <h3 className="text-lg font-semibold text-foreground">WhatsApp Conectado!</h3>
              <p className="text-muted-foreground flex items-center justify-center gap-2">
                <MessageCircle className="h-4 w-4" />
                {company?.evolution_instance_name || company?.name || "Sua Barbearia"}
              </p>
              <p className="text-sm text-muted-foreground">
                Pronto para enviar mensagens aos clientes
              </p>
            </div>

            <Button 
              variant="destructive" 
              onClick={disconnect}
              disabled={isLoading}
              className="mt-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Desconectar
            </Button>
          </div>
        )}

        {/* Estado: Desconectado - Mostrar botão de conectar */}
        {!isConnected && !hasQRCode && !isConnecting && (
          <div className="flex flex-col items-center gap-6 py-8">
            <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
              <MessageCircle className="h-10 w-10 text-muted-foreground" />
            </div>
            
            <div className="text-center space-y-1">
              <h3 className="text-lg font-medium text-foreground">WhatsApp não conectado</h3>
              <p className="text-sm text-muted-foreground">
                Conecte para enviar lembretes automáticos de agendamento
              </p>
              {hasError && error && (
                <p className="text-sm text-destructive mt-2">
                  {error}
                </p>
              )}
            </div>

            <Button 
              size="lg" 
              onClick={createInstance}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              ) : (
                <MessageCircle className="h-5 w-5 mr-2" />
              )}
              {isLoading ? "Gerando QR Code..." : "Conectar WhatsApp"}
            </Button>
          </div>
        )}

        {/* Estado: Mostrando QR Code Real */}
        {hasQRCode && !isConnected && (
          <div className="flex flex-col items-center gap-6 py-4">
            <div className="text-center space-y-1">
              <h3 className="text-lg font-semibold text-foreground">Escaneie o QR Code</h3>
              <p className="text-sm text-muted-foreground">
                Abra o WhatsApp no seu celular e escaneie o código abaixo
              </p>
            </div>

            {/* QR Code Real */}
            <div className="w-64 h-64 border-2 border-primary/30 rounded-lg bg-white flex items-center justify-center overflow-hidden">
              <img 
                src={`data:image/png;base64,${qrCode}`} 
                alt="QR Code WhatsApp"
                className="w-full h-full object-contain p-2"
              />
            </div>

            {/* Pairing Code (se disponível) */}
            {pairingCode && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Ou use o código:</p>
                <p className="font-mono text-xl font-bold text-primary tracking-wider">
                  {pairingCode}
                </p>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Aguardando conexão...
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={disconnect}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button 
                variant="outline"
                onClick={refreshQRCode}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Atualizar QR Code
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center max-w-sm">
              O status será atualizado automaticamente quando você escanear o QR Code
            </p>
          </div>
        )}

        {/* Estado: Carregando (criando instância) */}
        {connectionState === "loading" && !hasQRCode && (
          <div className="flex flex-col items-center gap-6 py-8">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
            </div>
            
            <div className="text-center space-y-1">
              <h3 className="text-lg font-medium text-foreground">Gerando QR Code...</h3>
              <p className="text-sm text-muted-foreground">
                Aguarde enquanto preparamos sua conexão
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
