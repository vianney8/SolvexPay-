import { useState, type FormEvent } from "react";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck } from "lucide-react";

type ConfirmationResult = {
  status?: string;
  requiresOtp?: boolean;
  requiresRedirect?: boolean;
  instructions?: string;
  message?: string;
};

export function OperatorConfirmationCode({
  endpoint,
  reference,
  includeReference = true,
  onResult,
}: {
  endpoint: string;
  reference?: string | null;
  includeReference?: boolean;
  onResult: (data: ConfirmationResult) => void;
}) {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const value = otp.trim();
    if (!reference || value.length < 4 || value.length > 32 || pending) return;
    setPending(true);
    setError("");
    try {
      const res = await apiRequest("POST", endpoint, { ...(includeReference ? { reference } : {}), otp: value });
      const data = await res.json();
      onResult(data);
      setOtp("");
    } catch (err: any) {
      setError(err?.message || "Code invalide ou vérification indisponible. Réessayez.");
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border border-amber-300/60 bg-amber-50/80 p-4 space-y-3">
      <div className="flex items-start gap-2.5">
        <ShieldCheck className="h-4 w-4 text-amber-700 mt-0.5 shrink-0" />
        <div>
          <Label htmlFor="operator-confirmation-code" className="text-sm font-bold text-amber-950">Code reçu de votre opérateur</Label>
          <p className="text-xs text-amber-800 mt-0.5">Saisissez le code reçu pour confirmer le paiement. Il n’est conservé que le temps de la requête.</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Input
          id="operator-confirmation-code"
          value={otp}
          onChange={(event) => setOtp(event.target.value.slice(0, 32))}
          autoComplete="one-time-code"
          minLength={4}
          maxLength={32}
          required
          className="bg-white"
          aria-invalid={!!error}
        />
        <Button type="submit" disabled={pending || !reference || otp.trim().length < 4 || otp.trim().length > 32} className="shrink-0">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmer"}
        </Button>
      </div>
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </form>
  );
}
