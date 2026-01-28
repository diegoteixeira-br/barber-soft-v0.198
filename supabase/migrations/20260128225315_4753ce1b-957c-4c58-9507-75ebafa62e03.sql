-- Normaliza telefones de clientes existentes
-- Adiciona prefixo '55' para números com 10-11 dígitos que não começam com 55

UPDATE public.clients
SET 
  phone = '55' || regexp_replace(phone, '\D', '', 'g'),
  updated_at = NOW()
WHERE phone IS NOT NULL
  AND length(regexp_replace(phone, '\D', '', 'g')) BETWEEN 10 AND 11
  AND left(regexp_replace(phone, '\D', '', 'g'), 2) != '55';