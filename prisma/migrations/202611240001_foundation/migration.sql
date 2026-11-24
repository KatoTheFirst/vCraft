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
