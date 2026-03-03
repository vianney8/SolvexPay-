import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  ArrowDownUp,
  Link2,
  Key,
  Settings,
  LogOut,
  ChevronUp,
  ShieldCheck,
  Send,
  Shield,
  Wallet,
} from "lucide-react";
import solvexpayLogo from "../assets/images/solvexpay-logo.png";

const mainMenuItems = [
  { title: "Transactions", url: "/transactions", icon: ArrowDownUp, color: "text-emerald-300" },
  { title: "Transfert", url: "/transfer", icon: Send, color: "text-cyan-300" },
  { title: "Portefeuille", url: "/wallet", icon: Wallet, color: "text-amber-300" },
  { title: "Liens de paiement", url: "/payment-links", icon: Link2, color: "text-pink-300" },
  { title: "Clés API", url: "/api-keys", icon: Key, color: "text-orange-300" },
  { title: "Vérification KYC", url: "/kyc", icon: ShieldCheck, color: "text-blue-300" },
  { title: "Paramètres", url: "/settings", icon: Settings, color: "text-slate-300" },
];

const adminMenuItems = [
  { title: "Administration", url: "/admin", icon: Shield, color: "text-red-400" },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout, isLoggingOut } = useAuth();

  const getInitials = () => {
    if (user?.firstName && user?.lastName) return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    if (user?.firstName) return user.firstName[0].toUpperCase();
    if (user?.email) return user.email[0].toUpperCase();
    return "U";
  };

  const getDisplayName = () => {
    if (user?.firstName) return [user.firstName, user.lastName].filter(Boolean).join(" ");
    return user?.email || "Utilisateur";
  };

  const isDashboard = location === "/dashboard" || location === "/";

  return (
    <Sidebar className="border-r-0">
      <div className="flex flex-col h-full" style={{ background: "linear-gradient(180deg, hsl(262 60% 10%) 0%, hsl(262 55% 8%) 60%, hsl(240 40% 6%) 100%)" }}>
        <SidebarHeader className="p-5 pb-3 flex-shrink-0">
          <Link href="/dashboard">
            <div className="flex items-center gap-3 cursor-pointer group" data-testid="link-logo">
              <div className="relative">
                <div className="absolute inset-0 rounded-xl bg-violet-500/30 blur-md group-hover:bg-violet-500/50 transition-all" />
                <img src={solvexpayLogo} alt="SolvexPay" className="relative w-9 h-9 rounded-xl object-cover ring-2 ring-white/10" />
              </div>
              <div>
                <span className="font-bold text-lg text-white tracking-tight">SolvexPay</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs text-emerald-400/80 font-medium">Système actif</span>
                </div>
              </div>
            </div>
          </Link>
        </SidebarHeader>

        <div className="px-3 pb-1 flex-shrink-0">
          <Link href="/dashboard" data-testid="link-dashboard">
            <div className={`flex items-center gap-3 px-3 h-10 rounded-lg transition-all duration-150 cursor-pointer ${
              isDashboard
                ? "bg-white/12 text-white shadow-lg"
                : "text-white/60 hover:text-white hover:bg-white/7"
            }`}>
              <LayoutDashboard className={`w-4 h-4 flex-shrink-0 transition-colors ${isDashboard ? "text-white" : "text-violet-300"}`} />
              <span className="text-sm font-semibold">Accueil</span>
              {isDashboard && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400" />}
            </div>
          </Link>
          <div className="my-2 h-px bg-white/8 mx-2" />
        </div>

        <SidebarContent className="flex-1 px-3 pb-2 overflow-y-auto">
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-semibold text-white/30 uppercase tracking-widest px-2 mb-1">
              Navigation
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5">
                {mainMenuItems.map((item) => {
                  const isActive = location === item.url;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        className={`h-9 rounded-lg transition-all duration-150 group/item ${
                          isActive
                            ? "bg-white/12 text-white shadow-lg"
                            : "text-white/60 hover:text-white hover:bg-white/7"
                        }`}
                      >
                        <Link href={item.url} data-testid={`link-${item.url.replace("/", "")}`} className="flex items-center gap-3 px-3">
                          <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-white" : item.color} transition-colors`} />
                          <span className="text-sm font-medium">{item.title}</span>
                          {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400" />}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {(user as any)?.isAdmin && (
            <SidebarGroup className="mt-4">
              <SidebarGroupLabel className="text-xs font-semibold text-red-400/50 uppercase tracking-widest px-2 mb-1">
                Admin
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminMenuItems.map((item) => {
                    const isActive = location === item.url;
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          className={`h-9 rounded-lg ${isActive ? "bg-red-500/15 text-red-300" : "text-red-400/70 hover:text-red-300 hover:bg-red-500/10"}`}
                        >
                          <Link href={item.url} data-testid={`link-${item.url.replace("/", "")}`} className="flex items-center gap-3 px-3">
                            <item.icon className="w-4 h-4 flex-shrink-0" />
                            <span className="text-sm font-medium">{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>

        <SidebarFooter className="p-3 border-t border-white/8 flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 px-3 h-14 rounded-xl bg-white/6 hover:bg-white/10 border border-white/8 text-white group"
                data-testid="button-user-menu"
              >
                <Avatar className="h-8 w-8 ring-2 ring-violet-500/40">
                  <AvatarImage src={user?.profileImageUrl || undefined} />
                  <AvatarFallback className="text-xs font-bold" style={{ background: "linear-gradient(135deg, hsl(262 83% 58%), hsl(160 84% 44%))", color: "white" }}>
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-semibold text-white truncate" data-testid="text-user-name">{getDisplayName()}</p>
                  <p className="text-xs text-white/40 truncate">{user?.email}</p>
                </div>
                <ChevronUp className="h-4 w-4 text-white/30 group-hover:text-white/60 transition-colors" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 shadow-xl">
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center gap-2 cursor-pointer">
                  <Settings className="h-4 w-4" />
                  Paramètres
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => logout()}
                disabled={isLoggingOut}
                className="text-destructive focus:text-destructive cursor-pointer"
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {isLoggingOut ? "Déconnexion..." : "Se déconnecter"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </div>
    </Sidebar>
  );
}
