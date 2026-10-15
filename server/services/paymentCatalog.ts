import { db } from "../db";
import { paymentMethods } from "@shared/schema";
import { PAYMENT_OPERATORS } from "@shared/payment-catalog";
import { eq, sql } from "drizzle-orm";

/** Add catalogue entries without resetting fees, maintenance or active flags. */
export async function ensurePaymentCatalog() {
  await db.transaction(async tx => {
    for (const operator of PAYMENT_OPERATORS) {
      const [existing] = await tx.select().from(paymentMethods).where(sql`lower(${paymentMethods.code}) = ${operator.code.toLowerCase()}`).limit(1);
      if (!existing) {
        await tx.insert(paymentMethods).values({
          code: operator.code, name: operator.name, category: "mobile_money",
          countries: operator.countries, feeType: "percentage", feeValue: "0",
          // Null operator rates intentionally inherit the site's global rates.
          feeDeposit: null, feeWithdrawal: null, feePLink: null, feeApi: null,
        }).onConflictDoNothing({ target: paymentMethods.code });
      } else {
        const countries = Array.from(new Set([...(existing.countries || []), ...operator.countries]));
        if (countries.length !== (existing.countries || []).length) {
          await tx.update(paymentMethods).set({ countries }).where(eq(paymentMethods.id, existing.id));
        }
      }
    }
  });
}
