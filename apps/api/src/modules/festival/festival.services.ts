import { prisma } from "../../lib/prisma.js";
import { Prisma } from "../../generated/prisma/client.js";

interface CreateFestivalInput {
  name: string;
  description?: string;
  categoryId: string;
  venueId: string;
  banner?: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  capacity?: number;
  cancellationPolicy?: unknown;
}

function createSlug(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function createFestival(
  userId: string,
  input: CreateFestivalInput
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

  const category = await prisma.category.findUnique({
    where: {
      id: input.categoryId,
    },
  });

  if (!category) {
    throw new Error("CATEGORY_NOT_FOUND");
  }

  const venue = await prisma.venue.findUnique({
    where: {
      id: input.venueId,
    },
  });

  if (!venue) {
    throw new Error("VENUE_NOT_FOUND");
  }

  const startDate = new Date(input.startDate);
  const endDate = new Date(input.endDate);
  if (startDate >= endDate) {
    throw new Error("INVALID_DATE_RANGE");
  }

  const baseSlug = createSlug(input.name);

  let slug = baseSlug;
  let counter = 1;

  while (
    await prisma.festival.findUnique({
      where: {
        slug,
      },
    })
  ) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

return prisma.festival.create({
  data: {
    organizerId: organizer.id,
    categoryId: input.categoryId,
    venueId: input.venueId,

    name: input.name.trim(),
    slug,
    description: input.description?.trim() || null,
    banner: input.banner?.trim() || null,

    startDate: new Date(input.startDate),
    endDate: new Date(input.endDate),

    startTime: input.startTime || null,
    endTime: input.endTime || null,

    capacity: input.capacity ?? null,

    status: "DRAFT",

    cancellationPolicy:
      input.cancellationPolicy ?? Prisma.JsonNull,
  },
  include: {
    category: true,
    venue: true,
    organizer: true,
  },
});
}

export async function submitFestival(
  userId: string,
  festivalId: string
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

  if (festival.status !== "DRAFT") {
    throw new Error("FESTIVAL_ALREADY_SUBMITTED");
  }

  return prisma.festival.update({
    where: {
      id: festivalId,
    },
    data: {
      status: "SUBMITTED",
    },
    include: {
      category: true,
      venue: true,
      organizer: true,
    },
  });
}

const publicOrganizer = {
  select: {
    id: true,
    organizationName: true,
    description: true,
    verificationStatus: true,
    contactEmail: true,
    contactPhone: true,
    user: {
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        profileImage: true,
      },
    },
  },
} as const;

export async function publishFestival(
  userId: string,
  festivalId: string
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

  if (festival.status !== "APPROVED") {
    throw new Error("FESTIVAL_NOT_APPROVED");
  }

  return prisma.festival.update({
    where: {
      id: festivalId,
    },
    data: {
      status: "PUBLISHED",
    },
    include: {
      category: true,
      venue: true,
      organizer: {
        ...publicOrganizer,
      },
      ticketTypes: true,
    },
  });
}

export async function getPublishedFestivals() {
  return prisma.festival.findMany({
    where: {
      status: "PUBLISHED",
    },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      banner: true,
      startDate: true,
      endDate: true,
      startTime: true,
      endTime: true,
      capacity: true,
      status: true,
      category: true,
      venue: true,
      organizer: publicOrganizer,
      ticketTypes: true,
    },
    orderBy: {
      startDate: "asc",
    },
  });
}

export async function getPublishedFestival(festivalId: string) {
  const festival = await prisma.festival.findFirst({
    where: {
      id: festivalId,
      status: "PUBLISHED",
    },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      banner: true,
      startDate: true,
      endDate: true,
      startTime: true,
      endTime: true,
      capacity: true,
      status: true,
      category: true,
      venue: true,
      organizer: publicOrganizer,
      ticketTypes: true,
      images: true,
    },
  });

  if (!festival) {
    throw new Error("FESTIVAL_NOT_FOUND");
  }

  return festival;
}

const organizerFestivalSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  banner: true,
  startDate: true,
  endDate: true,
  startTime: true,
  endTime: true,
  capacity: true,
  status: true,
  cancellationPolicy: true,
  category: true,
  venue: true,
  ticketTypes: true,
} as const;

async function findOrganizer(userId: string) {
  const organizer = await prisma.organizer.findUnique({
    where: { userId },
    select: { id: true, verificationStatus: true },
  });
  if (!organizer) throw new Error("ORGANIZER_NOT_FOUND");
  if (organizer.verificationStatus !== "APPROVED") throw new Error("ORGANIZER_NOT_APPROVED");
  return organizer;
}

export async function getOrganizerFestivals(userId: string) {
  const organizer = await findOrganizer(userId);
  return prisma.festival.findMany({
    where: { organizerId: organizer.id },
    select: organizerFestivalSelect,
    orderBy: { startDate: "asc" },
  });
}

export async function getOrganizerFestival(userId: string, festivalId: string) {
  const organizer = await findOrganizer(userId);
  const festival = await prisma.festival.findFirst({
    where: { id: festivalId, organizerId: organizer.id },
    select: organizerFestivalSelect,
  });
  if (!festival) throw new Error("FESTIVAL_NOT_FOUND");
  return festival;
}

interface UpdateFestivalInput {
  name?: string;
  description?: string;
  categoryId?: string;
  venueId?: string;
  banner?: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  capacity?: number;
  cancellationPolicy?: unknown;
}

