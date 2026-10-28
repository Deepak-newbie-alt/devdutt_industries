-- CreateTable
CREATE TABLE "companysettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "companyName" VARCHAR(200) NOT NULL,
    "addressLine1" VARCHAR(255) NOT NULL,
    "addressLine2" VARCHAR(255),
    "city" VARCHAR(100) NOT NULL,
    "state" VARCHAR(100) NOT NULL,
    "postalCode" VARCHAR(20) NOT NULL,
    "country" VARCHAR(100) NOT NULL DEFAULT 'India',
    "phone" VARCHAR(20) NOT NULL,
    "email" VARCHAR(255),
    "website" VARCHAR(255),
    "gstin" VARCHAR(15),
    "logoUrl" VARCHAR(500),
    "defaultTermsAndConditions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companysettings_pkey" PRIMARY KEY ("id")
);
