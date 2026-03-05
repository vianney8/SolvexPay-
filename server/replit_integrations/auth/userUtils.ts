export function sanitizeUser(user: any) {
  const {
    passwordHash: _pw,
    kycDocumentFront: _front,
    kycDocumentBack: _back,
    kycSelfie: _selfie,
    emailVerificationCode: _evc,
    emailVerificationExpiry: _eve,
    passwordResetCode: _prc,
    passwordResetExpiry: _pre,
    ...safe
  } = user;
  return safe;
}
