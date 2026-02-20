import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CreditCard, Smartphone, CheckCircle2, XCircle, Loader2, Phone } from "lucide-react";
import type { PaymentLink } from "@shared/schema";

const OPERATORS_BY_COUNTRY: Record<string, { label: string; operators: { value: string; label: string }[] }> = {
  TG: { label: "Togo", operators: [{ value: "TMoney", label: "TMoney" }, { value: "Moov", label: "Moov" }] },
  BJ: { label: "Benin", operators: [{ value: "MTN", label: "MTN" }, { value: "Moov", label: "Moov" }] },
  BF: { label: "Burkina Faso", operators: [{ value: "Orange", label: "Orange" }, { value: "Moov", label: "Moov" }] },
  CM: { label: "Cameroun", operators: [{ value: "MTN", label: "MTN" }, { value: "Orange", label: "Orange" }] },
  CI: { label: "Cote d'Ivoire", operators: [{ value: "MTN", label: "MTN" }, { value: "Orange", label: "Orange" }, { value: "Moov", label: "Moov" }, { value: "Wave", label: "Wave" }] },
  COD: { label: "RD Congo", operators: [{ value: "Vodacom", label: "Vodacom" }, { value: "Airtel", label: "Airtel" }, { value: "Orange", label: "Orange" }] },
  COG: { label: "Congo Brazzaville", operators: [{ value: "MTN", label: "MTN" }, { value: "Airtel", label: "Airtel" }] },
};

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
  const [verifyStatus, setVerifyStatus] = useState<string>("PROCESSING");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [country, setCountry] = useState("TG");
  const [operator, setOperator] = useState("");
  const [customerName, setCustomerName] = useState("");

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
    if (country) {
      const countryOps = OPERATORS_BY_COUNTRY[country]?.operators || [];
      if (countryOps.length > 0 && !countryOps.find(op => op.value === operator)) {
        setOperator(countryOps[0].value);
      }
    }
  }, [country]);

  const payMutation = useMutation({
    mutationFn: async (data: { phoneNumber: string; operator: string; country: string; customerName?: string }) => {
      const response = await apiRequest("POST", `/api/payment-links/public/${slug}/pay`, data);
      return response.json();
    },
    onSuccess: (data: any) => {
      setPendingReference(data.sendavaReference || data.reference);
      setVerifyStatus(data.sendavaStatus || "PROCESSING");
      setPaymentStatus("success");
      toast({ title: "Paiement initie", description: "Un prompt USSD a ete envoye sur votre telephone." });
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
    if (!pendingReference || verifyStatus === "SUCCESS" || verifyStatus === "FAILED" || verifyStatus === "CANCELLED") return;

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
    if (!phoneNumber || !operator || !country) return;
    setPaymentStatus("processing");
    payMutation.mutate({
      phoneNumber,
      operator,
      country,
      customerName: customerName || undefined,
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

  if (paymentStatus === "success") {
    const statusConfig: Record<string, { icon: any; color: string; bg: string; label: string; sublabel: string; spin: boolean }> = {
      PROCESSING: { icon: Loader2, color: "text-yellow-500", bg: "bg-yellow-500/10", label: "Paiement en cours...", sublabel: "Un prompt USSD a ete envoye. Confirmez sur votre telephone.", spin: true },
      PENDING: { icon: Loader2, color: "text-yellow-500", bg: "bg-yellow-500/10", label: "En attente", sublabel: "Veuillez confirmer le paiement sur votre telephone.", spin: true },
      SUCCESS: { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10", label: "Paiement confirme !", sublabel: "Votre paiement a ete effectue avec succes.", spin: false },
      FAILED: { icon: XCircle, color: "text-red-500", bg: "bg-red-500/10", label: "Paiement echoue", sublabel: "Le paiement n'a pas abouti. Veuillez reessayer.", spin: false },
      CANCELLED: { icon: XCircle, color: "text-gray-500", bg: "bg-gray-500/10", label: "Paiement annule", sublabel: "Le paiement a ete annule.", spin: false },
    };

    const config = statusConfig[verifyStatus] || statusConfig.PROCESSING;
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
            {(verifyStatus === "FAILED" || verifyStatus === "CANCELLED") && (
              <Button
                className="w-full"
                onClick={() => { setPaymentStatus("idle"); setPendingReference(null); setVerifyStatus("PROCESSING"); }}
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

  const availableOperators = OPERATORS_BY_COUNTRY[country]?.operators || [];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
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
              <Label htmlFor="phoneNumber" className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                Numero Mobile Money
              </Label>
              <Input
                id="phoneNumber"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                type="tel"
                placeholder="+22890123456"
                required
                data-testid="input-pay-phone"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Pays</Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger data-testid="select-pay-country">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(OPERATORS_BY_COUNTRY).map(([code, data]) => (
                      <SelectItem key={code} value={code}>{data.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Operateur</Label>
                <Select value={operator} onValueChange={setOperator}>
                  <SelectTrigger data-testid="select-pay-operator">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableOperators.map((op) => (
                      <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full gap-2"
              disabled={payMutation.isPending || !phoneNumber || !operator}
              data-testid="button-confirm-pay"
            >
              {payMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Smartphone className="h-4 w-4" />
                  Payer maintenant
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Paiement securise par SolvexPay via Mobile Money (USSD direct)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
