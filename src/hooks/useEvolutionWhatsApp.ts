import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/hooks/useCompany";

export type ConnectionState = "disconnected" | "connecting" | "open" | "loading" | "error";

interface UseEvolutionWhatsAppReturn {
  connectionState: ConnectionState;
  qrCode: string | null;
  pairingCode: string | null;
  isLoading: boolean;
  error: string | null;
  createInstance: () => Promise<void>;
  disconnect: () => Promise<void>;
  refreshQRCode: () => Promise<void>;
  checkStatus: () => Promise<void>;
}

export function useEvolutionWhatsApp(): UseEvolutionWhatsAppReturn {
  const { toast } = useToast();
  const { company } = useCompany();
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const checkStatus = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error: fnError } = await supabase.functions.invoke('evolution-whatsapp', {
        body: { action: 'status' },
      });

      if (fnError) {
        console.error('Status check error:', fnError);
        return;
      }

      console.log('Status check result:', data);

      if (data.success) {
        const state = data.state?.toLowerCase();
        
        if (state === 'open' || state === 'connected') {
          setConnectionState("open");
          setQrCode(null);
          setPairingCode(null);
          stopPolling();
          toast({
            title: "WhatsApp conectado!",
            description: "Sua integração está funcionando.",
          });
        } else if (state === 'connecting') {
          setConnectionState("connecting");
        } else if (state === 'close' || state === 'disconnected') {
          setConnectionState("disconnected");
          setQrCode(null);
          setPairingCode(null);
          stopPolling();
        }
      }
    } catch (err) {
      console.error('Status check failed:', err);
    }
  }, [toast, stopPolling]);

  const startPolling = useCallback(() => {
    stopPolling();
    pollingRef.current = setInterval(() => {
      checkStatus();
    }, 3000);
  }, [checkStatus, stopPolling]);

  const createInstance = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setConnectionState("loading");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Você precisa estar logado');
      }

      const { data, error: fnError } = await supabase.functions.invoke('evolution-whatsapp', {
        body: { action: 'create' },
      });

      console.log('Create instance result:', data);

      if (fnError) {
        throw new Error(fnError.message || 'Erro ao criar instância');
      }

      if (!data.success) {
        throw new Error(data.error || 'Erro ao criar instância');
      }

      setQrCode(data.qrCode);
      setPairingCode(data.pairingCode);
      setConnectionState("connecting");
      
      // Start polling to check connection status
      startPolling();

      toast({
        title: "QR Code gerado!",
        description: "Escaneie com seu WhatsApp para conectar.",
      });
    } catch (err) {
      console.error('Create instance error:', err);
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(message);
      setConnectionState("error");
      toast({
        title: "Erro ao conectar",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, startPolling]);

  const disconnect = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Você precisa estar logado');
      }

      const { data, error: fnError } = await supabase.functions.invoke('evolution-whatsapp', {
        body: { action: 'disconnect' },
      });

      console.log('Disconnect result:', data);

      if (fnError) {
        throw new Error(fnError.message || 'Erro ao desconectar');
      }

      if (!data.success) {
        throw new Error(data.error || 'Erro ao desconectar');
      }

      stopPolling();
      setConnectionState("disconnected");
      setQrCode(null);
      setPairingCode(null);

      toast({
        title: "WhatsApp desconectado",
        description: "A integração foi removida.",
      });
    } catch (err) {
      console.error('Disconnect error:', err);
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(message);
      toast({
        title: "Erro ao desconectar",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, stopPolling]);

  const refreshQRCode = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Você precisa estar logado');
      }

      const { data, error: fnError } = await supabase.functions.invoke('evolution-whatsapp', {
        body: { action: 'refresh-qr' },
      });

      console.log('Refresh QR result:', data);

      if (fnError) {
        throw new Error(fnError.message || 'Erro ao atualizar QR Code');
      }

      if (!data.success) {
        throw new Error(data.error || 'Erro ao atualizar QR Code');
      }

      setQrCode(data.qrCode);
      setPairingCode(data.pairingCode);

      toast({
        title: "QR Code atualizado!",
        description: "Escaneie novamente para conectar.",
      });
    } catch (err) {
      console.error('Refresh QR error:', err);
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(message);
      toast({
        title: "Erro ao atualizar QR Code",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Check initial status on mount
  useEffect(() => {
    if (company?.evolution_instance_name) {
      checkStatus();
    }
  }, [company?.evolution_instance_name, checkStatus]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    connectionState,
    qrCode,
    pairingCode,
    isLoading,
    error,
    createInstance,
    disconnect,
    refreshQRCode,
    checkStatus,
  };
}
