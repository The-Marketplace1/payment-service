import { getCurrency } from "../config/currencies.config.js";

const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF", "CLP", "GNF", "JPY", "KMF", "KRW", "MGA", "PYG",
  "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF",
]);

function decimalsFor(currency: string): number {
  const upper = currency.toUpperCase();
  if (ZERO_DECIMAL_CURRENCIES.has(upper)) return 0;
  return getCurrency(upper)?.decimals ?? 2;
}

export function toSmallestUnit(amount: number, currency = "NGN"): number {
  const decimals = decimalsFor(currency);
  return Math.round(amount * Math.pow(10, decimals));
}

export function fromSmallestUnit(amount: number, currency = "NGN"): number {
  const decimals = decimalsFor(currency);
  return amount / Math.pow(10, decimals);
}

export function formatAmount(amount: number, currency = "NGN"): string {
  const decimal = fromSmallestUnit(amount, currency);
  const upper = currency.toUpperCase();
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: upper,
      minimumFractionDigits: decimalsFor(currency),
    }).format(decimal);
  } catch {
    const c = getCurrency(upper);
    return `${c?.symbol ?? upper}${decimal.toFixed(decimalsFor(currency))}`;
  }
}

export function addAmounts(...amounts: number[]): number {
  return amounts.reduce((sum, a) => sum + a, 0);
}

export function validateAmount(amount: number): boolean {
  return Number.isInteger(amount) && amount > 0;
}

export function calculatePlatformFee(amount: number, feePercent = 2.5): number {
  return Math.round(amount * (feePercent / 100));
}
