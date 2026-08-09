# MyShop

MyShop is a production-oriented shopping website built with Next.js, TypeScript, TailwindCSS, Prisma, and PostgreSQL.

## Features

- Responsive storefront with product search, category filtering, product details, image galleries, YouTube/self-hosted video support, cart, guest checkout, login, registration, and customer order history.
- Protected admin dashboard for orders, revenue, products, categories, customers, shipping, payments, branding, SMTP, AI configuration, and uploads.
- PostgreSQL schema managed by Prisma migrations, with seed data for categories, products, shipping, payment, site settings, and an admin user.
- Secure password hashing, signed HTTP-only session cookies, encrypted provider credentials, login rate limiting, validation with Zod, upload type/size validation, and security headers.
- Dockerfile and docker-compose for local or server deployment.

## Setup

1. Copy `.env.example` to `.env`.
2. Fill `DATABASE_URL`, `JWT_SECRET`, `ENCRYPTION_KEY`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`.
3. Install dependencies:

```bash
npm install
```

4. Generate Prisma Client and apply migrations:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run db:seed
```

5. Start development:

```bash
npm run dev
```

## Production

Build and run with:

```bash
npm run build
npm run start
```

For Docker:

```bash
docker compose up --build
```

Keep real database credentials, SMTP passwords, payment credentials, and AI provider keys in environment variables or encrypted database settings. Do not commit `.env` files.
