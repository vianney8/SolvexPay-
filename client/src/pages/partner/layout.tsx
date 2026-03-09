import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, SidebarRail } from "@/components/ui/sidebar";
import { LayoutDashboard, Receipt, Key, Globe, BookOpen, Settings, LogOut, User } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import solvexpayLogo from "@/assets/images/solvexpay-logo.png";

const menuItems = [
  { title: "Tableau de bord", url: "/partner/dashboard", icon: LayoutDashboard },
  { title: "Transactions", url: "/partner/transactions", icon: Receipt },
  { title: "Clés API", url: "/partner/api-keys", icon: Key },
  { title: "Pays activés", url: "/partner/countries", icon: Globe },
  { title: "Documentation", url: "/partner/docs", icon: BookOpen },
  { title: "Paramètres", url: "/partner/settings", icon: Settings },
];

export function PartnerSidebar() {
  const [location] = useLocation();
  const { logoutMutation, user } = useAuth();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3 px-2">
          <img src={solvexpayLogo} alt="SolvexPay" className="w-9 h-9 rounded-xl object-cover ring-2 ring-primary/20 shadow-lg" />
          <div className="flex flex-col">
            <span className="font-black text-lg tracking-tight text-foreground">SolvexPay</span>
            <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Espace Partenaire</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 text-xs font-bold uppercase tracking-widest text-muted-foreground/50 mb-2">
            Menu Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="px-2">
              {menuItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <Link href={item.url} className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200">
                        <item.icon className={`h-4.5 w-4.5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                        <span className={`font-semibold text-sm ${isActive ? "text-foreground" : "text-muted-foreground"}`}>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-border/40 bg-muted/20">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
             <User className="h-5 w-5 text-primary" />
          </div>
          <div className="flex flex-col min-w-0">
            <p className="text-sm font-bold text-foreground truncate">{(user as any)?.profile?.companyName || user?.email}</p>
            <p className="text-[10px] text-muted-foreground truncate uppercase font-bold tracking-tighter">Partenaire</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-3 h-10 text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-xl transition-all"
          onClick={() => logoutMutation.mutate()}
          data-testid="button-logout"
        >
          <LogOut className="h-4.5 w-4.5" />
          <span className="font-bold text-sm">Déconnexion</span>
        </Button>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
