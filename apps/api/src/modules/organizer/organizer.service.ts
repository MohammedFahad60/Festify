import { prisma } from "../../lib/prisma.js";

interface CreateOrganizerInput {
  organizationName: string;
  description?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export async function createOrganizerProfile(
  userId: string,
  input: CreateOrganizerInput
) {
  const existingOrganizer = await prisma.organizer.findUnique({
    where: {
      userId,
    },
  });

  if (existingOrganizer) {
    throw new Error("ORGANIZER_ALREADY_EXISTS");
  }

  const organizer = await prisma.organizer.create({
    data: {
      userId,
      organizationName: input.organizationName.trim(),
      description: input.description?.trim() || null,
      contactEmail: input.contactEmail?.trim() || "",
      contactPhone: input.contactPhone?.trim() || null,
      verificationStatus: "PENDING",
    },
  });

  return organizer;
}

export async function approveOrganizerProfile(
  organizerId: string
) {
  const organizer = await prisma.organizer.findUnique({
    where: {
      id: organizerId,
    },
  });

  if (!organizer) {
    throw new Error("ORGANIZER_NOT_FOUND");
  }

  if (organizer.verificationStatus === "APPROVED") {
    throw new Error("ORGANIZER_ALREADY_APPROVED");
  }

  const organizerRole = await prisma.role.findUnique({
    where: {
      name: "ORGANIZER",
    },
  });

  if (!organizerRole) {
    throw new Error("ORGANIZER_ROLE_NOT_FOUND");
  }

  return prisma.$transaction(async (tx) => {
    const updatedOrganizer = await tx.organizer.update({
      where: {
        id: organizer.id,
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

    return updatedOrganizer;
  });
}