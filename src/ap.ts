import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import { logger } from "./config/logger.js";
import { requestIdMiddleware } from "./middleware/request-id.middleware.js";
import { countryMiddleware } from "./middleware/country.middleware.js";
import { errorMiddleware, notFoundMiddleware } from "./middleware/error.middleware.js";
import router from "./routes/index.js";
import { CONSTANTS } from "./config/constants.js";
import { env } from "./config/env.js";

const app: Express = express();

app.use(requestIdMiddleware);
app.use(countryMiddleware);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use(helmet());

app.use(
  cors({
    origin: env.NODE_ENV === "production" ? false : "*",
    credentials: true,
  }),
);

app.use(
  rateLimit({
    windowMs: CONSTANTS.RATE_LIMIT.WINDOW_MS,
    max: CONSTANTS.RATE_LIMIT.MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path.startsWith("/api/v1/webhooks/"),
  }),
);

app.use(
  "/api/v1/webhooks",
  express.raw({ type: "application/json" }),
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
