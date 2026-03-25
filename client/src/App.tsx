import { Switch, Route, useLocation } from "wouter";
import { useEffect, Component, ReactNode } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import { LoginPage, RegisterPage, ForgotPasswordPage } from "@/pages/auth";
import DashboardPage from "@/pages/dashboard";
import TransactionsPage from "@/pages/transactions";
import PaymentLinksPage from "@/pages/payment-links";
import ApiKeysPage from "@/pages/api-keys";
import KycPage from "@/pages/kyc";
import SettingsPage from "@/pages/settings";
import DepositPage from "@/pages/deposit";
import WithdrawPage from "@/pages/withdraw";
import PayPage from "@/pages/pay";
import PayApiPage from "@/pages/pay-api";
import AdminPage from "@/pages/admin";
import AdminUsersPage from "@/pages/admin-users";
import AdminMerchantsPage from "@/pages/admin-merchants";
import SupportPage from "@/pages/support";
import DocumentationPage from "@/pages/documentation";
import SrApiPage from "@/pages/sr-api";

const PREFETCH_KEYS = [
  ["/api/wallet"],
  ["/api/stats"],
  ["/api/transactions"],
  ["/api/payment-links"],
  ["/api/notifications"],
  ["/api/service-fees"],
  ["/api/support-links"],
  ["/api/payment-methods/public"],
  ["/api/api-keys"],
];

const ADMIN_PREFETCH_KEYS = [
  ["/api/admin/users"],
  ["/api/admin/wallets"],
  ["/api/admin/merchants"],
  ["/api/admin/stats"],
];

interface EBState { hasError: boolean; error?: Error }

class GlobalErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="max-w-sm w-full text-center space-y-5">
            <div className="h-20 w-20 rounded-3xl bg-orange-500/10 flex items-center justify-center mx-auto">
              <svg className="h-10 w-10 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-black text-foreground">Une erreur est survenue</h1>
              <p className="text-muted-foreground mt-2 text-sm">Veuillez recharger la page. Si le problème persiste, contactez le support.</p>
            </div>
            <button
              onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bold rounded-2xl text-sm hover:bg-primary/90 transition-colors"
            >
              Recharger la page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

class AdminErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch() {
    this.setState({ hasError: true });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="max-w-sm w-full text-center space-y-5">
            <div className="h-20 w-20 rounded-3xl bg-red-500/10 flex items-center justify-center mx-auto">
              <svg className="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-black text-foreground">Erreur dans le panneau admin</h1>
              <p className="text-muted-foreground mt-2 text-sm">Le reste du site fonctionne normalement. Rechargez la page pour réessayer.</p>
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => this.setState({ hasError: false })}
                className="inline-flex items-center justify-center px-4 py-2.5 bg-muted text-foreground font-semibold rounded-xl text-sm hover:bg-muted/80 transition-colors"
              >
                Réessayer
              </button>
              <button
                onClick={() => { this.setState({ hasError: false }); window.location.href = "/dashboard"; }}
                className="inline-flex items-center justify-center px-4 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl text-sm hover:bg-primary/90 transition-colors"
              >
                Retour au dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function AdminPageWrapped() {
  return (
    <AdminErrorBoundary>
      <AdminPage />
    </AdminErrorBoundary>
  );
}

function AuthenticatedRoutes() {
  return (
    <Switch>
      <Route path="/" component={DashboardPage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/transactions" component={TransactionsPage} />
      <Route path="/deposit" component={DepositPage} />
      <Route path="/withdraw" component={WithdrawPage} />
      <Route path="/payment-links" component={PaymentLinksPage} />
      <Route path="/api-keys" component={ApiKeysPage} />
      <Route path="/kyc" component={KycPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/admin" component={AdminPageWrapped} />
      <Route path="/admin/users" component={AdminUsersPage} />
      <Route path="/admin/merchants" component={AdminMerchantsPage} />
      <Route path="/support" component={SupportPage} />
      <Route path="/documentation" component={DocumentationPage} />
      <Route path="/sr-api" component={SrApiPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function BlockedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-sm w-full text-center space-y-5">
        <div className="h-20 w-20 rounded-3xl bg-red-500/10 flex items-center justify-center mx-auto">
          <svg className="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-black text-foreground">Compte suspendu</h1>
          <p className="text-muted-foreground mt-2 text-sm">Votre compte a été suspendu par l'administrateur. Veuillez contacter le support pour plus d'informations.</p>
        </div>
        <a
          href="mailto:support@solvexpay.com"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bold rounded-2xl text-sm hover:bg-primary/90 transition-colors"
        >
          Contacter le support
        </a>
      </div>
    </div>
  );
}

function Router() {
  const { user, isLoading, isBlocked } = useAuth();

  useEffect(() => {
    if (!user) return;
    PREFETCH_KEYS.forEach((key) => {
      queryClient.prefetchQuery({ queryKey: key, staleTime: Infinity });
    });
    if ((user as any).isAdmin) {
      ADMIN_PREFETCH_KEYS.forEach((key) => {
        queryClient.prefetchQuery({ queryKey: key, staleTime: Infinity });
      });
    }
  }, [user?.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-4 w-full max-w-md p-8">
          <Skeleton className="h-12 w-48 mx-auto" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/pay/:slug" component={PayPage} />
      <Route path="/pay-api/:id" component={PayApiPage} />
      <Route path="/documentation" component={DocumentationPage} />
      {user ? (
        <AuthenticatedRoutes />
      ) : (
        <>
          <Route path="/" component={LandingPage} />
          <Route path="/login" component={LoginPage} />
          <Route path="/register" component={RegisterPage} />
          <Route path="/forgot-password" component={ForgotPasswordPage} />
          <Route component={LandingPage} />
        </>
      )}
    </Switch>
  );
}

function RouteAwareRouter() {
  const [location] = useLocation();
  return (
    <GlobalErrorBoundary key={location}>
      <Router />
    </GlobalErrorBoundary>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <RouteAwareRouter />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
