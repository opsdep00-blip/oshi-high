-- CreateEnum
CREATE TYPE "Role" AS ENUM ('FAN', 'IDOL', 'ADMIN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "phoneHash" TEXT,
    "phoneSalt" TEXT,
    "supportingIdolId" TEXT,
    "selectedColors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "role" "Role" NOT NULL DEFAULT 'FAN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "snsProfileId" TEXT,
    "snsHandle" TEXT,
    "snsVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Idol" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "snsLink" TEXT,
    "snsHandle" TEXT,
    "snsVerifiedAt" TIMESTAMP(3),
    "claimedBy" TEXT,
    "claimedAt" TIMESTAMP(3),
    "description" TEXT,
    "profileImage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Idol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ad" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sponsorName" TEXT,
    "idolSharePercent" INTEGER NOT NULL DEFAULT 70,
    "platformFeePercent" INTEGER NOT NULL DEFAULT 30,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YellMaterial" (
    "id" TEXT NOT NULL,
    "adId" TEXT NOT NULL,
    "pixelData" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "width" INTEGER NOT NULL DEFAULT 32,
    "height" INTEGER NOT NULL DEFAULT 32,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "YellMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "idolId" TEXT NOT NULL,
    "yellMaterialId" TEXT,
    "amount" INTEGER NOT NULL,
    "activityPoints" INTEGER NOT NULL,
    "transactionType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "phoneHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phoneHash_key" ON "User"("phoneHash");

-- CreateIndex
CREATE INDEX "User_phoneHash_idx" ON "User"("phoneHash");

-- CreateIndex
CREATE INDEX "User_supportingIdolId_idx" ON "User"("supportingIdolId");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE INDEX "VerificationToken_identifier_idx" ON "VerificationToken"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Idol_name_key" ON "Idol"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Idol_snsLink_key" ON "Idol"("snsLink");

-- CreateIndex
CREATE INDEX "Idol_snsLink_idx" ON "Idol"("snsLink");

-- CreateIndex
CREATE INDEX "Idol_claimedBy_idx" ON "Idol"("claimedBy");

-- CreateIndex
CREATE INDEX "Ad_status_idx" ON "Ad"("status");

-- CreateIndex
CREATE INDEX "YellMaterial_adId_idx" ON "YellMaterial"("adId");

-- CreateIndex
CREATE INDEX "YellMaterial_isActive_idx" ON "YellMaterial"("isActive");

-- CreateIndex
CREATE INDEX "SupportTransaction_userId_idx" ON "SupportTransaction"("userId");

-- CreateIndex
CREATE INDEX "SupportTransaction_idolId_idx" ON "SupportTransaction"("idolId");

-- CreateIndex
CREATE INDEX "SupportTransaction_yellMaterialId_idx" ON "SupportTransaction"("yellMaterialId");

-- CreateIndex
CREATE INDEX "SupportTransaction_phoneHash_idx" ON "SupportTransaction"("phoneHash");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_supportingIdolId_fkey" FOREIGN KEY ("supportingIdolId") REFERENCES "Idol"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YellMaterial" ADD CONSTRAINT "YellMaterial_adId_fkey" FOREIGN KEY ("adId") REFERENCES "Ad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTransaction" ADD CONSTRAINT "SupportTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTransaction" ADD CONSTRAINT "SupportTransaction_idolId_fkey" FOREIGN KEY ("idolId") REFERENCES "Idol"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTransaction" ADD CONSTRAINT "SupportTransaction_yellMaterialId_fkey" FOREIGN KEY ("yellMaterialId") REFERENCES "YellMaterial"("id") ON DELETE SET NULL ON UPDATE CASCADE;
