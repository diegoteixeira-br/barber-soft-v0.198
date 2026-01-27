import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useSupportChat } from "@/hooks/useSupportChat";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function SupportChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { messages, isLoading, sendMessage, clearHistory, cancelRequest } = useSupportChat();

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector("[data-radix-scroll-area-viewport]");
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, isLoading]);

  const welcomeMessage = {
    id: "welcome",
    role: "assistant" as const,
    content: "Olá! 👋 Sou o Jackson, seu assistente virtual do BarberSoft. Estou aqui para te ajudar com qualquer dúvida sobre o sistema!\n\nPosso te ajudar com:\n- **Atendimento Rápido** (cortes fora do horário)\n- **Conexão do WhatsApp**\n- **Agenda e agendamentos**\n- **Financeiro e comissões**\n- **Marketing e campanhas**\n\nComo posso te ajudar?",
    timestamp: new Date(),
  };

  const displayMessages = messages.length === 0 ? [welcomeMessage] : messages;

  return (
    <>
      {/* Floating Speech Bubble Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-4 right-4 z-50 group",
          "md:bottom-6 md:right-6",
          "transition-all duration-300 ease-out",
          "hover:scale-105",
          isOpen && "hidden"
        )}
      >
        <div className="relative flex flex-col items-center justify-center px-4 py-3 bg-background border-2 border-primary rounded-xl shadow-lg glow-gold">
          {/* Header text */}
          <span className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-1">
            Suporte 24h
          </span>
          
          {/* J Avatar */}
          <span className="text-2xl font-bold text-primary">
            J
          </span>
          
          {/* Speech bubble tail */}
          <div className="absolute -bottom-2 right-4">
            {/* Outer triangle (border) */}
            <div 
              className="absolute w-0 h-0"
              style={{
                borderLeft: '8px solid transparent',
                borderRight: '8px solid transparent',
                borderTop: '10px solid hsl(var(--primary))',
              }}
            />
            {/* Inner triangle (fill) */}
            <div 
              className="absolute w-0 h-0 top-[-2px] left-[2px]"
              style={{
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderTop: '8px solid hsl(var(--background))',
              }}
            />
          </div>
        </div>
      </button>

      {/* Chat Window */}
      <div
        className={cn(
          "fixed z-50 transition-all duration-300 ease-in-out",
          // Mobile: full screen
          "inset-0 md:inset-auto",
          // Desktop: positioned bottom-right
          "md:bottom-6 md:right-6 md:w-[400px] md:h-[600px] md:max-h-[80vh]",
          isOpen
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-4 pointer-events-none"
        )}
      >
        <Card className="h-full flex flex-col shadow-2xl border-border/50 rounded-none md:rounded-xl overflow-hidden">
          {/* Header */}
          <CardHeader className="flex-row items-center justify-between space-y-0 py-3 px-4 bg-primary text-primary-foreground">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9 border-2 border-primary-foreground/20">
                <AvatarFallback className="bg-primary-foreground text-primary font-bold">
                  J
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-base font-semibold">Jackson - Suporte</CardTitle>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-xs opacity-80">Online 24h</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
                    disabled={messages.length === 0}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Limpar histórico?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Isso vai apagar todas as mensagens da conversa. Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={clearHistory}>
                      Limpar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>

          {/* Messages */}
          <CardContent className="flex-1 p-0 overflow-hidden" ref={scrollRef}>
            <ScrollArea className="h-full">
              <div className="flex flex-col">
                {displayMessages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))}
                {isLoading && (
                  <div className="flex items-center gap-2 px-4 py-3 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Jackson está digitando...</span>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>

          {/* Input */}
          <ChatInput
            onSend={sendMessage}
            onCancel={cancelRequest}
            isLoading={isLoading}
          />
        </Card>
      </div>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
