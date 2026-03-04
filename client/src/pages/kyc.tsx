import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Shield, CheckCircle2, Clock, AlertTriangle, Loader2,
  Upload, BadgeCheck, Lock,
} from "lucide-react";

function kycStatusLabel(status: string) {
  if (status === "verified") return { label: "Vérifié", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" };
  if (status === "pending") return { label: "En attente", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" };
  if (status === "rejected") return { label: "Rejeté", color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" };
  return { label: "Non démarré", color: "bg-muted text-muted-foreground" };
}

function FileUploadField({ label, fieldName, value, onUploaded, required }: { label: string; fieldName: string; value: string; onUploaded: (url: string) => void; required?: boolean }) {
  const { toast } = useToast();
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd, credentials: "include" });
      const data = await res.json();
      if (data.imageUrl) { onUploaded(data.imageUrl); toast({ title: "Photo téléchargée" }); }
      else toast({ title: "Erreur", description: "Impossible de télécharger", variant: "destructive" });
    } catch {
      toast({ title: "Erreur", description: "Erreur de téléchargement", variant: "destructive" });
    } finally { setUploading(false); }
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {label}{required && <span className="text-rose-500 ml-1">*</span>}
      </Label>
      <input ref={ref} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      {value ? (
        <div className="relative rounded-xl overflow-hidden border border-border/60 group">
          <img src={value} alt={label} className="w-full h-36 object-cover" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <Button type="button" size="sm" variant="secondary" onClick={() => ref.current?.click()} className="gap-1.5">
              <Upload className="h-3.5 w-3.5" />Changer
            </Button>
          </div>
          <div className="absolute top-2 right-2">
            <Badge className="bg-emerald-500 text-white text-xs border-0">✓</Badge>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          disabled={uploading}
          className="w-full h-28 border-2 border-dashed border-border/60 rounded-xl flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 hover:bg-primary/5 transition-colors"
          data-testid={`btn-upload-${fieldName}`}
        >
          {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
          <span className="text-xs font-medium">{uploading ? "Téléchargement…" : "Cliquez pour choisir une photo"}</span>
        </button>
      )}
    </div>
  );
}

