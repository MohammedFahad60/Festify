import { prisma } from "../../lib/prisma.js";
import { Prisma } from "../../generated/prisma/client.js";

const ticketSelect = {
  id: true,
  orderId: true,
  ticketTypeId: true,
  userId: true,
  ticketCode: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  ticketType: {
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      festival: {
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
          venue: true,
        },
      },
    },
  },
  order: {
    select: {
      id: true,
      status: true,
      totalAmount: true,
      createdAt: true,
      payments: {
        where: { status: "SUCCESS" },
        select: { id: true, status: true, amount: true, currency: true },
      },
    },
  },
} as const;

export async function getUserTickets(userId: string) {
  return prisma.ticket.findMany({
    where: { userId },
    select: ticketSelect,
    orderBy: [
      { createdAt: "desc" },
      { ticketType: { festival: { startDate: "asc" } } },
    ],
  });
}

export async function getUserTicket(userId: string, ticketId: string) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: ticketSelect,
  });

  if (!ticket) {
    throw new Error("TICKET_NOT_FOUND");
  }

  if (ticket.userId !== userId) {
    throw new Error("TICKET_NOT_OWNED");
  }

  return ticket;
}

const scanTicketSelect = {
  id: true,
  ticketCode: true,
  status: true,
  ticketType: {
    select: {
      name: true,
      festival: {
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
          organizerId: true,
          venue: true,
        },
      },
    },
  },
  user: {
    select: {
      id: true,
      name: true,
    },
  },
  order: {
    select: {
      status: true,
      payments: {
        where: { status: "SUCCESS" },
        select: { id: true },
      },
    },
  },
} as const;

async function getOrganizerId(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  userId: string
) {
  const organizer = await tx.organizer.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!organizer) {
    throw new Error("ORGANIZER_NOT_FOUND");
  }

  return organizer.id;
}

async function findScannableTicket(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  organizerId: string,
  ticketCode: string
) {
  const ticket = await tx.ticket.findUnique({
    where: { ticketCode },
    select: scanTicketSelect,
  });

  if (!ticket) {
    throw new Error("TICKET_NOT_FOUND");
  }

  if (ticket.ticketType.festival.organizerId !== organizerId) {
    throw new Error("TICKET_NOT_OWNED_BY_ORGANIZER");
  }

  return ticket;
}

function getTicketValidity(ticket: {
  status: string;
  order: { status: string; payments: Array<{ id: string }> };
}) {
  if (ticket.status !== "ACTIVE") {
    return { valid: false, reason: `TICKET_${ticket.status}` };
  }

  if (ticket.order.status !== "CONFIRMED") {
    return { valid: false, reason: "ORDER_NOT_CONFIRMED" };
  }

  if (ticket.order.payments.length === 0) {
    return { valid: false, reason: "PAYMENT_NOT_SUCCESSFUL" };
  }

  return { valid: true, reason: null };
}

export async function validateTicket(userId: string, ticketCode: string) {
  return prisma.$transaction(async (tx: any) => {
    const organizerId = await getOrganizerId(tx, userId);
    const ticket = await findScannableTicket(tx, organizerId, ticketCode);
    const validity = getTicketValidity(ticket);

    return {
      valid: validity.valid,
      reason: validity.reason,
      ticket,
    };
  });
}

export async function checkInTicket(userId: string, ticketCode: string) {
  return prisma.$transaction(async (tx: any) => {
    const organizerId = await getOrganizerId(tx, userId);
    const ticket = await findScannableTicket(tx, organizerId, ticketCode);
    const validity = getTicketValidity(ticket);

    if (!validity.valid) {
      throw new Error(validity.reason ?? "TICKET_NOT_VALID");
    }

    const updated = await tx.ticket.updateMany({
      where: {
        id: ticket.id,
        status: "ACTIVE",
      },
      data: {
        status: "USED",
      },
    });

    if (updated.count !== 1) {
      throw new Error("TICKET_ALREADY_USED");
    }

    return tx.ticket.findUniqueOrThrow({
      where: { id: ticket.id },
      select: scanTicketSelect,
    });
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });
}