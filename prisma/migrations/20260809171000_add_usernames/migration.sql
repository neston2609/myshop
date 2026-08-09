-- Add optional usernames for email-free login.
ALTER TABLE "User" ADD COLUMN "username" TEXT;

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