export default function KycPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const kycStatus = (user as any)?.kycStatus || "not_started";
  const kycSt = kycStatusLabel(kycStatus);

  const [kycFirstName, setKycFirstName] = useState("");
  const [kycLastName, setKycLastName] = useState("");
  const [kycDocumentNumber, setKycDocumentNumber] = useState("");
  const [kycDocumentFront, setKycDocumentFront] = useState("");
  const [kycDocumentBack, setKycDocumentBack] = useState("");
  const [kycSelfie, setKycSelfie] = useState("");

  useEffect(() => {
    if (user) {
      if ((user as any).kycFirstName) setKycFirstName((user as any).kycFirstName);
      if ((user as any).kycLastName) setKycLastName((user as any).kycLastName);
      if ((user as any).kycDocumentNumber) setKycDocumentNumber((user as any).kycDocumentNumber);
      if ((user as any).kycDocumentFront) setKycDocumentFront((user as any).kycDocumentFront);
      if ((user as any).kycDocumentBack) setKycDocumentBack((user as any).kycDocumentBack);
      if ((user as any).kycSelfie) setKycSelfie((user as any).kycSelfie);
    }
  }, [user]);

  const kycMutation = useMutation({
    mutationFn: async (data: any) => { const res = await apiRequest("POST", "/api/kyc/submit", data); return res.json(); },
    onSuccess: (data) => { queryClient.setQueryData(["/api/auth/user"], data); toast({ title: "Demande envoyée", description: "Votre demande a été soumise. Vous recevrez une réponse sous 24h au plus tard 48h." }); },
    onError: (error: any) => {
      let msg = "Erreur lors de la soumission.";
      try { const p = JSON.parse(error?.message?.replace(/^\d+:\s*/, "") || "{}"); msg = p.message || msg; } catch {}
      toast({ title: "Erreur", description: msg, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kycFirstName || !kycLastName) { toast({ title: "Erreur", description: "Prénom et nom requis", variant: "destructive" }); return; }
    if (!kycDocumentNumber) { toast({ title: "Erreur", description: "Numéro de la pièce requis", variant: "destructive" }); return; }
    if (!kycDocumentFront) { toast({ title: "Erreur", description: "Photo recto du document requise", variant: "destructive" }); return; }
    if (!kycSelfie) { toast({ title: "Erreur", description: "Selfie requis", variant: "destructive" }); return; }
    kycMutation.mutate({ kycFirstName, kycLastName, kycDocumentNumber, kycDocumentFront, kycDocumentBack: kycDocumentBack || null, kycSelfie });
  };

  const steps = [
    { label: "Soumission", done: kycStatus !== "not_started" },
    { label: "Examen", done: kycStatus === "verified" || kycStatus === "pending" },
    { label: "Validé", done: kycStatus === "verified" },
  ];

  const statusGradient =
    kycStatus === "verified" ? "from-emerald-600 to-teal-600" :
    kycStatus === "pending" ? "from-amber-500 to-orange-500" :
    kycStatus === "rejected" ? "from-rose-500 to-red-600" :
    "from-violet-600 to-indigo-600";

  return (
    <DashboardLayout title="Vérification KYC" breadcrumbs={[{ label: "Vérification KYC" }]}>
      <div className="max-w-xl space-y-5">

        {/* ── Bannière statut ── */}
        <div className={`relative rounded-3xl p-6 text-white overflow-hidden shadow-xl bg-gradient-to-br ${statusGradient}`}>
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center gap-4 mb-5">
              <div className="h-14 w-14 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0">
                {kycStatus === "verified" ? <BadgeCheck className="h-7 w-7" /> :
                 kycStatus === "pending" ? <Clock className="h-7 w-7" /> :
                 kycStatus === "rejected" ? <AlertTriangle className="h-7 w-7" /> :
                 <Shield className="h-7 w-7" />}
              </div>
              <div>
                <p className="text-white/70 text-xs font-medium uppercase tracking-wider">Statut KYC</p>
                <p className="font-black text-xl leading-tight" data-testid="text-kyc-status-title">{kycSt.label}</p>
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

        {/* ── Carte principale ── */}
        <Card className="border-border/60">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${kycStatus === "verified" ? "bg-emerald-500/10" : kycStatus === "pending" ? "bg-amber-500/10" : "bg-primary/10"}`}>
                  <Shield className={`h-5 w-5 ${kycStatus === "verified" ? "text-emerald-600" : kycStatus === "pending" ? "text-amber-600" : "text-primary"}`} />
                </div>
                <div>
                  <CardTitle className="text-base font-bold">Vérification d'identité</CardTitle>
                  <CardDescription className="text-xs">Vérifiez votre identité pour débloquer tous les services</CardDescription>
                </div>
              </div>
              <Badge className={kycSt.color} data-testid="badge-kyc-status">{kycSt.label}</Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            {kycStatus === "verified" && (
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-4 flex items-start gap-3">
                <BadgeCheck className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm text-emerald-700 dark:text-emerald-300">Identité vérifiée</p>
                  <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">Votre compte a été vérifié avec succès. Tous les services sont débloqués.</p>
                </div>
              </div>
            )}

            {kycStatus === "pending" && (
              <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm text-amber-700 dark:text-amber-300">En cours de vérification</p>
                  <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-0.5">Votre dossier est en cours de révision par nos équipes. Vous serez notifié dans un délai de 24h au plus tard 48h.</p>
                </div>
              </div>
            )}

            {kycStatus === "rejected" && (
              <div className="rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm text-rose-700 dark:text-rose-300">Demande rejetée</p>
                  {(user as any)?.kycRejectionReason && (
                    <p className="text-xs text-rose-600/80 dark:text-rose-400/80 mt-0.5">Motif : {(user as any).kycRejectionReason}</p>
                  )}
                  <p className="text-xs text-rose-600/80 dark:text-rose-400/80 mt-1">Vous pouvez soumettre une nouvelle demande ci-dessous.</p>
                </div>
              </div>
            )}

            {kycStatus === "not_started" && (
              <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-4">
                <div className="flex items-start gap-2 mb-2">
                  <Lock className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">Documents requis :</p>
                </div>
                <ul className="space-y-1 text-xs text-blue-600/80 dark:text-blue-400/80 list-disc list-inside ml-2">
                  <li>Pièce d'identité (CNI, passeport ou permis) — recto obligatoire, verso recommandé</li>
                  <li>Selfie tenant la pièce d'identité</li>
                  <li>Délai de traitement : <strong>24h au plus tard 48h</strong></li>
                </ul>
              </div>
            )}

            {(kycStatus === "not_started" || kycStatus === "rejected") && (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Prénom <span className="text-rose-500">*</span></Label>
                    <Input value={kycFirstName} onChange={e => setKycFirstName(e.target.value)} placeholder="Prénom sur document" className="h-11 border-border/70" required data-testid="input-kyc-firstname" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nom <span className="text-rose-500">*</span></Label>
                    <Input value={kycLastName} onChange={e => setKycLastName(e.target.value)} placeholder="Nom sur document" className="h-11 border-border/70" required data-testid="input-kyc-lastname" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Numéro de la pièce d'identité <span className="text-rose-500">*</span></Label>
                  <Input value={kycDocumentNumber} onChange={e => setKycDocumentNumber(e.target.value)} placeholder="Ex : BJ12345678" className="h-11 border-border/70 font-mono" required data-testid="input-kyc-document-number" />
                </div>

                <Separator />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FileUploadField label="Pièce d'identité (recto)" fieldName="doc-front" value={kycDocumentFront} onUploaded={setKycDocumentFront} required />
                  <FileUploadField label="Pièce d'identité (verso)" fieldName="doc-back" value={kycDocumentBack} onUploaded={setKycDocumentBack} />
                </div>

                <FileUploadField label="Selfie avec la pièce d'identité" fieldName="selfie" value={kycSelfie} onUploaded={setKycSelfie} required />

                <Button
                  type="submit"
                  className="w-full gap-2 h-12 font-bold shadow-xl shadow-primary/20"
                  disabled={kycMutation.isPending || !kycDocumentFront || !kycSelfie || !kycFirstName || !kycLastName || !kycDocumentNumber}
                  data-testid="button-submit-kyc"
                >
                  {kycMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" />Envoi en cours...</> : <><Shield className="h-4 w-4" />Soumettre pour vérification</>}
                </Button>

                <div className="flex items-center gap-2 justify-center flex-wrap">
                  <Badge variant="outline" className="gap-1 text-xs"><Lock className="h-3 w-3" /> Données chiffrées</Badge>
                  <Badge variant="outline" className="gap-1 text-xs"><Shield className="h-3 w-3" /> Traitement sécurisé</Badge>
                </div>
              </form>
            )}

          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
