import { useEffect, useState } from "react";

export function usePendingPayment(scope: string) {
  const key = `solvexpay:pending:${scope}`;
  const [reference, setReference] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const callback = params.get("status") === "callback" ? params.get("reference") : null;
    try { return callback || sessionStorage.getItem(key); } catch { return callback; }
  });
  useEffect(() => {
    try {
      if (reference) sessionStorage.setItem(key, reference);
      else sessionStorage.removeItem(key);
    } catch { /* Storage can be unavailable in private browsing. */ }
  }, [key, reference]);
  const clear = () => { try { sessionStorage.removeItem(key); } catch {} };
  return [reference, setReference, clear] as const;
}
