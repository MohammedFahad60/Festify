import type { Response } from "express";
import type { AuthenticatedRequest } from "../../middleware/auth.js";

import {
  approveFestival,
  approveOrganizer,
  getPendingFestivals,
  getPendingOrganizers,
  rejectFestival,
  rejectOrganizer,
} from "./admin.services.js";


export async function pendingOrganizers(
  _req: AuthenticatedRequest,
  res: Response
) {
  try {
    const organizers = await getPendingOrganizers();

    return res.json({
      success: true,
      data: {
        organizers,
      },
    });
  } catch (error) {
    console.error("Pending organizers error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
}

export async function approveOrganizerController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const organizer = await approveOrganizer(String(req.params.id));

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

      if (error.message === "ORGANIZER_ALREADY_REVIEWED") {
        return res.status(409).json({
          success: false,
          message: "Organizer has already been reviewed",
        });
      }

      if (error.message === "ORGANIZER_ROLE_NOT_FOUND") {
        return res.status(500).json({
          success: false,
          message: "Organizer role is not configured",
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

export async function rejectOrganizerController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const organizer = await rejectOrganizer(String(req.params.id));

    return res.json({
      success: true,
      message: "Organizer rejected",
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

      if (error.message === "ORGANIZER_ALREADY_REVIEWED") {
        return res.status(409).json({
          success: false,
          message: "Organizer has already been reviewed",
        });
      }
    }

    console.error("Reject organizer error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
}

export async function pendingFestivals(
  _req: AuthenticatedRequest,
  res: Response
) {
  try {
    const festivals = await getPendingFestivals();

    return res.json({
      success: true,
      data: {
        festivals,
      },
    });
  } catch (error) {
    console.error("Pending festivals error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
}

export async function approveFestivalController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const festival = await approveFestival(String(req.params.id));

    return res.json({
      success: true,
      message: "Festival approved successfully",
      data: {
        festival,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "FESTIVAL_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Festival not found",
        });
      }

      if (error.message === "FESTIVAL_ALREADY_REVIEWED") {
        return res.status(409).json({
          success: false,
          message: "Festival has already been reviewed",
        });
      }
    }

    console.error("Approve festival error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
}

export async function rejectFestivalController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const festival = await rejectFestival(String(req.params.id));

    return res.json({
      success: true,
      message: "Festival rejected",
      data: {
        festival,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "FESTIVAL_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Festival not found",
        });
      }

      if (error.message === "FESTIVAL_ALREADY_REVIEWED") {
        return res.status(409).json({
          success: false,
          message: "Festival has already been reviewed",
        });
      }
    }

    console.error("Reject festival error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
}