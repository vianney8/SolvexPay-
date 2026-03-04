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
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { OperatorLogo } from "@/components/operator-logo";
import {
  ArrowUpRight, Info, CheckCircle2, AlertTriangle, Loader2, ChevronDown, ArrowLeft, Send, ShieldAlert,
} from "lucide-react";
import { Link } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { Wallet as WalletType } from "@shared/schema";

function formatCurrency(amount: number | string) {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
}

function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(date));
}

const COUNTRIES = [
  { code: "BJ", name: "Bénin", flag: "🇧🇯", prefix: "+229", currency: "XOF", operators: ["MTN", "Moov"], phonePlaceholder: "01 90 12 34 56" },
  { code: "CI", name: "Côte d'Ivoire", flag: "🇨🇮", prefix: "+225", currency: "XOF", operators: ["Orange", "MTN", "Moov", "Wave"], phonePlaceholder: "07 12 34 56 78" },
  { code: "BF", name: "Burkina Faso", flag: "🇧🇫", prefix: "+226", currency: "XOF", operators: ["Moov", "Orange"], phonePlaceholder: "70 12 34 56" },
  { code: "TG", name: "Togo", flag: "🇹🇬", prefix: "+228", currency: "XOF", operators: ["TMoney", "Moov"], phonePlaceholder: "90 12 34 56" },
  { code: "SN", name: "Sénégal", flag: "🇸🇳", prefix: "+221", currency: "XOF", operators: ["Orange", "Wave", "Free"], phonePlaceholder: "77 123 45 67" },
  { code: "ML", name: "Mali", flag: "🇲🇱", prefix: "+223", currency: "XOF", operators: ["Orange", "Moov"], phonePlaceholder: "70 12 34 56" },
  { code: "CM", name: "Cameroun", flag: "🇨🇲", prefix: "+237", currency: "XAF", operators: ["MTN", "Orange"], phonePlaceholder: "6 12 34 56 12" },
  { code: "COD", name: "RD Congo", flag: "🇨🇩", prefix: "+243", currency: "CDF", operators: ["Vodacom", "Airtel", "Orange"], phonePlaceholder: "81 234 56 78" },
  { code: "COG", name: "Congo-Brazza.", flag: "🇨🇬", prefix: "+242", currency: "XAF", operators: ["Airtel", "MTN"], phonePlaceholder: "06 123 45 67" },
];

const OPERATOR_LABEL: Record<string, string> = {
  MTN: "MTN Money", Orange: "Orange Money", Moov: "Moov Money", Wave: "Wave",
  TMoney: "T-Money", Vodacom: "Vodacom M-Pesa", Airtel: "Airtel Money", Free: "Free Money",
};

