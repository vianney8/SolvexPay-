export interface AlphaNetwork {
  code: string;
  name: string;
  country: string;
  currency: string;
  payin: boolean;
  payout: boolean;
  otpRequired: boolean;
  otpInstructions: string;
  requiresRedirect: boolean;
}

export interface AlphaCountry {
  code: string;
  name: string;
  flag: string;
  prefix: string;
  currency: string;
  operators: string[];
  phonePlaceholder: string;
}

export interface AlphaCatalog {
  countries: AlphaCountry[];
  networks: AlphaNetwork[];
  currencies: string[];
  rateToXof: Record<string, number>;
  fetchedAt: string;
}
