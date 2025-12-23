import { useState, useEffect } from "react";
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
import { Slider } from "@/components/ui/slider";
import { AvatarUpload } from "@/components/ui/avatar-upload";
import { User } from "lucide-react";
import { Barber } from "@/hooks/useBarbers";

const PRESET_COLORS = [
  "#FF6B00", "#D4AF37", "#22C55E", "#3B82F6", 
  "#8B5CF6", "#EC4899", "#EF4444", "#06B6D4"
];

const barberSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  phone: z.string().optional(),
  photo_url: z.string().optional().or(z.literal("")),
  calendar_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Cor inválida"),
  commission_rate: z.number().min(0).max(100),
  is_active: z.boolean(),
});

type BarberFormValues = z.infer<typeof barberSchema>;

interface BarberFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  barber?: Barber | null;
  onSubmit: (data: BarberFormValues) => void;
  isLoading?: boolean;
}

export function BarberFormModal({
  open,
  onOpenChange,
  barber,
  onSubmit,
  isLoading,
}: BarberFormModalProps) {
  const form = useForm<BarberFormValues>({
    resolver: zodResolver(barberSchema),
    defaultValues: {
      name: "",
      phone: "",
      photo_url: "",
      calendar_color: "#FF6B00",
      commission_rate: 50,
      is_active: true,
    },
  });

  const [selectedColor, setSelectedColor] = useState("#FF6B00");

  // Reset form when modal opens/closes or barber changes
  useEffect(() => {
    if (open) {
      form.reset({
        name: barber?.name || "",
        phone: barber?.phone || "",
        photo_url: barber?.photo_url || "",
        calendar_color: barber?.calendar_color || "#FF6B00",
        commission_rate: barber?.commission_rate || 50,
        is_active: barber?.is_active ?? true,
      });
      setSelectedColor(barber?.calendar_color || "#FF6B00");
    }
  }, [open, barber, form]);

  const handleSubmit = (data: BarberFormValues) => {
    onSubmit(data);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {barber ? "Editar Profissional" : "Novo Profissional"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Avatar Upload */}
            <div className="flex justify-center pb-2">
              <AvatarUpload
                currentImageUrl={form.watch("photo_url") || undefined}
                onImageUploaded={(url) => form.setValue("photo_url", url)}
                bucket="barber-content"
                folder="profissionais"
                fallbackIcon={<User className="h-8 w-8 text-muted-foreground" />}
                size="lg"
                label="Foto do Profissional"
              />
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do profissional" {...field} />
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
                    <Input placeholder="(11) 99999-9999" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="calendar_color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cor na Agenda</FormLabel>
                  <div className="flex gap-2 flex-wrap">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          selectedColor === color
                            ? "border-foreground scale-110"
                            : "border-transparent"
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => {
                          setSelectedColor(color);
                          field.onChange(color);
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="commission_rate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comissão: {field.value}%</FormLabel>
                  <FormControl>
                    <Slider
                      min={0}
                      max={100}
                      step={5}
                      value={[field.value]}
                      onValueChange={(values) => field.onChange(values[0])}
                      className="py-4"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {barber ? "Salvar" : "Adicionar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
