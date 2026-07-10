# ${projectName} Backend API

Scaffolded Express.js web application built with TypeScript, Prisma, and Express routing.

## Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Database Setup**:
   Generate the Prisma Client and push the schema to the database (generates the local SQLite database file `dev.db`):
   ```bash
   npx prisma db push
   ```

3. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   The API will be available at [http://localhost:3000](http://localhost:3000).

## Project Structure

- `src/index.ts`: Application entry point.
- `src/app.ts`: Express application configuration and middleware integration.
- `src/config/database.ts`: Exported Prisma Client instance.
- `src/errors/`: Custom error definitions (e.g. `ApiError`).
- `src/middleware/`: Express middleware including `errorHandler`.
- `src/routes/`: Express routers and endpoint definitions.
- `src/controllers/`: Controllers handling requests, invoking services, and sending responses.
- `src/services/`: Business logic layer interacting with Prisma database.
- `prisma/schema.prisma`: Prisma schema defining data models.
