CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BANNED', 'SUSPENDED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "OrganizerVerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "FestivalStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'PUBLISHED', 'REJECTED', 'ONGOING', 'COMPLETED', 'ARCHIVED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "TicketTypeStatus" AS ENUM ('ACTIVE', 'INACTIVE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "PaymentStatus" AS ENUM ('CREATED', 'PENDING', 'SUCCESS', 'FAILED', 'CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "TicketStatus" AS ENUM ('ACTIVE', 'USED', 'CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "CategoryStatus" AS ENUM ('ACTIVE', 'INACTIVE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "AccessRole" AS ENUM ('USER', 'ORGANIZER', 'ADMIN'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "RegistrationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "CheckInStatus" AS ENUM ('VALID', 'INVALID'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE "user" (
"id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
"name" text NOT NULL,
"email" text NOT NULL UNIQUE,
"phone" text,
"passwordHash" text NOT NULL,
"profileImage" text,
"createdAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
"updatedAt" timestamptz(3) NOT NULL,
"status" "UserStatus" NOT NULL DEFAULT 'ACTIVE'
);

CREATE TABLE "role" (
"id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
"name" text NOT NULL UNIQUE,
"createdAt" timestamptz(3) NOT NULL DEFAULT 'now('
);

CREATE TABLE "user_role" (
"userId" text NOT NULL,
"roleId" text NOT NULL,
PRIMARY KEY ("userId", "roleId")
);

CREATE TABLE "organizer" (
"id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
"userId" text NOT NULL UNIQUE,
"organizationName" text NOT NULL,
"description" text,
"contactEmail" text NOT NULL,
"contactPhone" text,
"createdAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
"updatedAt" timestamptz(3) NOT NULL,
"verificationStatus" "OrganizerVerificationStatus" NOT NULL DEFAULT 'PENDING'
);

CREATE TABLE "category" (
"id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
"name" text NOT NULL UNIQUE,
"slug" text NOT NULL UNIQUE,
"createdAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
"updatedAt" timestamptz(3) NOT NULL,
"status" "CategoryStatus" NOT NULL DEFAULT 'ACTIVE'
);

CREATE TABLE "venue" (
"id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
"name" text NOT NULL,
"address" text NOT NULL,
"city" text NOT NULL,
"state" text NOT NULL,
"country" text NOT NULL,
"capacity" integer,
"createdAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
"updatedAt" timestamptz(3) NOT NULL
);

CREATE TABLE "festival" (
"id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
"organizerId" text NOT NULL,
"categoryId" text NOT NULL,
"venueId" text NOT NULL,
"name" text NOT NULL,
"slug" text NOT NULL UNIQUE,
"description" text,
"banner" text,
"startDate" timestamptz(3) NOT NULL,
"endDate" timestamptz(3) NOT NULL,
"startTime" text,
"endTime" text,
"capacity" integer,
"cancellationPolicy" jsonb,
"createdAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
"updatedAt" timestamptz(3) NOT NULL,
"status" "FestivalStatus" NOT NULL DEFAULT 'DRAFT'
);

CREATE TABLE "festival_image" (
"id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
"festivalId" text NOT NULL,
"imageUrl" text NOT NULL,
"altText" text,
"sortOrder" integer NOT NULL DEFAULT 0,
"createdAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
"updatedAt" timestamptz(3) NOT NULL
);

CREATE TABLE "ticket_type" (
"id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
"festivalId" text,
"eventId" text,
"name" text NOT NULL,
"description" text,
"price" numeric(10,2) NOT NULL,
"quantity" integer NOT NULL,
"soldQuantity" integer NOT NULL DEFAULT 0,
"saleStart" timestamptz(3) NOT NULL,
"saleEnd" timestamptz(3) NOT NULL,
"maxPerUser" integer,
"active" boolean NOT NULL DEFAULT TRUE,
"createdAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
"updatedAt" timestamptz(3) NOT NULL,
"status" "TicketTypeStatus" NOT NULL DEFAULT 'ACTIVE'
);

CREATE TABLE "order" (
"id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
"userId" text NOT NULL,
"festivalId" text NOT NULL,
"totalAmount" numeric(10,2) NOT NULL,
"createdAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
"updatedAt" timestamptz(3) NOT NULL,
"status" "OrderStatus" NOT NULL DEFAULT 'PENDING'
);

CREATE TABLE "order_item" (
"id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
"orderId" text NOT NULL,
"ticketTypeId" text NOT NULL,
"quantity" integer NOT NULL,
"unitPrice" numeric(10,2) NOT NULL,
"totalPrice" numeric(10,2) NOT NULL
);

CREATE TABLE "payment" (
"id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
"orderId" text,
"registrationId" text UNIQUE,
"provider" text NOT NULL DEFAULT 'INTERNAL',
"providerPaymentId" text,
"amount" numeric(10,2) NOT NULL,
"currency" text NOT NULL DEFAULT 'INR',
"createdAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
"updatedAt" timestamptz(3) NOT NULL,
"status" "PaymentStatus" NOT NULL DEFAULT 'CREATED'
);

CREATE TABLE "ticket" (
"id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
"orderId" text,
"registrationId" text,
"ticketTypeId" text NOT NULL,
"userId" text NOT NULL,
"ticketCode" text NOT NULL UNIQUE,
"ticketNumber" text UNIQUE,
"qrToken" text UNIQUE,
"createdAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
"updatedAt" timestamptz(3) NOT NULL,
"status" "TicketStatus" NOT NULL DEFAULT 'ACTIVE'
);

CREATE TABLE "session" (
"id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
"userId" text NOT NULL,
"refreshTokenHash" text NOT NULL UNIQUE,
"expiresAt" timestamptz(3) NOT NULL,
"revokedAt" timestamptz(3),
"replacedById" text,
"createdAt" timestamptz(3) NOT NULL DEFAULT 'now('
);

CREATE TABLE "verification_token" (
"id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
"userId" text NOT NULL,
"tokenHash" text NOT NULL UNIQUE,
"type" text NOT NULL,
"expiresAt" timestamptz(3) NOT NULL,
"usedAt" timestamptz(3),
"createdAt" timestamptz(3) NOT NULL DEFAULT 'now('
);

CREATE TABLE "organizer_profile" (
"id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
"userId" text NOT NULL UNIQUE,
"organizationName" text NOT NULL,
"slug" text NOT NULL UNIQUE,
"bio" text,
"website" text,
"createdAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
"updatedAt" timestamptz(3) NOT NULL,
"verificationStatus" "OrganizerVerificationStatus" NOT NULL DEFAULT 'PENDING'
);

CREATE TABLE "event" (
"id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
"organizerId" text NOT NULL,
"categoryId" text NOT NULL,
"venueId" text,
"title" text NOT NULL,
"slug" text NOT NULL UNIQUE,
"description" text,
"city" text,
"startsAt" timestamptz(3) NOT NULL,
"endsAt" timestamptz(3) NOT NULL,
"capacity" integer,
"featured" boolean NOT NULL DEFAULT FALSE,
"createdAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
"updatedAt" timestamptz(3) NOT NULL,
"status" "EventStatus" NOT NULL DEFAULT 'DRAFT'
);

CREATE TABLE "registration" (
"id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
"userId" text NOT NULL,
"eventId" text NOT NULL,
"bookingReference" text NOT NULL UNIQUE,
"total" numeric(10,2) NOT NULL,
"createdAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
"updatedAt" timestamptz(3) NOT NULL,
"status" "RegistrationStatus" NOT NULL DEFAULT 'CONFIRMED',
UNIQUE ("userId", "eventId")
);

CREATE TABLE "registration_item" (
"id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
"registrationId" text NOT NULL,
"ticketTypeId" text NOT NULL,
"quantity" integer NOT NULL,
"unitPrice" numeric(10,2) NOT NULL,
"subtotal" numeric(10,2) NOT NULL,
UNIQUE ("registrationId", "ticketTypeId")
);

CREATE TABLE "check_in" (
"id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
"ticketId" text NOT NULL UNIQUE,
"operatorId" text NOT NULL,
"checkedInAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
"status" "CheckInStatus" NOT NULL DEFAULT 'VALID'
);

CREATE TABLE "event_favorite" (
"userId" text NOT NULL,
"eventId" text NOT NULL,
"createdAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
PRIMARY KEY ("userId", "eventId")
);

CREATE TABLE "event_review" (
"id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
"userId" text NOT NULL,
"eventId" text NOT NULL,
"rating" integer NOT NULL,
"comment" text,
"createdAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
"updatedAt" timestamptz(3) NOT NULL,
UNIQUE ("userId", "eventId")
);

CREATE TABLE "notification" (
"id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
"userId" text NOT NULL,
"title" text NOT NULL,
"message" text NOT NULL,
"readAt" timestamptz(3),
"createdAt" timestamptz(3) NOT NULL DEFAULT 'now('
);

CREATE TABLE "audit_log" (
"id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
"actorId" text,
"action" text NOT NULL,
"entity" text NOT NULL,
"entityId" text,
"metadata" jsonb,
"createdAt" timestamptz(3) NOT NULL DEFAULT 'now('
);

CREATE TABLE "email_outbox" (
"id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
"recipient" text NOT NULL,
"subject" text NOT NULL,
"body" text NOT NULL,
"sentAt" timestamptz(3),
"attempts" integer NOT NULL DEFAULT 0,
"lastError" text,
"createdAt" timestamptz(3) NOT NULL DEFAULT 'now('
);

-- Authentication columns added by Phase 3.
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "email_verified_at" timestamptz(3);
ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "family_id" text;
ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "ip_address" text;
ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "user_agent" text;
ALTER TABLE "category" ADD COLUMN IF NOT EXISTS "sort_order" integer NOT NULL DEFAULT 0;
