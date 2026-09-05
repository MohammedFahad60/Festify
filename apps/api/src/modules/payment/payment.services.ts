import { randomUUID } from "node:crypto";
import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";

function createTicketCode() {
  return `FST-${randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase()}`;
}

async function issueTickets(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  orderId: string,
  userId: string,
  items: Array<{ ticketTypeId: string; quantity: number }>
) {
  const existingTickets = await tx.ticket.findMany({
    where: { orderId },
    select: { ticketTypeId: true },
  });
  const issuedByType = new Map<string, number>();

  for (const ticket of existingTickets) {
    issuedByType.set(
      ticket.ticketTypeId,
      (issuedByType.get(ticket.ticketTypeId) ?? 0) + 1
    );
  }

  for (const item of items) {
    const missing = item.quantity - (issuedByType.get(item.ticketTypeId) ?? 0);
    if (missing <= 0) {
      continue;
    }

    await tx.ticket.createMany({
      data: Array.from({ length: missing }, () => ({
        orderId,
        ticketTypeId: item.ticketTypeId,
        userId,
        ticketCode: createTicketCode(),
        status: "ACTIVE" as const,
      })),
    });
  }
}

const paymentSelect = {
  id: true,
  orderId: true,
  provider: true,
  providerPaymentId: true,
  amount: true,
  currency: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function createPayment(userId: string, orderId: string) {
  return prisma.$transaction(async (tx: any) => {
    const order = await tx.order.findUnique({
      where: {
        id: orderId,
      },
      include: {
        items: true,
      },
    });

    if (!order) {
      throw new Error("ORDER_NOT_FOUND");
    }

    if (order.userId !== userId) {
      throw new Error("ORDER_NOT_OWNED");
    }

    if (order.status !== "PENDING") {
      throw new Error("ORDER_NOT_PENDING");
    }

    if (order.items.length === 0) {
      throw new Error("ORDER_HAS_NO_ITEMS");
    }

    const existingPayment = await tx.payment.findFirst({
      where: {
        orderId,
        status: {
          in: ["CREATED", "PENDING"],
        },
      },
      select: {
        ...paymentSelect,
      },
    });

    if (existingPayment) {
      return existingPayment;
    }

    return tx.payment.create({
      data: {
        orderId,
        provider: "MOCK",
        amount: new Prisma.Decimal(order.totalAmount),
        currency: "INR",
        status: "CREATED",
      },
      select: paymentSelect,
    });
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });
}

export async function getOrderPayment(userId: string, orderId: string) {
  const order = await prisma.order.findUnique({
    where: {
      id: orderId,
    },
    select: {
      userId: true,
    },
  });

  if (!order) {
    throw new Error("ORDER_NOT_FOUND");
  }

  if (order.userId !== userId) {
    throw new Error("ORDER_NOT_OWNED");
  }

  const payment = await prisma.payment.findFirst({
    where: {
      orderId,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: paymentSelect,
  });

  if (!payment) {
    throw new Error("PAYMENT_NOT_FOUND");
  }

  return payment;
}

async function findOwnedPayment(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  userId: string,
  paymentId: string
) {
  const payment = await tx.payment.findUnique({
    where: {
      id: paymentId,
    },
    include: {
      order: {
        select: {
          userId: true,
          status: true,
        },
      },
    },
  });

  if (!payment) {
    throw new Error("PAYMENT_NOT_FOUND");
  }

  if (payment.order.userId !== userId) {
    throw new Error("PAYMENT_NOT_OWNED");
  }

  return payment;
}

export async function markPaymentSuccess(userId: string, paymentId: string) {
  return prisma.$transaction(async (tx: any) => {
    const payment = await findOwnedPayment(tx, userId, paymentId);

    if (payment.status === "SUCCESS") {
      const order = await tx.order.findUniqueOrThrow({
        where: { id: payment.orderId },
        include: { items: true },
      });
      if (order.status === "PENDING") {
        await tx.order.updateMany({
          where: { id: payment.orderId, status: "PENDING" },
          data: { status: "CONFIRMED" },
        });
      }
      await issueTickets(tx, order.id, order.userId, order.items);

      return tx.payment.findUniqueOrThrow({
        where: { id: paymentId },
        select: paymentSelect,
      });
    }

    if (!["CREATED", "PENDING"].includes(payment.status)) {
      throw new Error("PAYMENT_NOT_PENDING");
    }

    if (payment.order.status !== "PENDING") {
      throw new Error("ORDER_NOT_PENDING");
    }

    const providerPaymentId = `mock_${randomUUID()}`;

    const updatedCount = await tx.payment.updateMany({
      where: {
        id: paymentId,
        status: { in: ["CREATED", "PENDING"] },
      },
      data: {
        status: "SUCCESS",
        providerPaymentId,
      },
    });

    if (updatedCount.count !== 1) {
      throw new Error("PAYMENT_NOT_PENDING");
    }

    const updatedPayment = await tx.payment.findUniqueOrThrow({
      where: { id: paymentId },
      select: paymentSelect,
    });

    const confirmedOrder = await tx.order.updateMany({
      where: {
        id: payment.orderId,
        status: "PENDING",
      },
      data: {
        status: "CONFIRMED",
      },
    });

    if (confirmedOrder.count !== 1) {
      throw new Error("ORDER_NOT_PENDING");
    }

    const orderItems = await tx.orderItem.findMany({
      where: { orderId: payment.orderId },
      select: { ticketTypeId: true, quantity: true },
    });
    await issueTickets(tx, payment.orderId, payment.order.userId, orderItems);

    return updatedPayment;
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });
}

export async function markPaymentFailed(userId: string, paymentId: string) {
  return prisma.$transaction(async (tx: any) => {
    const payment = await findOwnedPayment(tx, userId, paymentId);

    if (!["CREATED", "PENDING"].includes(payment.status)) {
      throw new Error("PAYMENT_NOT_PENDING");
    }

    if (payment.order.status !== "PENDING") {
      throw new Error("ORDER_NOT_PENDING");
    }

    const updated = await tx.payment.updateMany({
      where: {
        id: paymentId,
        status: { in: ["CREATED", "PENDING"] },
      },
      data: {
        status: "FAILED",
      },
    });

    if (updated.count !== 1) {
      throw new Error("PAYMENT_NOT_PENDING");
    }

    return tx.payment.findUniqueOrThrow({
      where: { id: paymentId },
      select: paymentSelect,
    });
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });
}
