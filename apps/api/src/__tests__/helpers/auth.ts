import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { testPrisma } from "./db.js";

const JWT_SECRET =
  process.env.JWT_SECRET || "irfifEmUtGX76b8RTnof44Bs23bi0JiwKHhKTWZwUX5";

/**
 * Generate a valid JWT token for a given user ID and roles.
 */
export function generateToken(userId: string, roles: string[] = []): string {
  return jwt.sign(
    { sub: userId, role: roles[0] || "ATTENDEE" },
    JWT_SECRET,
    { expiresIn: "1h" } as jwt.SignOptions
  );
}

/**
 * Create a test user in the database with the given role.
 * Returns the user record and a valid JWT cookie string.
 */
export async function createTestUser(
  emailPrefix: string,
  roleName: string = "ATTENDEE",
  opts: { name?: string; status?: string } = {}
) {
  const email = `test-${emailPrefix}-${Date.now()}@test.local`;
  const password = "TestPassword123!";
  const passwordHash = await bcrypt.hash(password, 12);

  const role = await testPrisma.role.findUnique({
    where: { name: roleName as any },
  });

  if (!role) {
    throw new Error(`Role ${roleName} not found in database. Did you run the seed?`);
  }

  const user = await testPrisma.user.create({
    data: {
      name: opts.name || `Test User ${emailPrefix}`,
      email,
      phone: `9${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      passwordHash,
      status: (opts.status as any) || "ACTIVE",
      roles: {
        create: {
          roleId: role.id,
        },
      },
    },
  });

  const token = generateToken(user.id, [roleName]);

  return {
    user,
    token,
    password,
    cookie: `festify_token=${token}`,
  };
}

/**
 * Create an organizer user (with ORGANIZER role and organizer profile).
 */
export async function createTestOrganizer(
  emailPrefix: string,
  opts: { verificationStatus?: string; organizationName?: string } = {}
) {
  const result = await createTestUser(emailPrefix, "ORGANIZER", {
    name: opts.organizationName || `Test Organizer ${emailPrefix}`,
  });

  const organizer = await testPrisma.organizer.create({
    data: {
      userId: result.user.id,
      organizationName: opts.organizationName || `Org ${emailPrefix}`,
      description: `Test organization ${emailPrefix}`,
      contactEmail: result.user.email,
      verificationStatus: (opts.verificationStatus as any) || "APPROVED",
    },
  });

  return {
    ...result,
    organizer,
  };
}

/**
 * Create a user with multiple roles.
 */
export async function createMultiRoleUser(
  emailPrefix: string,
  roles: string[]
) {
  const email = `test-${emailPrefix}-${Date.now()}@test.local`;
  const passwordHash = await bcrypt.hash("TestPassword123!", 12);

  const roleRecords = await Promise.all(
    roles.map((name: string) =>
      testPrisma.role.findUnique({ where: { name: name as any } })
    )
  );

  const user = await testPrisma.user.create({
    data: {
      name: `Multi-Role User ${emailPrefix}`,
      email,
      passwordHash,
      status: "ACTIVE",
      roles: {
        create: roleRecords
          .filter((r: any) => r !== null)
          .map((r: any) => ({ roleId: r!.id })),
      },
    },
  });

  const token = generateToken(user.id, roles);

  return {
    user,
    token,
    cookie: `festify_token=${token}`,
  };
}
