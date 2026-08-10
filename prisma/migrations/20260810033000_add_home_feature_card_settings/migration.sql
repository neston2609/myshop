ALTER TABLE "SiteSettings"
ADD COLUMN "featureOneTitle" TEXT NOT NULL DEFAULT 'Configurable shipping',
ADD COLUMN "featureOneBody" TEXT NOT NULL DEFAULT 'Enable regions, delivery fees, and checkout options from admin.',
ADD COLUMN "featureTwoTitle" TEXT NOT NULL DEFAULT 'Secure by default',
ADD COLUMN "featureTwoBody" TEXT NOT NULL DEFAULT 'Hashed passwords, signed sessions, validation, and encrypted secrets.',
ADD COLUMN "featureThreeTitle" TEXT NOT NULL DEFAULT 'AI-ready operations',
ADD COLUMN "featureThreeBody" TEXT NOT NULL DEFAULT 'Choose providers and models for descriptions, SEO text, and assistant features.';
