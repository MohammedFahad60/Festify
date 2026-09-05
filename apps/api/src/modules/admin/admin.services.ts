import { prisma } from "../../lib/prisma.js";

export async function getPendingOrganizers() {
  return prisma.organizer.findMany({
    where: {
      verificationStatus: "PENDING",
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          status: true,
          createdAt: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

export async function approveOrganizer(organizerId: string) {
  return prisma.$transaction(async (tx) => {
    const organizer = await tx.organizer.findUnique({
      where: {
        id: organizerId,
      },
      include: {
        user: true,
      },
    });

    if (!organizer) {
      throw new Error("ORGANIZER_NOT_FOUND");
    }

    if (organizer.verificationStatus !== "PENDING") {
      throw new Error("ORGANIZER_ALREADY_REVIEWED");
    }

    const organizerRole = await tx.role.findUnique({
      where: {
        name: "ORGANIZER",
      },
    });

    if (!organizerRole) {
      throw new Error("ORGANIZER_ROLE_NOT_FOUND");
    }

    await tx.organizer.update({
      where: {
        id: organizerId,
      },
      data: {
        verificationStatus: "APPROVED",
      },
    });

    await tx.userRole.upsert({
      where: {
        userId_roleId: {
          userId: organizer.userId,
          roleId: organizerRole.id,
        },
      },
      update: {},
      create: {
        userId: organizer.userId,
        roleId: organizerRole.id,
      },
    });

    return tx.organizer.findUnique({
      where: {
        id: organizerId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  });
}

export async function rejectOrganizer(organizerId: string) {
  const organizer = await prisma.organizer.findUnique({
    where: {
      id: organizerId,
    },
  });

  if (!organizer) {
    throw new Error("ORGANIZER_NOT_FOUND");
  }

  if (organizer.verificationStatus !== "PENDING") {
    throw new Error("ORGANIZER_ALREADY_REVIEWED");
  }

  return prisma.organizer.update({
    where: {
      id: organizerId,
    },
    data: {
      verificationStatus: "REJECTED",
    },
  });
}

export async function getPendingFestivals() {
  return prisma.festival.findMany({
    where: {
      status: "SUBMITTED",
    },
    include: {
      organizer: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
      },
      category: true,
      venue: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

export async function approveFestival(festivalId: string) {
  const festival = await prisma.festival.findUnique({
    where: {
      id: festivalId,
    },
  });

  if (!festival) {
    throw new Error("FESTIVAL_NOT_FOUND");
  }

  if (festival.status !== "SUBMITTED") {
    throw new Error("FESTIVAL_ALREADY_REVIEWED");
  }

  return prisma.festival.update({
    where: {
      id: festivalId,
    },
    data: {
      status: "APPROVED",
    },
    include: {
      organizer: true,
      category: true,
      venue: true,
    },
  });
}

export async function rejectFestival(festivalId: string) {
  const festival = await prisma.festival.findUnique({
    where: {
      id: festivalId,
    },
  });

  if (!festival) {
    throw new Error("FESTIVAL_NOT_FOUND");
  }

  if (festival.status !== "SUBMITTED") {
    throw new Error("FESTIVAL_ALREADY_REVIEWED");
  }

  return prisma.festival.update({
    where: {
      id: festivalId,
    },
    data: {
      status: "REJECTED",
    },
    include: {
      organizer: true,
      category: true,
      venue: true,
    },
  });
}