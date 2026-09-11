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
"password_hash" text NOT NULL,
"profile_image" text,
"created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
"updated_at" timestamptz(3) NOT NULL,
"status" "UserStatus" NOT NULL DEFAULT 'ACTIVE'
);

CREATE TABLE "role" (
"id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
"name" text NOT NULL UNIQUE,
"created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "user_role" (
"user_id" text NOT NULL,
"role_id" text NOT NULL,
PRIMARY KEY ("user_id", "role_id")
);

CREATE TABLE "organizer" (
"id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
"user_id" text NOT NULL UNIQUE,
"organization_name" text NOT NULL,
"description" text,
"contact_email" text NOT NULL,
"contact_phone" text,
"created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
"updated_at" timestamptz(3) NOT NULL,
"verification_status" "OrganizerVerificationStatus" NOT NULL DEFAULT 'PENDING'
);

CREATE TABLE "category" (
"id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
"name" text NOT NULL UNIQUE,
"slug" text NOT NULL UNIQUE,
"created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
"updated_at" timestamptz(3) NOT NULL,
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
"created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
"updated_at" timestamptz(3) NOT NULL
);

CREATE TABLE "festival" (
"id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
"organizer_id" text NOT NULL,
"category_id" text NOT NULL,
"venue_id" text NOT NULL,
"name" text NOT NULL,
"slug" text NOT NULL UNIQUE,
"description" text,
"banner" text,
"start_date" timestamptz(3) NOT NULL,
"end_date" timestamptz(3) NOT NULL,
"start_time" text,
"end_time" text,
"capacity" integer,
"cancellation_policy" jsonb,
"created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
"updated_at" timestamptz(3) NOT NULL,
"status" "FestivalStatus" NOT NULL DEFAULT 'DRAFT'
);

CREATE TABLE "festival_image" (
"id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
"festival_id" text NOT NULL,
"image_url" text NOT NULL,
"alt_text" text,
"sort_order" integer NOT NULL DEFAULT 0,
"created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
"updated_at" timestamptz(3) NOT NULL
);

CREATE TABLE "ticket_type" (
"id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
"festival_id" text,
"event_id" text,
"name" text NOT NULL,
"description" text,
"price" numeric(10,2) NOT NULL,
"quantity" integer NOT NULL,
"sold_quantity" integer NOT NULL DEFAULT 0,
"sale_start" timestamptz(3) NOT NULL,
"sale_end" timestamptz(3) NOT NULL,
"max_per_user" integer,
"active" boolean NOT NULL DEFAULT TRUE,
"created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
"updated_at" timestamptz(3) NOT NULL,
"status" "TicketTypeStatus" NOT NULL DEFAULT 'ACTIVE'
);

CREATE TABLE "order" (
"id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
"user_id" text NOT NULL,
"festival_id" text NOT NULL,
"total_amount" numeric(10,2) NOT NULL,
"created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
"updated_at" timestamptz(3) NOT NULL,
"status" "OrderStatus" NOT NULL DEFAULT 'PENDING'
);

CREATE TABLE "order_item" (
"id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
"order_id" text NOT NULL,
"ticket_type_id" text NOT NULL,
"quantity" integer NOT NULL,
"unit_price" numeric(10,2) NOT NULL,
"total_price" numeric(10,2) NOT NULL
);

CREATE TABLE "payment" (
"id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
"order_id" text,
"registration_id" text UNIQUE,
"provider" text NOT NULL DEFAULT 'INTERNAL',
"provider_payment_id" text,
"amount" numeric(10,2) NOT NULL,
"currency" text NOT NULL DEFAULT 'INR',
"created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
"updated_at" timestamptz(3) NOT NULL,
"status" "PaymentStatus" NOT NULL DEFAULT 'CREATED'
);

CREATE TABLE "ticket" (
"id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
"order_id" text,
"registration_id" text,
"ticket_type_id" text NOT NULL,
"user_id" text NOT NULL,
"ticket_code" text NOT NULL UNIQUE,
"ticket_number" text UNIQUE,
"qr_token" text UNIQUE,
"created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
"updated_at" timestamptz(3) NOT NULL,
"status" "TicketStatus" NOT NULL DEFAULT 'ACTIVE'
);