export async function updateFestival(
  userId: string,
  festivalId: string,
  input: UpdateFestivalInput
) {
  const organizer = await findOrganizer(userId);
  const festival = await prisma.festival.findUnique({ where: { id: festivalId } });

  if (!festival) throw new Error("FESTIVAL_NOT_FOUND");
  if (festival.organizerId !== organizer.id) throw new Error("FESTIVAL_NOT_OWNED");
  if (!["DRAFT", "REJECTED"].includes(festival.status)) throw new Error("FESTIVAL_NOT_EDITABLE");

  const startDate = input.startDate ? new Date(input.startDate) : festival.startDate;
  const endDate = input.endDate ? new Date(input.endDate) : festival.endDate;
  if (startDate >= endDate) throw new Error("INVALID_DATE_RANGE");

  if (input.categoryId) {
    const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
    if (!category) throw new Error("CATEGORY_NOT_FOUND");
  }

  if (input.venueId) {
    const venue = await prisma.venue.findUnique({ where: { id: input.venueId } });
    if (!venue) throw new Error("VENUE_NOT_FOUND");
  }

  return prisma.festival.update({
    where: { id: festivalId },
    data: {
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.description !== undefined && { description: input.description.trim() || null }),
      ...(input.categoryId !== undefined && { category: { connect: { id: input.categoryId } } }),
      ...(input.venueId !== undefined && { venue: { connect: { id: input.venueId } } }),
      ...(input.banner !== undefined && { banner: input.banner.trim() || null }),
      ...(input.startDate !== undefined && { startDate }),
      ...(input.endDate !== undefined && { endDate }),
      ...(input.startTime !== undefined && { startTime: input.startTime.trim() || null }),
      ...(input.endTime !== undefined && { endTime: input.endTime.trim() || null }),
      ...(input.capacity !== undefined && { capacity: input.capacity }),
      ...(input.cancellationPolicy !== undefined && {
        cancellationPolicy: input.cancellationPolicy === null
          ? Prisma.JsonNull
          : input.cancellationPolicy as Prisma.InputJsonValue,
      }),
    },
    include: { category: true, venue: true, organizer: true, ticketTypes: true },
  });
}
interface AddFestivalImageInput {
  imageUrl: string;
  altText?: string;
  sortOrder?: number;
}

export async function addFestivalImage(
  userId: string,
  festivalId: string,
  input: AddFestivalImageInput
) {
  const organizer = await findOrganizer(userId);
  const festival = await prisma.festival.findUnique({ where: { id: festivalId } });

  if (!festival) throw new Error("FESTIVAL_NOT_FOUND");
  if (festival.organizerId !== organizer.id) throw new Error("FESTIVAL_NOT_OWNED");
  if (!["DRAFT", "REJECTED"].includes(festival.status)) throw new Error("FESTIVAL_NOT_EDITABLE");

  return prisma.festivalImage.create({
    data: {
      festivalId: festival.id,
      imageUrl: input.imageUrl,
      altText: input.altText,
      sortOrder: input.sortOrder ?? 0,
    }
  });
}

export async function getFestivalImages(
  userId: string | undefined,
  festivalId: string
) {
  const festival = await prisma.festival.findUnique({
    where: { id: festivalId },
    select: { status: true, organizerId: true, images: { orderBy: { sortOrder: 'asc' } } }
  });

  if (!festival) throw new Error("FESTIVAL_NOT_FOUND");

  if (festival.status === "PUBLISHED") {
    return festival.images;
  }

  if (!userId) {
    throw new Error("FESTIVAL_NOT_FOUND");
  }

  const organizer = await prisma.organizer.findUnique({ where: { userId } });
  if (!organizer || organizer.id !== festival.organizerId) {
    throw new Error("FESTIVAL_NOT_FOUND");
  }

  return festival.images;
}

interface UpdateFestivalImageInput {
  altText?: string;
  sortOrder?: number;
}

export async function updateFestivalImage(
  userId: string,
  festivalId: string,
  imageId: string,
  input: UpdateFestivalImageInput
) {
  const organizer = await findOrganizer(userId);
  const festival = await prisma.festival.findUnique({ where: { id: festivalId } });

  if (!festival) throw new Error("FESTIVAL_NOT_FOUND");
  if (festival.organizerId !== organizer.id) throw new Error("FESTIVAL_NOT_OWNED");
  if (!["DRAFT", "REJECTED"].includes(festival.status)) throw new Error("FESTIVAL_NOT_EDITABLE");

  const image = await prisma.festivalImage.findUnique({ where: { id: imageId } });
  if (!image || image.festivalId !== festivalId) throw new Error("IMAGE_NOT_FOUND");

  return prisma.festivalImage.update({
    where: { id: imageId },
    data: {
      ...(input.altText !== undefined && { altText: input.altText }),
      ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
    }
  });
}

export async function deleteFestivalImage(
  userId: string,
  festivalId: string,
  imageId: string
) {
  const organizer = await findOrganizer(userId);
  const festival = await prisma.festival.findUnique({ where: { id: festivalId } });

  if (!festival) throw new Error("FESTIVAL_NOT_FOUND");
  if (festival.organizerId !== organizer.id) throw new Error("FESTIVAL_NOT_OWNED");
  if (!["DRAFT", "REJECTED"].includes(festival.status)) throw new Error("FESTIVAL_NOT_EDITABLE");

  const image = await prisma.festivalImage.findUnique({ where: { id: imageId } });
  if (!image || image.festivalId !== festivalId) throw new Error("IMAGE_NOT_FOUND");

  return prisma.festivalImage.delete({
    where: { id: imageId }
  });
}
