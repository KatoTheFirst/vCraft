BEGIN;
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
COMMIT;
