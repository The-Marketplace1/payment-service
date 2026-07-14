export type { CurrencyConfig } from "../../config/currencies.config.js";

export {
  getCurrency,
  getEnabledCurrencies,
  getAllCurrencies,
  isCurrencyEnabled,
  formatAmount,
  toSmallestUnit,
  fromSmallestUnit,
} from "../../config/currencies.config.js";

export type SupportedCurrency = string;

export { getEnabledCurrencies as getSupportedCurrencies } from "../../config/currencies.config.js";
export { isCurrencyEnabled as isSupportedCurrency } from "../../config/currencies.config.js";
