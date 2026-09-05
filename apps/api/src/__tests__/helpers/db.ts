import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client.js";

/**
 * Test isolation strategy:
 * - Each test suite uses a shared PrismaClient for DB access
 * - After each test suite, we clean up test-created records
 * - We use unique prefixed IDs to distinguish test data from production-like fixtures
 * - We NEVER run prisma migrate reset
 * - We NEVER modify existing seed data
 *
 * Cleanup order respects foreign key constraints.
 */

const DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  process.env.DATABASE_URL ||
  "postgresql://postgres:admin@localhost:5432/festify";

const adapter = new PrismaPg({ connectionString: DATABASE_URL });

export const testPrisma = new PrismaClient({ adapter });

/**
 * Remove all test-created records (those created by our helpers).
 * Uses prefix markers to identify test data:
 * - Users with email starting with "test-"
 * - Organizers linked to test users
 * - Festivals with slug starting with "test-"
 * - Ticket types linked to test festivals
 * - Orders linked to test users
 * - Tickets linked to test users
 * - Payments linked to test orders
 */
export async function cleanupTestData() {
  const testUserIds = (
    await testPrisma.user.findMany({
      where: { email: { startsWith: "test-" } },
      select: { id: true },
    })
  ).map((u: { id: string }) => u.id);

  // Find organizers linked to test users
  const testOrganizerIds = (
    await testPrisma.organizer.findMany({
      where: { userId: { in: testUserIds } },
      select: { id: true },
    })
  ).map((o: { id: string }) => o.id);

  // Find festivals linked to test organizers
  const testFestivalIds = (
    await testPrisma.festival.findMany({
      where: { organizerId: { in: testOrganizerIds } },
      select: { id: true },
    })
  ).map((f: { id: string }) => f.id);

  // Find orders linked to test users
  const testOrderIds = (
    await testPrisma.order.findMany({
      where: { userId: { in: testUserIds } },
      select: { id: true },
    })
  ).map((o: { id: string }) => o.id);

  // Also find orders linked to test festivals (from any user in test context)
  const testFestivalOrderIds = (
    await testPrisma.order.findMany({
      where: { festivalId: { in: testFestivalIds } },
      select: { id: true },
    })
  ).map((o: { id: string }) => o.id);

  const allOrderIds = [...new Set([...testOrderIds, ...testFestivalOrderIds])];

  // Clean up in dependency order
  if (allOrderIds.length > 0) {
    await testPrisma.ticket.deleteMany({
      where: { orderId: { in: allOrderIds } },
    });
    await testPrisma.payment.deleteMany({
      where: { orderId: { in: allOrderIds } },
    });
    await testPrisma.orderItem.deleteMany({
      where: { orderId: { in: allOrderIds } },
    });
    await testPrisma.order.deleteMany({
      where: { id: { in: allOrderIds } },
    });
  }

  if (testFestivalIds.length > 0) {
    await testPrisma.ticketType.deleteMany({
      where: { festivalId: { in: testFestivalIds } },
    });
    await testPrisma.festivalImage.deleteMany({
      where: { festivalId: { in: testFestivalIds } },
    });
    await testPrisma.festival.deleteMany({
      where: { id: { in: testFestivalIds } },
    });
  }

  // Delete user roles for test users
  await testPrisma.userRole.deleteMany({
    where: { userId: { in: testUserIds } },
  });

  // Delete organizers
  if (testOrganizerIds.length > 0) {
    await testPrisma.organizer.deleteMany({
      where: { userId: { in: testUserIds } },
    });
  }

  // Delete test users
  await testPrisma.user.deleteMany({
    where: { id: { in: testUserIds } },
  });
}

export async function disconnectTestDb() {
  await testPrisma.$disconnect();
}
