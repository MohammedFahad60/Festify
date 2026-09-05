/**
 * Festify seed - placeholder
 * In production, this seeds roles, categories, venues, and admin user.
 * Run with: npx prisma db seed
 * Requires DATABASE_URL.
 */
import { PrismaClient } from "../apps/api/src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.log("DATABASE_URL not set, skipping seed");
  process.exit(0);
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding Festify...");

  // Roles
  const roles = ["ATTENDEE", "ORGANIZER", "ADMIN", "STAFF"];
  for (const name of roles) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // Categories
  const categories = [
    { name: "Music", slug: "music" },
    { name: "Arts", slug: "arts" },
    { name: "Food", slug: "food" },
    { name: "Tech", slug: "tech" },
  ];
  for (const c of categories) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: { name: c.name, slug: c.slug, status: "ACTIVE" },
    });
  }

  // Venues
  const venues = [
    { name: "Grand Hall", address: "123 Main St", city: "Mumbai", state: "Maharashtra", country: "India", capacity: 5000 },
  ];
  for (const v of venues) {
    const existing = await prisma.venue.findFirst({ where: { name: v.name } });
    if (!existing) await prisma.venue.create({ data: v });
  }

  console.log("Seeding complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
