ALTER TABLE "Order"
ADD COLUMN "remoteAreaFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN "paymentFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN "paymentSlipUrl" TEXT,
ADD COLUMN "paymentSlipName" TEXT,
ADD COLUMN "paymentSlipBank" TEXT,
ADD COLUMN "paymentSlipAmount" DECIMAL(10,2),
ADD COLUMN "paymentSlipPaidAt" TIMESTAMP(3),
ADD COLUMN "paymentSlipNote" TEXT,
ADD COLUMN "paymentNotifiedAt" TIMESTAMP(3);

ALTER TABLE "PaymentMethod"
ADD COLUMN "additionFeePercent" DECIMAL(5,2) NOT NULL DEFAULT 0;

ALTER TABLE "SiteSettings"
ADD COLUMN "remoteAreaFee" DECIMAL(10,2) NOT NULL DEFAULT 50,
ADD COLUMN "remotePostalCodes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE TABLE "DownloadSource" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "protocol" TEXT NOT NULL DEFAULT 'sftp',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "host" TEXT,
  "port" INTEGER,
  "username" TEXT,
  "passwordCiphertext" TEXT,
  "basePath" TEXT NOT NULL DEFAULT '/',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DownloadSource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DownloadCategory" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "imageUrl" TEXT,
  "sourceId" TEXT,
  "remotePath" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DownloadCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DownloadHideRule" (
  "id" TEXT NOT NULL,
  "pattern" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DownloadHideRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DownloadLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "path" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "sizeBytes" INTEGER,
  "ip" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DownloadLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DownloadSource_name_key" ON "DownloadSource"("name");
CREATE UNIQUE INDEX "DownloadCategory_slug_key" ON "DownloadCategory"("slug");
CREATE INDEX "DownloadCategory_sourceId_idx" ON "DownloadCategory"("sourceId");
CREATE INDEX "DownloadCategory_enabled_idx" ON "DownloadCategory"("enabled");
CREATE INDEX "DownloadLog_userId_idx" ON "DownloadLog"("userId");
CREATE INDEX "DownloadLog_createdAt_idx" ON "DownloadLog"("createdAt");

ALTER TABLE "DownloadCategory"
ADD CONSTRAINT "DownloadCategory_sourceId_fkey"
FOREIGN KEY ("sourceId") REFERENCES "DownloadSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DownloadLog"
ADD CONSTRAINT "DownloadLog_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
