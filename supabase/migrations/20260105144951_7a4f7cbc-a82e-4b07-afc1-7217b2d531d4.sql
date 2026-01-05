-- Tabela de campanhas de marketing
CREATE TABLE public.marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  unit_id UUID,
  message_template TEXT NOT NULL,
  media_url TEXT,
  media_type TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  total_recipients INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Tabela de logs por mensagem
CREATE TABLE public.campaign_message_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  recipient_phone TEXT NOT NULL,
  recipient_name TEXT,
  recipient_type TEXT NOT NULL DEFAULT 'client',
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_marketing_campaigns_company ON public.marketing_campaigns(company_id);
CREATE INDEX idx_marketing_campaigns_unit ON public.marketing_campaigns(unit_id);
CREATE INDEX idx_marketing_campaigns_status ON public.marketing_campaigns(status);
CREATE INDEX idx_campaign_message_logs_campaign ON public.campaign_message_logs(campaign_id);
CREATE INDEX idx_campaign_message_logs_status ON public.campaign_message_logs(status);

-- Enable RLS
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_message_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for marketing_campaigns
CREATE POLICY "Users can view their company campaigns"
ON public.marketing_campaigns FOR SELECT
USING (user_owns_company(company_id));

CREATE POLICY "Users can create campaigns for their company"
ON public.marketing_campaigns FOR INSERT
WITH CHECK (user_owns_company(company_id));

CREATE POLICY "Users can update their company campaigns"
ON public.marketing_campaigns FOR UPDATE
USING (user_owns_company(company_id));

-- RLS policies for campaign_message_logs
CREATE POLICY "Users can view logs from their campaigns"
ON public.campaign_message_logs FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.marketing_campaigns mc
  WHERE mc.id = campaign_id AND user_owns_company(mc.company_id)
));

CREATE POLICY "Users can create logs for their campaigns"
ON public.campaign_message_logs FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.marketing_campaigns mc
  WHERE mc.id = campaign_id AND user_owns_company(mc.company_id)
));

-- RPC functions for incrementing counters (called by edge functions with service role)
CREATE OR REPLACE FUNCTION public.increment_campaign_sent(cid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.marketing_campaigns
  SET sent_count = sent_count + 1
  WHERE id = cid;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_campaign_failed(cid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.marketing_campaigns
  SET failed_count = failed_count + 1
  WHERE id = cid;
END;
$$;