ALTER TABLE "SiteSettings"
ADD COLUMN "liveChatEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "lineOaId" TEXT NOT NULL DEFAULT '@retroconsole1981',
ADD COLUMN "lineChatPrompt" TEXT NOT NULL DEFAULT 'สวัสดีครับ สนใจสอบถามสินค้า',
ADD COLUMN "lineChannelTokenCiphertext" TEXT,
ADD COLUMN "lineAdminRecipientId" TEXT,
ADD COLUMN "lineNotifyProductContext" BOOLEAN NOT NULL DEFAULT false;
