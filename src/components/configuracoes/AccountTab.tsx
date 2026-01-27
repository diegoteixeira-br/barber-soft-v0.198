import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Shield, 
  LogOut, 
  Loader2, 
  User, 
  MessageSquare, 
  Bug, 
  Lightbulb,
  CreditCard,
  Crown,
  Infinity,
  Calendar,
  ExternalLink,
  AlertTriangle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useFeedback } from "@/hooks/useFeedback";
import { useSubscription } from "@/hooks/useSubscription";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function AccountTab() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isSuperAdmin } = useSuperAdmin();
  const { status, isLoading: subscriptionLoading, openCustomerPortal } = useSubscription();
  
  // Security state
  const [email, setEmail] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);
  // Feedback state
  const [feedbackType, setFeedbackType] = useState<'feedback' | 'bug' | 'suggestion'>('feedback');
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const { submitFeedback, isSubmitting: isSubmittingFeedback } = useFeedback();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setEmail(user?.email || null);
    };
    getUser();
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Senhas não coincidem",
        description: "A nova senha e a confirmação devem ser iguais.",
        variant: "destructive",
      });
      return;
    }

    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);

    if (error) {
      toast({
        title: "Erro ao alterar senha",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Senha alterada",
        description: "Sua senha foi alterada com sucesso.",
      });
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await supabase.auth.signOut();
    setLoggingOut(false);
    navigate("/auth");
  };

  const handleSubmitFeedback = () => {
    if (!feedbackMessage.trim()) return;
    
    submitFeedback(
      { type: feedbackType, message: feedbackMessage },
      {
        onSuccess: () => {
          setFeedbackMessage("");
          setFeedbackType('feedback');
        }
      }
    );
  };

  const isPartner = status?.is_partner;
  const daysRemaining = status?.days_remaining;

  const getStatusBadge = () => {
    if (isSuperAdmin) {
      return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Vitalício</Badge>;
    }
    if (isPartner) {
      return <Badge className="bg-gold/20 text-gold border-gold/30">Parceiro</Badge>;
    }
    switch (status?.plan_status) {
      case "trial":
        return <Badge variant="secondary">Trial</Badge>;
      case "active":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Ativo</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelado</Badge>;
      case "overdue":
        return <Badge variant="destructive">Pagamento Pendente</Badge>;
      default:
        return <Badge variant="outline">-</Badge>;
    }
  };

  const getPlanName = () => {
    if (isSuperAdmin) return "Super Admin";
    if (isPartner) return "Parceiro";
    switch (status?.plan_type) {
      case "inicial":
        return "Plano Inicial";
      case "profissional":
        return "Plano Profissional";
      case "franquias":
        return "Plano Franquias";
      default:
        return "Sem plano";
    }
  };

  return (
    <div className="space-y-6">
      {/* Subscription Card */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isSuperAdmin ? (
              <Infinity className="h-5 w-5 text-purple-400" />
            ) : isPartner ? (
              <Crown className="h-5 w-5 text-gold" />
            ) : (
              <CreditCard className="h-5 w-5 text-primary" />
            )}
            Assinatura
          </CardTitle>
          <CardDescription>
            Gerencie seu plano e faturamento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {subscriptionLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                    isSuperAdmin ? "bg-purple-500/20" : isPartner ? "bg-gold/20" : "bg-primary/20"
                  }`}>
                    {isSuperAdmin ? (
                      <Shield className="h-5 w-5 text-purple-400" />
                    ) : isPartner ? (
                      <Crown className="h-5 w-5 text-gold" />
                    ) : (
                      <CreditCard className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{getPlanName()}</p>
                    <div className="flex items-center gap-2">
                      {getStatusBadge()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Trial Progress */}
              {status?.plan_status === "trial" && daysRemaining !== null && (
                <div className="space-y-2 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-yellow-500 font-medium flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Período de teste
                    </span>
                    <span className="text-muted-foreground">{daysRemaining} dias restantes</span>
                  </div>
                  <Progress value={((7 - daysRemaining) / 7) * 100} className="h-2" />
                </div>
              )}

              {/* Partner Expiration */}
              {!isSuperAdmin && isPartner && status?.partner_ends_at && (
                <div className="flex items-center gap-2 p-4 rounded-lg bg-gold/10 border border-gold/20">
                  <Calendar className="h-4 w-4 text-gold" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gold">
                      Acesso válido até: {format(new Date(status.partner_ends_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                    {daysRemaining !== null && daysRemaining > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {daysRemaining} dia{daysRemaining > 1 ? 's' : ''} restante{daysRemaining > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Super Admin Info */}
              {isSuperAdmin && (
                <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <p className="text-sm text-purple-400">
                    Você tem acesso vitalício como Super Admin. Sem restrições de faturamento.
                  </p>
                </div>
              )}

              {/* Manage Subscription Button */}
              {!isSuperAdmin && !isPartner && status?.plan_status && status.plan_status !== "trial" && (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={async () => {
                    setIsOpeningPortal(true);
                    await openCustomerPortal();
                    setIsOpeningPortal(false);
                  }}
                  disabled={isOpeningPortal}
                >
                  {isOpeningPortal ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ExternalLink className="h-4 w-4 mr-2" />
                  )}
                  Gerenciar Assinatura
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Change Password Card */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Alterar Senha
          </CardTitle>
          <CardDescription>
            Atualize sua senha de acesso ao sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new_password">Nova Senha</Label>
              <Input
                id="new_password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirmar Nova Senha</Label>
              <Input
                id="confirm_password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" disabled={changingPassword || !newPassword || !confirmPassword}>
              {changingPassword && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Alterar Senha
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Feedback Card */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Enviar Feedback
          </CardTitle>
          <CardDescription>
            Sua opinião é muito importante para nós. Compartilhe sua experiência ou reporte um problema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-3 block">Tipo</Label>
            <RadioGroup 
              value={feedbackType} 
              onValueChange={(value) => setFeedbackType(value as typeof feedbackType)}
              className="grid grid-cols-3 gap-3"
            >
              <div>
                <RadioGroupItem value="feedback" id="acc-feedback" className="peer sr-only" />
                <Label
                  htmlFor="acc-feedback"
                  className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                >
                  <MessageSquare className="mb-2 h-5 w-5" />
                  <span className="text-xs">Feedback</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem value="bug" id="acc-bug" className="peer sr-only" />
                <Label
                  htmlFor="acc-bug"
                  className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                >
                  <Bug className="mb-2 h-5 w-5" />
                  <span className="text-xs">Bug</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem value="suggestion" id="acc-suggestion" className="peer sr-only" />
                <Label
                  htmlFor="acc-suggestion"
                  className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                >
                  <Lightbulb className="mb-2 h-5 w-5" />
                  <span className="text-xs">Sugestão</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="feedback-message" className="text-sm font-medium mb-2 block">
              Mensagem
            </Label>
            <Textarea
              id="feedback-message"
              value={feedbackMessage}
              onChange={(e) => setFeedbackMessage(e.target.value)}
              placeholder={
                feedbackType === 'bug' 
                  ? "Descreva o problema encontrado com o máximo de detalhes..."
                  : feedbackType === 'suggestion'
                  ? "Compartilhe sua ideia de melhoria..."
                  : "Conte-nos sua experiência..."
              }
              className="min-h-[100px]"
            />
          </div>

          <Button 
            onClick={handleSubmitFeedback}
            disabled={!feedbackMessage.trim() || isSubmittingFeedback}
            className="w-full"
          >
            {isSubmittingFeedback ? "Enviando..." : "Enviar Feedback"}
          </Button>
        </CardContent>
      </Card>

      {/* Session Card */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Sessão
          </CardTitle>
          <CardDescription>
            Gerencie sua sessão de usuário
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{email || "Carregando..."}</p>
              <p className="text-xs text-muted-foreground">Usuário logado</p>
            </div>
          </div>

          <Separator />

          <Button
            variant="destructive"
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full"
          >
            {loggingOut ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4 mr-2" />
            )}
            Sair do Sistema
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
