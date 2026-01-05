import { useState } from "react";
import { Send, Users, Cake, UserX, Search, CheckSquare, Square, Building2, Settings, Save, Scissors, Loader2 } from "lucide-react";
import { MessageTemplatesModal } from "./MessageTemplatesModal";
import { TemplateSelector } from "./TemplateSelector";
import { useMessageTemplates } from "@/hooks/useMessageTemplates";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { useClients, type ClientFilter } from "@/hooks/useClients";
import { useUnits } from "@/hooks/useUnits";
import { useBarbers } from "@/hooks/useBarbers";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

type RecipientType = "clients" | "barbers";

interface Target {
  phone: string;
  name: string;
  unit_id: string;
}

const filterOptions = [
  { value: "all", label: "Todos os Clientes", icon: Users },
  { value: "birthday_month", label: "Aniversariantes do Mês", icon: Cake },
  { value: "inactive", label: "Sumidos (30+ dias)", icon: UserX },
];

export function CampaignsTab() {
  const [recipientType, setRecipientType] = useState<RecipientType>("clients");
  const [filter, setFilter] = useState<ClientFilter>("all");
  const [unitFilter, setUnitFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedBarberIds, setSelectedBarberIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [templatesModalOpen, setTemplatesModalOpen] = useState(false);

  const { createTemplate } = useMessageTemplates();
  const { units } = useUnits();
  const { clients, isLoading: clientsLoading } = useClients({
    filter,
    unitIdFilter: unitFilter === "all" ? null : unitFilter,
  });
  const { barbers, isLoading: barbersLoading } = useBarbers(unitFilter === "all" ? null : unitFilter);

  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm)
  );

  const filteredBarbers = barbers
    .filter((barber) => barber.phone)
    .filter((barber) =>
      barber.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      barber.phone?.includes(searchTerm)
    );

  const showUnitBadge = unitFilter === "all" && units.length > 1;
  const isLoading = recipientType === "clients" ? clientsLoading : barbersLoading;

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleBarberSelection = (id: string) => {
    const newSelected = new Set(selectedBarberIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedBarberIds(newSelected);
  };

  const selectAll = () => {
    if (recipientType === "clients") {
      if (selectedIds.size === filteredClients.length) {
        setSelectedIds(new Set());
      } else {
        setSelectedIds(new Set(filteredClients.map((c) => c.id)));
      }
    } else {
      if (selectedBarberIds.size === filteredBarbers.length) {
        setSelectedBarberIds(new Set());
      } else {
        setSelectedBarberIds(new Set(filteredBarbers.map((b) => b.id)));
      }
    }
  };

  const handleSendCampaign = async () => {
    const isClientsMode = recipientType === "clients";
    const selectedCount = isClientsMode ? selectedIds.size : selectedBarberIds.size;

    if (selectedCount === 0) {
      toast({ title: "Selecione pelo menos um destinatário", variant: "destructive" });
      return;
    }
    if (!message.trim()) {
      toast({ title: "Digite uma mensagem", variant: "destructive" });
      return;
    }

    setIsSending(true);
    
    try {
      // Group targets by unit_id
      const targetsByUnit = new Map<string, { unitId: string; unitName: string; targets: Target[] }>();

      if (isClientsMode) {
        const selectedClients = clients.filter((c) => selectedIds.has(c.id));
        selectedClients.forEach((client) => {
          const unitId = client.unit_id;
          if (!targetsByUnit.has(unitId)) {
            const unit = units.find(u => u.id === unitId);
            targetsByUnit.set(unitId, {
              unitId,
              unitName: unit?.name || "Unidade",
              targets: [],
            });
          }
          targetsByUnit.get(unitId)!.targets.push({
            phone: client.phone,
            name: client.name,
            unit_id: unitId,
          });
        });
      } else {
        const selectedBarbersList = barbers.filter((b) => selectedBarberIds.has(b.id));
        selectedBarbersList.forEach((barber) => {
          const unitId = barber.unit_id;
          if (!targetsByUnit.has(unitId)) {
            const unit = units.find(u => u.id === unitId);
            targetsByUnit.set(unitId, {
              unitId,
              unitName: unit?.name || "Unidade",
              targets: [],
            });
          }
          targetsByUnit.get(unitId)!.targets.push({
            phone: barber.phone!,
            name: barber.name,
            unit_id: unitId,
          });
        });
      }

      // Send one request per unit
      const results: { unitName: string; success: boolean; count: number; error?: string }[] = [];

      for (const [unitId, { unitName, targets }] of targetsByUnit) {
        console.log(`Sending campaign to unit ${unitName} with ${targets.length} targets`);
        
        const { data, error } = await supabase.functions.invoke("send-marketing-campaign", {
          body: {
            unit_id: unitId,
            message_template: message,
            targets,
          },
        });

        results.push({
          unitName,
          success: !error && data?.success,
          count: targets.length,
          error: error?.message || data?.error,
        });
      }

      // Calculate results
      const successCount = results.filter(r => r.success).reduce((sum, r) => sum + r.count, 0);
      const failedUnits = results.filter(r => !r.success);

      if (failedUnits.length > 0 && successCount === 0) {
        // All failed
        toast({
          title: "Erro ao enviar campanha",
          description: failedUnits.map(f => `${f.unitName}: ${f.error}`).join("; "),
          variant: "destructive",
        });
      } else if (failedUnits.length > 0) {
        // Partial success
        toast({
          title: "Campanha parcialmente enviada",
          description: `${successCount} mensagem(ns) em processamento. Falha: ${failedUnits.map(f => f.unitName).join(", ")}`,
          variant: "destructive",
        });
        // Clear selections for successful units
        if (isClientsMode) {
          setSelectedIds(new Set());
        } else {
          setSelectedBarberIds(new Set());
        }
        setMessage("");
      } else {
        // All success
        toast({
          title: "Campanha iniciada!",
          description: `${successCount} mensagem(ns) sendo enviadas em segundo plano. Intervalo de 15-25s entre cada envio para evitar bloqueio.`,
        });
        if (isClientsMode) {
          setSelectedIds(new Set());
        } else {
          setSelectedBarberIds(new Set());
        }
        setMessage("");
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      toast({
        title: "Erro inesperado",
        description: "Não foi possível enviar a campanha.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const selectedClients = clients.filter((c) => selectedIds.has(c.id));
  const selectedBarbersList = barbers.filter((b) => selectedBarberIds.has(b.id));
  const totalSelected = recipientType === "clients" ? selectedIds.size : selectedBarberIds.size;
  const previewName = recipientType === "clients" 
    ? selectedClients[0]?.name 
    : selectedBarbersList[0]?.name;
  const currentListLength = recipientType === "clients" ? filteredClients.length : filteredBarbers.length;
  const currentSelectedSize = recipientType === "clients" ? selectedIds.size : selectedBarberIds.size;

  return (
    <div className="space-y-6">
      {/* Filter and Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Unit Filter */}
          {units.length > 1 && (
            <Select value={unitFilter} onValueChange={(v) => { setUnitFilter(v); setSelectedIds(new Set()); setSelectedBarberIds(new Set()); }}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Unidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Unidades</SelectItem>
                {units.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id}>
                    {unit.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {recipientType === "clients" && (
            <Select value={filter} onValueChange={(v) => { setFilter(v as ClientFilter); setSelectedIds(new Set()); }}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Filtrar clientes" />
              </SelectTrigger>
              <SelectContent>
                {filterOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex items-center gap-2">
                      <opt.icon className="h-4 w-4" />
                      {opt.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full sm:w-[300px]"
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recipient List */}
        <Card>
          <CardHeader className="pb-3">
            <Tabs value={recipientType} onValueChange={(v) => setRecipientType(v as RecipientType)} className="mb-2">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="clients" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Clientes ({filteredClients.length})
                </TabsTrigger>
                <TabsTrigger value="barbers" className="flex items-center gap-2">
                  <Scissors className="h-4 w-4" />
                  Profissionais ({filteredBarbers.length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center justify-between">
              <CardDescription>
                {currentSelectedSize > 0 
                  ? `${currentSelectedSize} de ${currentListLength} selecionados`
                  : `${currentListLength} encontrado(s)`
                }
              </CardDescription>
              <Button variant="outline" size="sm" onClick={selectAll}>
                {currentSelectedSize === currentListLength && currentListLength > 0 ? (
                  <><CheckSquare className="mr-2 h-4 w-4" /> Desmarcar</>
                ) : (
                  <><Square className="mr-2 h-4 w-4" /> Selecionar Todos</>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : recipientType === "clients" ? (
              filteredClients.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Users className="mx-auto h-12 w-12 opacity-30" />
                  <p className="mt-2">Nenhum cliente encontrado</p>
                </div>
              ) : (
                <div className="max-h-[400px] space-y-2 overflow-y-auto pr-2">
                  {filteredClients.map((client) => (
                    <div
                      key={client.id}
                      onClick={() => toggleSelection(client.id)}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                        selectedIds.has(client.id)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <Checkbox checked={selectedIds.has(client.id)} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{client.name}</p>
                        <p className="text-sm text-muted-foreground">{client.phone}</p>
                        {showUnitBadge && client.unit_name && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <Building2 className="h-3 w-3" />
                            <span>{client.unit_name}</span>
                          </div>
                        )}
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        {client.birth_date && (
                          <Badge variant="outline" className="mb-1">
                            <Cake className="mr-1 h-3 w-3" />
                            {client.birth_date.split("-").slice(1).reverse().join("/")}
                          </Badge>
                        )}
                        {client.last_visit_at && (
                          <p>Última visita: {format(new Date(client.last_visit_at), "dd/MM/yy")}</p>
                        )}
                        <p>{client.total_visits} visita(s)</p>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              filteredBarbers.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Scissors className="mx-auto h-12 w-12 opacity-30" />
                  <p className="mt-2">Nenhum profissional com telefone encontrado</p>
                </div>
              ) : (
                <div className="max-h-[400px] space-y-2 overflow-y-auto pr-2">
                  {filteredBarbers.map((barber) => (
                    <div
                      key={barber.id}
                      onClick={() => toggleBarberSelection(barber.id)}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                        selectedBarberIds.has(barber.id)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <Checkbox checked={selectedBarberIds.has(barber.id)} />
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={barber.photo_url || undefined} />
                        <AvatarFallback>{barber.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{barber.name}</p>
                        <p className="text-sm text-muted-foreground">{barber.phone}</p>
                        {showUnitBadge && barber.unit_name && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <Building2 className="h-3 w-3" />
                            <span>{barber.unit_name}</span>
                          </div>
                        )}
                      </div>
                      <Badge variant={barber.is_active ? "default" : "secondary"}>
                        {barber.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Mensagem da Campanha</CardTitle>
                <CardDescription>
                  Use <code className="rounded bg-muted px-1">{"{{nome}}"}</code> para personalizar com o nome
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setTemplatesModalOpen(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Gerenciar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <TemplateSelector onSelectTemplate={(content) => setMessage(content)} />
              {message.trim() && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const name = prompt("Nome do template:");
                    if (name?.trim()) {
                      createTemplate.mutate({ name: name.trim(), content: message });
                    }
                  }}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Salvar como Template
                </Button>
              )}
            </div>
            
            <Textarea
              placeholder="Olá {{nome}}! Temos uma promoção especial para você..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[200px] resize-none"
            />

            {message && totalSelected > 0 && (
              <div className="rounded-lg border border-dashed p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Prévia:</p>
                <p className="text-sm">
                  {message.replace(/\{\{nome\}\}/g, previewName || "Destinatário")}
                </p>
              </div>
            )}

            <Button
              className="w-full"
              size="lg"
              onClick={handleSendCampaign}
              disabled={isSending || totalSelected === 0 || !message.trim()}
            >
              {isSending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando...</>
              ) : (
                <><Send className="mr-2 h-4 w-4" /> Enviar Campanha ({totalSelected} {recipientType === "clients" ? "cliente" : "profissional"}{totalSelected !== 1 ? "s" : ""})</>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      <MessageTemplatesModal 
        open={templatesModalOpen} 
        onOpenChange={setTemplatesModalOpen} 
      />
    </div>
  );
}
