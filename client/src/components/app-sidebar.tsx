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

const menuItems = [
  { title: "Accueil", url: "/dashboard", icon: LayoutDashboard, color: "text-violet-600" },
  { title: "Transactions", url: "/transactions", icon: ArrowDownUp, color: "text-emerald-600" },
  { title: "Transfert", url: "/transfer", icon: Send, color: "text-cyan-600" },
  { title: "Portefeuille", url: "/wallet", icon: Wallet, color: "text-amber-600" },
  { title: "Liens de paiement", url: "/payment-links", icon: Link2, color: "text-pink-600" },
  { title: "Clés API", url: "/api-keys", icon: Key, color: "text-orange-600" },
  { title: "Vérification KYC", url: "/kyc", icon: ShieldCheck, color: "text-blue-600" },
  { title: "Paramètres", url: "/settings", icon: Settings, color: "text-slate-600" },
];

const adminMenuItems = [
  { title: "Administration", url: "/admin", icon: Shield, color: "text-red-600" },
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

  return (
    <Sidebar className="border-r border-gray-200">
      <div className="flex flex-col h-full bg-white">
        <SidebarHeader className="p-5 pb-4 flex-shrink-0 border-b border-gray-100">
          <Link href="/dashboard">
            <div className="flex items-center gap-3 cursor-pointer group" data-testid="link-logo">
              <div className="relative">
                <div className="absolute inset-0 rounded-xl bg-violet-500/20 blur-md group-hover:bg-violet-500/40 transition-all" />
                <img src={solvexpayLogo} alt="SolvexPay" className="relative w-9 h-9 rounded-xl object-cover ring-2 ring-violet-100" />
              </div>
              <div>
                <span className="font-bold text-lg text-gray-900 tracking-tight">SolvexPay</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs text-emerald-600 font-medium">Système actif</span>
                </div>
              </div>
            </div>
          </Link>
        </SidebarHeader>

        <SidebarContent className="flex-1 px-3 py-3 overflow-y-auto">
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-2 mb-1">
              Navigation
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5">
                {menuItems.map((item) => {
                  const isActive = location === item.url || (item.url === "/dashboard" && location === "/");
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        className={`h-10 rounded-xl transition-all duration-150 ${
                          isActive
                            ? "bg-violet-50 text-violet-700 shadow-sm"
                            : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                        }`}
                      >
                        <Link href={item.url} data-testid={`link-${item.url.replace("/", "")}`} className="flex items-center gap-3 px-3">
                          <item.icon className={`w-4 h-4 flex-shrink-0 transition-colors ${isActive ? "text-violet-600" : item.color}`} />
                          <span className={`text-sm font-medium ${isActive ? "text-violet-700 font-semibold" : ""}`}>{item.title}</span>
                          {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-500" />}
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
              <SidebarGroupLabel className="text-xs font-semibold text-red-400 uppercase tracking-widest px-2 mb-1">
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
                          className={`h-10 rounded-xl ${isActive ? "bg-red-50 text-red-700" : "text-red-500 hover:text-red-700 hover:bg-red-50"}`}
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

        <SidebarFooter className="p-3 border-t border-gray-100 flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 px-3 h-14 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-900 group"
                data-testid="button-user-menu"
              >
                <Avatar className="h-8 w-8 ring-2 ring-violet-200">
                  <AvatarImage src={user?.profileImageUrl || undefined} />
                  <AvatarFallback className="text-xs font-bold" style={{ background: "linear-gradient(135deg, hsl(262 83% 58%), hsl(160 84% 44%))", color: "white" }}>
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate" data-testid="text-user-name">{getDisplayName()}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
                <ChevronUp className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
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
