import type { Response } from "express";
import type { Request } from "express";
import { z } from "zod";
import type { AuthenticatedRequest } from "../../middleware/auth.js";
import {
  createFestival,
  getPublishedFestival,
  getPublishedFestivals,
  getOrganizerFestival,
  getOrganizerFestivals,
  updateFestival,
  publishFestival,
  submitFestival,

  addFestivalImage,
  getFestivalImages,
  updateFestivalImage,
  deleteFestivalImage,

} from "./festival.services.js";

const createFestivalSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3)
    .max(200),

  description: z
    .string()
    .trim()
    .max(10000)
    .optional(),

  categoryId: z
    .string()
    .uuid(),

  venueId: z
    .string()
    .uuid(),

  banner: z
    .string()
    .url()
    .optional(),

  startDate: z
    .string()
    .datetime(),

  endDate: z
    .string()
    .datetime(),

  startTime: z
    .string()
    .optional(),

  endTime: z
    .string()
    .optional(),

  capacity: z
    .number()
    .int()
    .positive()
    .optional(),

  cancellationPolicy: z
    .unknown()
    .optional(),
});


const addImageSchema = z.object({
  imageUrl: z.string().url().max(1000),
  altText: z.string().trim().max(500).optional(),
  sortOrder: z.number().int().nonnegative().max(10000).optional().default(0),
});

const updateImageSchema = z.object({
  altText: z.string().trim().max(500).optional(),
  sortOrder: z.number().int().nonnegative().max(10000).optional(),
});

const updateFestivalSchema = createFestivalSchema.partial();
const idSchema = z.string().uuid();

export async function createFestivalController(
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

    const result = createFestivalSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: result.error.flatten().fieldErrors,
      });
    }

    const festival = await createFestival(
      req.user.id,
      result.data
    );

    return res.status(201).json({
      success: true,
      message: "Festival created successfully",
      data: {
        festival,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "ORGANIZER_NOT_FOUND") {
        return res.status(403).json({
          success: false,
          message: "Organizer profile not found",
        });
      }

      if (error.message === "ORGANIZER_NOT_APPROVED") {
        return res.status(403).json({
          success: false,
          message: "Organizer has not been approved",
        });
      }

      if (error.message === "CATEGORY_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      if (error.message === "VENUE_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Venue not found",
        });
      }

      if (error.message === "INVALID_DATE_RANGE") {
        return res.status(400).json({
          success: false,
          message: "End date must be after start date",
        });
      }
    }

    console.error("Create festival error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
}

export async function submitFestivalController(
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

    const id = idSchema.safeParse(req.params.id);
    if (!id.success) {
      return res.status(400).json({ success: false, message: "Invalid festival ID" });
    }

    const festival = await submitFestival(
      req.user.id,
      id.data
    );

    return res.json({
      success: true,
      message: "Festival submitted for review",
      data: {
        festival,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "ORGANIZER_NOT_FOUND") {
        return res.status(403).json({
          success: false,
          message: "Organizer profile not found",
        });
      }

      if (error.message === "ORGANIZER_NOT_APPROVED") {
        return res.status(403).json({
          success: false,
          message: "Organizer has not been approved",
        });
      }

      if (error.message === "FESTIVAL_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Festival not found",
        });
      }

      if (error.message === "FESTIVAL_NOT_OWNED") {
        return res.status(403).json({
          success: false,
          message: "You do not own this festival",
        });
      }

      if (error.message === "FESTIVAL_ALREADY_SUBMITTED") {
        return res.status(409).json({
          success: false,
          message: "Festival has already been submitted",
        });
      }
    }

    console.error("Submit festival error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
}

export async function publishFestivalController(
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

    const id = idSchema.safeParse(req.params.id);
    if (!id.success) {
      return res.status(400).json({ success: false, message: "Invalid festival ID" });
    }

    const festival = await publishFestival(
      req.user.id,
      id.data
    );

    return res.json({
      success: true,
      message: "Festival published successfully",
      data: {
        festival,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "ORGANIZER_NOT_FOUND") {
        return res.status(403).json({
          success: false,
          message: "Organizer profile not found",
        });
      }

      if (error.message === "ORGANIZER_NOT_APPROVED") {
        return res.status(403).json({
          success: false,
          message: "Organizer has not been approved",
        });
      }

      if (error.message === "FESTIVAL_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Festival not found",
        });
      }

      if (error.message === "FESTIVAL_NOT_OWNED") {
        return res.status(403).json({
          success: false,
          message: "You do not own this festival",
        });
      }

      if (error.message === "FESTIVAL_NOT_APPROVED") {
        return res.status(409).json({
          success: false,
          message: "Only approved festivals may be published",
        });
      }
    }

    console.error("Publish festival error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
}

