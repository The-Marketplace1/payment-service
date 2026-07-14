import { PrismaClient, PaymentProvider, PaymentStatus, EscrowStatus, TransactionType, TransactionStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding payment service database...");

  const payment = await prisma.payment.upsert({
    where: { reference: "seed-payment-001" },
    update: {},
    create: {
      userId: "user-seed-001",
      amount: 50000,
      currency: "USD",
      status: PaymentStatus.COMPLETED,
      provider: PaymentProvider.STRIPE,
      reference: "seed-payment-001",
      providerRef: "pi_seed_001",
      metadata: { source: "seed" },
    },
  });

  await prisma.escrow.upsert({
    where: { bookingId: "booking-seed-001" },
    update: {},
    create: {
      bookingId: "booking-seed-001",
      payerId: "user-seed-001",
      payeeId: "professional-seed-001",
      amount: 50000,
      currency: "USD",
      status: EscrowStatus.HELD,
      paymentId: payment.id,
      releaseConditions: { requiresCompletion: true, autoReleaseAfterDays: 7 },
    },
  });

  await prisma.transaction.create({
    data: {
      paymentId: payment.id,
      type: TransactionType.PAYMENT,
      status: TransactionStatus.COMPLETED,
      amount: 50000,
      currency: "USD",
    },
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
