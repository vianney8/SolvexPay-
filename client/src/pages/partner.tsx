import { Switch, Route, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { PartnerSidebar } from "./partner/layout";
import PartnerDashboard from "./partner/dashboard";
import PartnerTransactions from "./partner/transactions";
import PartnerApiKeys from "./partner/api-keys";
import PartnerCountries from "./partner/countries";
import PartnerDocs from "./partner/docs";
import PartnerSettings from "./partner/settings";
import PartnerAuthPage from "./partner/index";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import React from "react";

export default function PartnerPage() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-4 w-full max-w-md p-8 text-center">
          <Skeleton className="h-16 w-16 mx-auto rounded-2xl" />
          <Skeleton className="h-6 w-48 mx-auto rounded-lg" />
          <Skeleton className="h-4 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (!user || !user.isPartner) {
    return <PartnerAuthPage />;
  }

  const style = {
    "--sidebar-width": "18rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full bg-background overflow-hidden">
        <PartnerSidebar />
        <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
          <header className="flex h-16 items-center justify-between px-6 border-b border-border/40 bg-background/50 backdrop-blur-md sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="h-10 w-10 rounded-xl hover:bg-muted/50 transition-colors" data-testid="button-sidebar-toggle" />
              <div className="h-6 w-px bg-border/60 mx-1 hidden sm:block" />
              <div className="flex flex-col">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground leading-none">SolvexPay Partner</p>
                <p className="text-sm font-bold text-foreground leading-none mt-1">Espace de Gestion Directe</p>
              </div>
            </div>
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-10 scrollbar-thin scrollbar-thumb-border">
            <div className="max-w-7xl mx-auto">
              <Switch>
                <Route path="/partner" component={PartnerDashboard} />
                <Route path="/partner/dashboard" component={PartnerDashboard} />
                <Route path="/partner/transactions" component={PartnerTransactions} />
                <Route path="/partner/api-keys" component={PartnerApiKeys} />
                <Route path="/partner/countries" component={PartnerCountries} />
                <Route path="/partner/docs" component={PartnerDocs} />
                <Route path="/partner/settings" component={PartnerSettings} />
                <Route>
                   <div className="p-12 text-center">
                      <h1 className="text-4xl font-black">404</h1>
                      <p className="text-muted-foreground mt-2">Page partenaire introuvable.</p>
                   </div>
                </Route>
              </Switch>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
