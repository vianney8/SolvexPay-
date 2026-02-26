import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ArrowUpRight, CheckCircle2, AlertTriangle, Phone, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import type { Wallet as WalletType } from "@shared/schema";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

const COUNTRIES = [
  { code: "BJ", name: "Benin", currency: "XOF", operators: ["MTN", "Moov"] },
  { code: "BF", name: "Burkina Faso", currency: "XOF", operators: ["Moov", "Orange"] },
  { code: "TG", name: "Togo", currency: "XOF", operators: ["TMoney", "Moov"] },
  { code: "CM", name: "Cameroun", currency: "XAF", operators: ["MTN", "Orange"] },
  { code: "CI", name: "Cote d'Ivoire", currency: "XOF", operators: ["Orange", "MTN", "Moov", "Wave"] },
  { code: "COD", name: "RDC", currency: "CDF", operators: ["Vodacom", "Airtel", "Orange"] },
  { code: "COG", name: "Congo Brazzaville", currency: "XAF", operators: ["Airtel", "MTN"] },
];

export default function WithdrawPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [amount, setAmount] = useState("");
  const [country, setCountry] = useState("BJ");
  const [operator, setOperator] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [success, setSuccess] = useState(false);
  const [withdrawRef, setWithdrawRef] = useState("");

  const selectedCountry = COUNTRIES.find(c => c.code === country);
  const availableOperators = selectedCountry?.operators || [];

  useEffect(() => {
    setOperator("");
  }, [country]);

  const { data: wallet } = useQuery<WalletType>({
    queryKey: ["/api/wallet"],
  });

  const balance = parseFloat(String(wallet?.balanceXOF || 0));
  const withdrawAmount = amount ? parseFloat(amount) : 0;
  const insufficientFunds = withdrawAmount > balance;

  const withdrawMutation = useMutation({
    mutationFn: async (data: { amount: number; phoneNumber: string; operator: string; country: string }) => {
      const res = await apiRequest("POST", "/api/transactions/withdraw", data);
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setWithdrawRef(data.reference || data.sendavaReference || "");
      setSuccess(true);
      toast({ title: "Retrait initie", description: "Les fonds seront envoyes sur votre Mobile Money." });
    },
    onError: (error: any) => {
      toast({ title: "Erreur", description: error.message || "Impossible d'initier le retrait.", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !phoneNumber || !operator || !country || insufficientFunds) return;
    withdrawMutation.mutate({ amount: parseFloat(amount), phoneNumber, operator, country });
  };

  if (success) {
    return (
      <DashboardLayout title="Retrait" breadcrumbs={[{ label: "Retrait" }]}>
        <div className="max-w-md mx-auto mt-12">
          <Card className="border-0 shadow-none">
            <CardContent className="pt-10 pb-10 text-center space-y-5">
              <div className="h-20 w-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold" data-testid="text-withdraw-status">Retrait initie</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  <span className="font-semibold">{formatCurrency(parseFloat(amount))} XOF</span> vers <span className="font-semibold">{phoneNumber}</span> ({operator})
                </p>
              </div>
              {withdrawRef && (
                <p className="text-xs text-muted-foreground font-mono">{withdrawRef}</p>
              )}
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => navigate("/")} data-testid="button-back-dashboard">
                  Tableau de bord
                </Button>
                <Button className="flex-1" onClick={() => { setSuccess(false); setAmount(""); setPhoneNumber(""); setWithdrawRef(""); setOperator(""); }} data-testid="button-new-withdraw">
                  Nouveau retrait
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Retrait" breadcrumbs={[{ label: "Retrait" }]}>
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="h-14 w-14 rounded-2xl bg-orange-500/10 flex items-center justify-center mx-auto">
            <ArrowUpRight className="h-7 w-7 text-orange-500" />
          </div>
          <h1 className="text-2xl font-bold" data-testid="text-withdraw-title">Retrait</h1>
          <p className="text-sm text-muted-foreground">
            Disponible : <span className="font-semibold">{formatCurrency(balance)} XOF</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Card className="border-0 shadow-none bg-muted/30">
            <CardContent className="p-5 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">Montant (XOF)</Label>
                <Input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  type="number"
                  placeholder="0"
                  min="100"
                  max={balance}
                  required
                  className="text-3xl h-16 text-center font-bold border-0 bg-transparent focus-visible:ring-0 placeholder:text-muted-foreground/30"
                  data-testid="input-withdraw-amount"
                />
              </div>
              {balance > 0 && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => setAmount(String(Math.floor(balance)))}
                    className="px-3 py-1.5 rounded-full text-xs font-medium bg-muted hover:bg-accent text-muted-foreground transition-colors"
                    data-testid="button-max-amount"
                  >
                    Retirer tout ({formatCurrency(Math.floor(balance))})
                  </button>
                </div>
              )}
              {insufficientFunds && withdrawAmount > 0 && (
                <div className="flex items-center gap-2 justify-center text-sm text-red-500">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>Solde insuffisant</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-none bg-muted/30">
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">Pays</Label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger className="h-11" data-testid="select-withdraw-country">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c.code} value={c.code} data-testid={`option-withdraw-country-${c.code}`}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">Operateur</Label>
                  <Select value={operator} onValueChange={setOperator}>
                    <SelectTrigger className="h-11" data-testid="select-withdraw-operator">
                      <SelectValue placeholder="Choisir" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableOperators.map((op) => (
                        <SelectItem key={op} value={op} data-testid={`option-withdraw-operator-${op}`}>
                          {op}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  Numero du destinataire
                </Label>
                <Input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  type="tel"
                  placeholder="+22890123456"
                  required
                  className="h-11"
                  data-testid="input-withdraw-phone"
                />
              </div>
            </CardContent>
          </Card>

          {withdrawAmount >= 100 && !insufficientFunds && (
            <div className="px-1 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Montant</span>
                <span className="font-medium">{formatCurrency(withdrawAmount)} XOF</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="font-semibold">Total debite</span>
                <span className="text-xl font-bold" data-testid="text-withdraw-total">{formatCurrency(withdrawAmount)} XOF</span>
              </div>
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold rounded-xl"
            disabled={withdrawMutation.isPending || !amount || parseFloat(amount) < 100 || !phoneNumber || !operator || insufficientFunds}
            data-testid="button-confirm-withdraw"
          >
            {withdrawMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Envoi en cours...
              </>
            ) : (
              `Retirer${withdrawAmount >= 100 ? " " + formatCurrency(withdrawAmount) + " XOF" : ""}`
            )}
          </Button>

          <p className="text-[11px] text-center text-muted-foreground">
            Les fonds seront envoyes directement sur le compte Mobile Money indique.
          </p>
        </form>
      </div>
    </DashboardLayout>
  );
}
