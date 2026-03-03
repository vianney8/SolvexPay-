import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { OperatorLogo } from "@/components/operator-logo";
import {
  Send, Info, CheckCircle2, AlertTriangle, Loader2, ChevronDown, ArrowLeft, Zap,
} from "lucide-react";
import { Link } from "wouter";
import type { Wallet as WalletType } from "@shared/schema";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

const COUNTRIES = [
  { code: "BJ", name: "Bénin", flag: "🇧🇯", prefix: "+229", currency: "XOF", operators: ["MTN", "Moov"] },
  { code: "CI", name: "Côte d'Ivoire", flag: "🇨🇮", prefix: "+225", currency: "XOF", operators: ["Orange", "MTN", "Moov", "Wave"] },
  { code: "BF", name: "Burkina Faso", flag: "🇧🇫", prefix: "+226", currency: "XOF", operators: ["Moov", "Orange"] },
  { code: "TG", name: "Togo", flag: "🇹🇬", prefix: "+228", currency: "XOF", operators: ["TMoney", "Moov"] },
  { code: "SN", name: "Sénégal", flag: "🇸🇳", prefix: "+221", currency: "XOF", operators: ["Orange", "Wave", "Free"] },
  { code: "ML", name: "Mali", flag: "🇲🇱", prefix: "+223", currency: "XOF", operators: ["Orange", "Moov"] },
  { code: "CM", name: "Cameroun", flag: "🇨🇲", prefix: "+237", currency: "XAF", operators: ["MTN", "Orange"] },
  { code: "COD", name: "RD Congo", flag: "🇨🇩", prefix: "+243", currency: "CDF", operators: ["Vodacom", "Airtel", "Orange"] },
  { code: "COG", name: "Congo-Brazza.", flag: "🇨🇬", prefix: "+242", currency: "XAF", operators: ["Airtel", "MTN"] },
];

const OPERATOR_LABEL: Record<string, string> = {
  MTN: "MTN Money", Orange: "Orange Money", Moov: "Moov Money", Wave: "Wave",
  TMoney: "T-Money", Vodacom: "Vodacom M-Pesa", Airtel: "Airtel Money", Free: "Free Money",
};