CREATE TABLE "session" (
"id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
"user_id" text NOT NULL,
"refresh_token_hash" text NOT NULL UNIQUE,
"expires_at" timestamptz(3) NOT NULL,
"revoked_at" timestamptz(3),
"replaced_by_id" text,
"created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "verification_token" (
"id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
"user_id" text NOT NULL,
"token_hash" text NOT NULL UNIQUE,
"type" text NOT NULL,
"expires_at" timestamptz(3) NOT NULL,
"used_at" timestamptz(3),
"created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "organizer_profile" (
"id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
"user_id" text NOT NULL UNIQUE,
"organization_name" text NOT NULL,
"slug" text NOT NULL UNIQUE,
"bio" text,
"website" text,
"created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
"updated_at" timestamptz(3) NOT NULL,
"verification_status" "OrganizerVerificationStatus" NOT NULL DEFAULT 'PENDING'
);

CREATE TABLE "event" (
"id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
"organizer_id" text NOT NULL,
"category_id" text NOT NULL,
"venue_id" text,
"title" text NOT NULL,
"slug" text NOT NULL UNIQUE,
"description" text,
"city" text,
"starts_at" timestamptz(3) NOT NULL,
"ends_at" timestamptz(3) NOT NULL,
"capacity" integer,
"featured" boolean NOT NULL DEFAULT FALSE,
"created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
"updated_at" timestamptz(3) NOT NULL,
"status" "EventStatus" NOT NULL DEFAULT 'DRAFT'
);

CREATE TABLE "registration" (
"id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
"user_id" text NOT NULL,
"event_id" text NOT NULL,
"booking_reference" text NOT NULL UNIQUE,
"total" numeric(10,2) NOT NULL,
"created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
"updated_at" timestamptz(3) NOT NULL,
"status" "RegistrationStatus" NOT NULL DEFAULT 'CONFIRMED',
UNIQUE ("user_id", "event_id")
);

CREATE TABLE "registration_item" (
"id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
"registration_id" text NOT NULL,
"ticket_type_id" text NOT NULL,
"quantity" integer NOT NULL,
"unit_price" numeric(10,2) NOT NULL,
"subtotal" numeric(10,2) NOT NULL,
UNIQUE ("registration_id", "ticket_type_id")
);

CREATE TABLE "check_in" (
"id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
"ticket_id" text NOT NULL UNIQUE,
"operator_id" text NOT NULL,
"checked_in_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
"status" "CheckInStatus" NOT NULL DEFAULT 'VALID'
);

CREATE TABLE "event_favorite" (
"user_id" text NOT NULL,
"event_id" text NOT NULL,
"created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
PRIMARY KEY ("user_id", "event_id")
);

CREATE TABLE "event_review" (
"id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
"user_id" text NOT NULL,
"event_id" text NOT NULL,
"rating" integer NOT NULL,
"comment" text,
"created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
"updated_at" timestamptz(3) NOT NULL,
UNIQUE ("user_id", "event_id")
);

