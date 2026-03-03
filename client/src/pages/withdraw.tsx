import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  ArrowUpRight, Wallet, Info, CheckCircle2, AlertTriangle, Phone, Globe2, Loader2, ArrowLeft, Send,
} from "lucide-react";
import { Link } from "wouter";
import type { Wallet as WalletType } from "@shared/schema";

function formatCurrency(amount: number, currency = "XOF") {
  return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

const COUNTRIES = [
  { code: "BJ", name: "Bénin", flag: "🇧🇯", currency: "XOF", operators: ["MTN", "Moov"] },
  { code: "BF", name: "Burkina Faso", flag: "🇧🇫", currency: "XOF", operators: ["Moov", "Orange"] },
  { code: "TG", name: "Togo", flag: "🇹🇬", currency: "XOF", operators: ["TMoney", "Moov"] },
  { code: "CM", name: "Cameroun", flag: "🇨🇲", currency: "XAF", operators: ["MTN", "Orange"] },
  { code: "CI", name: "Côte d'Ivoire", flag: "🇨🇮", currency: "XOF", operators: ["Orange", "MTN", "Moov", "Wave"] },
  { code: "COD", name: "RD Congo", flag: "🇨🇩", currency: "CDF", operators: ["Vodacom", "Airtel", "Orange"] },
  { code: "COG", name: "Congo-Brazzaville", flag: "🇨🇬", currency: "XAF", operators: ["Airtel", "MTN"] },
];

const OPERATOR_COLORS: Record<string, string> = {
  MTN: "from-yellow-400 to-yellow-600",
  Orange: "from-orange-400 to-orange-600",
  Wave: "from-blue-400 to-blue-600",
  Moov: "from-purple-400 to-purple-600",
  TMoney: "from-cyan-400 to-cyan-600",
  Vodacom: "from-red-400 to-red-600",
  Airtel: "from-red-500 to-red-700",
};

export default function WithdrawPage() {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [country, setCountry] = useState("BJ");
  const [operator, setOperator] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [success, setSuccess] = useState(false);
  const [withdrawRef, setWithdrawRef] = useState("");

  const selectedCountry = COUNTRIES.find(c => c.code === country);
  const currency = selectedCountry?.currency || "XOF";
  const availableOperators = selectedCountry?.operators || [];

  useEffect(() => { setOperator(""); }, [country]);

  const { data: wallet } = useQuery<WalletType>({ queryKey: ["/api/wallet"] });

  const balance = parseFloat(String(wallet?.balanceXOF || 0));
  const withdrawAmount = parseFloat(amount) || 0;
  const insufficientFunds = withdrawAmount > balance && withdrawAmount > 0;
  const fees = withdrawAmount * 0.01;
  const totalDebit = withdrawAmount + fees;

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
      toast({ title: "Retrait initié", description: "Les fonds seront envoyés sur votre compte Mobile Money." });
    },
    onError: (error: any) => {
      toast({ title: "Erreur", description: error.message || "Impossible d'initier le retrait.", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !phoneNumber || !operator || !country || insufficientFunds) return;
    withdrawMutation.mutate({ amount: withdrawAmount, phoneNumber, operator, country });
  };

  if (success) {
    return (
      <DashboardLayout title="" breadcrumbs={[{ label: "Retrait" }]}>
        <div className="max-w-md mx-auto space-y-5 mt-4">
          <Card className="border-border/60 overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-orange-400 to-rose-500" />
            <CardContent className="pt-10 pb-10 text-center space-y-5">
              <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto shadow-xl">
                <CheckCircle2 className="h-10 w-10 text-white" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold" data-testid="text-withdraw-status">Retrait initié !</h2>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                  Les fonds seront envoyés sur le compte Mobile Money dans quelques minutes.
                </p>
              </div>
              <div className="bg-muted/40 rounded-2xl p-4 space-y-2 text-sm text-left">
                <div className="flex justify-between"><span className="text-muted-foreground">Montant</span><span className="font-bold">{formatCurrency(withdrawAmount)} XOF</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Téléphone</span><span className="font-semibold">{phoneNumber}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Opérateur</span><span className="font-semibold">{operator}</span></div>
                {withdrawRef && <div className="flex justify-between"><span className="text-muted-foreground">Référence</span><span className="font-mono text-xs">{withdrawRef}</span></div>}
              </div>
              <div className="flex gap-3 pt-2">
                <Link href="/dashboard" className="flex-1">
                  <Button variant="outline" className="w-full h-11 font-semibold border-border/70" data-testid="button-back-dashboard">
                    <ArrowLeft className="h-4 w-4 mr-1.5" />
                    Tableau de bord
                  </Button>
                </Link>
                <Button
                  className="flex-1 h-11 font-semibold shadow-lg shadow-primary/20"
                  onClick={() => { setSuccess(false); setAmount(""); setPhoneNumber(""); setWithdrawRef(""); setOperator(""); }}
                  data-testid="button-new-withdraw"
                >
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
    <DashboardLayout title="" breadcrumbs={[{ label: "Retrait" }]}>
      <div className="max-w-lg mx-auto space-y-5">
        <div
          className="relative rounded-3xl p-6 text-white overflow-hidden shadow-xl"
          style={{ background: "linear-gradient(135deg, hsl(24 90% 38%) 0%, hsl(24 90% 50%) 50%, hsl(38 92% 50%) 100%)" }}
        >
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-28 h-28 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/2" />
          <div className="relative flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-white/15 flex items-center justify-center">
                <ArrowUpRight className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg" data-testid="text-withdraw-title">Effectuer un retrait</h3>
                <p className="text-white/70 text-sm">Envoi vers Mobile Money</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-white/60 text-xs font-medium">Solde disponible</p>
              <p className="font-black text-2xl" data-testid="text-current-balance">
                {formatCurrency(balance)} XOF
              </p>
              {balance > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(String(Math.floor(balance)))}
                  className="text-white/70 text-xs underline hover:text-white transition-colors mt-0.5"
                  data-testid="button-max-amount"
                >
                  Retirer le max
                </button>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <Wallet className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold">Montant du retrait</CardTitle>
                  <CardDescription className="text-xs">Saisissez le montant à retirer</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Montant (XOF)</Label>
                <Input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  type="number"
                  placeholder="Saisissez le montant"
                  min="100"
                  max={balance}
                  required
                  className="text-lg font-bold h-12 border-border/70"
                  data-testid="input-withdraw-amount"
                />
              </div>

              {insufficientFunds && (
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-destructive/5 border border-destructive/20">
                  <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-destructive font-medium">
                    Solde insuffisant. Votre solde est de {formatCurrency(balance)} XOF.
                  </p>
                </div>
              )}

              {withdrawAmount > 0 && !insufficientFunds && (
                <div className="bg-orange-500/5 border border-orange-500/20 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Montant retiré</span>
                    <span className="font-semibold">{formatCurrency(withdrawAmount)} {currency}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Frais (1%)</span>
                    <span className="text-destructive font-medium">+ {formatCurrency(fees)} {currency}</span>
                  </div>
                  <Separator className="bg-orange-500/10" />
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">Total débité</span>
                    <span className="font-black text-xl" data-testid="text-withdraw-total">{formatCurrency(totalDebit)} {currency}</span>
                  </div>
                  {totalDebit > balance && (
                    <p className="text-xs text-destructive font-medium">⚠ Le total avec frais dépasse votre solde</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <Globe2 className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold">Pays et opérateur</CardTitle>
                  <CardDescription className="text-xs">Sélectionnez le pays de destination</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {COUNTRIES.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => setCountry(c.code)}
                    className={`flex items-center gap-2 p-3 rounded-xl border-2 text-xs font-semibold transition-all ${
                      country === c.code
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border/60 text-muted-foreground hover:border-border hover:bg-muted/30"
                    }`}
                    data-testid={`option-withdraw-country-${c.code}`}
                  >
                    <span className="text-base">{c.flag}</span>
                    <span className="truncate">{c.name}</span>
                  </button>
                ))}
              </div>

              {availableOperators.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Opérateur Mobile Money</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {availableOperators.map((op) => (
                      <button
                        key={op}
                        type="button"
                        onClick={() => setOperator(op)}
                        className={`flex items-center gap-3 p-3.5 rounded-xl border-2 text-sm font-bold transition-all ${
                          operator === op
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border/60 text-muted-foreground hover:border-border hover:bg-muted/30"
                        }`}
                        data-testid={`option-withdraw-operator-${op}`}
                      >
                        <div className={`h-7 w-7 rounded-lg bg-gradient-to-br ${OPERATOR_COLORS[op] || "from-gray-400 to-gray-600"} flex-shrink-0`} />
                        <span>{op}</span>
                        {operator === op && <CheckCircle2 className="h-4 w-4 ml-auto text-primary flex-shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Phone className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold">Compte destinataire</CardTitle>
                  <CardDescription className="text-xs">Numéro Mobile Money à créditer</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Numéro de téléphone</Label>
                <Input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  type="tel"
                  placeholder="+229 97 00 00 00"
                  required
                  className="h-11 border-border/70"
                  data-testid="input-withdraw-phone"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex items-start gap-3 p-4 rounded-2xl bg-orange-500/5 border border-orange-500/20">
            <Info className="h-4 w-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Les fonds seront envoyés directement sur le compte Mobile Money indiqué. Des frais de <strong>1%</strong> sont appliqués. Délai de traitement : quelques minutes à 24h.
            </p>
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-base font-bold gap-2"
            style={{ background: !withdrawAmount || insufficientFunds ? undefined : "linear-gradient(135deg, hsl(24 90% 42%) 0%, hsl(38 92% 50%) 100%)" }}
            variant={!withdrawAmount || insufficientFunds ? "outline" : "default"}
            disabled={withdrawMutation.isPending || !amount || !phoneNumber || !operator || !country || insufficientFunds}
            data-testid="button-confirm-withdraw"
          >
            {withdrawMutation.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Envoi en cours...</>
            ) : (
              <><Send className="h-4 w-4" /> Retirer {withdrawAmount > 0 ? `${formatCurrency(withdrawAmount)} ${currency}` : ""}</>
            )}
          </Button>
        </form>
      </div>
    </DashboardLayout>
  );
}
