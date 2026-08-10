ALTER TABLE "ShippingMethod"
ADD COLUMN "freeShippingThreshold" DECIMAL(10,2);

ALTER TABLE "Order"
ADD COLUMN "shippingSubdistrict" TEXT,
ADD COLUMN "shippingDistrict" TEXT,
ADD COLUMN "shippingProvince" TEXT,
ADD COLUMN "shippingPostalCode" TEXT;
