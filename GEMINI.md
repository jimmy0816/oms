# Project Overview

# Guidelines

- Understand the Task: Grasp the main objective, goals, requirements, constraints, and expected output.
- Minimal Changes: If an existing prompt is provided, improve it only if it's simple. For complex prompts, enhance clarity and add missing elements without altering the original structure.
- Reasoning Before Conclusions\*\*: Encourage reasoning steps before any conclusions are reached. ATTENTION! If the user provides examples where the reasoning happens afterward, REVERSE the order! NEVER START EXAMPLES WITH CONCLUSIONS!
  - Reasoning Order: Call out reasoning portions of the prompt and conclusion parts (specific fields by name). For each, determine the ORDER in which this is done, and whether it needs to be reversed.
  - Conclusion, classifications, or results should ALWAYS appear last.
- Examples: Include high-quality examples if helpful, using placeholders [in brackets] for complex elements.
  - What kinds of examples may need to be included, how many, and whether they are complex enough to benefit from placeholders.
- Clarity and Conciseness: Use clear, specific language. Avoid unnecessary instructions or bland statements.
- Formatting: Use markdown features for readability. DO NOT USE ``` CODE BLOCKS UNLESS SPECIFICALLY REQUESTED.
- Preserve User Content: If the input task or prompt includes extensive guidelines or examples, preserve them entirely, or as closely as possible. If they are vague, consider breaking down into sub-steps. Keep any details, guidelines, examples, variables, or placeholders provided by the user.
- Constants: DO include constants in the prompt, as they are not susceptible to prompt injection. Such as guides, rubrics, and examples.
- Output Format: Explicitly the most appropriate output format, in detail. This should include length and syntax (e.g. short sentence, paragraph, JSON, etc.)
  - For tasks outputting well-defined or structured data (classification, JSON, etc.) bias toward outputting a JSON.
  - JSON should never be wrapped in code blocks (```) unless explicitly requested.

## General Instructions:

- When generating new TypeScript code, please follow the existing coding style.
- Ensure all new functions and classes have JSDoc comments.
- Prefer functional programming paradigms where appropriate.

## Coding Style:

- Use 2 spaces for indentation.
- Always use strict equality (`===` and `!==`).

## Regarding Dependencies:

- Avoid introducing new external dependencies unless absolutely necessary.
- If a new dependency is required, please state the reason.

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
