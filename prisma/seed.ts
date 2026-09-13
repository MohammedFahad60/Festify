import bcrypt from "bcrypt";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../apps/api/src/generated/prisma/client.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required to seed the database");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
const PASSWORD = "FestifyDevOnly!2026";

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  const roles = Object.fromEntries(await Promise.all(["USER", "ATTENDEE", "ORGANIZER", "ADMIN", "STAFF"].map(async (name) => [name, await prisma.role.upsert({ where: { name }, update: {}, create: { name } })])));
  const accounts = [
    { key: "admin", name: "Festify Admin", email: "admin@festify.local", role: "ADMIN" },
    { key: "organizer", name: "Festify Events", email: "organizer@festify.local", role: "ORGANIZER" },
    { key: "user", name: "Festify Guest", email: "user@festify.local", role: "USER" },
  ];
  const users: Record<string, { id: string }> = {};
  for (const account of accounts) {
    const user = await prisma.user.upsert({ where: { email: account.email }, update: { name: account.name, passwordHash, status: "ACTIVE" }, create: { name: account.name, email: account.email, passwordHash, status: "ACTIVE" } });
    users[account.key] = user;
    await prisma.userRole.upsert({ where: { userId_roleId: { userId: user.id, roleId: roles[account.role].id } }, update: {}, create: { userId: user.id, roleId: roles[account.role].id } });
  }
  const organizer = await prisma.organizer.upsert({ where: { userId: users.organizer.id }, update: { verificationStatus: "APPROVED" }, create: { userId: users.organizer.id, organizationName: "Festify Events", contactEmail: "organizer@festify.local", verificationStatus: "APPROVED" } });
  const categoryData = ["Music", "Arts", "Food", "Tech", "Sports", "Wellness"].map((name) => ({ name, slug: name.toLowerCase() }));
  const categories = await Promise.all(categoryData.map((c) => prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: c })));
  const venue = await prisma.venue.upsert({ where: { id: "00000000-0000-0000-0000-000000000001" }, update: {}, create: { id: "00000000-0000-0000-0000-000000000001", name: "Riverside Grounds", address: "1 Festival Way", city: "Mumbai", state: "Maharashtra", country: "India", capacity: 1000 } });
  const events = [
    { slug: "sunset-sessions", name: "Sunset Sessions", status: "PUBLISHED" as const, price: "25.00", category: categories[0] },
    { slug: "community-art-lab", name: "Community Art Lab", status: "PUBLISHED" as const, price: "0.00", category: categories[1] },
    { slug: "future-tech-forum", name: "Future Tech Forum", status: "DRAFT" as const, price: "50.00", category: categories[3] },
  ];
  for (const item of events) {
    const festival = await prisma.festival.upsert({ where: { slug: item.slug }, update: { status: item.status }, create: { organizerId: organizer.id, categoryId: item.category.id, venueId: venue.id, name: item.name, slug: item.slug, description: `A sample ${item.name} event for local development.`, startDate: new Date("2027-06-01T17:00:00Z"), endDate: new Date("2027-06-01T22:00:00Z"), capacity: 500, status: item.status } });
    await prisma.ticketType.upsert({ where: { id: `00000000-0000-0000-0000-${String(events.indexOf(item) + 10).padStart(12, "0")}` }, update: { price: item.price }, create: { id: `00000000-0000-0000-0000-${String(events.indexOf(item) + 10).padStart(12, "0")}`, festivalId: festival.id, name: item.price === "0.00" ? "Free admission" : "General admission", price: item.price, quantity: 500, saleStart: new Date("2026-01-01T00:00:00Z"), saleEnd: new Date("2027-06-01T17:00:00Z") } });
  }
  console.log(`Seeded ${accounts.length} development accounts, ${categories.length} categories and ${events.length} events.`);
  console.log(`Development password for all accounts: ${PASSWORD}`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
