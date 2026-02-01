-- Add fidelity columns to units table
ALTER TABLE public.units
ADD COLUMN IF NOT EXISTS fidelity_program_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS fidelity_cuts_threshold integer DEFAULT 10,
ADD COLUMN IF NOT EXISTS fidelity_min_value numeric DEFAULT 30.00;

-- Update the trigger to read fidelity settings from units instead of business_settings
CREATE OR REPLACE FUNCTION public.sync_client_on_appointment_complete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  client_record RECORD;
  fidelity_enabled boolean;
  cuts_threshold integer;
  min_value numeric;
  should_count_loyalty boolean;
  is_new_status_completed boolean;
  current_loyalty_cuts integer;
  current_available_courtesies integer;
BEGIN
  -- Determina se é uma nova conclusão
  IF TG_OP = 'INSERT' THEN
    is_new_status_completed := (NEW.status = 'completed');
  ELSE
    is_new_status_completed := (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed');
  END IF;

  -- Processar quando status muda para completed
  IF is_new_status_completed THEN
    
    -- ETAPA 1: Busca por telefone (PRIORIDADE - formato sanitizado 5565999891722)
    IF NEW.client_phone IS NOT NULL AND NEW.client_phone != '' THEN
      SELECT * INTO client_record 
      FROM public.clients 
      WHERE unit_id = NEW.unit_id AND phone = NEW.client_phone;
    END IF;
    
    -- ETAPA 2: Fallback - busca por NOME (para Serviço Rápido sem telefone)
    IF client_record IS NULL AND NEW.client_name IS NOT NULL AND TRIM(NEW.client_name) != '' THEN
      SELECT * INTO client_record 
      FROM public.clients 
      WHERE unit_id = NEW.unit_id 
        AND LOWER(TRIM(name)) = LOWER(TRIM(NEW.client_name))
      LIMIT 1;
    END IF;
    
    -- Se encontrou cliente cadastrado, processa fidelidade
    IF client_record IS NOT NULL THEN
      -- Atualiza visitas
      UPDATE public.clients
      SET last_visit_at = NOW(), 
          total_visits = COALESCE(total_visits, 0) + 1, 
          updated_at = NOW()
      WHERE id = client_record.id;
      
      -- BUSCA CONFIGURAÇÕES DE FIDELIDADE DA UNIDADE (não mais de business_settings)
      SELECT COALESCE(u.fidelity_program_enabled, false), 
             COALESCE(u.fidelity_cuts_threshold, 10),
             COALESCE(u.fidelity_min_value, 30.00)
      INTO fidelity_enabled, cuts_threshold, min_value
      FROM public.units u WHERE u.id = NEW.unit_id;
      
      -- Busca valores ATUAIS do cliente (fresh read)
      SELECT loyalty_cuts, available_courtesies 
      INTO current_loyalty_cuts, current_available_courtesies 
      FROM public.clients WHERE id = client_record.id;
      
      current_loyalty_cuts := COALESCE(current_loyalty_cuts, 0);
      current_available_courtesies := COALESCE(current_available_courtesies, 0);
      
      -- Cortesia de fidelidade: zera contador
      IF NEW.payment_method = 'fidelity_courtesy' THEN
        UPDATE public.clients
        SET loyalty_cuts = 0, 
            available_courtesies = GREATEST(available_courtesies - 1, 0),
            updated_at = NOW()
        WHERE id = client_record.id;
        RETURN NEW;
      END IF;
      
      -- Verifica se deve contar para fidelidade
      should_count_loyalty := (
        fidelity_enabled = true 
        AND cuts_threshold > 0
        AND NEW.total_price >= min_value
        AND (NEW.payment_method IS NULL OR NEW.payment_method NOT IN ('courtesy', 'fidelity_courtesy'))
        AND current_available_courtesies = 0
      );
      
      IF should_count_loyalty THEN
        IF (current_loyalty_cuts + 1) >= cuts_threshold THEN
          -- Completou ciclo: ganha cortesia
          UPDATE public.clients
          SET loyalty_cuts = 0, 
              available_courtesies = 1,
              total_courtesies_earned = COALESCE(total_courtesies_earned, 0) + 1,
              updated_at = NOW()
          WHERE id = client_record.id;
        ELSE
          -- Incrementa contador
          UPDATE public.clients
          SET loyalty_cuts = current_loyalty_cuts + 1, 
              updated_at = NOW()
          WHERE id = client_record.id;
        END IF;
      END IF;
    END IF;
      
  END IF;
  
  RETURN NEW;
END;
$function$;