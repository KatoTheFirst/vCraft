-- vCraft | Install once in a fresh Supabase project. All changes are atomic.
BEGIN;
SET LOCAL search_path TO public, pg_catalog;
-- 202611240001_foundation
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'ARTISAN', 'BUYER');

-- CreateEnum
CREATE TYPE "Approval" AS ENUM ('PENDING', 'APPROVED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "QuoteState" AS ENUM ('DRAFT_REQUEST', 'SENT_TO_ARTISANS', 'ARTISANS_BIDDING', 'BUYER_ACCEPTED', 'IN_PRODUCTION', 'DELIVERED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "passwordHash" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CraftVillage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "CraftVillage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtisanProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "villageId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "story" TEXT,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "certificates" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "isOpen" BOOLEAN NOT NULL DEFAULT false,
    "approval" "Approval" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "ArtisanProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "artisanId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "price" DECIMAL(14,0) NOT NULL,
    "story" TEXT,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "published" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionBatch" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "ProductionBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionLog" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL,
    "title" TEXT NOT NULL,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "ProductionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteRequest" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "deadline" TIMESTAMPTZ(3) NOT NULL,
    "state" "QuoteState" NOT NULL DEFAULT 'DRAFT_REQUEST',
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "QuoteRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteRecipient" (
    "requestId" TEXT NOT NULL,
    "artisanId" TEXT NOT NULL,

    CONSTRAINT "QuoteRecipient_pkey" PRIMARY KEY ("requestId","artisanId")
);

-- CreateTable
CREATE TABLE "QuoteBid" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "artisanId" TEXT NOT NULL,
    "unitPrice" DECIMAL(14,0) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "completionDate" TIMESTAMPTZ(3) NOT NULL,
    "acceptedQuantity" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "QuoteBid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityNews" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "publishedAt" TIMESTAMPTZ(3),

    CONSTRAINT "CommunityNews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CraftVillage_slug_key" ON "CraftVillage"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ArtisanProfile_userId_key" ON "ArtisanProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ArtisanProfile_slug_key" ON "ArtisanProfile"("slug");

-- CreateIndex
CREATE INDEX "ArtisanProfile_villageId_approval_idx" ON "ArtisanProfile"("villageId", "approval");

-- CreateIndex
CREATE INDEX "Product_artisanId_published_idx" ON "Product"("artisanId", "published");

-- CreateIndex
CREATE INDEX "Product_category_idx" ON "Product"("category");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionBatch_code_key" ON "ProductionBatch"("code");

-- CreateIndex
CREATE INDEX "ProductionBatch_productId_idx" ON "ProductionBatch"("productId");

-- CreateIndex
CREATE INDEX "ProductionLog_batchId_occurredAt_idx" ON "ProductionLog"("batchId", "occurredAt");

-- CreateIndex
CREATE INDEX "QuoteRequest_buyerId_state_idx" ON "QuoteRequest"("buyerId", "state");

-- CreateIndex
CREATE INDEX "QuoteRecipient_artisanId_idx" ON "QuoteRecipient"("artisanId");

-- CreateIndex
CREATE INDEX "QuoteBid_artisanId_idx" ON "QuoteBid"("artisanId");

-- CreateIndex
CREATE UNIQUE INDEX "QuoteBid_requestId_artisanId_key" ON "QuoteBid"("requestId", "artisanId");

-- CreateIndex
CREATE INDEX "CommunityNews_publishedAt_idx" ON "CommunityNews"("publishedAt");

-- CreateIndex
CREATE INDEX "CommunityNews_authorId_idx" ON "CommunityNews"("authorId");

-- AddForeignKey
ALTER TABLE "ArtisanProfile" ADD CONSTRAINT "ArtisanProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtisanProfile" ADD CONSTRAINT "ArtisanProfile_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "CraftVillage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_artisanId_fkey" FOREIGN KEY ("artisanId") REFERENCES "ArtisanProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionBatch" ADD CONSTRAINT "ProductionBatch_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionLog" ADD CONSTRAINT "ProductionLog_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ProductionBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteRequest" ADD CONSTRAINT "QuoteRequest_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteRecipient" ADD CONSTRAINT "QuoteRecipient_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "QuoteRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteRecipient" ADD CONSTRAINT "QuoteRecipient_artisanId_fkey" FOREIGN KEY ("artisanId") REFERENCES "ArtisanProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteBid" ADD CONSTRAINT "QuoteBid_requestId_artisanId_fkey" FOREIGN KEY ("requestId", "artisanId") REFERENCES "QuoteRecipient"("requestId", "artisanId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteBid" ADD CONSTRAINT "QuoteBid_artisanId_fkey" FOREIGN KEY ("artisanId") REFERENCES "ArtisanProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityNews" ADD CONSTRAINT "CommunityNews_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ArtisanProfile" ADD CHECK (("latitude" IS NULL) = ("longitude" IS NULL)), ADD CHECK ("latitude" BETWEEN -90 AND 90 AND "longitude" BETWEEN -180 AND 180);
ALTER TABLE "Product" ADD CHECK ("price" >= 0);
ALTER TABLE "ProductionBatch" ADD CHECK ("quantity" > 0);
ALTER TABLE "QuoteRequest" ADD CHECK ("quantity" > 0);
ALTER TABLE "QuoteBid" ADD CHECK ("unitPrice" >= 0 AND "quantity" > 0 AND "acceptedQuantity" BETWEEN 0 AND "quantity");

-- 202611240002_auth_workshop
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phone" TEXT;

-- AlterTable
ALTER TABLE "ArtisanProfile" ADD COLUMN     "familyHistory" TEXT;

-- CreateTable
CREATE TABLE "LoginSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "LoginSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthAttempt" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "AuthAttempt_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "artisanId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "bytes" INTEGER NOT NULL,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LoginSession_expiresAt_idx" ON "LoginSession"("expiresAt");

-- CreateIndex
CREATE INDEX "LoginSession_userId_idx" ON "LoginSession"("userId");

-- CreateIndex
CREATE INDEX "AuthAttempt_expiresAt_idx" ON "AuthAttempt"("expiresAt");

-- CreateIndex
CREATE INDEX "MediaAsset_artisanId_purpose_idx" ON "MediaAsset"("artisanId", "purpose");

-- AddForeignKey
ALTER TABLE "LoginSession" ADD CONSTRAINT "LoginSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_artisanId_fkey" FOREIGN KEY ("artisanId") REFERENCES "ArtisanProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ArtisanProfile" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;

-- 202611240003_project_database

-- AlterEnum
ALTER TYPE "Approval" ADD VALUE 'REJECTED';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "ArtisanProfile" ADD COLUMN     "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "reviewNote" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMPTZ(3),
ADD COLUMN     "reviewedById" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "ProductionBatch" ADD COLUMN     "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "qrIssuedAt" TIMESTAMPTZ(3),
ADD COLUMN     "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "QuoteRequest" ADD COLUMN     "budget" DECIMAL(16,0),
ADD COLUMN     "category" TEXT,
ADD COLUMN     "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "QuoteBid" ADD COLUMN     "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deliveredQuantity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "producedQuantity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "CommunityNews" ADD COLUMN     "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "pinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "ArtisanProfile_reviewedById_idx" ON "ArtisanProfile"("reviewedById");

-- CreateIndex
CREATE INDEX "ArtisanProfile_villageId_approval_isOpen_idx" ON "ArtisanProfile"("villageId", "approval", "isOpen");

-- CreateIndex
CREATE INDEX "QuoteRequest_state_createdAt_idx" ON "QuoteRequest"("state", "createdAt");

-- CreateIndex
CREATE INDEX "CommunityNews_pinned_publishedAt_idx" ON "CommunityNews"("pinned", "publishedAt");

-- AddForeignKey
ALTER TABLE "ArtisanProfile" ADD CONSTRAINT "ArtisanProfile_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "QuoteRequest" ADD CONSTRAINT "quote_budget_nonnegative" CHECK ("budget" >= 0);
ALTER TABLE "QuoteBid" ADD CONSTRAINT "bid_progress_order" CHECK (
  0 <= "deliveredQuantity" AND "deliveredQuantity" <= "producedQuantity"
  AND "producedQuantity" <= "acceptedQuantity"
);

-- Changing a bid first writes the parent row. Concurrent allocations for the
-- same order then serialize (or receive a serialization failure at higher isolation).
CREATE FUNCTION check_bid_allocation() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE capacity integer;
BEGIN
  UPDATE "QuoteRequest" SET "version" = "version" + 1, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = NEW."requestId" RETURNING "quantity" INTO capacity;
  IF (SELECT sum("acceptedQuantity") FROM "QuoteBid" WHERE "requestId" = NEW."requestId") > capacity THEN
    RAISE EXCEPTION 'Assigned quantity exceeds request quantity' USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER check_bid_allocation AFTER INSERT OR UPDATE OF "requestId", "acceptedQuantity"
ON "QuoteBid" FOR EACH ROW EXECUTE FUNCTION check_bid_allocation();

CREATE FUNCTION check_request_capacity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT sum("acceptedQuantity") FROM "QuoteBid" WHERE "requestId" = NEW."id") > NEW."quantity" THEN
    RAISE EXCEPTION 'Request quantity is below assigned quantity' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER check_request_capacity BEFORE UPDATE OF "quantity" ON "QuoteRequest"
FOR EACH ROW EXECUTE FUNCTION check_request_capacity();

-- Validate existing orders too. An invalid allocation aborts the whole migration.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "QuoteBid" b JOIN "QuoteRequest" r ON r.id = b."requestId"
    GROUP BY r.id, r.quantity HAVING SUM(b."acceptedQuantity") > r.quantity) THEN
    RAISE EXCEPTION 'Existing order exceeds its requested quantity';
  END IF;
END $$;

ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CraftVillage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ArtisanProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ProductionBatch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ProductionLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."QuoteRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."QuoteRecipient" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."QuoteBid" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CommunityNews" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."LoginSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AuthAttempt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."MediaAsset" ENABLE ROW LEVEL SECURITY;
-- RLS governs rows; remove table grants as well (including TRUNCATE).
DO $$
DECLARE api_role text; table_name text;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = api_role) THEN
      FOREACH table_name IN ARRAY ARRAY['User','CraftVillage','ArtisanProfile','Product','ProductionBatch','ProductionLog','QuoteRequest','QuoteRecipient','QuoteBid','CommunityNews','LoginSession','AuthAttempt','MediaAsset'] LOOP
        EXECUTE format('REVOKE ALL ON TABLE public.%I FROM %I', table_name, api_role);
      END LOOP;
    END IF;
  END LOOP;
END $$;
COMMIT;
