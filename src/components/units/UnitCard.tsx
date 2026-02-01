import { Building2, MapPin, Phone, User, Pencil, Trash2, MessageCircle, Crown, Settings, Gift, Unplug, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Unit } from "@/hooks/useUnits";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UnitCardProps {
  unit: Unit;
  onEdit: (unit: Unit) => void;
  onDelete: (unit: Unit) => void;
  onConfigureWhatsApp: (unit: Unit) => void;
  onSetHeadquarters?: (unit: Unit) => void;
  onSettings?: (unit: Unit) => void;
}

type WhatsAppStatus = 'disconnected' | 'connected' | 'checking';

interface WhatsAppProfile {
  name: string | null;
  phone: string | null;
  pictureUrl: string | null;
}

const formatBrazilianPhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  
  if (digits.length === 13 && digits.startsWith('55')) {
    return `(${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  } else if (digits.length === 12 && digits.startsWith('55')) {
    return `(${digits.slice(2, 4)}) ${digits.slice(4, 8)}-${digits.slice(8)}`;
  } else if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  } else if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  
  return phone;
};

export function UnitCard({ unit, onEdit, onDelete, onConfigureWhatsApp, onSetHeadquarters, onSettings }: UnitCardProps) {
  const [whatsappStatus, setWhatsappStatus] = useState<WhatsAppStatus>('checking');
  const [profile, setProfile] = useState<WhatsAppProfile | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  useEffect(() => {
    const checkWhatsAppStatus = async () => {
      if (!unit.evolution_instance_name) {
        setWhatsappStatus('disconnected');
        setProfile(null);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setWhatsappStatus('disconnected');
          return;
        }

        const { data, error } = await supabase.functions.invoke('evolution-whatsapp', {
          body: { action: 'status', unit_id: unit.id }
        });

        if (error || !data?.success) {
          setWhatsappStatus('disconnected');
          setProfile(null);
          return;
        }

        if (data.state === 'open') {
          setWhatsappStatus('connected');
          setProfile({
            name: unit.whatsapp_name || data.profile?.name || null,
            phone: unit.whatsapp_phone || data.profile?.phone || null,
            pictureUrl: unit.whatsapp_picture_url || data.profile?.pictureUrl || null,
          });
        } else {
          setWhatsappStatus('disconnected');
          setProfile(null);
        }
      } catch (err) {
        console.error('Error checking WhatsApp status:', err);
        setWhatsappStatus('disconnected');
        setProfile(null);
      }
    };

    checkWhatsAppStatus();
  }, [unit.id, unit.evolution_instance_name, unit.whatsapp_name, unit.whatsapp_phone, unit.whatsapp_picture_url]);

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('evolution-whatsapp', {
        body: { action: 'disconnect', unit_id: unit.id }
      });

      if (error) throw error;

      toast.success('WhatsApp desconectado com sucesso');
      setWhatsappStatus('disconnected');
      setProfile(null);
      setPopoverOpen(false);
    } catch (err) {
      console.error('Error disconnecting WhatsApp:', err);
      toast.error('Erro ao desconectar WhatsApp');
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <Card className="group relative overflow-hidden border-border bg-card transition-all duration-200 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
      <CardHeader className="flex flex-row items-start justify-between pb-2">
          <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Building2 className="h-5 w-5 text-primary" />
            <span 
              className={`absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-card ${
                whatsappStatus === 'checking' 
                  ? 'bg-yellow-500' 
                  : whatsappStatus === 'connected' 
                    ? 'bg-green-500' 
                    : 'bg-muted-foreground/50'
              }`}
              title={
                whatsappStatus === 'checking' 
                  ? 'Verificando conexão...' 
                  : whatsappStatus === 'connected' 
                    ? 'WhatsApp conectado' 
                    : 'WhatsApp desconectado'
              }
            >
              {whatsappStatus === 'connected' && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              )}
              {whatsappStatus === 'checking' && (
                <span className="absolute inline-flex h-full w-full animate-pulse rounded-full bg-yellow-400 opacity-75" />
              )}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-foreground">{unit.name}</h3>
              {unit.is_headquarters && (
                <Badge className="text-xs bg-primary/20 text-primary border-primary/30">
                  <Crown className="mr-1 h-3 w-3" />
                  Matriz
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title="Configurações da unidade"
              >
                <Settings className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover">
              <DropdownMenuItem onClick={() => onSettings?.(unit)} className="cursor-pointer">
                <Gift className="mr-2 h-4 w-4" />
                Programa de Fidelidade
              </DropdownMenuItem>
              {!unit.is_headquarters && onSetHeadquarters && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onSetHeadquarters(unit)} className="cursor-pointer">
                    <Crown className="mr-2 h-4 w-4" />
                    Definir como Matriz
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onEdit(unit)} className="cursor-pointer">
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(unit)}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {unit.fidelity_program_enabled && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
              <Gift className="mr-1 h-3 w-3" />
              Fidelidade: {unit.fidelity_cuts_threshold} cortes
            </Badge>
          </div>
        )}
        
        {unit.address && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary/70" />
            <span>{unit.address}</span>
          </div>
        )}
        
        {unit.phone && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-4 w-4 text-primary/70" />
            <span>{unit.phone}</span>
          </div>
        )}
        
        {unit.manager_name && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4 text-primary/70" />
            <span>{unit.manager_name}</span>
          </div>
        )}

        {/* WhatsApp Action Button */}
        <div className="pt-2">
          {whatsappStatus === 'checking' ? (
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full" 
              disabled
            >
              <MessageCircle className="mr-2 h-4 w-4 animate-pulse" />
              Verificando...
            </Button>
          ) : whatsappStatus === 'connected' ? (
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20 hover:text-green-300 justify-start gap-2"
                >
                  {profile?.pictureUrl ? (
                    <img 
                      src={profile.pictureUrl} 
                      alt="WhatsApp" 
                      className="h-5 w-5 rounded-full object-cover"
                    />
                  ) : (
                    <MessageCircle className="h-4 w-4" />
                  )}
                  <span className="truncate flex-1 text-left">
                    {profile?.phone ? formatBrazilianPhone(profile.phone) : 'WhatsApp Conectado'}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-0" align="start">
                <div className="p-4 space-y-4">
                  {/* Profile Info */}
                  <div className="flex items-center gap-3">
                    {profile?.pictureUrl ? (
                      <img 
                        src={profile.pictureUrl} 
                        alt="WhatsApp" 
                        className="h-12 w-12 rounded-full object-cover border-2 border-green-500/50"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center border-2 border-green-500/50">
                        <MessageCircle className="h-6 w-6 text-green-500" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {profile?.name || 'WhatsApp'}
                      </p>
                      {profile?.phone && (
                        <p className="text-sm text-muted-foreground">
                          {formatBrazilianPhone(profile.phone)}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-xs text-green-500 font-medium">Online</span>
                      </div>
                    </div>
                  </div>

                  {/* Disconnect Button */}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDisconnect}
                    disabled={isDisconnecting}
                    className="w-full gap-2"
                  >
                    {isDisconnecting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Unplug className="h-4 w-4" />
                    )}
                    Desconectar WhatsApp
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          ) : (
            <Button 
              size="sm" 
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              onClick={() => onConfigureWhatsApp(unit)}
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Conectar WhatsApp
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