export async function listPublishedFestivalsController(
  _req: Request,
  res: Response
) {
  try {
    const festivals = await getPublishedFestivals();

    return res.json({
      success: true,
      data: {
        festivals,
      },
    });
  } catch (error) {
    console.error("List published festivals error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
}

export async function getPublishedFestivalController(
  req: Request,
  res: Response
) {
  try {
    const id = idSchema.safeParse(req.params.id);
    if (!id.success) {
      return res.status(400).json({ success: false, message: "Invalid festival ID" });
    }
    const festival = await getPublishedFestival(id.data);

    return res.json({
      success: true,
      data: {
        festival,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "FESTIVAL_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Festival not found",
      });
    }

    console.error("Get published festival error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
}

export async function listOrganizerFestivalsController(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: "Authentication required" });
    return res.json({ success: true, data: { festivals: await getOrganizerFestivals(req.user.id) } });
  } catch (error) {
    if (error instanceof Error && ["ORGANIZER_NOT_FOUND", "ORGANIZER_NOT_APPROVED"].includes(error.message)) return res.status(403).json({ success: false, message: "Approved organizer access required" });
    console.error("List organizer festivals error:", error);
    return res.status(500).json({ success: false, message: "Something went wrong" });
  }
}

export async function getOrganizerFestivalController(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: "Authentication required" });
    const id = idSchema.safeParse(req.params.id);
    if (!id.success) return res.status(400).json({ success: false, message: "Invalid festival ID" });
    return res.json({ success: true, data: { festival: await getOrganizerFestival(req.user.id, id.data) } });
  } catch (error) {
    if (error instanceof Error && error.message === "FESTIVAL_NOT_FOUND") return res.status(404).json({ success: false, message: "Festival not found" });
    if (error instanceof Error && ["ORGANIZER_NOT_FOUND", "ORGANIZER_NOT_APPROVED"].includes(error.message)) return res.status(403).json({ success: false, message: "Approved organizer access required" });
    console.error("Get organizer festival error:", error);
    return res.status(500).json({ success: false, message: "Something went wrong" });
  }
}

export async function updateFestivalController(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: "Authentication required" });
    const id = idSchema.safeParse(req.params.id);
    if (!id.success) return res.status(400).json({ success: false, message: "Invalid festival ID" });
    const result = updateFestivalSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ success: false, message: "Validation failed", errors: result.error.flatten().fieldErrors });
    const festival = await updateFestival(req.user.id, id.data, result.data);
    return res.json({ success: true, message: "Festival updated successfully", data: { festival } });
  } catch (error) {
    if (error instanceof Error) {
      const responses: Record<string, { status: number; message: string }> = {
        ORGANIZER_NOT_FOUND: { status: 403, message: "Organizer profile not found" },
        ORGANIZER_NOT_APPROVED: { status: 403, message: "Organizer has not been approved" },
        FESTIVAL_NOT_FOUND: { status: 404, message: "Festival not found" },
        FESTIVAL_NOT_OWNED: { status: 403, message: "You do not own this festival" },
        FESTIVAL_NOT_EDITABLE: { status: 409, message: "Only draft or rejected festivals can be edited" },
        CATEGORY_NOT_FOUND: { status: 404, message: "Category not found" },
        VENUE_NOT_FOUND: { status: 404, message: "Venue not found" },
        INVALID_DATE_RANGE: { status: 400, message: "End date must be after start date" },
      };
      const response = responses[error.message];
      if (response) return res.status(response.status).json({ success: false, message: response.message });
    }
    console.error("Update festival error:", error);
    return res.status(500).json({ success: false, message: "Something went wrong" });
  }
}
export async function addFestivalImageController(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required' });
    const id = idSchema.safeParse(req.params.id);
    if (!id.success) return res.status(400).json({ success: false, message: 'Invalid festival ID' });
    const result = addImageSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ success: false, message: 'Validation failed', errors: result.error.flatten().fieldErrors });
    const image = await addFestivalImage(req.user.id, id.data, result.data);
    return res.status(201).json({ success: true, message: 'Image added successfully', data: { image } });
  } catch (error) {
    if (error instanceof Error) {
      const responses: Record<string, { status: number; message: string }> = {
        ORGANIZER_NOT_FOUND: { status: 403, message: 'Organizer profile not found' },
        ORGANIZER_NOT_APPROVED: { status: 403, message: 'Organizer has not been approved' },
        FESTIVAL_NOT_FOUND: { status: 404, message: 'Festival not found' },
        FESTIVAL_NOT_OWNED: { status: 403, message: 'You do not own this festival' },
        FESTIVAL_NOT_EDITABLE: { status: 409, message: 'Festival cannot be edited in its current state' },
      };
      const response = responses[error.message];
      if (response) return res.status(response.status).json({ success: false, message: response.message });
    }
    console.error('Add festival image error:', error);
    return res.status(500).json({ success: false, message: 'Something went wrong' });
  }
}

