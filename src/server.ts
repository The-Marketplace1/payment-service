import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { initQueues, closeQueues } from "./services/queue.service.js";
import app from "./app.js";

async function startServer(): Promise<void> {
  logger.info(
    { service: "payment-service", env: env.NODE_ENV },
    "Starting payment service...",
  );

  await connectDatabase();
  logger.info("Database connection established");

  initQueues();

  const server = app.listen(env.PORT, () => {
    logger.info(
      { port: env.PORT, env: env.NODE_ENV },
      `Payment service listening on port ${env.PORT}`,
    );
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Shutdown signal received");
    server.close(async () => {
      logger.info("HTTP server closed");
      await closeQueues();
      await disconnectDatabase();
      logger.info("Payment service shut down gracefully");
      process.exit(0);
    });

    setTimeout(() => {
      logger.error("Forced shutdown after timeout");
      process.exit(1);
    }, 10_000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("uncaughtException", (err) => {
    logger.fatal({ err }, "Uncaught exception — shutting down");
    process.exit(1);
  });
  process.on("unhandledRejection", (reason) => {
    const msg = reason instanceof Error ? reason.message : String(reason);
    if (msg.includes("ECONNREFUSED") || msg.includes("connect ECONNREFUSED")) {
      logger.warn({ reason: msg }, "Unhandled rejection from background connection (Redis?) — ignoring, service continues");
      return;
    }
    logger.error({ reason }, "Unhandled rejection");
  });
}

export { startServer };
