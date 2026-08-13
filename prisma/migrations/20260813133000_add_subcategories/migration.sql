CREATE TABLE "SubCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SubCategory_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Product" ADD COLUMN "subCategoryId" TEXT;

CREATE UNIQUE INDEX "SubCategory_categoryId_slug_key" ON "SubCategory"("categoryId", "slug");
CREATE INDEX "SubCategory_categoryId_idx" ON "SubCategory"("categoryId");
CREATE INDEX "SubCategory_active_idx" ON "SubCategory"("active");
CREATE INDEX "Product_subCategoryId_idx" ON "Product"("subCategoryId");

ALTER TABLE "SubCategory" ADD CONSTRAINT "SubCategory_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Product" ADD CONSTRAINT "Product_subCategoryId_fkey"
FOREIGN KEY ("subCategoryId") REFERENCES "SubCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

