

# Plano: Trigger de Fidelidade com Busca Flexível + Auto-Cadastro

## Objetivo

Modificar o trigger `sync_client_on_appointment_complete` para:
1. Buscar cliente por **telefone** (prioridade)
2. Se não encontrar, buscar por **nome** na mesma unidade
3. Se ainda não encontrar, **criar o cliente** automaticamente

## Fluxo da Nova Lógica

```text
┌─────────────────────────────────────────────────────┐
│  AGENDAMENTO FINALIZADO (status = 'completed')      │
└─────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│  1. Tem telefone? Busca por telefone + unit_id      │
└─────────────────────────────────────────────────────┘
                    │
          Não encontrou?
                    ▼
┌─────────────────────────────────────────────────────┐
│  2. Tem nome? Busca por NOME + unit_id              │
└─────────────────────────────────────────────────────┘
                    │
          Não encontrou?
                    ▼
┌─────────────────────────────────────────────────────┐
│  3. NOVO: Criar cliente automaticamente             │
│     (nome obrigatório, telefone opcional)           │
└─────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│  4. Atualiza visitas e processa fidelidade          │
└─────────────────────────────────────────────────────┘
```

## Migração SQL

```sql
CREATE OR REPLACE FUNCTION public.sync_client_on_appointment_complete()
RETURNS TRIGGER AS $$
DECLARE
  client_record RECORD;
  fidelity_enabled boolean;
  cuts_threshold integer;
  min_value numeric;
  owner_id uuid;
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

  -- MUDANÇA: Processar mesmo sem telefone (precisa ter pelo menos nome)
  IF is_new_status_completed AND NEW.client_name IS NOT NULL AND TRIM(NEW.client_name) != '' THEN
    
    -- ETAPA 1: Busca por telefone (se disponível)
    IF NEW.client_phone IS NOT NULL AND NEW.client_phone != '' THEN
      SELECT * INTO client_record 
      FROM public.clients 
      WHERE unit_id = NEW.unit_id AND phone = NEW.client_phone;
    END IF;
    
    -- ETAPA 2: Fallback - busca por nome (se não encontrou por telefone)
    IF client_record IS NULL THEN
      SELECT * INTO client_record 
      FROM public.clients 
      WHERE unit_id = NEW.unit_id 
        AND LOWER(TRIM(name)) = LOWER(TRIM(NEW.client_name))
      LIMIT 1;
    END IF;
    
    -- ETAPA 3: Auto-cadastro (se não encontrou e não é dependente)
    IF client_record IS NULL AND NEW.is_dependent IS NOT TRUE THEN
      INSERT INTO public.clients (
        company_id, unit_id, name, phone, birth_date, 
        last_visit_at, total_visits, loyalty_cuts
      )
      VALUES (
        NEW.company_id, NEW.unit_id, NEW.client_name, 
        NULLIF(TRIM(NEW.client_phone), ''),  -- telefone pode ser NULL
        NEW.client_birth_date, NOW(), 1, 0
      )
      RETURNING * INTO client_record;
    ELSE
      -- Cliente existe: atualiza visitas
      IF client_record IS NOT NULL THEN
        UPDATE public.clients
        SET last_visit_at = NOW(), 
            total_visits = COALESCE(total_visits, 0) + 1, 
            updated_at = NOW()
        WHERE id = client_record.id;
      END IF;
    END IF;
    
    -- Processa fidelidade (para clientes novos e existentes)
    IF client_record IS NOT NULL THEN
      -- Busca owner e configurações
      SELECT owner_user_id INTO owner_id 
      FROM public.companies WHERE id = NEW.company_id;
      
      SELECT COALESCE(bs.fidelity_program_enabled, false), 
             COALESCE(bs.fidelity_cuts_threshold, 10),
             COALESCE(bs.fidelity_min_value, 30.00)
      INTO fidelity_enabled, cuts_threshold, min_value
      FROM public.business_settings bs WHERE bs.user_id = owner_id;
      
      -- Busca valores ATUAIS do cliente (fresh read)
      SELECT loyalty_cuts, available_courtesies 
      INTO current_loyalty_cuts, current_available_courtesies 
      FROM public.clients WHERE id = client_record.id;
      
      current_loyalty_cuts := COALESCE(current_loyalty_cuts, 0);
      current_available_courtesies := COALESCE(current_available_courtesies, 0);
      
      -- Cortesia de fidelidade: zera contador
      IF NEW.payment_method = 'fidelity_courtesy' THEN
        UPDATE public.clients
        SET loyalty_cuts = 0, updated_at = NOW()
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';
```

## Mudanças Principais

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Condição inicial | `client_phone IS NOT NULL` | `client_name IS NOT NULL` |
| Busca por telefone | Única opção | Prioridade 1 |
| Busca por nome | Não existia | Prioridade 2 (fallback) |
| Auto-cadastro | Só com telefone | Com ou sem telefone |

## Cenários de Teste

| Cenário | Resultado |
|---------|-----------|
| Serviço Rápido com nome de cliente cadastrado | Encontra por nome, conta fidelidade |
| Serviço Rápido com nome novo | Cria cliente, inicia fidelidade |
| Agendamento normal com telefone | Comportamento igual ao atual |
| Dependente sem cadastro | Não cria cliente (correto) |

## Arquivo Modificado

| Tipo | Local |
|------|-------|
| SQL Migration | Função `sync_client_on_appointment_complete` |

