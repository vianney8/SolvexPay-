import { Resend } from "resend";

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY not configured.");
  }
  if (!fromEmail) {
    throw new Error("RESEND_FROM_EMAIL not configured.");
  }

  return { client: new Resend(apiKey), fromEmail };
}

export async function sendVerificationEmail(to: string, code: string, firstName: string) {
  const { client, fromEmail } = getResendClient();

  const { data, error } = await client.emails.send({
    from: fromEmail,
    to,
    subject: "Votre code de vérification - SolvexPay",
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
      <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
          <tr><td align="center">
            <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
              <tr>
                <td style="background:linear-gradient(135deg,#6d28d9 0%,#7c3aed 50%,#0891b2 100%);padding:36px 40px;text-align:center;">
                  <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:900;letter-spacing:-0.5px;">SolvexPay</h1>
                  <p style="margin:6px 0 0;color:rgba(255,255,255,0.7);font-size:13px;">Passerelle de paiement pan-africaine</p>
                </td>
              </tr>
              <tr>
                <td style="padding:40px;">
                  <p style="margin:0 0 8px;font-size:16px;color:#374151;">Bonjour <strong>${firstName}</strong>,</p>
                  <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.6;">
                    Pour finaliser la création de votre compte, veuillez entrer le code de vérification ci-dessous. Ce code est valide pendant <strong>15 minutes</strong>.
                  </p>
                  <div style="text-align:center;margin:0 0 32px;">
                    <div style="display:inline-block;background:#f5f3ff;border:2px solid #7c3aed;border-radius:16px;padding:20px 48px;">
                      <p style="margin:0;font-size:42px;font-weight:900;letter-spacing:12px;color:#6d28d9;font-variant-numeric:tabular-nums;">${code}</p>
                    </div>
                    <p style="margin:12px 0 0;font-size:12px;color:#9ca3af;">Ne partagez ce code avec personne</p>
                  </div>
                  <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;">Si vous n'avez pas créé de compte sur SolvexPay, ignorez cet email.</p>
                </td>
              </tr>
              <tr>
                <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
                  <p style="margin:0;font-size:12px;color:#9ca3af;">© 2025 SolvexPay · Sécurisé par TLS</p>
                </td>
              </tr>
            </table>
          </td></tr>
        </table>
      </body>
      </html>
    `,
  });

  if (error) {
    console.error("[Resend] API error:", JSON.stringify(error));
    throw new Error(`Resend API error: ${error.message || JSON.stringify(error)}`);
  }

  console.log(`[Resend] Email sent successfully to ${to}. ID: ${data?.id}`);
  return data;
}

export async function sendPasswordResetEmail(to: string, code: string, firstName: string) {
  const { client, fromEmail } = getResendClient();

  const { data, error } = await client.emails.send({
    from: fromEmail,
    to,
    subject: "Réinitialisation de mot de passe - SolvexPay",
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
      <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
          <tr><td align="center">
            <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
              <tr>
                <td style="background:linear-gradient(135deg,#6d28d9 0%,#7c3aed 50%,#0891b2 100%);padding:36px 40px;text-align:center;">
                  <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:900;letter-spacing:-0.5px;">SolvexPay</h1>
                  <p style="margin:6px 0 0;color:rgba(255,255,255,0.7);font-size:13px;">Passerelle de paiement pan-africaine</p>
                </td>
              </tr>
              <tr>
                <td style="padding:40px;">
                  <p style="margin:0 0 8px;font-size:16px;color:#374151;">Bonjour <strong>${firstName}</strong>,</p>
                  <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.6;">
                    Vous avez demandé à réinitialiser votre mot de passe. Entrez le code ci-dessous pour continuer. Ce code est valide pendant <strong>15 minutes</strong>.
                  </p>
                  <div style="text-align:center;margin:0 0 32px;">
                    <div style="display:inline-block;background:#f5f3ff;border:2px solid #7c3aed;border-radius:16px;padding:20px 48px;">
                      <p style="margin:0;font-size:42px;font-weight:900;letter-spacing:12px;color:#6d28d9;font-variant-numeric:tabular-nums;">${code}</p>
                    </div>
                    <p style="margin:12px 0 0;font-size:12px;color:#9ca3af;">Ne partagez ce code avec personne</p>
                  </div>
                  <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;">Si vous n'avez pas demandé cette réinitialisation, ignorez cet email. Votre mot de passe ne changera pas.</p>
                </td>
              </tr>
              <tr>
                <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
                  <p style="margin:0;font-size:12px;color:#9ca3af;">© 2025 SolvexPay · Sécurisé par TLS</p>
                </td>
              </tr>
            </table>
          </td></tr>
        </table>
      </body>
      </html>
    `,
  });

  if (error) {
    console.error("[Resend] Password reset email error:", JSON.stringify(error));
    throw new Error(`Resend API error: ${error.message || JSON.stringify(error)}`);
  }

  console.log(`[Resend] Password reset email sent to ${to}. ID: ${data?.id}`);
  return data;
}

