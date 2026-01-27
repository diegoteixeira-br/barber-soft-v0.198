

# Chat de Suporte 24h com IA - Jackson Suporte

## Visao Geral

Implementar um chat de suporte com IA integrado ao sistema BarberSoft, disponivel em todas as paginas quando o usuario estiver logado. O assistente virtual "Jackson Suporte" ajudara os barbeiros com duvidas sobre:

- Como usar cada funcionalidade do sistema
- Conectar WhatsApp e ativar automacoes
- Atendimento Rapido para clientes fora do horario
- Configuracoes de marketing, financeiro, agenda
- Resolucao de problemas comuns

---

## Arquitetura

```text
+------------------+       +-------------------+       +------------------+
|  SupportChat     | ----> | Edge Function     | ----> | Lovable AI       |
|  (Widget React)  |       | support-chat      |       | (gemini-3-flash) |
+------------------+       +-------------------+       +------------------+
        |                          |
        v                          v
  [LocalStorage]            [System Prompt com
   Chat History              Base de Conhecimento]
```

---

## Componentes a Criar

### 1. Widget Flutuante de Chat

**Arquivo**: `src/components/support/SupportChatWidget.tsx`

**Caracteristicas**:
- Botao flutuante fixo no canto inferior direito
- Expande para janela de chat ao clicar
- Avatar do Jackson com indicador "online"
- Design consistente com tema dark do sistema
- Animacao suave de entrada/saida
- Responsivo (tela cheia em mobile)

**Estado**:
- Mensagens armazenadas em localStorage (persiste entre sessoes)
- Estado de carregamento durante resposta da IA
- Toggle aberto/fechado

### 2. Componente de Mensagens

**Arquivo**: `src/components/support/ChatMessage.tsx`

**Caracteristicas**:
- Bolhas de mensagem estilizadas (usuario vs IA)
- Suporte a markdown nas respostas
- Timestamp de cada mensagem
- Indicador de "digitando..." durante streaming

### 3. Edge Function de Suporte

**Arquivo**: `supabase/functions/support-chat/index.ts`

**Logica**:
- Recebe mensagem do usuario
- Envia para Lovable AI com system prompt especializado
- Streaming de resposta para UX fluida
- Tratamento de erros (429, 402)

---

## System Prompt da IA

O prompt incluira:

1. **Identidade**: Jackson, assistente virtual do BarberSoft
2. **Tom**: Amigavel, prestativo, usa linguagem simples
3. **Base de Conhecimento**:
   - Atendimento Rapido: como registrar cortes fora do horario
   - WhatsApp: como conectar via Unidades > Editar > WhatsApp
   - Marketing: campanhas, automacoes, templates
   - Financeiro: fluxo de caixa, comissoes, despesas
   - Agenda: agendamentos, visualizacoes, bloqueios
   - Configuracoes: horarios, notificacoes, fidelidade
4. **Limitacoes**: Nao acessa dados do banco diretamente

---

## Integracao com DashboardLayout

O widget sera adicionado ao `DashboardLayout.tsx` para aparecer em todas as paginas protegidas automaticamente:

```tsx
// DashboardLayout.tsx
import { SupportChatWidget } from "@/components/support/SupportChatWidget";

export function DashboardLayout({ children }) {
  return (
    <SidebarProvider>
      {/* ... layout existente ... */}
      <SupportChatWidget />  {/* Widget sempre visivel */}
    </SidebarProvider>
  );
}
```

---

## Fluxo de Usuario

1. Usuario logado ve icone de chat no canto inferior direito
2. Clica no icone -> abre janela de chat
3. Digita pergunta: "Como atender cliente fora do horario?"
4. Jackson responde com instrucoes do Atendimento Rapido
5. Usuario pode continuar perguntando (contexto mantido)
6. Fechar chat -> historico salvo em localStorage

---

## Arquivos a Criar/Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `src/components/support/SupportChatWidget.tsx` | Criar | Widget flutuante principal |
| `src/components/support/ChatMessage.tsx` | Criar | Componente de mensagem |
| `src/components/support/ChatInput.tsx` | Criar | Input com botao enviar |
| `src/hooks/useSupportChat.ts` | Criar | Hook para gerenciar estado e API |
| `supabase/functions/support-chat/index.ts` | Criar | Edge function com Lovable AI |
| `src/components/layout/DashboardLayout.tsx` | Modificar | Adicionar widget |
| `supabase/config.toml` | Modificar | Configurar nova function |

---

## Exemplos de Interacao

**Pergunta**: "Tem cliente querendo cortar agora mas ja fechou o horario, como faco?"

**Resposta Jackson**:
> Sem problemas! Voce pode usar o **Atendimento Rapido**:
>
> 1. Na pagina **Agenda**, clique no botao **Atendimento Rapido** (icone de raio)
> 2. Preencha o nome do cliente e selecione o servico
> 3. Escolha a forma de pagamento
> 4. Clique em **Lancar Atendimento**
>
> O corte sera registrado no caixa do dia, mesmo fora do horario de funcionamento!

---

**Pergunta**: "Como conecto o WhatsApp?"

**Resposta Jackson**:
> Para conectar o WhatsApp:
>
> 1. Va em **Unidades** no menu lateral
> 2. Clique em **Editar** na unidade desejada
> 3. Role ate a secao **Integracao WhatsApp**
> 4. Clique em **Conectar WhatsApp**
> 5. Escaneie o QR Code com seu celular
>
> Apos conectar, o Jackson (eu!) poderei atender seus clientes automaticamente!

---

## Detalhes Tecnicos

### Edge Function - Streaming

```typescript
// supabase/functions/support-chat/index.ts
const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${LOVABLE_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "google/gemini-3-flash-preview",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...conversationHistory,
    ],
    stream: true,
  }),
});

return new Response(response.body, {
  headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
});
```

### Hook React - Streaming

```typescript
// src/hooks/useSupportChat.ts
const streamChat = async (messages) => {
  const resp = await fetch(`${SUPABASE_URL}/functions/v1/support-chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  
  // Parse SSE line-by-line para streaming fluido
  const reader = resp.body.getReader();
  // ... processamento de chunks
};
```

### Persistencia Local

```typescript
// Salvar historico
localStorage.setItem('support-chat-history', JSON.stringify(messages));

// Recuperar ao carregar
const saved = localStorage.getItem('support-chat-history');
if (saved) setMessages(JSON.parse(saved));
```

---

## Interface Visual

**Botao Flutuante**:
- Circulo com avatar "J" (Jackson)
- Badge de notificacao se houver mensagem nao lida
- Posicao: `fixed bottom-4 right-4`

**Janela de Chat**:
- Largura: 380px (desktop) / tela cheia (mobile)
- Altura: 500px (desktop) / tela cheia (mobile)
- Header com nome "Jackson - Suporte" e botao fechar
- Area de mensagens com scroll
- Input fixo no rodape

---

## Estimativa de Implementacao

| Etapa | Complexidade |
|-------|--------------|
| Edge Function support-chat | Baixa |
| Hook useSupportChat | Media |
| Componentes visuais | Media |
| Integracao DashboardLayout | Baixa |
| System prompt detalhado | Media |
| Testes e ajustes | Baixa |

---

## Resultado Final

O barbeiro tera acesso a um assistente virtual 24h que:
- Responde duvidas sobre qualquer funcionalidade
- Ensina como usar recursos como Atendimento Rapido
- Guia na conexao do WhatsApp
- Ajuda a resolver problemas comuns
- Esta sempre disponivel em qualquer pagina do sistema