export default function WithdrawPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [amount, setAmount] = useState("");
  const [country, setCountry] = useState((user as any)?.withdrawalCountry || "BJ");
  const [operator, setOperator] = useState((user as any)?.withdrawalOperator || "");

  function stripPrefix(phone: string) {
    if (!phone) return "";
    for (const c of COUNTRIES) {
      if (phone.startsWith(c.prefix)) return phone.slice(c.prefix.length).trim();
    }
    return phone;
  }
  const [phone, setPhone] = useState(stripPrefix((user as any)?.withdrawalPhone || ""));
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [success, setSuccess] = useState(false);
  const [withdrawRef, setWithdrawRef] = useState("");
  const [kycGateOpen, setKycGateOpen] = useState(false);

  const selectedCountry = COUNTRIES.find(c => c.code === country) || COUNTRIES[0];
  const currency = selectedCountry.currency;

  useEffect(() => { setOperator(""); }, [country]);

  const { data: wallet } = useQuery<WalletType>({ queryKey: ["/api/wallet"] });
  const { data: allTransactions } = useQuery<any[]>({ queryKey: ["/api/transactions"] });
  const { data: paymentMethods } = useQuery<any[]>({ queryKey: ["/api/payment-methods/public"] });
  const { data: serviceFees } = useQuery<{ deposit: number; withdrawal: number; transfer: number }>({ queryKey: ["/api/service-fees"] });

  function getOperatorStatus(op: string) {
    if (!paymentMethods || paymentMethods.length === 0) return { available: true, maintenance: false };
    const pm = paymentMethods.find((m: any) => m.code === op);
    if (!pm) return { available: true, maintenance: false };
    const globalMaint = pm.inMaintenance === true;
    const countryMaint = (pm.maintenanceCountries || []).includes(country);
    return { available: pm.isActive !== false, maintenance: globalMaint || countryMaint };
  }
  const balance = parseFloat(String(wallet?.balanceXOF || 0));
  const withdrawAmount = parseFloat(amount) || 0;
  const feeRate = (serviceFees?.withdrawal ?? 7) / 100;
  const fees = Math.round(withdrawAmount * feeRate);
  const netAmount = withdrawAmount - fees;
  const insufficientFunds = withdrawAmount > balance && withdrawAmount > 0;

  const recentWithdrawals = allTransactions
    ?.filter((t: any) => t.type === "withdrawal")
    .slice(0, 5) || [];

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
      toast({ title: "Retrait initié", description: "Les fonds seront envoyés sur votre Mobile Money." });
    },
    onError: (error: any) => {
      try {
        const parsed = JSON.parse(error.message?.replace(/^\d+:\s*/, "") || "{}");
        if (parsed.kycRequired) { setKycGateOpen(true); return; }
        toast({ title: "Erreur", description: parsed.message || "Impossible d'initier le retrait.", variant: "destructive" });
      } catch {
        toast({ title: "Erreur", description: error.message || "Impossible d'initier le retrait.", variant: "destructive" });
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawAmount || !phone || !operator || !country || insufficientFunds) return;
    const fullPhone = phone.startsWith("+") ? phone : `${selectedCountry.prefix}${phone}`;
    withdrawMutation.mutate({ amount: withdrawAmount, phoneNumber: fullPhone, operator, country });
  };

  if (success) {
    return (
      <DashboardLayout title="" breadcrumbs={[{ label: "Retrait" }]}>
        <div className="max-w-md mx-auto mt-6">
          <Card className="border-border/60 overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-cyan-400 to-blue-500" />
            <CardContent className="pt-10 pb-10 text-center space-y-5">
              <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto shadow-xl">
                <CheckCircle2 className="h-10 w-10 text-white" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold" data-testid="text-withdraw-status">Retrait initié !</h2>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                  Les fonds seront envoyés sur votre compte Mobile Money dans quelques minutes.
                </p>
              </div>
              <div className="bg-muted/40 rounded-2xl p-5 space-y-2 text-sm text-left">
                <div className="flex justify-between"><span className="text-muted-foreground">Montant</span><span className="font-bold">{formatCurrency(withdrawAmount)} {currency}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Opérateur</span><span className="font-semibold flex items-center gap-2"><OperatorLogo operator={operator} size={18} />{OPERATOR_LABEL[operator] || operator}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Pays</span><span className="font-semibold">{selectedCountry.flag} {selectedCountry.name}</span></div>
                {withdrawRef && <div className="flex justify-between"><span className="text-muted-foreground">Référence</span><span className="font-mono text-xs">{withdrawRef}</span></div>}
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link href="/dashboard" className="w-full sm:flex-1">
                  <Button variant="outline" className="w-full h-12 font-semibold text-sm" data-testid="button-back-dashboard">
                    <ArrowLeft className="h-4 w-4 mr-2" /> Tableau de bord
                  </Button>
                </Link>
                <Button
                  className="w-full sm:flex-1 h-12 font-bold shadow-lg shadow-primary/20 bg-primary text-primary-foreground hover:bg-primary/90 text-sm"
                  onClick={() => { setSuccess(false); setAmount(""); setPhone(""); setWithdrawRef(""); setOperator(""); }}
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
      <div className="max-w-md mx-auto space-y-5">
        <div
          className="relative rounded-3xl p-5 text-white overflow-hidden shadow-xl"
          style={{ background: "linear-gradient(135deg, hsl(200 90% 30%) 0%, hsl(210 85% 48%) 60%, hsl(220 80% 52%) 100%)" }}
        >
          <div className="absolute top-0 right-0 w-36 h-36 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                <ArrowUpRight className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-base" data-testid="text-withdraw-title">Retrait Mobile Money</p>
                <p className="text-white/70 text-xs">Envoi vers votre compte</p>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-white/60 text-xs">Solde disponible</p>
              <p className="font-black text-xl" data-testid="text-current-balance">{formatCurrency(balance)} XOF</p>
              {balance > 0 && (
                <button type="button" onClick={() => setAmount(String(Math.floor(balance * 0.99)))} className="text-white/70 text-xs underline hover:text-white mt-0.5" data-testid="button-max-amount">
                  Max
                </button>
              )}
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
                    data-testid="button-select-country"
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
                          data-testid={`option-withdraw-country-${c.code}`}
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
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Opérateur Mobile Money</Label>
                <div className={`grid gap-3 ${selectedCountry.operators.length <= 2 ? "grid-cols-2" : selectedCountry.operators.length === 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4"}`}>
                  {selectedCountry.operators.map((op) => {
                    const opStatus = getOperatorStatus(op);
                    const isDisabled = !opStatus.available || opStatus.maintenance;
                    return (
                      <button
                        key={op}
                        type="button"
                        onClick={() => { if (!isDisabled) setOperator(op); }}
                        disabled={isDisabled}
                        className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-200 ${
                          isDisabled
                            ? "border-border/20 bg-muted/30 opacity-60 cursor-not-allowed"
                            : operator === op
                            ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                            : "border-border/50 hover:border-border bg-card hover:bg-muted/20"
                        }`}
                        data-testid={`option-withdraw-operator-${op}`}
                      >
                        {opStatus.maintenance && (
                          <span className="absolute -top-1.5 -right-1.5 bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none z-10">
                            Maint.
                          </span>
                        )}
                        {!opStatus.available && !opStatus.maintenance && (
                          <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none z-10">
                            Indispo
                          </span>
                        )}
                        <div className={`rounded-2xl overflow-hidden transition-transform ${operator === op ? "scale-110" : ""}`}>
                          <OperatorLogo operator={op} size={52} />
                        </div>
                        <span className={`text-xs font-bold text-center leading-tight ${operator === op ? "text-primary" : isDisabled ? "text-muted-foreground/60" : "text-muted-foreground"}`}>
                          {OPERATOR_LABEL[op] || op}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Numéro de téléphone Mobile Money</Label>
                <div className="flex gap-0 rounded-xl border border-border/70 overflow-hidden focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                  <div className="flex items-center gap-2 px-3 bg-muted/40 border-r border-border/70 flex-shrink-0">
                    <span className="text-base">{selectedCountry.flag}</span>
                    <span className="text-sm font-semibold text-muted-foreground">{selectedCountry.prefix}</span>
                  </div>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9\s]/g, ""))}
                    type="tel"
                    placeholder={selectedCountry.phonePlaceholder}
                    required
                    className="flex-1 h-12 border-0 rounded-none focus-visible:ring-0 bg-transparent"
                    data-testid="input-withdraw-phone"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Montant ({currency})</Label>
                <Input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  type="number"
                  placeholder="Entrez le montant"
                  min="100"
                  max={balance}
                  required
                  className="text-xl font-bold h-14 border-border/70 text-center tracking-wide"
                  data-testid="input-withdraw-amount"
                />
              </div>
            </CardContent>
          </Card>

          {withdrawAmount > 0 && (
            <Card className={`border-border/60 ${insufficientFunds ? "border-destructive/30 bg-destructive/3" : ""}`}>
              <CardContent className="p-4 space-y-2">
                {insufficientFunds && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/5 border border-destructive/20 mb-2">
                    <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-destructive font-semibold">Solde insuffisant. Disponible : {formatCurrency(balance)} XOF</p>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Montant du retrait</span>
                  <span className="font-semibold">{formatCurrency(withdrawAmount)} {currency}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Frais ({Math.round(feeRate * 100)}%)</span>
                  <span className="text-destructive font-medium">- {formatCurrency(fees)} {currency}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">Vous recevrez</span>
                  <span className={`font-black text-xl ${insufficientFunds ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`} data-testid="text-withdraw-total">{formatCurrency(netAmount)} {currency}</span>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex items-start gap-3 p-4 rounded-2xl bg-cyan-500/5 border border-cyan-500/20">
            <Info className="h-4 w-4 text-cyan-600 dark:text-cyan-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Frais de retrait de <strong>{Math.round(feeRate * 100)}%</strong> appliqués sur le montant retiré. Les fonds arrivent automatiquement (max 24h selon l'opérateur).
            </p>
          </div>

          <Button
            type="submit"
            className="w-full h-13 text-base font-bold gap-2 shadow-xl"
            style={{ background: !withdrawAmount || insufficientFunds ? undefined : "linear-gradient(135deg, hsl(200 90% 34%) 0%, hsl(220 80% 52%) 100%)" }}
            variant={insufficientFunds ? "outline" : "default"}
            disabled={withdrawMutation.isPending || !withdrawAmount || !phone || !operator || !country || insufficientFunds}
            data-testid="button-confirm-withdraw"
          >
            {withdrawMutation.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Envoi en cours...</>
            ) : (
              <><Send className="h-4 w-4" /> Retirer {withdrawAmount > 0 ? `${formatCurrency(withdrawAmount)} ${currency}` : ""}</>
            )}
          </Button>
        </form>

        {recentWithdrawals.length > 0 && (
          <div className="space-y-3 pt-2">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Derniers retraits</p>
            <Card className="border-border/60">
              <CardContent className="p-0 divide-y divide-border/40">
                {recentWithdrawals.map((tx: any, i: number) => {
                  const statusColors: Record<string, string> = {
                    completed: "text-emerald-600 dark:text-emerald-400",
                    pending: "text-amber-600 dark:text-amber-400",
                    failed: "text-red-500",
                  };
                  const statusLabels: Record<string, string> = { completed: "Terminé", pending: "En cours", failed: "Échoué" };
                  return (
                    <div key={tx.id || i} className="flex items-center gap-3 px-4 py-3" data-testid={`withdraw-history-row-${i}`}>
                      <div className="h-9 w-9 rounded-xl bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                        <ArrowUpRight className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {tx.provider && tx.provider.toLowerCase() !== "omnipay" ? tx.provider : "Retrait"}
                          {tx.phoneNumber && <span className="ml-2 text-xs font-normal text-muted-foreground">{tx.phoneNumber}</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">{tx.createdAt ? formatDate(tx.createdAt) : ""}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-foreground">-{formatCurrency(tx.amount)} {tx.currency || "XOF"}</p>
                        <p className={`text-xs font-semibold ${statusColors[tx.status] || "text-muted-foreground"}`}>{statusLabels[tx.status] || tx.status}</p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <Dialog open={kycGateOpen} onOpenChange={setKycGateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mx-auto mb-2 shadow-lg">
              <ShieldAlert className="h-7 w-7 text-white" />
            </div>
            <DialogTitle className="text-center">Vérification d'identité requise</DialogTitle>
            <DialogDescription className="text-center">
              Pour effectuer des retraits, votre compte doit être vérifié. Accédez au menu <strong>Vérification KYC</strong> pour soumettre votre dossier.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 mt-2">
            <Link href="/kyc" onClick={() => setKycGateOpen(false)}>
              <Button className="w-full font-bold gap-2 bg-cyan-600 hover:bg-cyan-700 text-white" data-testid="button-kyc-dialog-withdraw">
                <ShieldAlert className="h-4 w-4" /> Vérifier mon identité
              </Button>
            </Link>
            <Button variant="ghost" onClick={() => setKycGateOpen(false)} className="w-full">Fermer</Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
