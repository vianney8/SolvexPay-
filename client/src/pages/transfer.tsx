import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Send, ArrowRight, Wallet, Info, Phone, CheckCircle2, ArrowLeft, Globe2 } from "lucide-react";
import type { Wallet as WalletType } from "@shared/schema";

const countries = [
  { code: "BJ", name: "Bénin", prefix: "+229", flag: "🇧🇯" },
  { code: "CI", name: "Côte d'Ivoire", prefix: "+225", flag: "🇨🇮" },
  { code: "BF", name: "Burkina Faso", prefix: "+226", flag: "🇧🇫" },
  { code: "TG", name: "Togo", prefix: "+228", flag: "🇹🇬" },
  { code: "SN", name: "Sénégal", prefix: "+221", flag: "🇸🇳" },
  { code: "ML", name: "Mali", prefix: "+223", flag: "🇲🇱" },
  { code: "NE", name: "Niger", prefix: "+227", flag: "🇳🇪" },
  { code: "GW", name: "Guinée-Bissau", prefix: "+245", flag: "🇬🇼" },
  { code: "NG", name: "Nigeria", prefix: "+234", flag: "🇳🇬" },
  { code: "GH", name: "Ghana", prefix: "+233", flag: "🇬🇭" },
  { code: "KE", name: "Kenya", prefix: "+254", flag: "🇰🇪" },
  { code: "CM", name: "Cameroun", prefix: "+237", flag: "🇨🇲" },
  { code: "CD", name: "RD Congo", prefix: "+243", flag: "🇨🇩" },
  { code: "CG", name: "Congo-Brazzaville", prefix: "+242", flag: "🇨🇬" },
  { code: "GN", name: "Guinée", prefix: "+224", flag: "🇬🇳" },
  { code: "GA", name: "Gabon", prefix: "+241", flag: "🇬🇦" },
  { code: "MA", name: "Maroc", prefix: "+212", flag: "🇲🇦" },
];

const operators = [
  { id: "mtn", name: "MTN Mobile Money", color: "bg-yellow-400" },
  { id: "orange", name: "Orange Money", color: "bg-orange-500" },
  { id: "wave", name: "Wave", color: "bg-blue-500" },
  { id: "moov", name: "Moov Money", color: "bg-purple-500" },
  { id: "free", name: "Free Money", color: "bg-emerald-500" },
  { id: "airtel", name: "Airtel Money", color: "bg-red-500" },
  { id: "tmoney", name: "T-Money", color: "bg-cyan-500" },
];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount) + " XOF";
}

