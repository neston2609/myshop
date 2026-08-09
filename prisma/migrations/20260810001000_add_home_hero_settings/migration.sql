ALTER TABLE "SiteSettings"
ADD COLUMN "heroEyebrow" TEXT NOT NULL DEFAULT 'Minimal commerce, ready to grow',
ADD COLUMN "heroTitle" TEXT NOT NULL DEFAULT 'Shop essentials with a calmer checkout.',
ADD COLUMN "heroSubtitle" TEXT NOT NULL DEFAULT 'A modern storefront with guest checkout, customer accounts, secure admin controls, uploads, SMTP, payments, and AI configuration.';
