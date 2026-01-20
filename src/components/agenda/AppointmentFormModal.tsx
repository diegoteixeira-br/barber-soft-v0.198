import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Trash2, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ClientCombobox } from "@/components/clients/ClientCombobox";
import { ClientFormModal } from "@/components/clients/ClientFormModal";
import { useClients, CreateClientData, Client } from "@/hooks/useClients";
import { useDependents, ClientDependent } from "@/hooks/useDependents";
import type { Barber } from "@/hooks/useBarbers";
import type { Service } from "@/hooks/useServices";
import type { Appointment, AppointmentFormData } from "@/hooks/useAppointments";

const formSchema = z.object({
  client_id: z.string().optional(),
  client_name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(100),
  client_phone: z.string().optional(),
  client_birth_date: z.string().optional(),
  barber_id: z.string().min(1, "Selecione um barbeiro"),
  service_id: z.string().min(1, "Selecione um serviço"),
  date: z.string().min(1, "Selecione uma data"),
  time: z.string().min(1, "Selecione um horário"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AppointmentFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  barbers: Barber[];
  services: Service[];
  initialDate?: Date;
  initialBarberId?: string;
  appointment?: Appointment | null;
  onSubmit: (data: AppointmentFormData) => void;
  onDelete?: () => void;
  isLoading?: boolean;
  isDeleting?: boolean;
}

export function AppointmentFormModal({
  open,
  onOpenChange,
  barbers,
  services,
  initialDate,
  initialBarberId,
  appointment,
  onSubmit,
  onDelete,
  isLoading,
  isDeleting,
}: AppointmentFormModalProps) {
  const { clients, createClient } = useClients();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [selectedDependentId, setSelectedDependentId] = useState<string | null>(null);
  
  // Fetch dependents for the selected client
  const { dependents } = useDependents(selectedClientId || undefined);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      client_id: "",
      client_name: "",
      client_phone: "",
      client_birth_date: "",
      barber_id: "",
      service_id: "",
      date: "",
      time: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (appointment) {
        const startDate = new Date(appointment.start_time);
        form.reset({
          client_id: "",
          client_name: appointment.client_name,
          client_phone: appointment.client_phone || "",
          client_birth_date: appointment.client_birth_date || "",
          barber_id: appointment.barber_id || "",
          service_id: appointment.service_id || "",
          date: format(startDate, "yyyy-MM-dd"),
          time: format(startDate, "HH:mm"),
          notes: appointment.notes || "",
        });
        setSelectedClientId(null);
      } else {
        form.reset({
          client_id: "",
          client_name: "",
          client_phone: "",
          client_birth_date: "",
          barber_id: initialBarberId || "",
          service_id: "",
          date: initialDate ? format(initialDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
          time: initialDate ? format(initialDate, "HH:mm") : "09:00",
          notes: "",
        });
        setSelectedClientId(null);
      }
    }
  }, [open, appointment, initialDate, initialBarberId, form]);

  const handleClientSelect = (client: Client | null) => {
    if (client) {
      setSelectedClientId(client.id);
      setSelectedDependentId(null); // Reset dependent selection when client changes
      form.setValue("client_name", client.name);
      form.setValue("client_phone", client.phone);
      form.setValue("client_birth_date", client.birth_date || "");
    } else {
      setSelectedClientId(null);
      setSelectedDependentId(null);
      form.setValue("client_name", "");
      form.setValue("client_phone", "");
      form.setValue("client_birth_date", "");
    }
  };

  const handleDependentSelect = (dependentId: string) => {
    if (dependentId === "titular") {
      setSelectedDependentId(null);
      // Reset to client's data
      const client = clients.find(c => c.id === selectedClientId);
      if (client) {
        form.setValue("client_name", client.name);
        form.setValue("client_birth_date", client.birth_date || "");
      }
    } else {
      setSelectedDependentId(dependentId);
      const dependent = dependents?.find(d => d.id === dependentId);
      if (dependent) {
        form.setValue("client_name", dependent.name);
        form.setValue("client_birth_date", dependent.birth_date || "");
      }
    }
  };

  const handleCreateNewClient = (searchValue: string) => {
    setNewClientName(searchValue);
    setShowCreateClient(true);
  };

  const handleClientCreated = (data: CreateClientData) => {
    createClient.mutate(data, {
      onSuccess: (newClient) => {
        setShowCreateClient(false);
        setSelectedClientId(newClient.id);
        form.setValue("client_name", newClient.name);
        form.setValue("client_phone", newClient.phone);
        form.setValue("client_birth_date", newClient.birth_date || "");
      },
    });
  };

  const handleSubmit = (values: FormValues) => {
    const [year, month, day] = values.date.split("-").map(Number);
    const [hours, minutes] = values.time.split(":").map(Number);
    const startTime = new Date(year, month - 1, day, hours, minutes);

    onSubmit({
      client_name: values.client_name,
      client_phone: values.client_phone,
      client_birth_date: values.client_birth_date,
      barber_id: values.barber_id,
      service_id: values.service_id,
      start_time: startTime,
      notes: values.notes,
      is_dependent: !!selectedDependentId,
      dependent_id: selectedDependentId,
    });
  };

  const selectedService = services.find(s => s.id === form.watch("service_id"));
  const activeBarbers = barbers.filter(b => b.is_active);
  const activeServices = services.filter(s => s.is_active);
  const isEditMode = !!appointment;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {appointment ? "Editar Agendamento" : "Novo Agendamento"}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="client_name"
                render={() => (
                  <FormItem>
                    <FormLabel>Cliente *</FormLabel>
                    <ClientCombobox
                      clients={clients}
                      value={selectedClientId}
                      onChange={handleClientSelect}
                      onCreateNew={handleCreateNewClient}
                      placeholder="Buscar ou criar cliente..."
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedClientId && (
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground bg-secondary/50 rounded-md p-3">
                    <p><strong>Telefone:</strong> {form.watch("client_phone") || "Não informado"}</p>
                    {form.watch("client_birth_date") && (
                      <p><strong>Nascimento:</strong> {form.watch("client_birth_date")?.split('-').reverse().join('/')}</p>
                    )}
                  </div>

                  {/* Dependent Selector */}
                  {dependents && dependents.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Agendar para
                      </label>
                      <Select
                        value={selectedDependentId || "titular"}
                        onValueChange={handleDependentSelect}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione quem será atendido" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="titular">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{clients.find(c => c.id === selectedClientId)?.name}</span>
                              <span className="text-muted-foreground text-xs">(Titular)</span>
                            </div>
                          </SelectItem>
                          {dependents.map((dependent) => (
                            <SelectItem key={dependent.id} value={dependent.id}>
                              <div className="flex items-center gap-2">
                                <span>{dependent.name}</span>
                                {dependent.relationship && (
                                  <span className="text-muted-foreground text-xs">({dependent.relationship})</span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedDependentId && (
                        <p className="text-xs text-muted-foreground">
                          O agendamento será registrado para o dependente, mas o contato será feito com o titular.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="barber_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Barbeiro *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {activeBarbers.map(barber => (
                            <SelectItem key={barber.id} value={barber.id}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: barber.calendar_color || "#FF6B00" }}
                                />
                                {barber.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="service_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Serviço *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {activeServices.map(service => (
                            <SelectItem key={service.id} value={service.id}>
                              {service.name} - R$ {Number(service.price).toFixed(2)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {selectedService && (
                <p className="text-sm text-muted-foreground">
                  Duração: {selectedService.duration_minutes} min | Valor: R$ {Number(selectedService.price).toFixed(2)}
                </p>
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Horário *</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Observações adicionais..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-between gap-3 pt-4">
                <div>
                  {isEditMode && onDelete && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button type="button" variant="destructive" disabled={isDeleting}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          {isDeleting ? "Excluindo..." : "Excluir"}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir agendamento?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita. O agendamento será permanentemente excluído.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={onDelete} className="bg-destructive hover:bg-destructive/90">
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Salvando..." : appointment ? "Atualizar" : "Criar Agendamento"}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Quick Create Client Modal */}
      <ClientFormModal
        open={showCreateClient}
        onOpenChange={setShowCreateClient}
        onCreate={handleClientCreated}
        isLoading={createClient.isPending}
        initialName={newClientName}
      />
    </>
  );
}