export default function TransferPage() {
  const { toast } = useToast();
  const [destinationCountry, setDestinationCountry] = useState("BJ");
  const [operator, setOperator] = useState("mtn");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<"form" | "confirm">("form");

  const { data: wallet } = useQuery<WalletType>({ queryKey: ["/api/wallet"] });

  const transferMutation = useMutation({
    mutationFn: async (data: { amount: number; phoneNumber: string; operator: string; country: string; firstName: string; lastName: string }) => {
      return apiRequest("POST", "/api/transactions/transfer", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      toast({ title: "Transfert initié", description: "Votre transfert a été envoyé avec succès." });
      setStep("form");
      setAmount("");
      setPhoneNumber("");
      setRecipientName("");
    },
    onError: (error: any) => {
      toast({ title: "Erreur", description: error?.message || "Impossible d'effectuer le transfert.", variant: "destructive" });
    },
  });

  const selectedCountry = countries.find(c => c.code === destinationCountry);
  const selectedOperator = operators.find(p => p.id === operator);
  const parsedAmount = parseFloat(amount) || 0;
  const fees = parsedAmount * 0.02;
  const totalDebit = parsedAmount + fees;
  const balanceXOF = parseFloat(wallet?.balanceXOF || "0");

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parsedAmount < 500) {
      toast({ title: "Erreur", description: "Le montant minimum est de 500 XOF", variant: "destructive" });
      return;
    }
    if (!phoneNumber || phoneNumber.length < 8) {
      toast({ title: "Erreur", description: "Numéro de téléphone invalide", variant: "destructive" });
      return;
    }
    if (totalDebit > balanceXOF) {
      toast({ title: "Solde insuffisant", description: "Votre solde est insuffisant pour ce transfert.", variant: "destructive" });
      return;
    }
    setStep("confirm");
  };

  const handleConfirm = () => {
    const nameParts = recipientName.trim().split(" ");
    const firstName = nameParts[0] || recipientName;
    const lastName = nameParts.slice(1).join(" ") || ".";
    transferMutation.mutate({
      amount: parsedAmount,
      phoneNumber: `${selectedCountry?.prefix}${phoneNumber}`.replace("+", ""),
      operator,
      country: destinationCountry,
      firstName,
      lastName,
    });
  };

  return (
    <DashboardLayout title="Transfert d'argent" breadcrumbs={[{ label: "Transfert" }]}>
      <div className="max-w-2xl mx-auto space-y-6">
        <div
          className="relative rounded-3xl p-6 text-white overflow-hidden shadow-xl"
          style={{ background: "linear-gradient(135deg, hsl(262 83% 52%) 0%, hsl(280 70% 60%) 100%)" }}
        >
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
          <div className="relative flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-white/15 flex items-center justify-center">
                <Send className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Envoyer de l'argent</h3>
                <p className="text-white/70 text-sm">Transfert international Mobile Money</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-white/60 text-xs font-medium">Solde disponible</p>
              <p className="font-black text-2xl" data-testid="text-transfer-balance">{formatCurrency(balanceXOF)}</p>
            </div>
          </div>
        </div>

        {step === "form" && (
          <form onSubmit={handleContinue} className="space-y-5">
            <Card className="border-border/60">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Globe2 className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold">Destination</CardTitle>
                    <CardDescription className="text-xs">Pays et opérateur du destinataire</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pays de destination</Label>
                  <Select value={destinationCountry} onValueChange={setDestinationCountry}>
                    <SelectTrigger className="h-11 border-border/70" data-testid="select-transfer-country">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          <span className="flex items-center gap-2">
                            <span>{c.flag}</span>
                            <span>{c.name}</span>
                            <span className="text-muted-foreground text-xs">({c.prefix})</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Opérateur Mobile Money</Label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {operators.map((op) => (
                      <button
                        key={op.id}
                        type="button"
                        onClick={() => setOperator(op.id)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-xs font-semibold ${
                          operator === op.id
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border/60 text-muted-foreground hover:border-border hover:bg-muted/30"
                        }`}
                        data-testid={`option-operator-${op.id}`}
                      >
                        <div className={`h-5 w-5 rounded-full ${op.color}`} />
                        <span className="text-center leading-tight">{op.name.split(" ")[0]}</span>
                      </button>
                    ))}
                  </div>
                  <input type="hidden" name="operator" value={operator} data-testid="select-transfer-operator" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Phone className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold">Destinataire</CardTitle>
                    <CardDescription className="text-xs">Informations du bénéficiaire</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nom complet du destinataire</Label>
                  <Input
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Nom Prénom"
                    required
                    className="h-11 border-border/70"
                    data-testid="input-transfer-recipient"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Numéro de téléphone</Label>
                  <div className="flex gap-2">
                    <div className="flex items-center gap-1.5 px-3 border border-border/70 rounded-lg bg-muted/40 text-sm font-semibold flex-shrink-0 h-11">
                      <span>{selectedCountry?.flag}</span>
                      <span className="text-muted-foreground">{selectedCountry?.prefix}</span>
                    </div>
                    <Input
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                      placeholder="97 00 00 00"
                      type="tel"
                      required
                      className="flex-1 h-11 border-border/70"
                      data-testid="input-transfer-phone"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Wallet className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold">Montant</CardTitle>
                    <CardDescription className="text-xs">Saisissez le montant à envoyer</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Montant (XOF)</Label>
                  <Input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    type="number"
                    placeholder="10 000"
                    min="500"
                    required
                    className="h-11 border-border/70 text-lg font-bold"
                    data-testid="input-transfer-amount"
                  />
                  <p className="text-xs text-muted-foreground">Montant minimum : 500 XOF</p>
                </div>

                {parsedAmount > 0 && (
                  <div className="bg-muted/40 rounded-2xl p-4 space-y-3 border border-border/40">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Montant envoyé</span>
                      <span className="font-semibold">{formatCurrency(parsedAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Frais (2%)</span>
                      <span className="text-destructive font-medium">+ {formatCurrency(fees)}</span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">Total débité</span>
                      <span className="font-black text-lg text-foreground" data-testid="text-transfer-total">{formatCurrency(totalDebit)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20">
              <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Des frais de transfert de <strong>2%</strong> sont appliqués. Les délais dépendent de l'opérateur et du pays de destination.
              </p>
            </div>

            <Button type="submit" className="w-full h-12 gap-2 text-base font-bold shadow-lg shadow-primary/20" data-testid="button-continue-transfer">
              Continuer vers la confirmation
              <ArrowRight className="h-5 w-5" />
            </Button>
          </form>
        )}

        {step === "confirm" && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setStep("form")}
                className="h-9 w-9 rounded-xl border border-border/70 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <h2 className="font-bold text-lg">Confirmation du transfert</h2>
                <p className="text-xs text-muted-foreground">Vérifiez les informations avant d'envoyer</p>
              </div>
            </div>

            <Card className="border-border/60">
              <CardContent className="p-6 space-y-4">
                {[
                  { label: "Destinataire", value: recipientName, testid: "text-confirm-recipient" },
                  { label: "Téléphone", value: `${selectedCountry?.prefix} ${phoneNumber}`, testid: "text-confirm-phone" },
                  { label: "Pays", value: `${selectedCountry?.flag} ${selectedCountry?.name}` },
                  { label: "Opérateur", value: selectedOperator?.name },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-4 py-2">
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                    <span className="font-semibold text-sm text-right" data-testid={item.testid}>{item.value}</span>
                  </div>
                ))}

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-muted-foreground">Montant envoyé</span>
                    <span className="font-semibold text-sm">{formatCurrency(parsedAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-muted-foreground">Frais (2%)</span>
                    <span className="text-sm text-destructive font-medium">+ {formatCurrency(fees)}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-bold text-base">Total débité</span>
                    <span className="font-black text-xl">{formatCurrency(totalDebit)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-start gap-3 p-4 rounded-2xl bg-violet-500/5 border border-violet-500/20">
              <CheckCircle2 className="h-4 w-4 text-violet-600 dark:text-violet-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                En confirmant, vous autorisez SolvexPay à débiter <strong>{formatCurrency(totalDebit)}</strong> de votre portefeuille.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 h-12 font-semibold border-border/70"
                onClick={() => setStep("form")}
                disabled={transferMutation.isPending}
                data-testid="button-back-transfer"
              >
                Modifier
              </Button>
              <Button
                className="flex-1 h-12 gap-2 font-bold shadow-lg shadow-primary/20"
                onClick={handleConfirm}
                disabled={transferMutation.isPending}
                data-testid="button-confirm-transfer"
              >
                <Send className="h-4 w-4" />
                {transferMutation.isPending ? "Envoi en cours..." : "Confirmer l'envoi"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
