import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Unit } from "@/hooks/useUnits";

const formSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100, "Nome muito longo"),
  address: z.string().max(200, "Endereço muito longo").optional(),
  phone: z.string().max(20, "Telefone muito longo").optional(),
  manager_name: z.string().max(100, "Nome muito longo").optional(),
});

type FormData = z.infer<typeof formSchema>;

interface UnitFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: FormData) => void;
  unit?: Unit | null;
  isLoading?: boolean;
}

export function UnitFormModal({ open, onClose, onSubmit, unit, isLoading }: UnitFormModalProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      address: "",
      phone: "",
      manager_name: "",
    },
  });

  useEffect(() => {
    if (unit) {
      form.reset({
        name: unit.name,
        address: unit.address || "",
        phone: unit.phone || "",
        manager_name: unit.manager_name || "",
      });
    } else {
      form.reset({
        name: "",
        address: "",
        phone: "",
        manager_name: "",
      });
    }
  }, [unit, form]);

  const handleSubmit = (data: FormData) => {
    onSubmit({
      name: data.name,
      address: data.address || undefined,
      phone: data.phone || undefined,
      manager_name: data.manager_name || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{unit ? "Editar Unidade" : "Nova Unidade"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Unidade *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Barbearia Centro" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Endereço</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Rua das Flores, 123" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: (11) 99999-9999" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="manager_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gerente Responsável</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: João Silva" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Salvando..." : unit ? "Salvar" : "Criar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
