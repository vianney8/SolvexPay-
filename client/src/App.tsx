import { Switch, Route } from "wouter";
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

interface ErrorBoundaryState { hasError: boolean; error?: Error }

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
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
      <Route path="/admin" component={AdminPage} />
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

  if (isBlocked) {
    return <BlockedPage />;
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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <ErrorBoundary>
            <Router />
          </ErrorBoundary>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
