-- Add fidelity program columns to business_settings
ALTER TABLE public.business_settings 
ADD COLUMN IF NOT EXISTS fidelity_program_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS fidelity_cuts_threshold integer DEFAULT 10;

-- Add loyalty tracking columns to clients
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS loyalty_cuts integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS available_courtesies integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_courtesies_earned integer DEFAULT 0;

-- Update the sync trigger to handle fidelity program
CREATE OR REPLACE FUNCTION public.sync_client_on_appointment_complete()
RETURNS TRIGGER AS $$
DECLARE
  client_record RECORD;
  fidelity_enabled boolean;
  cuts_threshold integer;
  owner_id uuid;
BEGIN
  -- Only execute when status changes TO 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Only sync if phone is provided
    IF NEW.client_phone IS NOT NULL AND NEW.client_phone != '' THEN
      
      -- Check if client already exists
      SELECT * INTO client_record 
      FROM public.clients 
      WHERE unit_id = NEW.unit_id AND phone = NEW.client_phone;
      
      IF client_record IS NULL THEN
        -- Client doesn't exist: only create if NOT a dependent appointment
        IF NEW.is_dependent IS NOT TRUE THEN
          -- Create new client with appointment data
          INSERT INTO public.clients (company_id, unit_id, name, phone, birth_date, last_visit_at, total_visits, loyalty_cuts)
          VALUES (
            NEW.company_id,
            NEW.unit_id,
            NEW.client_name,
            NEW.client_phone,
            NEW.client_birth_date,
            NOW(),
            1,
            0
          )
          RETURNING * INTO client_record;
        END IF;
      ELSE
        -- Client exists: update visit stats (never overwrite name or birth_date)
        UPDATE public.clients
        SET 
          last_visit_at = NOW(),
          total_visits = COALESCE(total_visits, 0) + 1,
          updated_at = NOW()
        WHERE id = client_record.id;
      END IF;
      
      -- Handle fidelity program if client exists
      IF client_record IS NOT NULL THEN
        -- Get the owner_user_id from company
        SELECT owner_user_id INTO owner_id
        FROM public.companies
        WHERE id = NEW.company_id;
        
        -- Get fidelity settings
        SELECT 
          COALESCE(bs.fidelity_program_enabled, false),
          COALESCE(bs.fidelity_cuts_threshold, 10)
        INTO fidelity_enabled, cuts_threshold
        FROM public.business_settings bs
        WHERE bs.user_id = owner_id;
        
        -- If fidelity program is enabled
        IF fidelity_enabled = true AND cuts_threshold > 0 THEN
          -- Check if incrementing will reach threshold
          IF (COALESCE(client_record.loyalty_cuts, 0) + 1) >= cuts_threshold THEN
            -- Credit courtesy and reset counter
            UPDATE public.clients
            SET 
              loyalty_cuts = 0,
              available_courtesies = COALESCE(available_courtesies, 0) + 1,
              total_courtesies_earned = COALESCE(total_courtesies_earned, 0) + 1,
              updated_at = NOW()
            WHERE id = client_record.id;
          ELSE
            -- Just increment loyalty cuts
            UPDATE public.clients
            SET 
              loyalty_cuts = COALESCE(loyalty_cuts, 0) + 1,
              updated_at = NOW()
            WHERE id = client_record.id;
          END IF;
        END IF;
      END IF;
      
    END IF;
      
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;