-- Add column for cancellation vocal notification
ALTER TABLE public.business_settings 
ADD COLUMN IF NOT EXISTS vocal_cancellation_enabled boolean DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN public.business_settings.vocal_cancellation_enabled IS 'Enable vocal notification when appointments are cancelled via WhatsApp';