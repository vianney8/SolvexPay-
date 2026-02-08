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
import {
  Send, ArrowRight, Globe, Wallet, Info, Phone,
} from "lucide-react";
import type { Wallet as WalletType } from "@shared/schema";

const countries = [
  { code: "BJ", name: "Benin", flag: "BJ", prefix: "+229", currency: "XOF" },
  { code: "CI", name: "Cote d'Ivoire", flag: "CI", prefix: "+225", currency: "XOF" },
  { code: "BF", name: "Burkina Faso", flag: "BF", prefix: "+226", currency: "XOF" },
  { code: "TG", name: "Togo", flag: "TG", prefix: "+228", currency: "XOF" },
  { code: "SN", name: "Senegal", flag: "SN", prefix: "+221", currency: "XOF" },
  { code: "ML", name: "Mali", flag: "ML", prefix: "+223", currency: "XOF" },
  { code: "NE", name: "Niger", flag: "NE", prefix: "+227", currency: "XOF" },
  { code: "GW", name: "Guinee-Bissau", flag: "GW", prefix: "+245", currency: "XOF" },
  { code: "NG", name: "Nigeria", flag: "NG", prefix: "+234", currency: "XOF" },
  { code: "GH", name: "Ghana", flag: "GH", prefix: "+233", currency: "XOF" },
  { code: "KE", name: "Kenya", flag: "KE", prefix: "+254", currency: "XOF" },
];

const providers = [
  { id: "mtn", name: "MTN Mobile Money" },
  { id: "orange", name: "Orange Money" },
  { id: "wave", name: "Wave" },
  { id: "moov", name: "Moov Money" },
  { id: "free", name: "Free Money" },
  { id: "airtel", name: "Airtel Money" },
];

function formatCurrency(amount: number, currency = "XOF") {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + ` ${currency}`;
}

