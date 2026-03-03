import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ChevronLeft } from "lucide-react";
import solvexpayLogo from "@/assets/images/solvexpay-logo.png";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  breadcrumbs?: { label: string; href?: string }[];
}

function goBack() {
  if (window.history.length > 1) {
    window.history.back();
  } else {
    window.location.href = "/dashboard";
  }
}

export function DashboardLayout({ children, title, breadcrumbs }: DashboardLayoutProps) {
  const showBackButton = breadcrumbs && breadcrumbs.length > 0;

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1">
          <header className="flex h-14 items-center gap-3 border-b border-border/60 bg-background/95 backdrop-blur-sm px-4 lg:px-6 sticky top-0 z-50 shadow-sm">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0" data-testid="button-sidebar-toggle" />
            <span className="font-bold text-sm bg-gradient-to-r from-violet-600 to-violet-400 bg-clip-text text-transparent">SolvexPay</span>
            <Separator orientation="vertical" className="h-5 flex-shrink-0" />

            {showBackButton && (
              <>
                <button
                  type="button"
                  onClick={goBack}
                  className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 group"
                  data-testid="button-back"
                >
                  <span className="h-7 w-7 rounded-lg border border-border/70 bg-background flex items-center justify-center group-hover:bg-muted/50 transition-colors">
                    <ChevronLeft className="h-4 w-4" />
                  </span>
                  <span className="hidden sm:inline">Retour</span>
                </button>
                <Separator orientation="vertical" className="h-5 flex-shrink-0" />
              </>
            )}

            <div className="flex-1 min-w-0">
              <Breadcrumb>
                <BreadcrumbList>
                  {breadcrumbs?.map((crumb, index) => [
                    index > 0 && <BreadcrumbSeparator key={`sep-${index}`} />,
                    <BreadcrumbItem key={`item-${index}`}>
                      {crumb.href ? (
                        <BreadcrumbLink href={crumb.href} className="text-sm">{crumb.label}</BreadcrumbLink>
                      ) : (
                        <BreadcrumbPage className="text-sm font-semibold">{crumb.label}</BreadcrumbPage>
                      )}
                    </BreadcrumbItem>,
                  ])}
                </BreadcrumbList>
              </Breadcrumb>
            </div>

            <div className="flex-shrink-0" data-testid="header-logo">
              <img src={solvexpayLogo} alt="SolvexPay" className="w-7 h-7 rounded-lg object-cover ring-1 ring-primary/20" />
            </div>
          </header>

          <main className="flex-1 overflow-auto p-4 lg:p-6 bg-background">
            {title && (
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">{title}</h1>
              </div>
            )}
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
