import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CreditCard, Smartphone, CheckCircle2, XCircle } from "lucide-react";
import type { PaymentLink } from "@shared/schema";

const providers = [
  { id: "solvexpay", name: "SolvexPay", color: "bg-primary", recommended: true },
  { id: "mtn", name: "MTN Mobile Money", color: "bg-yellow-500" },
  { id: "orange", name: "Orange Money", color: "bg-orange-500" },
  { id: "wave", name: "Wave", color: "bg-blue-500" },
  { id: "moov", name: "Moov Money", color: "bg-purple-500" },
];

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
    mutationFn: async (data: { provider: string; phoneNumber: string }) => {
      const response = await apiRequest("POST", `/api/payment-links/public/${slug}/pay`, data);
      return response.json();
    },
    onSuccess: (data: any) => {
      if (data.redirectToPayment && data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        setPaymentStatus("success");
      }
    },
    onError: () => {
      setPaymentStatus("error");
      toast({
        title: "Erreur",
        description: "Le paiement n'a pas pu être initié. Veuillez réessayer.",
        variant: "destructive",
      });
    },
  });

  const handlePay = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPaymentStatus("processing");
    const formData = new FormData(e.currentTarget);
    payMutation.mutate({
      provider: formData.get("provider") as string,
      phoneNumber: formData.get("phoneNumber") as string,
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
            <h1 className="text-2xl font-bold mb-2">Lien non trouvé</h1>
            <p className="text-muted-foreground">
              Ce lien de paiement n'existe pas ou a été désactivé.
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
            <h1 className="text-2xl font-bold mb-2">Lien désactivé</h1>
            <p className="text-muted-foreground">
              Ce lien de paiement a été désactivé par le marchand.
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
          <CardContent className="pt-8 pb-8">
            <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-primary" />
            <h1 className="text-2xl font-bold mb-2">Paiement initié</h1>
            <p className="text-muted-foreground mb-4">
              Vous allez recevoir une demande de paiement sur votre téléphone.
              Veuillez confirmer la transaction.
            </p>
            <p className="font-semibold text-lg">
              {formatCurrency(paymentLink.amount, paymentLink.currency)}
            </p>
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
            <p className="text-sm text-muted-foreground">Montant à payer</p>
            <p className="text-4xl font-bold text-primary" data-testid="text-payment-amount">
              {formatCurrency(paymentLink.amount, paymentLink.currency)}
            </p>
          </div>

          <form onSubmit={handlePay} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="provider">Mode de paiement</Label>
              <Select name="provider" defaultValue="solvexpay">
                <SelectTrigger id="provider" data-testid="select-pay-provider">
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {providers.map((p) => (
                    <SelectItem key={p.id} value={p.id} data-testid={`option-provider-${p.id}`}>
                      <div className="flex items-center gap-2">
                        <div className={`h-4 w-4 rounded-full ${p.color}`} />
                        {p.name}
                        {(p as any).recommended && (
                          <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded" data-testid="badge-recommended">
                            Recommandé
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Numéro de téléphone</Label>
              <Input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                placeholder="+221 77 123 45 67"
                required
                data-testid="input-pay-phone"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full gap-2" 
              disabled={payMutation.isPending}
              data-testid="button-confirm-pay"
            >
              <Smartphone className="h-4 w-4" />
              {payMutation.isPending ? "Traitement..." : "Payer maintenant"}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Paiement sécurisé par SolvexPay
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
