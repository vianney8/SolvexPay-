import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ShieldCheck,
  Upload,
  User,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  FileText,
  Camera,
  Lock,
} from "lucide-react";

type KycStatus = "not_started" | "pending" | "verified" | "rejected";

export default function KycPage() {
  const { toast } = useToast();
  const [kycStatus] = useState<KycStatus>("not_started");
  const [submitting, setSubmitting] = useState(false);
  const [docType, setDocType] = useState("cni");
  const [idNumber, setIdNumber] = useState("");
  const [docFront, setDocFront] = useState<File | null>(null);
  const [docBack, setDocBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!idNumber) {
      toast({ title: "Erreur", description: "Veuillez saisir le numéro du document", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      toast({ title: "Documents soumis", description: "Votre vérification est en cours. Vous serez notifié par email." });
    }, 2000);
  };

  const statusBg: Record<KycStatus, string> = {
    not_started: "from-slate-500 to-slate-700",
    pending: "from-amber-500 to-orange-600",
    verified: "from-emerald-500 to-teal-600",
    rejected: "from-red-500 to-rose-700",
  };

  const statusLabel: Record<KycStatus, string> = {
    not_started: "Non vérifié",
    pending: "En cours d'examen",
    verified: "Identité vérifiée",
    rejected: "Rejeté",
  };

  const steps = [
    { label: "Soumission", done: kycStatus !== "not_started" },
    { label: "Examen", done: kycStatus === "verified" || kycStatus === "pending" },
    { label: "Validé", done: kycStatus === "verified" },
  ];

  const docTypeLabels: Record<string, string> = {
    cni: "Carte Nationale d'Identité",
    passport: "Passeport",
    permis: "Permis de conduire",
  };

  return (
    <DashboardLayout title="" breadcrumbs={[{ label: "Vérification KYC" }]}>
      <div className="max-w-lg mx-auto space-y-5">
        <div
          className={`relative rounded-3xl p-6 text-white overflow-hidden shadow-xl bg-gradient-to-br ${statusBg[kycStatus]}`}
        >
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center gap-4 mb-5">
              <div className="h-14 w-14 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0">
                {kycStatus === "verified" ? <CheckCircle2 className="h-7 w-7" /> :
                 kycStatus === "pending" ? <Clock className="h-7 w-7" /> :
                 kycStatus === "rejected" ? <AlertCircle className="h-7 w-7" /> :
                 <ShieldCheck className="h-7 w-7" />}
              </div>
              <div>
                <p className="text-white/70 text-xs font-medium uppercase tracking-wider">Statut KYC</p>
                <p className="font-black text-xl leading-tight" data-testid="text-kyc-status-title">{statusLabel[kycStatus]}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {steps.map((step, i) => (
                <div key={step.label} className="flex items-center gap-2 flex-1">
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${step.done ? "bg-white text-slate-800" : "bg-white/20 text-white"}`}>
                    {step.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                  </div>
                  <span className={`text-xs font-medium ${step.done ? "text-white" : "text-white/60"}`}>{step.label}</span>
                  {i < steps.length - 1 && <div className={`flex-1 h-px ${step.done ? "bg-white/50" : "bg-white/20"}`} />}
                </div>
              ))}
            </div>
          </div>
        </div>

        {kycStatus === "verified" && (
          <Card className="border-emerald-200 bg-emerald-50/50">
            <CardContent className="p-6 text-center space-y-3">
              <div className="h-16 w-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <h3 className="font-bold text-lg text-emerald-700">Identité vérifiée avec succès</h3>
              <p className="text-sm text-emerald-600/80">Vous avez accès à toutes les fonctionnalités de SolvexPay.</p>
            </CardContent>
          </Card>
        )}

        {kycStatus === "pending" && (
          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="p-6 text-center space-y-3">
              <div className="h-16 w-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto">
                <Clock className="h-8 w-8 text-amber-600 animate-pulse" />
              </div>
              <h3 className="font-bold text-lg text-amber-700">Vérification en cours</h3>
              <p className="text-sm text-amber-600/80">Nos équipes examinent vos documents. Délai : 24 à 48 heures. Vous recevrez un email de confirmation.</p>
            </CardContent>
          </Card>
        )}

        {(kycStatus === "not_started" || kycStatus === "rejected") && (
          <>
            {kycStatus === "rejected" && (
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-destructive/5 border border-destructive/20">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                <p className="text-sm text-destructive font-medium">Votre dossier a été rejeté. Soumettez à nouveau des documents valides et lisibles.</p>
              </div>
            )}

            <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20">
              <Lock className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                La vérification d'identité est obligatoire pour augmenter vos limites de transaction. Vos données sont chiffrées et sécurisées.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Card className="border-border/60">
                <CardContent className="p-5 space-y-5">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Type de document</Label>
                    <Select value={docType} onValueChange={setDocType}>
                      <SelectTrigger className="h-11 border-border/70" data-testid="select-doc-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cni">Carte Nationale d'Identité (CNI)</SelectItem>
                        <SelectItem value="passport">Passeport</SelectItem>
                        <SelectItem value="permis">Permis de conduire</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Numéro du {docTypeLabels[docType] || "document"}
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        value={idNumber}
                        onChange={(e) => setIdNumber(e.target.value)}
                        placeholder="Numéro de la pièce d'identité"
                        className="pl-10 h-11 border-border/70"
                        required
                        data-testid="input-id-number"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/60">
                <CardContent className="p-5 space-y-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5" /> Documents requis
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: "doc-front", label: "Recto", file: docFront, setFile: setDocFront, testId: "input-doc-front" },
                      { id: "doc-back", label: "Verso", file: docBack, setFile: setDocBack, testId: "input-doc-back" },
                    ].map((item) => (
                      <div key={item.id} className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground">{item.label}</Label>
                        <input type="file" accept="image/*,.pdf" onChange={(e) => item.setFile(e.target.files?.[0] || null)} className="hidden" id={item.id} data-testid={item.testId} />
                        <label
                          htmlFor={item.id}
                          className={`flex flex-col items-center gap-2 p-5 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${item.file ? "border-primary/40 bg-primary/5" : "border-border/60 hover:border-primary/30 hover:bg-muted/20"}`}
                        >
                          {item.file ? (
                            <>
                              <CheckCircle2 className="h-6 w-6 text-primary" />
                              <p className="text-xs font-semibold text-primary text-center truncate w-full">{item.file.name}</p>
                            </>
                          ) : (
                            <>
                              <Upload className="h-6 w-6 text-muted-foreground" />
                              <p className="text-xs text-muted-foreground text-center">Cliquez pour ajouter</p>
                            </>
                          )}
                        </label>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <Camera className="h-3.5 w-3.5" /> Selfie avec le document
                    </Label>
                    <input type="file" accept="image/*" onChange={(e) => setSelfie(e.target.files?.[0] || null)} className="hidden" id="selfie" data-testid="input-selfie" />
                    <label
                      htmlFor="selfie"
                      className={`flex items-center gap-4 p-4 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${selfie ? "border-primary/40 bg-primary/5" : "border-border/60 hover:border-primary/30 hover:bg-muted/20"}`}
                    >
                      {selfie ? (
                        <>
                          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-primary truncate">{selfie.name}</p>
                            <p className="text-xs text-muted-foreground">Selfie ajouté</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                            <Camera className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-foreground">Prenez un selfie</p>
                            <p className="text-xs text-muted-foreground">Tenez votre document à côté de votre visage</p>
                          </div>
                        </>
                      )}
                    </label>
                  </div>

                  <p className="text-xs text-muted-foreground">Formats acceptés : PNG, JPG ou PDF — Max 5 MB par fichier</p>
                </CardContent>
              </Card>

              <Button
                type="submit"
                className="w-full h-12 font-bold gap-2 shadow-xl shadow-primary/20"
                disabled={submitting}
                data-testid="button-submit-kyc"
              >
                {submitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Envoi en cours...</>
                ) : (
                  <><ShieldCheck className="h-4 w-4" /> Soumettre pour vérification</>
                )}
              </Button>

              <div className="flex items-center gap-2 justify-center text-xs text-muted-foreground">
                <Badge variant="outline" className="gap-1 text-xs">
                  <Lock className="h-3 w-3" /> Données chiffrées
                </Badge>
                <Badge variant="outline" className="gap-1 text-xs">
                  <ShieldCheck className="h-3 w-3" /> Traitement sécurisé
                </Badge>
              </div>
            </form>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
