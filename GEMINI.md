# Project Overview

This is a full-stack monorepo application for an Operations Management System (OMS). It is built with [pnpm workspaces](https://pnpm.io/workspaces) and [Turborepo](https://turbo.build/repo) to manage the monorepo structure.

The project consists of the following packages:

- `apps/frontend`: A [Next.js](https://nextjs.org/) application for the user interface.
- `apps/backend`: A [Next.js](https://nextjs.org/) application for the backend API.
- `packages/prisma-client`: A package for managing the [Prisma](https://www.prisma.io/) database client and schema.
- `packages/shared-types`: A package for sharing TypeScript types between the frontend and backend.

## Architecture

The frontend and backend are separate Next.js applications. The frontend communicates with the backend via a REST API. Authentication is handled by JWTs. The database is managed by Prisma.

# Building and Running

The following commands are available from the root of the project:

- `pnpm install`: Install dependencies for all packages.
- `pnpm dev`: Run the development server for all applications.
- `pnpm build`: Build all applications.
- `pnpm start`: Start the production server for all applications.
- `pnpm lint`: Lint all applications.

You can also run these commands from within each individual package's directory.

# Development Conventions

- **Monorepo:** The project uses a monorepo structure. All packages are located in the `apps` and `packages` directories.
- **Turborepo:** Turborepo is used to cache build outputs and speed up development.
- **Prisma:** The database schema is defined in `packages/prisma-client/prisma/schema.prisma`. To apply schema changes, run `pnpm prisma migrate dev` from the `packages/prisma-client` directory.
- **Shared Types:** Shared types between the frontend and backend are located in `packages/shared-types`.
- **Authentication:** The backend uses JWT for authentication. The authentication logic can be found in `apps/backend/src/middleware/auth.ts`.
- **API Client:** The frontend uses a generated API client to communicate with the backend. The client is located in `apps/frontend/src/lib/apiClient.ts`.