export default function TransferPage() {
  const { toast } = useToast();
  const [destinationCountry, setDestinationCountry] = useState("BJ");
  const [provider, setProvider] = useState("mtn");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<"form" | "confirm">("form");

  const { data: wallet } = useQuery<WalletType>({
    queryKey: ["/api/wallet"],
  });

  const transferMutation = useMutation({
    mutationFn: async (data: { amount: number; currency: string; provider: string; phoneNumber: string }) => {
      return apiRequest("POST", "/api/transactions/withdraw", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      toast({
        title: "Transfert initie",
        description: "Votre transfert a ete envoye avec succes.",
      });
      setStep("form");
      setAmount("");
      setPhoneNumber("");
      setRecipientName("");
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error?.message || "Impossible d'effectuer le transfert.",
        variant: "destructive",
      });
    },
  });

  const selectedCountry = countries.find(c => c.code === destinationCountry);
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
      toast({ title: "Erreur", description: "Numero de telephone invalide", variant: "destructive" });
      return;
    }
    if (totalDebit > balanceXOF) {
      toast({ title: "Solde insuffisant", description: "Votre solde est insuffisant pour ce transfert.", variant: "destructive" });
      return;
    }
    setStep("confirm");
  };

  const handleConfirm = () => {
    transferMutation.mutate({
      amount: parsedAmount,
      currency: selectedCountry?.currency || "XOF",
      provider,
      phoneNumber: `${selectedCountry?.prefix}${phoneNumber}`,
    });
  };

  return (
    <DashboardLayout title="Transfert d'argent" breadcrumbs={[{ label: "Transfert" }]}>
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardContent className="pt-6 pb-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center flex-shrink-0">
                <Send className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg">Envoyer de l'argent</h3>
                <p className="text-sm text-muted-foreground">Transferez des fonds vers un autre pays africain</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Solde disponible</p>
                <p className="font-bold text-lg" data-testid="text-transfer-balance">{formatCurrency(balanceXOF)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {step === "form" && (
          <form onSubmit={handleContinue} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Destination</CardTitle>
                <CardDescription>Choisissez le pays et l'operateur du destinataire</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Pays de destination</Label>
                  <Select value={destinationCountry} onValueChange={setDestinationCountry}>
                    <SelectTrigger data-testid="select-transfer-country">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.name} ({c.prefix})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Operateur Mobile Money</Label>
                  <Select value={provider} onValueChange={setProvider}>
                    <SelectTrigger data-testid="select-transfer-provider">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {providers.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Destinataire</CardTitle>
                <CardDescription>Informations sur la personne qui recevra le transfert</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="recipient-name">Nom du destinataire</Label>
                  <Input
                    id="recipient-name"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Nom complet du destinataire"
                    required
                    data-testid="input-transfer-recipient"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone-number">Numero de telephone</Label>
                  <div className="flex gap-2">
                    <div className="flex items-center gap-1 px-3 border rounded-md bg-muted text-sm font-medium min-w-fit flex-shrink-0">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      {selectedCountry?.prefix}
                    </div>
                    <Input
                      id="phone-number"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                      placeholder="97 00 00 00"
                      type="tel"
                      required
                      data-testid="input-transfer-phone"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Montant</CardTitle>
                <CardDescription>Saisissez le montant a envoyer en {selectedCountry?.currency || "XOF"}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="transfer-amount">Montant ({selectedCountry?.currency || "XOF"})</Label>
                  <Input
                    id="transfer-amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    type="number"
                    placeholder="10 000"
                    min="500"
                    required
                    data-testid="input-transfer-amount"
                  />
                </div>

                {parsedAmount > 0 && (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <span className="text-sm text-muted-foreground">Montant envoye</span>
                      <span className="font-medium">{formatCurrency(parsedAmount, selectedCountry?.currency)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <span className="text-sm text-muted-foreground">Frais de transfert (2%)</span>
                      <span className="text-sm text-destructive">+ {formatCurrency(fees, selectedCountry?.currency)}</span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <span className="font-medium">Total debite</span>
                      <span className="font-bold text-lg" data-testid="text-transfer-total">{formatCurrency(totalDebit, selectedCountry?.currency)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="rounded-lg bg-muted/50 border p-4 flex items-start gap-3">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                Des frais de transfert de 2% sont appliques sur chaque envoi. Le destinataire recevra le montant exact que vous avez saisi. 
                Les delais de reception dependent de l'operateur et du pays de destination.
              </p>
            </div>

            <Button type="submit" className="w-full gap-2" data-testid="button-continue-transfer">
              <ArrowRight className="h-4 w-4" />
              Continuer
            </Button>
          </form>
        )}

        {step === "confirm" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Confirmation du transfert</CardTitle>
                <CardDescription>Verifiez les informations avant de confirmer</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <span className="text-sm text-muted-foreground">Destinataire</span>
                    <span className="font-medium" data-testid="text-confirm-recipient">{recipientName}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <span className="text-sm text-muted-foreground">Telephone</span>
                    <span className="font-medium" data-testid="text-confirm-phone">{selectedCountry?.prefix} {phoneNumber}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <span className="text-sm text-muted-foreground">Pays</span>
                    <span className="font-medium">{selectedCountry?.name}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <span className="text-sm text-muted-foreground">Operateur</span>
                    <span className="font-medium">{providers.find(p => p.id === provider)?.name}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <span className="text-sm text-muted-foreground">Montant envoye</span>
                    <span className="font-medium">{formatCurrency(parsedAmount, selectedCountry?.currency)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <span className="text-sm text-muted-foreground">Frais (2%)</span>
                    <span className="text-sm text-destructive">+ {formatCurrency(fees, selectedCountry?.currency)}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <span className="font-semibold">Total debite</span>
                    <span className="font-bold text-lg">{formatCurrency(totalDebit, selectedCountry?.currency)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3 flex-wrap">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep("form")}
                disabled={transferMutation.isPending}
                data-testid="button-back-transfer"
              >
                Modifier
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={handleConfirm}
                disabled={transferMutation.isPending}
                data-testid="button-confirm-transfer"
              >
                <Send className="h-4 w-4" />
                {transferMutation.isPending ? "Envoi en cours..." : "Confirmer le transfert"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
