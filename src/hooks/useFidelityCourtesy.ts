import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useFidelityCourtesy() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const useCourtesy = useMutation({
    mutationFn: async ({ clientPhone, unitId }: { clientPhone: string; unitId: string }) => {
      // Find the client by phone and unit
      const { data: client, error: findError } = await supabase
        .from("clients")
        .select("id, available_courtesies")
        .eq("unit_id", unitId)
        .eq("phone", clientPhone)
        .maybeSingle();

      if (findError) throw findError;
      if (!client) throw new Error("Cliente não encontrado");
      if (!client.available_courtesies || client.available_courtesies <= 0) {
        throw new Error("Cliente não possui cortesias disponíveis");
      }

      // Decrement available courtesies
      const { error: updateError } = await supabase
        .from("clients")
        .update({
          available_courtesies: client.available_courtesies - 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", client.id);

      if (updateError) throw updateError;

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({
        title: "Cortesia de fidelidade utilizada!",
        description: "O saldo de cortesias do cliente foi atualizado.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao usar cortesia",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getClientCourtesies = async (clientPhone: string | null, unitId: string): Promise<number> => {
    if (!clientPhone) return 0;
    
    const { data } = await supabase
      .from("clients")
      .select("available_courtesies")
      .eq("unit_id", unitId)
      .eq("phone", clientPhone)
      .maybeSingle();

    return data?.available_courtesies || 0;
  };

  return {
    useCourtesy,
    getClientCourtesies,
  };
}