export default function TransferPage() {
  const { toast } = useToast();
  const [country, setCountry] = useState("BJ");
  const [operator, setOperator] = useState("");
  const [phone, setPhone] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [amount, setAmount] = useState("");
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [success, setSuccess] = useState(false);

  const selectedCountry = COUNTRIES.find(c => c.code === country)!;

  useEffect(() => { setOperator(""); }, [country]);

  const { data: wallet } = useQuery<WalletType>({ queryKey: ["/api/wallet"] });
  const balance = parseFloat(String(wallet?.balanceXOF || 0));
  const transferAmount = parseFloat(amount) || 0;
  const fees = transferAmount * 0.01;
  const totalDebit = transferAmount + fees;
  const insufficientFunds = totalDebit > balance && transferAmount > 0;

  const transferMutation = useMutation({
    mutationFn: async (data: { amount: number; phoneNumber: string; operator: string; country: string; firstName?: string; lastName?: string }) => {
      const res = await apiRequest("POST", "/api/transactions/transfer", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setSuccess(true);
    },
    onError: (error: any) => {
      toast({ title: "Erreur", description: error.message || "Impossible d'initier le transfert.", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferAmount || !phone || !operator || !country || insufficientFunds) return;
    const fullPhone = phone.startsWith("+") ? phone : `${selectedCountry.prefix}${phone}`;
    const nameParts = recipientName.trim().split(" ");
    transferMutation.mutate({
      amount: transferAmount,
      phoneNumber: fullPhone,
      operator,
      country,
      firstName: nameParts[0] || undefined,
      lastName: nameParts.slice(1).join(" ") || undefined,
    });
  };

  if (success) {
    return (
      <DashboardLayout title="" breadcrumbs={[{ label: "Transfert" }]}>
        <div className="max-w-md mx-auto mt-6">
          <Card className="border-border/60 overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-cyan-400 to-blue-500" />
            <CardContent className="pt-10 pb-10 text-center space-y-5">
              <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mx-auto shadow-xl">
                <CheckCircle2 className="h-10 w-10 text-white" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold" data-testid="text-transfer-status">Transfert initié !</h2>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                  Le bénéficiaire recevra les fonds immédiatement sur son compte Mobile Money.
                </p>
              </div>
              <div className="bg-muted/40 rounded-2xl p-5 space-y-2 text-sm text-left">
                <div className="flex justify-between"><span className="text-muted-foreground">Montant</span><span className="font-bold">{formatCurrency(transferAmount)} XOF</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Opérateur</span><span className="font-semibold flex items-center gap-1.5"><OperatorLogo operator={operator} size={18} />{OPERATOR_LABEL[operator] || operator}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Pays</span><span className="font-semibold">{selectedCountry.flag} {selectedCountry.name}</span></div>
                {recipientName && <div className="flex justify-between"><span className="text-muted-foreground">Bénéficiaire</span><span className="font-semibold">{recipientName}</span></div>}
              </div>
              <div className="flex gap-3 pt-2">
                <Link href="/dashboard" className="flex-1">
                  <Button variant="outline" className="w-full h-11 font-semibold" data-testid="button-back-dashboard">
                    <ArrowLeft className="h-4 w-4 mr-1.5" /> Tableau de bord
                  </Button>
                </Link>
                <Button
                  className="flex-1 h-11 font-bold"
                  onClick={() => { setSuccess(false); setAmount(""); setPhone(""); setRecipientName(""); setOperator(""); }}
                  data-testid="button-new-transfer"
                >
                  Nouveau transfert
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="" breadcrumbs={[{ label: "Transfert" }]}>
      <div className="max-w-md mx-auto space-y-5">
        <div
          className="relative rounded-3xl p-5 text-white overflow-hidden shadow-xl"
          style={{ background: "linear-gradient(135deg, hsl(200 90% 30%) 0%, hsl(210 85% 48%) 60%, hsl(220 80% 52%) 100%)" }}
        >
          <div className="absolute top-0 right-0 w-36 h-36 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                <Send className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-base" data-testid="text-transfer-title">Transfert Mobile Money</p>
                <p className="text-white/70 text-xs">Envoi vers un bénéficiaire</p>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-white/60 text-xs">Solde</p>
              <p className="font-black text-xl" data-testid="text-transfer-balance">{formatCurrency(balance)} XOF</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Card className="border-border/60">
            <CardContent className="p-5 space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pays de destination</Label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowCountryPicker(!showCountryPicker)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border/70 bg-background hover:bg-muted/30 transition-colors"
                    data-testid="button-select-transfer-country"
                  >
                    <span className="text-xl">{selectedCountry.flag}</span>
                    <span className="flex-1 text-left font-semibold text-sm">{selectedCountry.name}</span>
                    <Badge variant="secondary" className="text-xs font-mono">{selectedCountry.currency}</Badge>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showCountryPicker ? "rotate-180" : ""}`} />
                  </button>
                  {showCountryPicker && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                      {COUNTRIES.map((c) => (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => { setCountry(c.code); setShowCountryPicker(false); }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors ${country === c.code ? "bg-primary/5 text-primary font-semibold" : "text-foreground"}`}
                          data-testid={`option-transfer-country-${c.code}`}
                        >
                          <span className="text-lg">{c.flag}</span>
                          <span className="flex-1 text-left">{c.name}</span>
                          <span className="text-xs text-muted-foreground font-mono">{c.prefix}</span>
                          {country === c.code && <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Opérateur du bénéficiaire</Label>
                <div className={`grid gap-3 ${selectedCountry.operators.length <= 2 ? "grid-cols-2" : selectedCountry.operators.length === 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4"}`}>
                  {selectedCountry.operators.map((op) => (
                    <button
                      key={op}
                      type="button"
                      onClick={() => setOperator(op)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-200 ${
                        operator === op
                          ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                          : "border-border/50 hover:border-border bg-card hover:bg-muted/20"
                      }`}
                      data-testid={`option-transfer-operator-${op}`}
                    >
                      <div className={`rounded-2xl overflow-hidden transition-transform ${operator === op ? "scale-110" : ""}`}>
                        <OperatorLogo operator={op} size={52} />
                      </div>
                      <span className={`text-xs font-bold text-center leading-tight ${operator === op ? "text-primary" : "text-muted-foreground"}`}>
                        {OPERATOR_LABEL[op] || op}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Numéro Mobile Money du bénéficiaire</Label>
                <div className="flex gap-0 rounded-xl border border-border/70 overflow-hidden focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                  <div className="flex items-center gap-2 px-3 bg-muted/40 border-r border-border/70 flex-shrink-0">
                    <span className="text-base">{selectedCountry.flag}</span>
                    <span className="text-sm font-semibold text-muted-foreground">{selectedCountry.prefix}</span>
                  </div>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9\s]/g, ""))}
                    type="tel"
                    placeholder="90 12 34 56"
                    required
                    className="flex-1 h-12 border-0 rounded-none focus-visible:ring-0 bg-transparent"
                    data-testid="input-transfer-phone"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nom du bénéficiaire (optionnel)</Label>
                <Input
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Jean Dupont"
                  className="h-11 border-border/70"
                  data-testid="input-transfer-name"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Montant (XOF)</Label>
                <Input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  type="number"
                  placeholder="Entrez le montant"
                  min="100"
                  required
                  className="text-xl font-bold h-14 border-border/70 text-center tracking-wide"
                  data-testid="input-transfer-amount"
                />
              </div>
            </CardContent>
          </Card>

          {transferAmount > 0 && (
            <Card className={`border-border/60 ${insufficientFunds ? "border-destructive/30" : ""}`}>
              <CardContent className="p-4 space-y-2">
                {insufficientFunds && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/5 border border-destructive/20 mb-2">
                    <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-destructive font-semibold">Solde insuffisant. Disponible : {formatCurrency(balance)} XOF</p>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Montant envoyé</span>
                  <span className="font-semibold">{formatCurrency(transferAmount)} XOF</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Frais (1%)</span>
                  <span className="text-destructive font-medium">+ {formatCurrency(fees)} XOF</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">Total débité</span>
                  <span className={`font-black text-xl ${insufficientFunds ? "text-destructive" : ""}`} data-testid="text-transfer-total">{formatCurrency(totalDebit)} XOF</span>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Frais de <strong>1%</strong> appliqués. Le bénéficiaire reçoit les fonds instantanément.
            </p>
          </div>

          <Button
            type="submit"
            className="w-full h-13 text-base font-bold gap-2 shadow-xl"
            style={{ background: !transferAmount || insufficientFunds ? undefined : "linear-gradient(135deg, hsl(200 90% 34%) 0%, hsl(220 80% 52%) 100%)" }}
            disabled={transferMutation.isPending || !transferAmount || !phone || !operator || !country || insufficientFunds}
            data-testid="button-confirm-transfer"
          >
            {transferMutation.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Envoi en cours...</>
            ) : (
              <><Zap className="h-4 w-4" /> Transférer {transferAmount > 0 ? `${formatCurrency(transferAmount)} XOF` : ""}</>
            )}
          </Button>
        </form>
      </div>
    </DashboardLayout>
  );
}
