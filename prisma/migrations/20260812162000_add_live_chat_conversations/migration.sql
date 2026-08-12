CREATE TABLE "LiveChatConversation" (
  "id" TEXT NOT NULL,
  "chatRef" TEXT NOT NULL,
  "customerName" TEXT,
  "customerContact" TEXT,
  "pageUrl" TEXT,
  "pageTitle" TEXT,
  "productId" TEXT,
  "productName" TEXT,
  "lineRecipientId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "LiveChatConversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LiveChatMessage" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "sender" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'WEB',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "LiveChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LiveChatConversation_chatRef_key" ON "LiveChatConversation"("chatRef");
CREATE INDEX "LiveChatConversation_chatRef_idx" ON "LiveChatConversation"("chatRef");
CREATE INDEX "LiveChatConversation_lineRecipientId_idx" ON "LiveChatConversation"("lineRecipientId");
CREATE INDEX "LiveChatConversation_status_idx" ON "LiveChatConversation"("status");
CREATE INDEX "LiveChatConversation_createdAt_idx" ON "LiveChatConversation"("createdAt");
CREATE INDEX "LiveChatMessage_conversationId_idx" ON "LiveChatMessage"("conversationId");
CREATE INDEX "LiveChatMessage_createdAt_idx" ON "LiveChatMessage"("createdAt");

ALTER TABLE "LiveChatMessage"
ADD CONSTRAINT "LiveChatMessage_conversationId_fkey"
FOREIGN KEY ("conversationId") REFERENCES "LiveChatConversation"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
