import type { Response } from "express";
import { z } from "zod";

import type { AuthenticatedRequest } from "../../middleware/auth.js";
import { prisma } from "../../lib/prisma.js";

import {
  createOrganizerProfile,
  approveOrganizerProfile,
} from "./organizer.service.js";

const createOrganizerSchema = z.object({
  organizationName: z
    .string()
    .trim()
    .min(2, "Organization name must be at least 2 characters")
    .max(150),

  description: z
    .string()
    .trim()
    .max(2000)
    .optional(),

  contactEmail: z
    .string()
    .trim()
    .email()
    .optional(),

  contactPhone: z
    .string()
    .trim()
    .min(7)
    .max(20)
    .optional(),
});

export async function createOrganizer(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const result = createOrganizerSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: result.error.flatten().fieldErrors,
      });
    }

    const organizer = await createOrganizerProfile(
      req.user.id,
      result.data
    );

    return res.status(201).json({
      success: true,
      message: "Organizer application submitted",
      data: {
        organizer,
      },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "ORGANIZER_ALREADY_EXISTS"
    ) {
      return res.status(409).json({
        success: false,
        message: "Organizer profile already exists",
      });
    }

    console.error("Create organizer error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
}

export async function getMyOrganizerProfile(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const organizer = await prisma.organizer.findUnique({
      where: {
        userId: req.user.id,
      },
    });

    if (!organizer) {
      return res.status(404).json({
        success: false,
        message: "Organizer profile not found",
      });
    }

    return res.json({
      success: true,
      data: {
        organizer,
      },
    });
  } catch (error) {
    console.error("Get organizer profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
}

export async function approveOrganizer(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const organizerId = String(req.params.id);

    if (!organizerId) {
      return res.status(400).json({
        success: false,
        message: "Organizer ID is required",
      });
    }

    const organizer = await approveOrganizerProfile(organizerId);

    return res.json({
      success: true,
      message: "Organizer approved successfully",
      data: {
        organizer,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "ORGANIZER_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Organizer not found",
        });
      }

      if (error.message === "ORGANIZER_ALREADY_APPROVED") {
        return res.status(409).json({
          success: false,
          message: "Organizer is already approved",
        });
      }

      if (error.message === "ORGANIZER_ROLE_NOT_FOUND") {
        return res.status(500).json({
          success: false,
          message: "ORGANIZER role not found",
        });
      }
    }

    console.error("Approve organizer error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
}