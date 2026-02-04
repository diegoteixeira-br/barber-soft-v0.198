

# Plano: Sistema de Opt-Out (SAIR) do Marketing

## Como o Sistema Funciona Atualmente

### Fluxo Completo

```text
1. Cliente recebe msg de marketing
         ↓
2. Cliente responde "SAIR"
         ↓
3. Evolution API → n8n (chat-barbearia)
         ↓
4. n8n verifica se msg = "SAIR"?
      ├── SIM → POST para process-opt-out (receptor-barber)
      └── NAO → Continua para Agente Jackson
         ↓
5. Edge Function process-opt-out:
      - Encontra cliente pelo telefone
      - Atualiza marketing_opt_out = true
      - Envia confirmacao automatica
         ↓
6. Proximas campanhas:
      - send-marketing-campaign filtra clientes com opt-out
      - Cliente nao recebe mais msgs de marketing
```

### O Que Ja Esta Implementado

1. Edge function `process-opt-out` que atualiza o cliente no banco
2. Campo `marketing_opt_out` na tabela clients
3. Filtragem automatica no envio de campanhas (ja ignora clientes com opt-out)
4. Badge "Opt-out Marketing" visivel na interface de clientes
5. Mensagem de confirmacao automatica para o cliente ("Voce foi removido...")
6. Suporte a "VOLTAR" para opt-in novamente

## O Que Precisa Ser Ajustado

### Problema 1: Lista de Campanhas Mostra Clientes com Opt-Out

Atualmente os clientes com opt-out aparecem na lista de selecao de campanhas. Mesmo que sejam filtrados no backend, isso confunde o usuario.

**Solucao**: Filtrar clientes com opt-out da lista de selecao de campanhas.

### Problema 2: Indicador Visual na Lista de Clientes

Adicionar badge vermelho "Bloqueado" ou icone indicando que o cliente nao recebera marketing.

### Problema 3: Validar Configuracao do n8n

O n8n precisa enviar o payload correto para a edge function:

```json
{
  "instanceName": "nome_da_instancia",
  "sender": "5511999999999@s.whatsapp.net",
  "message": "SAIR",
  "secret": "valor_do_N8N_CALLBACK_SECRET",
  "action": "opt_out"
}
```

Para VOLTAR:
```json
{
  "action": "opt_in"
}
```

## Etapas de Implementacao

### Etapa 1: Filtrar Clientes com Opt-Out na Lista de Campanhas

Modificar `src/components/marketing/CampaignsTab.tsx`:
- Adicionar filtro `.filter(c => !c.marketing_opt_out)` na lista de clientes
- Clientes bloqueados nao aparecerao mais na lista de selecao

### Etapa 2: Adicionar Contador de Bloqueados

Mostrar quantos clientes estao bloqueados (ex: "45 clientes disponiveis, 3 bloqueados")

### Etapa 3: Criar Filtro "Bloqueados" na Aba de Campanhas

Adicionar opcao para ver clientes que fizeram opt-out:
- Novo filtro "Bloqueados (SAIR)" na lista de filtros
- Permite visualizar e gerenciar quem esta bloqueado

### Etapa 4: Adicionar Opcao de Desbloqueio Manual

Na interface de detalhes do cliente, adicionar botao para remover o opt-out manualmente (para casos especiais)

### Etapa 5: Atualizar Interface Visual

Adicionar badge vermelho com icone BellOff para clientes bloqueados quando aparecerem em outras partes do sistema

## Detalhes Tecnicos

### Arquivos a Modificar

1. `src/components/marketing/CampaignsTab.tsx`
   - Filtrar clientes com marketing_opt_out = true
   - Adicionar contador de bloqueados
   - Adicionar filtro para ver bloqueados

2. `src/components/clients/ClientDetailsModal.tsx`
   - Adicionar botao para desbloquear cliente

3. `src/hooks/useClients.ts`
   - Adicionar mutation para toggle de opt-out

### Codigo da Filtragem (CampaignsTab.tsx)

```typescript
// Linha 60-63 - adicionar filtro de opt-out
const filteredClients = clients
  .filter((client) => !client.marketing_opt_out) // NOVO: excluir bloqueados
  .filter((client) =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm)
  );

// Contador de bloqueados
const blockedCount = clients.filter(c => c.marketing_opt_out).length;
```

### Novo Filtro na Lista

```typescript
const filterOptions = [
  { value: "all", label: "Todos os Clientes", icon: Users },
  { value: "birthday_month", label: "Aniversariantes do Mes", icon: Cake },
  { value: "inactive", label: "Sumidos (30+ dias)", icon: UserX },
  { value: "opted_out", label: "Bloqueados (SAIR)", icon: BellOff }, // NOVO
];
```

## Verificacao do n8n

O workflow do n8n mostrado nos prints esta correto:
- Webhook recebe mensagem
- Verifica se contem "SAIR" (regex: `^[\s\W]*(SAIR|sair|Sair)[\s\W_]*$`)
- Envia POST para `process-opt-out` com instanceName, sender, message, secret

**Importante**: O secret enviado pelo n8n deve ser o mesmo valor configurado em `N8N_CALLBACK_SECRET` no Supabase.

## Resultado Esperado

1. Clientes que enviarem "SAIR" serao automaticamente bloqueados
2. Receberao confirmacao automatica de que foram removidos
3. Nao aparecerao mais na lista de selecao de campanhas
4. Se enviarem "VOLTAR", serao desbloqueados automaticamente
5. Administrador pode ver e gerenciar clientes bloqueados
6. Opcao de desbloqueio manual disponivel

