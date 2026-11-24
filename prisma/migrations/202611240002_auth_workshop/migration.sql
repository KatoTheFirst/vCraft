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
