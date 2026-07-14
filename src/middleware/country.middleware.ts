import type { Request, Response, NextFunction } from "express";
import { getCountry, getDefaultCountry, type CountryConfig } from "../config/countries.config.js";
import { getCurrency, type CurrencyConfig } from "../config/currencies.config.js";

declare global {
  namespace Express {
    interface Request {
      country: CountryConfig;
      currency: CurrencyConfig;
    }
  }
}

export function countryMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const headerCode = req.headers["x-country-code"] as string | undefined;
  const code = headerCode?.toUpperCase() ?? "NG";

  const country = getCountry(code) ?? getDefaultCountry();

  const currencyOverride = req.headers["x-currency"] as string | undefined;
  const currencyCode = currencyOverride?.toUpperCase() ?? country.currency;
  const currency = getCurrency(currencyCode) ?? getCurrency(country.currency)!;

  req.country = country;
  req.currency = currency;

  next();
}
