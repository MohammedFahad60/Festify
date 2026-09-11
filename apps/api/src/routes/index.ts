import { Router } from "express";

import { prisma } from "../lib/prisma.js";

import authRoutes from "../modules/auth/auth.routes.js";
import organizerRoutes from "../modules/organizer/organizer.routes.js";
import adminRoutes from "../modules/admin/admin.routes.js";
import festivalRoutes from "../modules/festival/festival.routes.js";
import ticketTypeRoutes from "../modules/ticket-type/ticket-type.routes.js";
import orderRoutes from "../modules/order/order.routes.js";
import paymentRoutes from "../modules/payment/payment.routes.js";
import ticketRoutes from "../modules/ticket/ticket.routes.js";
import ticketV1Routes from "../modules/ticket/ticket-v1.routes.js";
import catalogRoutes from "../modules/catalog/catalog.routes.js";
import coreRoutes from "../modules/core/core.routes.js";
import registrationRoutes from "../modules/registration/registration.routes.js";
import organizerV1Routes from "../modules/organizer/organizer-v1.routes.js";
import adminV1Routes from "../modules/admin/admin-v1.routes.js";
import openapiRoutes from "./openapi.js";
import managementRoutes from "../modules/core/management.routes.js";

import testRoutes from "./test.routes.js";

const router = Router();

router.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      success: true,
      api: "ok",
      database: "ok",
    });
  } catch (error) {
    console.error("Database health check failed:", error);

    res.status(500).json({
      success: false,
      api: "ok",
      database: "error",
    });
  }
});

router.use("/auth", authRoutes);
router.use("/test", testRoutes);
router.use("/organizers", organizerRoutes);
router.use("/admin", adminRoutes);
router.use("/festivals", festivalRoutes);
router.use(ticketTypeRoutes);
router.use("/orders", orderRoutes);
router.use("/payments", paymentRoutes);
router.use(ticketV1Routes);
router.use("/tickets", ticketRoutes);
router.use(coreRoutes);
router.use(registrationRoutes);
router.use(organizerV1Routes);
router.use(adminV1Routes);
router.use(openapiRoutes);
router.use(managementRoutes);
router.use("/catalog", catalogRoutes);

export default router;