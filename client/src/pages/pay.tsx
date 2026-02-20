import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CreditCard, Smartphone, CheckCircle2, XCircle, ExternalLink, Loader2 } from "lucide-react";
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
  const [paymentUrl, setPaymentUrl] = useState("");

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

  const payMutation = useMutation({
    mutationFn: async (data: { customerPhone?: string; customerName?: string; customerEmail?: string }) => {
      const response = await apiRequest("POST", `/api/payment-links/public/${slug}/pay`, data);
      return response.json();
    },
    onSuccess: (data: any) => {
      if (data.paymentUrl) {
        setPaymentUrl(data.paymentUrl);
        setPaymentStatus("success");
        window.open(data.paymentUrl, "_blank");
      } else {
        setPaymentStatus("success");
      }
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

  const handlePay = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPaymentStatus("processing");
    const formData = new FormData(e.currentTarget);
    payMutation.mutate({
      customerPhone: (formData.get("phoneNumber") as string) || undefined,
      customerName: (formData.get("customerName") as string) || undefined,
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
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <CheckCircle2 className="h-16 w-16 mx-auto text-primary" />
            <h1 className="text-2xl font-bold">Paiement initie</h1>
            <p className="text-muted-foreground">
              Cliquez sur le bouton ci-dessous pour completer votre paiement via Mobile Money.
            </p>
            <p className="font-semibold text-lg">
              {formatCurrency(paymentLink.amount, paymentLink.currency)}
            </p>
            {paymentUrl && (
              <Button
                className="w-full gap-2"
                onClick={() => window.open(paymentUrl, "_blank")}
                data-testid="button-open-payment"
              >
                <ExternalLink className="h-4 w-4" />
                Payer maintenant
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
                name="customerName"
                type="text"
                placeholder="Jean Dupont"
                data-testid="input-pay-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Telephone (optionnel)</Label>
              <Input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                placeholder="+229 XX XX XX XX"
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
                  Traitement...
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
            Paiement securise par SolvexPay via SendavaPay
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
