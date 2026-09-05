import { prisma } from "../../lib/prisma.js";

interface CreateTicketTypeInput {
  name: string;
  description?: string;
  price: number;
  quantity: number;
  saleStart: string;
  saleEnd: string;
  maxPerUser?: number;
}

export async function createTicketType(
  userId: string,
  festivalId: string,
  input: CreateTicketTypeInput
) {
  const organizer = await prisma.organizer.findUnique({
    where: {
      userId,
    },
  });

  if (!organizer) {
    throw new Error("ORGANIZER_NOT_FOUND");
  }

  if (organizer.verificationStatus !== "APPROVED") {
    throw new Error("ORGANIZER_NOT_APPROVED");
  }

  const festival = await prisma.festival.findUnique({
    where: {
      id: festivalId,
    },
  });

  if (!festival) {
    throw new Error("FESTIVAL_NOT_FOUND");
  }

  if (festival.organizerId !== organizer.id) {
    throw new Error("FESTIVAL_NOT_OWNED");
  }

  const saleStart = new Date(input.saleStart);
  const saleEnd = new Date(input.saleEnd);

  if (saleEnd <= saleStart) {
    throw new Error("INVALID_SALE_PERIOD");
  }

  const ticketType = await prisma.ticketType.create({
    data: {
      festivalId,

      name: input.name.trim(),
      description: input.description?.trim() || null,

      price: input.price,
      quantity: input.quantity,
      soldQuantity: 0,

      saleStart,
      saleEnd,

      maxPerUser: input.maxPerUser ?? null,

      status: "ACTIVE",
    },
  });

  return ticketType;
}