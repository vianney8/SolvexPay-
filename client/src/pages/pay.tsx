import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CreditCard, Smartphone, CheckCircle2, XCircle, Loader2, Phone, ExternalLink } from "lucide-react";
import type { PaymentLink } from "@shared/schema";

function formatCurrency(amount: string | number, currency = "XOF") {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export default function PayPage() {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [pendingReference, setPendingReference] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<string>("pending");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  const searchParams = new URLSearchParams(window.location.search);
  const callbackStatus = searchParams.get("status");

  const { data: paymentLink, isLoading, error } = useQuery<PaymentLink>({
    queryKey: ["/api/payment-links/public", slug],
    queryFn: async () => {
      const response = await fetch(`/api/payment-links/public/${slug}`);
      if (!response.ok) {
        throw new Error("Payment link not found");
      }
      return response.json();
    },
  });

  useEffect(() => {
    if (callbackStatus === "callback") {
      setPaymentStatus("processing");
      toast({ title: "Verification en cours", description: "Nous verifions votre paiement..." });
    }
  }, [callbackStatus]);

  const payMutation = useMutation({
    mutationFn: async (data: { customerPhone?: string; customerName?: string; customerEmail?: string }) => {
      const response = await apiRequest("POST", `/api/payment-links/public/${slug}/pay`, data);
      return response.json();
    },
    onSuccess: (data: any) => {
      setPendingReference(data.sendavaReference || data.reference);
      if (data.paymentUrl) {
        setPaymentUrl(data.paymentUrl);
      }
      setPaymentStatus("processing");
      toast({ title: "Paiement cree", description: "Cliquez sur le bouton pour finaliser le paiement." });
    },
    onError: () => {
      setPaymentStatus("error");
      toast({
        title: "Erreur",
        description: "Le paiement n'a pas pu etre initie. Veuillez reessayer.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!pendingReference || verifyStatus === "completed" || verifyStatus === "failed" || verifyStatus === "cancelled") return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/payment-links/verify-public", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference: pendingReference }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.status) setVerifyStatus(data.status);
        }
      } catch {}
    }, 5000);

    return () => clearInterval(interval);
  }, [pendingReference, verifyStatus]);

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentStatus("processing");
    payMutation.mutate({
      customerPhone: customerPhone || undefined,
      customerName: customerName || undefined,
      customerEmail: customerEmail || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Skeleton className="h-8 w-48 mx-auto mb-2" />
            <Skeleton className="h-4 w-64 mx-auto" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !paymentLink) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <XCircle className="h-16 w-16 mx-auto mb-4 text-destructive" />
            <h1 className="text-2xl font-bold mb-2">Lien non trouve</h1>
            <p className="text-muted-foreground">
              Ce lien de paiement n'existe pas ou a ete desactive.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!paymentLink.isActive) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <XCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h1 className="text-2xl font-bold mb-2">Lien desactive</h1>
            <p className="text-muted-foreground">
              Ce lien de paiement a ete desactive par le marchand.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (paymentStatus === "processing" || paymentStatus === "success" || paymentStatus === "error") {
    const statusConfig: Record<string, { icon: any; color: string; bg: string; label: string; sublabel: string; spin: boolean }> = {
      pending: { icon: Loader2, color: "text-yellow-500", bg: "bg-yellow-500/10", label: "Paiement en cours...", sublabel: paymentUrl ? "Cliquez sur le bouton pour finaliser votre paiement." : "Verification en cours...", spin: true },
      completed: { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10", label: "Paiement confirme !", sublabel: "Votre paiement a ete effectue avec succes. Merci !", spin: false },
      failed: { icon: XCircle, color: "text-red-500", bg: "bg-red-500/10", label: "Paiement echoue", sublabel: "Le paiement n'a pas abouti. Veuillez reessayer.", spin: false },
      cancelled: { icon: XCircle, color: "text-gray-500", bg: "bg-gray-500/10", label: "Paiement annule", sublabel: "Le paiement a ete annule.", spin: false },
    };

    const config = statusConfig[verifyStatus] || statusConfig.pending;
    const StatusIcon = config.icon;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <div className={`h-16 w-16 rounded-full ${config.bg} flex items-center justify-center mx-auto`}>
              <StatusIcon className={`h-8 w-8 ${config.color} ${config.spin ? "animate-spin" : ""}`} />
            </div>
            <h1 className="text-2xl font-bold" data-testid="text-payment-status">{config.label}</h1>
            <p className="text-muted-foreground text-sm">{config.sublabel}</p>
            <p className="font-semibold text-lg">
              {formatCurrency(paymentLink.amount, paymentLink.currency)}
            </p>
            {pendingReference && (
              <p className="text-xs text-muted-foreground">
                Reference: <span className="font-mono">{pendingReference}</span>
              </p>
            )}
            {paymentUrl && (verifyStatus === "pending") && (
              <a
                href={paymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
                data-testid="link-payment-url"
              >
                <ExternalLink className="h-4 w-4" />
                Payer maintenant sur SendavaPay
              </a>
            )}
            {(verifyStatus === "failed" || verifyStatus === "cancelled") && (
              <Button
                className="w-full"
                onClick={() => { setPaymentStatus("idle"); setPendingReference(null); setPaymentUrl(null); setVerifyStatus("pending"); }}
                data-testid="button-retry-payment"
              >
                Reessayer
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {paymentLink.imageUrl && (
            <div className="w-full h-32 mb-4 rounded-lg overflow-hidden">
              <img src={paymentLink.imageUrl} alt={paymentLink.name} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <CreditCard className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl" data-testid="text-payment-name">{paymentLink.name}</CardTitle>
          {paymentLink.description && (
            <CardDescription>{paymentLink.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="text-center mb-6">
            <p className="text-sm text-muted-foreground">Montant a payer</p>
            <p className="text-4xl font-bold text-primary" data-testid="text-payment-amount">
              {formatCurrency(paymentLink.amount, paymentLink.currency)}
            </p>
          </div>

          <form onSubmit={handlePay} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">Votre nom (optionnel)</Label>
              <Input
                id="customerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                type="text"
                placeholder="Jean Dupont"
                data-testid="input-pay-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerEmail">Email (optionnel)</Label>
              <Input
                id="customerEmail"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                type="email"
                placeholder="jean@exemple.com"
                data-testid="input-pay-email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerPhone" className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                Numero de telephone (optionnel)
              </Label>
              <Input
                id="customerPhone"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                type="tel"
                placeholder="+22890123456"
                data-testid="input-pay-phone"
              />
            </div>

            <Button
              type="submit"
              className="w-full gap-2"
              disabled={payMutation.isPending}
              data-testid="button-confirm-pay"
            >
              {payMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creation du paiement...
                </>
              ) : (
                <>
                  <Smartphone className="h-4 w-4" />
                  Payer {formatCurrency(paymentLink.amount, paymentLink.currency)}
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Paiement securise par SolvexPay via SendavaPay Mobile Money
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