CREATE TABLE "notification" (
"id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
"user_id" text NOT NULL,
"title" text NOT NULL,
"message" text NOT NULL,
"read_at" timestamptz(3),
"created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "audit_log" (
"id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
"actor_id" text,
"action" text NOT NULL,
"entity" text NOT NULL,
"entity_id" text,
"metadata" jsonb,
"created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "email_outbox" (
"id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
"recipient" text NOT NULL,
"subject" text NOT NULL,
"body" text NOT NULL,
"sent_at" timestamptz(3),
"attempts" integer NOT NULL DEFAULT 0,
"last_error" text,
"created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Authentication columns added by Phase 3.
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "email_verified_at" timestamptz(3);
ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "family_id" text;
ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "ip_address" text;
ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "user_agent" text;
ALTER TABLE "category" ADD COLUMN IF NOT EXISTS "sort_order" integer NOT NULL DEFAULT 0;
ALTER TABLE "check_in" ADD COLUMN IF NOT EXISTS "method" text NOT NULL DEFAULT 'QR';
ALTER TABLE "check_in" ADD COLUMN IF NOT EXISTS "gate" text;

-- Foreign keys and delete behavior (kept explicit for clean-database verification).
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE CASCADE;
ALTER TABLE "organizer" ADD CONSTRAINT "organizer_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;
ALTER TABLE "festival" ADD CONSTRAINT "festival_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "organizer"("id") ON DELETE CASCADE;
ALTER TABLE "festival" ADD CONSTRAINT "festival_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE RESTRICT;
ALTER TABLE "festival" ADD CONSTRAINT "festival_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venue"("id") ON DELETE RESTRICT;
ALTER TABLE "event" ADD CONSTRAINT "event_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "organizer_profile"("id") ON DELETE CASCADE;
ALTER TABLE "event" ADD CONSTRAINT "event_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE RESTRICT;
ALTER TABLE "event" ADD CONSTRAINT "event_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venue"("id") ON DELETE SET NULL;
ALTER TABLE "organizer_profile" ADD CONSTRAINT "organizer_profile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;
ALTER TABLE "verification_token" ADD CONSTRAINT "verification_token_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;
ALTER TABLE "ticket_type" ADD CONSTRAINT "ticket_type_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "event"("id") ON DELETE CASCADE;
ALTER TABLE "ticket_type" ADD CONSTRAINT "ticket_type_festival_id_fkey" FOREIGN KEY ("festival_id") REFERENCES "festival"("id") ON DELETE CASCADE;
ALTER TABLE "registration" ADD CONSTRAINT "registration_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;
ALTER TABLE "registration" ADD CONSTRAINT "registration_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "event"("id") ON DELETE RESTRICT;
ALTER TABLE "registration_item" ADD CONSTRAINT "registration_item_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "registration"("id") ON DELETE CASCADE;
ALTER TABLE "registration_item" ADD CONSTRAINT "registration_item_ticket_type_id_fkey" FOREIGN KEY ("ticket_type_id") REFERENCES "ticket_type"("id") ON DELETE RESTRICT;
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "registration"("id") ON DELETE CASCADE;
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_ticket_type_id_fkey" FOREIGN KEY ("ticket_type_id") REFERENCES "ticket_type"("id") ON DELETE RESTRICT;
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;
ALTER TABLE "check_in" ADD CONSTRAINT "check_in_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "ticket"("id") ON DELETE CASCADE;
ALTER TABLE "check_in" ADD CONSTRAINT "check_in_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "user"("id") ON DELETE RESTRICT;
ALTER TABLE "event_favorite" ADD CONSTRAINT "event_favorite_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;
ALTER TABLE "event_favorite" ADD CONSTRAINT "event_favorite_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "event"("id") ON DELETE CASCADE;
ALTER TABLE "event_review" ADD CONSTRAINT "event_review_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;
ALTER TABLE "event_review" ADD CONSTRAINT "event_review_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "event"("id") ON DELETE CASCADE;
ALTER TABLE "notification" ADD CONSTRAINT "notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "user"("id") ON DELETE SET NULL;
ALTER TABLE "payment" ADD CONSTRAINT "payment_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "registration"("id") ON DELETE CASCADE;
ALTER TABLE "festival_image" ADD CONSTRAINT "festival_image_festival_id_fkey" FOREIGN KEY ("festival_id") REFERENCES "festival"("id") ON DELETE CASCADE;
ALTER TABLE "order" ADD CONSTRAINT "order_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;
ALTER TABLE "order" ADD CONSTRAINT "order_festival_id_fkey" FOREIGN KEY ("festival_id") REFERENCES "festival"("id") ON DELETE RESTRICT;
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE CASCADE;
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_ticket_type_id_fkey" FOREIGN KEY ("ticket_type_id") REFERENCES "ticket_type"("id") ON DELETE RESTRICT;
ALTER TABLE "payment" ADD CONSTRAINT "payment_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE CASCADE;
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE CASCADE;
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_festival_ticket_type_id_fkey" FOREIGN KEY ("ticket_type_id") REFERENCES "ticket_type"("id") ON DELETE RESTRICT;
