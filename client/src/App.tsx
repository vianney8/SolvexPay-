import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import { LoginPage, RegisterPage } from "@/pages/auth";
import DashboardPage from "@/pages/dashboard";
import WalletPage from "@/pages/wallet";
import TransactionsPage from "@/pages/transactions";
import PaymentLinksPage from "@/pages/payment-links";
import ApiKeysPage from "@/pages/api-keys";
import PayPage from "@/pages/pay";

function AuthenticatedRoutes() {
  return (
    <Switch>
      <Route path="/" component={DashboardPage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/wallet" component={WalletPage} />
      <Route path="/transactions" component={TransactionsPage} />
      <Route path="/payment-links" component={PaymentLinksPage} />
      <Route path="/api-keys" component={ApiKeysPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function Router() {
  const { user, isLoading } = useAuth();

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
      {user ? (
        <AuthenticatedRoutes />
      ) : (
        <>
          <Route path="/" component={LandingPage} />
          <Route path="/login" component={LoginPage} />
          <Route path="/register" component={RegisterPage} />
          <Route component={LandingPage} />
        </>
      )}
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="solvexpay-ui-theme">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
