ALTER TABLE "Order" ADD COLUMN "discountCode" TEXT;

CREATE TABLE "DiscountCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "value" DECIMAL(10,2) NOT NULL,
    "minimumSubtotal" DECIMAL(10,2),
    "maximumDiscount" DECIMAL(10,2),
    "expiresAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DiscountCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DiscountCode_code_key" ON "DiscountCode"("code");
CREATE INDEX "DiscountCode_active_isPublic_idx" ON "DiscountCode"("active", "isPublic");
CREATE INDEX "DiscountCode_expiresAt_idx" ON "DiscountCode"("expiresAt");

