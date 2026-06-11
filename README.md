# PH Health Care Backend

Healthcare management API built with Express, TypeScript, Prisma, and PostgreSQL.

## Project Structure

```
prisma/schema/     # Split Prisma schema files
src/
  app/modules/     # Feature modules (auth, doctor, patient, etc.)
  app/routes/      # Route aggregator
  config/          # Environment & Prisma client
  middlewares/       # Auth, validation, error handling
  utils/           # Shared helpers
  errors/          # Error handlers
  types/           # TypeScript declarations
  constants/       # App constants
src/app.ts         # Express app setup
server.ts          # Entry point
```

## Getting Started

1. Copy `.env.example` to `.env` and fill in values.
2. Install dependencies: `npm install`
3. Generate Prisma client: `npm run generate`
4. Run migrations: `npm run migrate`
5. Start dev server: `npm run dev`

## API Base URL

`http://localhost:5000/api/v1`

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Compile TypeScript
- `npm run start` - Run production build
- `npm run migrate` - Run Prisma migrations
- `npm run generate` - Generate Prisma client
- `npm run studio` - Open Prisma Studio
