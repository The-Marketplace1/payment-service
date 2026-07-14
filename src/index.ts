import { startServer } from "./server.js";
import { logger } from "./config/logger.js";

startServer().catch((err) => {
  logger.fatal({ err }, "Failed to start payment service");
  process.exit(1);
});
