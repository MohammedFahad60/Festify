import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";

interface OrderItemInput {
  ticketTypeId: string;
  quantity: number;
}

interface CreateOrderInput {
  festivalId: string;
  items: OrderItemInput[];
}

const orderInclude = {
  festival: {
    include: {
      category: true,
      venue: true,
    },
  },
  items: {
    include: {
      ticketType: true,
    },
  },
  tickets: true,
} as const;

export async function createOrder(
  userId: string,
  input: CreateOrderInput
) {
  const now = new Date();
  const requestedItems = new Map<string, number>();

  for (const item of input.items) {
    requestedItems.set(
      item.ticketTypeId,
      (requestedItems.get(item.ticketTypeId) ?? 0) + item.quantity
    );
  }

  return prisma.$transaction(async (tx) => {
    const festival = await tx.festival.findUnique({
      where: {
        id: input.festivalId,
      },
    });

    if (!festival) {
      throw new Error("FESTIVAL_NOT_FOUND");
    }

    if (festival.status !== "PUBLISHED") {
      throw new Error("FESTIVAL_NOT_PUBLISHED");
    }

    if (festival.endDate <= now) {
      throw new Error("FESTIVAL_ENDED");
    }

    const orderItems: Array<{
      ticketTypeId: string;
      quantity: number;
      unitPrice: Prisma.Decimal;
      totalPrice: Prisma.Decimal;
    }> = [];
    let totalAmount = new Prisma.Decimal(0);

    for (const [ticketTypeId, quantity] of requestedItems) {
      const ticketType = await tx.ticketType.findUnique({
        where: {
          id: ticketTypeId,
        },
      });

      if (!ticketType) {
        throw new Error("TICKET_TYPE_NOT_FOUND");
      }

      if (ticketType.festivalId !== input.festivalId) {
        throw new Error("TICKET_TYPE_NOT_IN_FESTIVAL");
      }

      if (ticketType.status !== "ACTIVE") {
        throw new Error("TICKET_TYPE_NOT_ACTIVE");
      }

      if (now < ticketType.saleStart || now > ticketType.saleEnd) {
        throw new Error("TICKET_SALE_NOT_ACTIVE");
      }

      const priorQuantity = await tx.orderItem.aggregate({
        where: {
          ticketTypeId,
          order: {
            userId,
            status: {
              in: ["PENDING", "CONFIRMED"],
            },
          },
        },
        _sum: {
          quantity: true,
        },
      });

      const purchasedQuantity = priorQuantity._sum.quantity ?? 0;
      if (
        ticketType.maxPerUser !== null &&
        purchasedQuantity + quantity > ticketType.maxPerUser
      ) {
        throw new Error("MAX_PER_USER_EXCEEDED");
      }

      const reserved = await tx.ticketType.updateMany({
        where: {
          id: ticketType.id,
          festivalId: input.festivalId,
          status: "ACTIVE",
          soldQuantity: {
            lte: ticketType.quantity - quantity,
          },
        },
        data: {
          soldQuantity: {
            increment: quantity,
          },
        },
      });

      if (reserved.count !== 1) {
        throw new Error("INSUFFICIENT_INVENTORY");
      }

      const unitPrice = new Prisma.Decimal(ticketType.price);
      const totalPrice = unitPrice.mul(quantity);
      totalAmount = totalAmount.add(totalPrice);
      orderItems.push({
        ticketTypeId,
        quantity,
        unitPrice,
        totalPrice,
      });
    }

    return tx.order.create({
      data: {
        userId,
        festivalId: input.festivalId,
        status: "PENDING",
        totalAmount,
        items: {
          create: orderItems,
        },
      },
      include: orderInclude,
    });
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });
}

export async function confirmOrder(userId: string, orderId: string) {
  return prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
            where: {
                id: orderId,
            },
            include: {
                payments: {
                    where: {
                        status: "SUCCESS",
                    },
                    select: {
                        id: true,
                    },
                },
            },
    });

        if (!order) {
            throw new Error("ORDER_NOT_FOUND");
        }

        if (order.userId !== userId) {
            throw new Error("ORDER_NOT_OWNED");
        }

        if (order.status === "CONFIRMED") {
            return tx.order.findUniqueOrThrow({
                where: { id: orderId },
                include: orderInclude,
            });
        }

        if (order.status !== "PENDING") {
            throw new Error("ORDER_NOT_PENDING");
        }

        if (order.payments.length === 0) {
            throw new Error("PAYMENT_REQUIRED");
        }

        return tx.order.update({
            where: {
                id: orderId,
                status: "PENDING",
            },
            data: {
                status: "CONFIRMED",
            },
            include: orderInclude,
        });
    }, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
}

export async function getUserOrders(userId: string) {
  return prisma.order.findMany({
    where: {
      userId,
    },
    include: orderInclude,
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getUserOrder(userId: string, orderId: string) {
  const order = await prisma.order.findUnique({
    where: {
      id: orderId,
    },
    include: orderInclude,
  });

  if (!order) {
    throw new Error("ORDER_NOT_FOUND");
  }

  if (order.userId !== userId) {
    throw new Error("ORDER_NOT_OWNED");
  }

  return order;
}

export async function cancelOrder(userId: string, orderId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: {
        id: orderId,
      },
      include: {
        items: true,
        festival: true,
        payments: true,
      },
    });

    if (!order) {
      throw new Error("ORDER_NOT_FOUND");
    }

    if (order.userId !== userId) {
      throw new Error("ORDER_NOT_OWNED");
    }

    if (!["PENDING", "CONFIRMED"].includes(order.status)) {
      throw new Error("ORDER_NOT_CANCELLABLE");
    }

    if (order.payments.some((payment) => payment.status === "SUCCESS")) {
      throw new Error("ORDER_HAS_SUCCESSFUL_PAYMENT");
    }

    if (order.festival.startDate <= new Date()) {
      throw new Error("ORDER_NOT_CANCELLABLE");
    }

    for (const item of order.items) {
      const restored = await tx.ticketType.updateMany({
        where: {
          id: item.ticketTypeId,
          soldQuantity: {
            gte: item.quantity,
          },
        },
        data: {
          soldQuantity: {
            decrement: item.quantity,
          },
        },
      });

      if (restored.count !== 1) {
        throw new Error("INVENTORY_RESTORE_FAILED");
      }
    }

    await tx.payment.updateMany({
      where: {
        orderId,
        status: {
          in: ["CREATED", "PENDING"],
        },
      },
      data: {
        status: "CANCELLED",
      },
    });

    return tx.order.update({
      where: {
        id: orderId,
      },
      data: {
        status: "CANCELLED",
      },
      include: orderInclude,
    });
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });
}