export async function listFestivalImagesController(req: AuthenticatedRequest, res: Response) {
  try {
    const id = idSchema.safeParse(req.params.id);
    if (!id.success) return res.status(400).json({ success: false, message: 'Invalid festival ID' });
    const images = await getFestivalImages(req.user?.id, id.data);
    return res.json({ success: true, data: { images } });
  } catch (error) {
    if (error instanceof Error && error.message === 'FESTIVAL_NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Festival not found' });
    }
    console.error('List festival images error:', error);
    return res.status(500).json({ success: false, message: 'Something went wrong' });
  }
}

export async function updateFestivalImageController(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required' });
    const festivalId = idSchema.safeParse(req.params.festivalId);
    const imageId = idSchema.safeParse(req.params.imageId);
    if (!festivalId.success || !imageId.success) return res.status(400).json({ success: false, message: 'Invalid ID' });
    
    const result = updateImageSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ success: false, message: 'Validation failed', errors: result.error.flatten().fieldErrors });
    
    const image = await updateFestivalImage(req.user.id, festivalId.data, imageId.data, result.data);
    return res.json({ success: true, message: 'Image updated successfully', data: { image } });
  } catch (error) {
    if (error instanceof Error) {
      const responses: Record<string, { status: number; message: string }> = {
        ORGANIZER_NOT_FOUND: { status: 403, message: 'Organizer profile not found' },
        ORGANIZER_NOT_APPROVED: { status: 403, message: 'Organizer has not been approved' },
        FESTIVAL_NOT_FOUND: { status: 404, message: 'Festival not found' },
        FESTIVAL_NOT_OWNED: { status: 403, message: 'You do not own this festival' },
        FESTIVAL_NOT_EDITABLE: { status: 409, message: 'Festival cannot be edited in its current state' },
        IMAGE_NOT_FOUND: { status: 404, message: 'Image not found' },
      };
      const response = responses[error.message];
      if (response) return res.status(response.status).json({ success: false, message: response.message });
    }
    console.error('Update festival image error:', error);
    return res.status(500).json({ success: false, message: 'Something went wrong' });
  }
}

export async function deleteFestivalImageController(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required' });
    const festivalId = idSchema.safeParse(req.params.festivalId);
    const imageId = idSchema.safeParse(req.params.imageId);
    if (!festivalId.success || !imageId.success) return res.status(400).json({ success: false, message: 'Invalid ID' });
    
    await deleteFestivalImage(req.user.id, festivalId.data, imageId.data);
    return res.json({ success: true, message: 'Image deleted successfully' });
  } catch (error) {
    if (error instanceof Error) {
      const responses: Record<string, { status: number; message: string }> = {
        ORGANIZER_NOT_FOUND: { status: 403, message: 'Organizer profile not found' },
        ORGANIZER_NOT_APPROVED: { status: 403, message: 'Organizer has not been approved' },
        FESTIVAL_NOT_FOUND: { status: 404, message: 'Festival not found' },
        FESTIVAL_NOT_OWNED: { status: 403, message: 'You do not own this festival' },
        FESTIVAL_NOT_EDITABLE: { status: 409, message: 'Festival cannot be edited in its current state' },
        IMAGE_NOT_FOUND: { status: 404, message: 'Image not found' },
      };
      const response = responses[error.message];
      if (response) return res.status(response.status).json({ success: false, message: response.message });
    }
    console.error('Delete festival image error:', error);
    return res.status(500).json({ success: false, message: 'Something went wrong' });
  }
}
