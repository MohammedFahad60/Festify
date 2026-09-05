import { Router } from "express";
import { prisma } from "../../lib/prisma.js";

const router = Router();

router.get("/categories", async (_req, res) => {
  const categories = await prisma.category.findMany({ where: { status: "ACTIVE" }, select: { id: true, name: true, slug: true }, orderBy: { name: "asc" } });
  return res.json({ success: true, data: { categories } });
});

router.get("/venues", async (_req, res) => {
  const venues = await prisma.venue.findMany({ select: { id: true, name: true, address: true, city: true, state: true, country: true }, orderBy: [{ city: "asc" }, { name: "asc" }] });
  return res.json({ success: true, data: { venues } });
});

export default router;