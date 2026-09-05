import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";

interface RegisterInput {
  name: string;
  email: string;
  phone?: string;
  password: string;
}

export async function registerUser(input: RegisterInput) {
  const email = input.email.toLowerCase().trim();

  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (existingUser) {
    throw new Error("EMAIL_ALREADY_EXISTS");
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const attendeeRole = await prisma.role.findUnique({
    where: {
      name: "ATTENDEE",
    },
  });

  if (!attendeeRole) {
    throw new Error("ATTENDEE_ROLE_NOT_FOUND");
  }

  const user = await prisma.user.create({
    data: {
      name: input.name.trim(),
      email,
      phone: input.phone?.trim() || null,
      passwordHash,
      roles: {
        create: {
          roleId: attendeeRole.id,
        },
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      profileImage: true,
      status: true,
      createdAt: true,
    },
  });

  const token = jwt.sign(
    {
      sub: user.id,
      role: "ATTENDEE",
    },
    env.jwtSecret,
    {
      expiresIn: env.jwtExpiresIn,
    } as jwt.SignOptions
  );

  return {
    user,
    token,
  };
}


interface LoginInput {
  email: string;
  password: string;
}

export async function loginUser(input: LoginInput) {
  const email = input.email.toLowerCase().trim();

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
    include: {
      roles: {
        include: {
          role: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error("INVALID_CREDENTIALS");
  }

  if (user.status !== "ACTIVE") {
    throw new Error("ACCOUNT_NOT_ACTIVE");
  }

  const passwordMatches = await bcrypt.compare(
    input.password,
    user.passwordHash
  );

  if (!passwordMatches) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const primaryRole = user.roles[0]?.role.name ?? "ATTENDEE";

  const token = jwt.sign(
    {
      sub: user.id,
      role: primaryRole,
    },
    env.jwtSecret,
    {
      expiresIn: env.jwtExpiresIn,
    } as jwt.SignOptions
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      profileImage: user.profileImage,
      status: user.status,
      roles: user.roles.map((userRole: { role: { name: string } }) => userRole.role.name),
    },
  };
}