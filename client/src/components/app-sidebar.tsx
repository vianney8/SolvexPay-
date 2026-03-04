import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
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
  ChevronDown,
  ShieldCheck,
  Send,
  Shield,
  BookOpen,
  HeadphonesIcon,
} from "lucide-react";
import solvexpayIcon from "../assets/images/solvexpay-icon.jpg";

const menuItems = [
  { title: "Accueil", url: "/dashboard", icon: LayoutDashboard, bg: "bg-violet-100", iconColor: "text-violet-600" },
  { title: "Transactions", url: "/transactions", icon: ArrowDownUp, bg: "bg-emerald-100", iconColor: "text-emerald-600" },
  { title: "Transfert", url: "/transfer", icon: Send, bg: "bg-cyan-100", iconColor: "text-cyan-600" },
  { title: "Liens de paiement", url: "/payment-links", icon: Link2, bg: "bg-pink-100", iconColor: "text-pink-600" },
  { title: "Clés API", url: "/api-keys", icon: Key, bg: "bg-orange-100", iconColor: "text-orange-600" },
  { title: "Vérification KYC", url: "/kyc", icon: ShieldCheck, bg: "bg-blue-100", iconColor: "text-blue-600" },
  { title: "Documentation", url: "/documentation", icon: BookOpen, bg: "bg-indigo-100", iconColor: "text-indigo-600", externalUrl: "https://docs.solvexpay.site" },
  { title: "Support", url: "/support", icon: HeadphonesIcon, bg: "bg-rose-100", iconColor: "text-rose-600" },
  { title: "Paramètres", url: "/settings", icon: Settings, bg: "bg-slate-100", iconColor: "text-slate-600" },
];

const adminMenuItems = [
  { title: "Administration", url: "/admin", icon: Shield, bg: "bg-red-100", iconColor: "text-red-600" },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout, isLoggingOut } = useAuth();

  const getDisplayName = () => {
    if (user?.firstName) return [user.firstName, user.lastName].filter(Boolean).join(" ");
    return user?.email || "Utilisateur";
  };

  return (
    <Sidebar className="border-r-0">
      <div className="flex flex-col h-full" style={{ background: "linear-gradient(180deg, hsl(262 60% 97%) 0%, hsl(262 40% 95%) 100%)" }}>

        <SidebarHeader className="px-4 py-5 flex-shrink-0">
          <Link href="/dashboard">
            <div className="flex items-center gap-3 cursor-pointer" data-testid="link-logo">
              <div className="relative flex-shrink-0">
                <div className="h-9 w-9 rounded-xl shadow-md ring-1 ring-blue-100 overflow-hidden">
                  <img src={solvexpayIcon} alt="SolvexPay" className="w-full h-full object-cover" />
                </div>
              </div>
              <div>
                <p className="font-black text-base leading-none"><span className="text-blue-800">Solvex</span><span className="text-slate-400">Pay</span></p>
                <div className="flex items-center gap-1.5 mt-1">
                  {(user as any)?.kycStatus === "verified" ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                      <span className="text-xs text-emerald-600 font-medium">Vérifié</span>
                    </>
                  ) : (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" />
                      <span className="text-xs text-slate-400 font-medium">Non vérifié</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </Link>
        </SidebarHeader>

        <SidebarContent className="flex-1 px-3 pb-3 overflow-y-auto">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 mb-2">Menu principal</p>
          <SidebarMenu className="space-y-0.5">
            {menuItems.map((item) => {
              const isActive = location === item.url || (item.url === "/dashboard" && location === "/");
              const itemClass = `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 cursor-pointer group ${
                isActive
                  ? "bg-white shadow-sm border border-gray-200/80 text-gray-900"
                  : "text-gray-500 hover:bg-white/70 hover:text-gray-800 hover:shadow-sm"
              }`;
              const itemContent = (
                <>
                  <span className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                    isActive ? item.bg : "bg-gray-100/0"
                  }`}>
                    <item.icon className={`w-4 h-4 ${isActive ? item.iconColor : "text-gray-400"}`} />
                  </span>
                  <span className={`text-sm flex-1 ${isActive ? "font-semibold text-gray-900" : "font-medium"}`}>
                    {item.title}
                  </span>
                  {isActive && (
                    <span className="w-2 h-2 rounded-full bg-violet-500 flex-shrink-0" />
                  )}
                </>
              );
              return (
                <SidebarMenuItem key={item.title}>
                  {(item as any).externalUrl ? (
                    <a
                      href={(item as any).externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid={`link-documentation`}
                      className={itemClass}
                    >
                      {itemContent}
                    </a>
                  ) : (
                    <Link
                      href={item.url}
                      data-testid={`link-${item.url.replace("/", "")}`}
                      className={itemClass}
                    >
                      {itemContent}
                    </Link>
                  )}
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>

          {(user as any)?.isAdmin && (
            <>
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest px-2 mt-5 mb-2">Administration</p>
              <SidebarMenu className="space-y-0.5">
                {adminMenuItems.map((item) => {
                  const isActive = location === item.url;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <Link
                        href={item.url}
                        data-testid={`link-${item.url.replace("/", "")}`}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 cursor-pointer group ${
                          isActive ? "bg-red-50 shadow-sm border border-red-100 text-red-700" : "text-red-400 hover:bg-red-50/70 hover:text-red-700"
                        }`}
                      >
                        <span className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${isActive ? "bg-red-100" : ""}`}>
                          <item.icon className="w-4 h-4" />
                        </span>
                        <span className="text-sm font-medium flex-1">{item.title}</span>
                      </Link>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </>
          )}
        </SidebarContent>

        <SidebarFooter className="p-3 border-t border-violet-200/60 flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 px-3 h-14 rounded-2xl bg-white hover:bg-gray-50 border border-gray-200 text-gray-900 shadow-sm group"
                data-testid="button-user-menu"
              >
                {user?.profileImageUrl ? (
                  <Avatar className="h-9 w-9 ring-2 ring-violet-100 flex-shrink-0">
                    <AvatarImage src={user.profileImageUrl} />
                  </Avatar>
                ) : (
                  <div className="ring-2 ring-violet-100 rounded-full flex-shrink-0">
                    <UserAvatar firstName={user?.firstName || undefined} lastName={user?.lastName || undefined} userId={user?.id} email={user?.email || undefined} profileImageUrl={(user as any)?.profileImageUrl} size={36} />
                  </div>
                )}
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate" data-testid="text-user-name">{getDisplayName()}</p>
                  <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors flex-shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 shadow-xl rounded-xl">
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center gap-2 cursor-pointer rounded-lg">
                  <Settings className="h-4 w-4" />
                  Paramètres
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => logout()}
                disabled={isLoggingOut}
                className="text-destructive focus:text-destructive cursor-pointer rounded-lg"
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
