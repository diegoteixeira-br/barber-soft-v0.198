import { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import {
  LayoutDashboard,
  Calendar,
  Users,
  UserRound,
  Scissors,
  DollarSign,
  Settings,
  Building2,
  ChevronDown,
  LogOut,
  Megaphone,
  BarChart3,
  Headphones,
  MessageCircle,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUnits } from "@/hooks/useUnits";
import { useCurrentUnit } from "@/contexts/UnitContext";

const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Agenda", url: "/agenda", icon: Calendar },
  { title: "Clientes", url: "/clientes", icon: UserRound },
  { title: "Profissionais", url: "/profissionais", icon: Users },
  { title: "Serviços", url: "/servicos", icon: Scissors },
  { title: "Financeiro", url: "/financeiro", icon: DollarSign },
  { title: "Marketing", url: "/marketing", icon: Megaphone },
  { title: "Relatórios", url: "/relatorios", icon: BarChart3 },
  { title: "Unidades", url: "/unidades", icon: Building2 },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

interface AppSidebarProps {
  onOpenChat: () => void;
  isChatOpen: boolean;
  onOpenFeedback: () => void;
}

export function AppSidebar({ onOpenChat, isChatOpen, onOpenFeedback }: AppSidebarProps) {
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { toast } = useToast();
  const { units } = useUnits();
  const { currentUnitId, setCurrentUnitId } = useCurrentUnit();
  const { settings: businessSettings } = useBusinessSettings();
  const [user, setUser] = useState<User | null>(null);

  const selectedUnit = units.find((u) => u.id === currentUnitId) || units[0];

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const getUserInitials = () => {
    if (!user) return "??";
    const fullName = user.user_metadata?.full_name;
    if (fullName) {
      return fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
    }
    return user.email?.slice(0, 2).toUpperCase() || "??";
  };

  const getBusinessInitials = () => {
    const name = businessSettings?.business_name;
    if (name) {
      return name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
    }
    return getUserInitials();
  };

  const getDisplayName = () => {
    return businessSettings?.business_name || user?.user_metadata?.full_name || "Usuário";
  };

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Erro ao sair",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Sidebar className="border-r border-border bg-sidebar">
      <SidebarHeader className="border-b border-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Scissors className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-lg font-bold text-gold">BarberSoft</span>
              <span className="text-xs text-muted-foreground">Gestão de Barbearias</span>
            </div>
          )}
        </div>

        {/* Unit Selector */}
        {!collapsed && units.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="mt-4 w-full justify-between border border-border bg-secondary/50 hover:bg-secondary"
              >
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span className="truncate text-sm">{selectedUnit?.name || "Selecionar"}</span>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 bg-popover">
              {units.map((unit) => (
                <DropdownMenuItem
                  key={unit.id}
                  onClick={() => setCurrentUnitId(unit.id)}
                  className={`cursor-pointer ${currentUnitId === unit.id ? "bg-primary/10" : ""}`}
                >
                  <Building2 className="mr-2 h-4 w-4" />
                  {unit.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Menu Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={collapsed ? item.title : undefined}
                    className={`transition-all duration-200 ${
                      isActive(item.url)
                        ? "bg-primary/10 text-primary hover:bg-primary/20"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    <Link to={item.url}>
                      <item.icon className={`h-5 w-5 ${isActive(item.url) ? "text-primary" : ""}`} />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {/* Feedback Item */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={onOpenFeedback}
                  tooltip={collapsed ? "Feedback" : undefined}
                  className="transition-all duration-200 text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <MessageCircle className="h-5 w-5" />
                  <span>Feedback</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {/* Support Chat Item */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={onOpenChat}
                  isActive={isChatOpen}
                  tooltip={collapsed ? "Suporte 24h" : undefined}
                  className={`transition-all duration-200 ${
                    isChatOpen
                      ? "bg-primary/10 text-primary hover:bg-primary/20"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <Headphones className={`h-5 w-5 ${isChatOpen ? "text-primary" : ""}`} />
                  <span>Suporte 24h</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 border border-primary/30">
            {businessSettings?.logo_url && (
              <AvatarImage src={businessSettings.logo_url} alt="Logo" />
            )}
            <AvatarFallback className="bg-primary/10 text-primary">{getBusinessInitials()}</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex flex-1 flex-col overflow-hidden">
              <span className="truncate text-sm font-medium">{getDisplayName()}</span>
              <span className="truncate text-xs text-muted-foreground">{user?.email || ""}</span>
            </div>
          )}
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="shrink-0 text-muted-foreground hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
