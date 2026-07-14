export interface CurrencyConfig {
  code: string;
  name: string;
  symbol: string;
  decimals: number;
  smallestUnit: string;
  enabled: boolean;
}

export const CURRENCIES: Record<string, CurrencyConfig> = {
  // ─── Africa ───────────────────────────────────────────────────────────────
  NGN: { code: "NGN", name: "Nigerian Naira",       symbol: "₦",  decimals: 2, smallestUnit: "kobo",    enabled: true  },
  KES: { code: "KES", name: "Kenyan Shilling",      symbol: "KSh",decimals: 2, smallestUnit: "cent",    enabled: false },
  GHS: { code: "GHS", name: "Ghanaian Cedi",        symbol: "₵",  decimals: 2, smallestUnit: "pesewa",  enabled: false },
  ZAR: { code: "ZAR", name: "South African Rand",   symbol: "R",  decimals: 2, smallestUnit: "cent",    enabled: false },
  UGX: { code: "UGX", name: "Ugandan Shilling",     symbol: "USh",decimals: 0, smallestUnit: "shilling",enabled: false },
  TZS: { code: "TZS", name: "Tanzanian Shilling",   symbol: "TSh",decimals: 2, smallestUnit: "cent",    enabled: false },
  RWF: { code: "RWF", name: "Rwandan Franc",        symbol: "RF", decimals: 0, smallestUnit: "franc",   enabled: false },
  XOF: { code: "XOF", name: "West African CFA",     symbol: "CFA",decimals: 0, smallestUnit: "centime", enabled: false },
  XAF: { code: "XAF", name: "Central African CFA",  symbol: "CFA",decimals: 0, smallestUnit: "centime", enabled: false },
  EGP: { code: "EGP", name: "Egyptian Pound",       symbol: "E£", decimals: 2, smallestUnit: "piastre", enabled: false },

  // ─── Americas ─────────────────────────────────────────────────────────────
  USD: { code: "USD", name: "US Dollar",            symbol: "$",  decimals: 2, smallestUnit: "cent",    enabled: false },
  CAD: { code: "CAD", name: "Canadian Dollar",      symbol: "CA$",decimals: 2, smallestUnit: "cent",    enabled: false },
  BRL: { code: "BRL", name: "Brazilian Real",       symbol: "R$", decimals: 2, smallestUnit: "centavo", enabled: false },
  MXN: { code: "MXN", name: "Mexican Peso",         symbol: "MX$",decimals: 2, smallestUnit: "centavo", enabled: false },

  // ─── Europe ───────────────────────────────────────────────────────────────
  EUR: { code: "EUR", name: "Euro",                 symbol: "€",  decimals: 2, smallestUnit: "cent",    enabled: false },
  GBP: { code: "GBP", name: "British Pound",        symbol: "£",  decimals: 2, smallestUnit: "penny",   enabled: false },
  CHF: { code: "CHF", name: "Swiss Franc",          symbol: "Fr", decimals: 2, smallestUnit: "rappen",  enabled: false },
  SEK: { code: "SEK", name: "Swedish Krona",        symbol: "kr", decimals: 2, smallestUnit: "öre",     enabled: false },
  NOK: { code: "NOK", name: "Norwegian Krone",      symbol: "kr", decimals: 2, smallestUnit: "øre",     enabled: false },
  DKK: { code: "DKK", name: "Danish Krone",         symbol: "kr", decimals: 2, smallestUnit: "øre",     enabled: false },
  PLN: { code: "PLN", name: "Polish Złoty",         symbol: "zł", decimals: 2, smallestUnit: "grosz",   enabled: false },

  // ─── Asia-Pacific ─────────────────────────────────────────────────────────
  INR: { code: "INR", name: "Indian Rupee",         symbol: "₹",  decimals: 2, smallestUnit: "paise",   enabled: false },
  AUD: { code: "AUD", name: "Australian Dollar",    symbol: "A$", decimals: 2, smallestUnit: "cent",    enabled: false },
  NZD: { code: "NZD", name: "New Zealand Dollar",   symbol: "NZ$",decimals: 2, smallestUnit: "cent",    enabled: false },
  SGD: { code: "SGD", name: "Singapore Dollar",     symbol: "S$", decimals: 2, smallestUnit: "cent",    enabled: false },
  JPY: { code: "JPY", name: "Japanese Yen",         symbol: "¥",  decimals: 0, smallestUnit: "yen",     enabled: false },
  HKD: { code: "HKD", name: "Hong Kong Dollar",     symbol: "HK$",decimals: 2, smallestUnit: "cent",    enabled: false },
  PHP: { code: "PHP", name: "Philippine Peso",      symbol: "₱",  decimals: 2, smallestUnit: "centavo", enabled: false },
  MYR: { code: "MYR", name: "Malaysian Ringgit",    symbol: "RM", decimals: 2, smallestUnit: "sen",      enabled: false },
  IDR: { code: "IDR", name: "Indonesian Rupiah",    symbol: "Rp", decimals: 0, smallestUnit: "rupiah",  enabled: false },

  // ─── Middle East ──────────────────────────────────────────────────────────
  AED: { code: "AED", name: "UAE Dirham",           symbol: "AED",decimals: 2, smallestUnit: "fils",    enabled: false },
  SAR: { code: "SAR", name: "Saudi Riyal",          symbol: "SR", decimals: 2, smallestUnit: "halala",  enabled: false },
};

export function getCurrency(code: string): CurrencyConfig | undefined {
  return CURRENCIES[code.toUpperCase()];
}

export function getEnabledCurrencies(): CurrencyConfig[] {
  return Object.values(CURRENCIES).filter((c) => c.enabled);
}

export function getAllCurrencies(): CurrencyConfig[] {
  return Object.values(CURRENCIES);
}

export function isCurrencyEnabled(code: string): boolean {
  return CURRENCIES[code.toUpperCase()]?.enabled ?? false;
}

export function formatAmount(amountInSmallestUnit: number, currencyCode: string): string {
  const c = getCurrency(currencyCode);
  if (!c) return `${amountInSmallestUnit} ${currencyCode}`;
  const divisor = Math.pow(10, c.decimals);
  const formatted = c.decimals === 0
    ? amountInSmallestUnit.toLocaleString()
    : (amountInSmallestUnit / divisor).toFixed(c.decimals);
  return `${c.symbol}${formatted}`;
}

export function toSmallestUnit(amount: number, currencyCode: string): number {
  const c = getCurrency(currencyCode);
  const decimals = c?.decimals ?? 2;
  return Math.round(amount * Math.pow(10, decimals));
}

export function fromSmallestUnit(amountInSmallestUnit: number, currencyCode: string): number {
  const c = getCurrency(currencyCode);
  const decimals = c?.decimals ?? 2;
  return amountInSmallestUnit / Math.pow(10, decimals);
}
