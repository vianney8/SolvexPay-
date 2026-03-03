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
import solvexpayLogo from "@/assets/images/solvexpay-logo.png";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  breadcrumbs?: { label: string; href?: string }[];
}

export function DashboardLayout({ children, title, breadcrumbs }: DashboardLayoutProps) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1">
          <header className="flex h-14 items-center gap-4 border-b border-border/60 bg-background/95 backdrop-blur-sm px-4 lg:px-6 sticky top-0 z-50 shadow-sm">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors" data-testid="button-sidebar-toggle" />
            <Separator orientation="vertical" className="h-5" />
            <div className="flex-1">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/dashboard" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
                      Accueil
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  {breadcrumbs?.map((crumb, index) => (
                    <>
                      <BreadcrumbSeparator key={`sep-${index}`} />
                      <BreadcrumbItem key={`item-${index}`}>
                        {crumb.href ? (
                          <BreadcrumbLink href={crumb.href} className="text-sm">{crumb.label}</BreadcrumbLink>
                        ) : (
                          <BreadcrumbPage className="text-sm font-medium">{crumb.label}</BreadcrumbPage>
                        )}
                      </BreadcrumbItem>
                    </>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0" data-testid="header-logo">
              <div className="relative">
                <img src={solvexpayLogo} alt="SolvexPay" className="w-7 h-7 rounded-lg object-cover ring-1 ring-primary/20" />
              </div>
              <span className="font-bold text-sm hidden sm:inline bg-gradient-to-r from-violet-600 to-violet-400 bg-clip-text text-transparent">SolvexPay</span>
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
