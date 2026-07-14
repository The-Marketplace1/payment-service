import { prisma } from "../config/database.js";

export interface RevenueReport {
  period: string;
  totalGross: number;
  totalCommission: number;
  totalNet: number;
  transactionCount: number;
  currency: string;
}

export interface EscrowStatusReport {
  status: string;
  count: number;
  totalAmount: number;
}

export interface AdminDashboard {
  totalRevenue: number;
  totalCommission: number;
  activeEscrows: number;
  pendingPayouts: number;
  refundVolume: number;
  openDisputes: number;
  chargebacks: number;
  expiredEscrows: number;
}

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setUTCHours(0, 0, 0, 0);
  return r;
}

function startOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export const reportsService = {
  async getRevenue(period: "daily" | "monthly", date = new Date()): Promise<RevenueReport> {
    const from = period === "daily" ? startOfDay(date) : startOfMonth(date);
    const to = new Date();

    const commissions = await prisma.ledgerEntry.aggregate({
      where: { type: "COMMISSION", createdAt: { gte: from, lte: to } },
      _sum: { amount: true },
      _count: { id: true },
    });
    const payouts = await prisma.ledgerEntry.aggregate({
      where: { type: "PAYOUT", createdAt: { gte: from, lte: to } },
      _sum: { amount: true },
    });

    const commission = commissions._sum.amount ?? 0;
    const net = payouts._sum.amount ?? 0;

    return {
      period: period === "daily" ? from.toISOString().slice(0, 10) : from.toISOString().slice(0, 7),
      totalGross: commission + net,
      totalCommission: commission,
      totalNet: net,
      transactionCount: commissions._count.id,
      currency: "NGN",
    };
  },

  async getCommissions(from: Date, to: Date) {
    const entries = await prisma.ledgerEntry.findMany({
      where: { type: "COMMISSION", createdAt: { gte: from, lte: to } },
      include: { escrow: { select: { bookingId: true, currency: true, commissionRate: true } } },
      orderBy: { createdAt: "desc" },
    });

    const total = entries.reduce((s, e) => s + e.amount, 0);
    return { from: from.toISOString(), to: to.toISOString(), total, count: entries.length, entries };
  },

  async getPayouts(from: Date, to: Date) {
    const entries = await prisma.ledgerEntry.findMany({
      where: { type: "PAYOUT", createdAt: { gte: from, lte: to } },
      include: { escrow: { select: { bookingId: true, payeeId: true, currency: true } } },
      orderBy: { createdAt: "desc" },
    });

    const total = entries.reduce((s, e) => s + e.amount, 0);
    const failedEscrows = await prisma.escrow.count({ where: { status: "PAYOUT_FAILED" } });

    return { from: from.toISOString(), to: to.toISOString(), total, count: entries.length, failedPayouts: failedEscrows, entries };
  },

  async getRefunds(from: Date, to: Date) {
    const entries = await prisma.ledgerEntry.findMany({
      where: { type: "REFUND", createdAt: { gte: from, lte: to } },
      include: { escrow: { select: { bookingId: true, payerId: true, currency: true } } },
      orderBy: { createdAt: "desc" },
    });

    const total = entries.reduce((s, e) => s + e.amount, 0);
    return { from: from.toISOString(), to: to.toISOString(), total, count: entries.length, entries };
  },

  async getEscrowOverview(): Promise<EscrowStatusReport[]> {
    const groups = await prisma.escrow.groupBy({
      by: ["status"],
      _count: { id: true },
      _sum: { amount: true },
    });

    return groups.map((g) => ({
      status: g.status,
      count: g._count.id,
      totalAmount: g._sum.amount ?? 0,
    }));
  },

  async getDashboard(): Promise<AdminDashboard> {
    const [
      commissionTotal,
      payoutTotal,
      activeEscrows,
      pendingPayouts,
      refundTotal,
      openDisputes,
      chargebacks,
      expiredEscrows,
    ] = await Promise.all([
      prisma.ledgerEntry.aggregate({ where: { type: "COMMISSION" }, _sum: { amount: true } }),
      prisma.ledgerEntry.aggregate({ where: { type: "PAYOUT" }, _sum: { amount: true } }),
      prisma.escrow.count({ where: { status: { in: ["HELD", "FUNDED"] } } }),
      prisma.escrow.count({ where: { status: { in: ["RELEASE_PENDING", "PAYOUT_FAILED"] } } }),
      prisma.ledgerEntry.aggregate({ where: { type: "REFUND" }, _sum: { amount: true } }),
      prisma.escrow.count({ where: { status: "DISPUTED" } }),
      prisma.escrow.count({ where: { status: "CHARGEBACK" } }),
      prisma.escrow.count({ where: { status: "EXPIRED" } }),
    ]);

    return {
      totalRevenue: (commissionTotal._sum.amount ?? 0) + (payoutTotal._sum.amount ?? 0),
      totalCommission: commissionTotal._sum.amount ?? 0,
      activeEscrows,
      pendingPayouts,
      refundVolume: refundTotal._sum.amount ?? 0,
      openDisputes,
      chargebacks,
      expiredEscrows,
    };
  },

  async exportAuditLedger(from: Date, to: Date, format: "json" | "csv") {
    const entries = await prisma.ledgerEntry.findMany({
      where: { createdAt: { gte: from, lte: to } },
      include: { escrow: { select: { bookingId: true, payerId: true, payeeId: true, currency: true } } },
      orderBy: { createdAt: "asc" },
    });

    if (format === "json") return { count: entries.length, entries };

    const header = "id,escrowId,bookingId,type,amount,currency,actorId,description,createdAt";
    const rows = entries.map((e) =>
      [
        e.id,
        e.escrowId,
        e.escrow.bookingId,
        e.type,
        e.amount,
        e.currency,
        e.actorId ?? "",
        `"${(e.description ?? "").replace(/"/g, '""')}"`,
        e.createdAt.toISOString(),
      ].join(","),
    );

    return [header, ...rows].join("\n");
  },
};
