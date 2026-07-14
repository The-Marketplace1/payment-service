import type { PaymentProvider } from "@prisma/client";

export interface CountryConfig {
  code: string;
  name: string;
  currency: string;
  timezone: string;
  locale: string;
  phonePrefix: string;
  providers: {
    primary: PaymentProvider;
    secondary?: PaymentProvider;
  };
  payoutMethods: string[];
  disputeWindowDays: number;
  enabled: boolean;
}

export const COUNTRIES: Record<string, CountryConfig> = {
  // ─── LIVE ─────────────────────────────────────────────────────────────────
  NG: {
    code: "NG",
    name: "Nigeria",
    currency: "NGN",
    timezone: "Africa/Lagos",
    locale: "en-NG",
    phonePrefix: "+234",
    providers: { primary: "PAYSTACK", secondary: "FLUTTERWAVE" },
    payoutMethods: ["bank_transfer", "mobile_money"],
    disputeWindowDays: 7,
    enabled: true,
  },

  // ─── COMING SOON — enable one at a time as operations launch ─────────────
  US: {
    code: "US",
    name: "United States",
    currency: "USD",
    timezone: "America/New_York",
    locale: "en-US",
    phonePrefix: "+1",
    providers: { primary: "STRIPE" },
    payoutMethods: ["ach", "bank_transfer"],
    disputeWindowDays: 10,
    enabled: false,
  },
  GB: {
    code: "GB",
    name: "United Kingdom",
    currency: "GBP",
    timezone: "Europe/London",
    locale: "en-GB",
    phonePrefix: "+44",
    providers: { primary: "STRIPE" },
    payoutMethods: ["bank_transfer", "iban"],
    disputeWindowDays: 14,
    enabled: false,
  },
  DE: {
    code: "DE",
    name: "Germany",
    currency: "EUR",
    timezone: "Europe/Berlin",
    locale: "de-DE",
    phonePrefix: "+49",
    providers: { primary: "STRIPE" },
    payoutMethods: ["iban", "bank_transfer"],
    disputeWindowDays: 14,
    enabled: false,
  },
  FR: {
    code: "FR",
    name: "France",
    currency: "EUR",
    timezone: "Europe/Paris",
    locale: "fr-FR",
    phonePrefix: "+33",
    providers: { primary: "STRIPE" },
    payoutMethods: ["iban", "bank_transfer"],
    disputeWindowDays: 14,
    enabled: false,
  },
  CA: {
    code: "CA",
    name: "Canada",
    currency: "CAD",
    timezone: "America/Toronto",
    locale: "en-CA",
    phonePrefix: "+1",
    providers: { primary: "STRIPE" },
    payoutMethods: ["ach", "bank_transfer"],
    disputeWindowDays: 10,
    enabled: false,
  },
  AU: {
    code: "AU",
    name: "Australia",
    currency: "AUD",
    timezone: "Australia/Sydney",
    locale: "en-AU",
    phonePrefix: "+61",
    providers: { primary: "STRIPE" },
    payoutMethods: ["bank_transfer"],
    disputeWindowDays: 10,
    enabled: false,
  },
  ZA: {
    code: "ZA",
    name: "South Africa",
    currency: "ZAR",
    timezone: "Africa/Johannesburg",
    locale: "en-ZA",
    phonePrefix: "+27",
    providers: { primary: "FLUTTERWAVE", secondary: "PAYSTACK" },
    payoutMethods: ["bank_transfer"],
    disputeWindowDays: 7,
    enabled: false,
  },
  KE: {
    code: "KE",
    name: "Kenya",
    currency: "KES",
    timezone: "Africa/Nairobi",
    locale: "en-KE",
    phonePrefix: "+254",
    providers: { primary: "FLUTTERWAVE", secondary: "PAYSTACK" },
    payoutMethods: ["mobile_money", "bank_transfer"],
    disputeWindowDays: 7,
    enabled: false,
  },
  GH: {
    code: "GH",
    name: "Ghana",
    currency: "GHS",
    timezone: "Africa/Accra",
    locale: "en-GH",
    phonePrefix: "+233",
    providers: { primary: "PAYSTACK", secondary: "FLUTTERWAVE" },
    payoutMethods: ["mobile_money", "bank_transfer"],
    disputeWindowDays: 7,
    enabled: false,
  },
  IN: {
    code: "IN",
    name: "India",
    currency: "INR",
    timezone: "Asia/Kolkata",
    locale: "en-IN",
    phonePrefix: "+91",
    providers: { primary: "STRIPE" },
    payoutMethods: ["bank_transfer", "upi"],
    disputeWindowDays: 10,
    enabled: false,
  },
  AE: {
    code: "AE",
    name: "United Arab Emirates",
    currency: "AED",
    timezone: "Asia/Dubai",
    locale: "en-AE",
    phonePrefix: "+971",
    providers: { primary: "STRIPE" },
    payoutMethods: ["bank_transfer"],
    disputeWindowDays: 7,
    enabled: false,
  },
  SG: {
    code: "SG",
    name: "Singapore",
    currency: "SGD",
    timezone: "Asia/Singapore",
    locale: "en-SG",
    phonePrefix: "+65",
    providers: { primary: "STRIPE" },
    payoutMethods: ["bank_transfer"],
    disputeWindowDays: 10,
    enabled: false,
  },
};

export function getCountry(code: string): CountryConfig | undefined {
  return COUNTRIES[code.toUpperCase()];
}

export function getEnabledCountries(): CountryConfig[] {
  return Object.values(COUNTRIES).filter((c) => c.enabled);
}

export function getAllCountries(): CountryConfig[] {
  return Object.values(COUNTRIES);
}

export function isCountryEnabled(code: string): boolean {
  return COUNTRIES[code.toUpperCase()]?.enabled ?? false;
}

export function getDefaultCountry(): CountryConfig {
  return COUNTRIES["NG"]!;
}
