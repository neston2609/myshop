ALTER TABLE "Product"
  ADD COLUMN "recommendedPosition" INTEGER;

CREATE INDEX "Product_recommendedPosition_idx" ON "Product"("recommendedPosition");