export async function sendWithdrawalEmail(
  to: string,
  firstName: string,
  params: {
    status: "success" | "failed";
    reference: string;
    amount: number;
    currency: string;
    phone: string;
    operator: string;
    date: string;
  }
) {
  const { client, fromEmail } = getResendClient();
  const isSuccess = params.status === "success";
  const subject = isSuccess
    ? `Retrait effectué avec succès - SolvexPay`
    : `Retrait échoué - SolvexPay`;
  const statusColor = isSuccess ? "#16a34a" : "#dc2626";
  const statusBg = isSuccess ? "#f0fdf4" : "#fef2f2";
  const statusBorder = isSuccess ? "#bbf7d0" : "#fecaca";
  const statusIcon = isSuccess ? "✓" : "✗";
  const statusLabel = isSuccess ? "Retrait réussi" : "Retrait échoué";
  const statusMessage = isSuccess
    ? `Votre retrait a été traité avec succès. Les fonds ont été envoyés vers votre numéro.`
    : `Votre retrait n'a pas pu être traité. Si un montant a été débité, il sera remboursé sur votre wallet.`;

  const { data, error } = await client.emails.send({
    from: fromEmail,
    to,
    subject,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
      <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
          <tr><td align="center">
            <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
              <tr>
                <td style="background:linear-gradient(135deg,#6d28d9 0%,#7c3aed 50%,#0891b2 100%);padding:36px 40px;text-align:center;">
                  <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:900;letter-spacing:-0.5px;">SolvexPay</h1>
                  <p style="margin:6px 0 0;color:rgba(255,255,255,0.7);font-size:13px;">Passerelle de paiement pan-africaine</p>
                </td>
              </tr>
              <tr>
                <td style="padding:40px;">
                  <p style="margin:0 0 16px;font-size:16px;color:#374151;">Bonjour <strong>${firstName}</strong>,</p>

                  <div style="background:${statusBg};border:1px solid ${statusBorder};border-radius:12px;padding:20px 24px;margin:0 0 28px;text-align:center;">
                    <div style="display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;background:${statusColor};border-radius:50%;margin:0 0 12px;">
                      <span style="color:#fff;font-size:22px;font-weight:900;">${statusIcon}</span>
                    </div>
                    <p style="margin:0 0 4px;font-size:18px;font-weight:700;color:${statusColor};">${statusLabel}</p>
                    <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.5;">${statusMessage}</p>
                  </div>

                  <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin:0 0 28px;">
                    <tr style="background:#f9fafb;">
                      <td style="padding:12px 18px;font-size:13px;color:#6b7280;font-weight:500;border-bottom:1px solid #e5e7eb;">Montant</td>
                      <td style="padding:12px 18px;font-size:14px;color:#111827;font-weight:700;text-align:right;border-bottom:1px solid #e5e7eb;">${params.amount.toLocaleString("fr-FR")} ${params.currency}</td>
                    </tr>
                    <tr>
                      <td style="padding:12px 18px;font-size:13px;color:#6b7280;font-weight:500;border-bottom:1px solid #e5e7eb;">Numéro</td>
                      <td style="padding:12px 18px;font-size:14px;color:#111827;text-align:right;border-bottom:1px solid #e5e7eb;">${params.phone}</td>
                    </tr>
                    <tr style="background:#f9fafb;">
                      <td style="padding:12px 18px;font-size:13px;color:#6b7280;font-weight:500;border-bottom:1px solid #e5e7eb;">Opérateur</td>
                      <td style="padding:12px 18px;font-size:14px;color:#111827;text-align:right;border-bottom:1px solid #e5e7eb;">${params.operator}</td>
                    </tr>
                    <tr>
                      <td style="padding:12px 18px;font-size:13px;color:#6b7280;font-weight:500;border-bottom:1px solid #e5e7eb;">Référence</td>
                      <td style="padding:12px 18px;font-size:13px;color:#6b7280;font-family:monospace;text-align:right;border-bottom:1px solid #e5e7eb;">${params.reference}</td>
                    </tr>
                    <tr style="background:#f9fafb;">
                      <td style="padding:12px 18px;font-size:13px;color:#6b7280;font-weight:500;">Date</td>
                      <td style="padding:12px 18px;font-size:13px;color:#6b7280;text-align:right;">${params.date}</td>
                    </tr>
                  </table>

                  <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;">
                    Pour toute question, contactez notre support via WhatsApp ou email.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
                  <p style="margin:0;font-size:12px;color:#9ca3af;">© 2025 SolvexPay · Sécurisé par TLS</p>
                </td>
              </tr>
            </table>
          </td></tr>
        </table>
      </body>
      </html>
    `,
  });

  if (error) {
    console.error("[Resend] Withdrawal email error:", JSON.stringify(error));
    throw new Error(`Resend API error: ${error.message || JSON.stringify(error)}`);
  }

  console.log(`[Resend] Withdrawal email sent to ${to}. ID: ${data?.id}`);
  return data;
}

export async function testResendConnection(to: string) {
  const { client, fromEmail } = getResendClient();
  console.log(`[Resend] Testing with from_email: "${fromEmail}"`);

  const { data, error } = await client.emails.send({
    from: fromEmail,
    to,
    subject: "Test de connexion - SolvexPay",
    html: "<p>Ce message confirme que Resend est correctement configuré pour SolvexPay.</p>",
  });

  if (error) {
    return { success: false, error: error.message || JSON.stringify(error) };
  }

  return { success: true, id: data?.id };
}
