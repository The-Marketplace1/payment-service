import { Queue, Worker, type Job, type ConnectionOptions } from "bullmq";
import { env } from "../config/env.js";
import { CONSTANTS } from "../config/constants.js";
import { logger } from "../config/logger.js";
import { escrowService } from "./escrow.service.js";
import { webhookService } from "./webhook.service.js";
import type { ReleaseEscrowDto, RefundEscrowDto, DisputeEscrowDto } from "../types/escrow.types.js";
import type { IncomingWebhookEvent } from "../types/webhook.types.js";

function getConnection(): ConnectionOptions {
  const url = new URL(env.REDIS_URL.startsWith("redis://") ? env.REDIS_URL : `redis://${env.REDIS_URL}`);
  return {
    host: url.hostname,
    port: Number(url.port) || 6379,
    ...(url.password && { password: url.password }),
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
  } as ConnectionOptions;
}

export let escrowQueue: Queue | null = null;
export let webhookQueue: Queue | null = null;

export function initQueues(): void {
  try {
    const connection = getConnection();

    escrowQueue = new Queue(CONSTANTS.QUEUES.ESCROW_PROCESSING, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 1000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      },
    });

    webhookQueue = new Queue(CONSTANTS.QUEUES.WEBHOOK_PROCESSING, {
      connection,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: { count: 200 },
        removeOnFail: { count: 100 },
      },
    });

    startEscrowWorker(connection);
    startWebhookWorker(connection);

    logger.info("BullMQ queues and workers initialized");
  } catch (err) {
    logger.warn({ err }, "Redis unavailable — queues disabled (running without async processing)");
  }
}

function startEscrowWorker(connection: ConnectionOptions): void {
  const worker = new Worker(
    CONSTANTS.QUEUES.ESCROW_PROCESSING,
    async (job: Job) => {
      logger.info({ jobId: job.id, name: job.name }, "Processing escrow job");

      switch (job.name) {
        case CONSTANTS.JOBS.RELEASE_ESCROW:
          await escrowService.releaseEscrow(job.data as ReleaseEscrowDto);
          break;
        case CONSTANTS.JOBS.REFUND_ESCROW:
          await escrowService.refundEscrow(job.data as RefundEscrowDto);
          break;
        case CONSTANTS.JOBS.DISPUTE_ESCROW:
          await escrowService.disputeEscrow(job.data as DisputeEscrowDto);
          break;
        default:
          logger.warn({ jobName: job.name }, "Unknown escrow job type");
      }
    },
    { connection, concurrency: 5 },
  );

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id, name: job.name }, "Escrow job completed");
  });
  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Escrow job failed");
  });
}

function startWebhookWorker(connection: ConnectionOptions): void {
  const worker = new Worker(
    CONSTANTS.QUEUES.WEBHOOK_PROCESSING,
    async (job: Job) => {
      logger.info({ jobId: job.id, provider: (job.data as IncomingWebhookEvent).provider }, "Processing webhook job");
      await webhookService.processWebhook(job.data as IncomingWebhookEvent);
    },
    { connection, concurrency: 10 },
  );

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id }, "Webhook job completed");
  });
  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Webhook job failed");
  });
}

export async function enqueueEscrowJob(
  jobName: string,
  data: Record<string, unknown>,
  opts?: { delay?: number },
): Promise<void> {
  if (!escrowQueue) {
    logger.warn({ jobName }, "Escrow queue unavailable — processing synchronously");
    return;
  }
  await escrowQueue.add(jobName, data, opts);
}

export async function enqueueWebhookJob(event: IncomingWebhookEvent): Promise<void> {
  if (!webhookQueue) {
    logger.warn("Webhook queue unavailable — processing synchronously");
    await webhookService.processWebhook(event);
    return;
  }
  await webhookQueue.add(CONSTANTS.JOBS.PROCESS_WEBHOOK, event);
}

export async function closeQueues(): Promise<void> {
  if (escrowQueue) await escrowQueue.close();
  if (webhookQueue) await webhookQueue.close();
  logger.info("Queues closed");
}
