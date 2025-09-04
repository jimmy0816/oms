# A new, robust Dockerfile for backend (non-standalone) - FINAL STRATEGY

# ---- 1. Base ----
# Base stage with Node.js and pnpm
FROM node:18-alpine AS base
WORKDIR /app
RUN npm install -g pnpm

# ---- 2. Dependencies ----
# Install all dependencies in a separate, cacheable layer
FROM base AS deps
WORKDIR /app

# FIRST: Install OS-level dependencies like OpenSSL, so Prisma can detect it.
RUN apk add --no-cache openssl

# THEN: Copy package manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages/prisma-client/package.json packages/prisma-client/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json

# NOW: Install all dependencies. Prisma will correctly detect the OpenSSL version.
RUN pnpm install --frozen-lockfile

# ---- 3. Builder ----
# This stage ONLY builds the TypeScript source code to JavaScript
FROM deps AS builder
WORKDIR /app

# The deps stage already has a consistent environment.
# We only need to copy the rest of the source code.
COPY . .

# Set prisma engine type for build
ENV PRISMA_CLIENT_ENGINE_TYPE=binary

# Build all TS code into JS, but skip generate
RUN pnpm --filter=shared-types build
RUN pnpm --filter=prisma-client build
RUN pnpm --filter=backend build

# ---- 4. Runner ----
# The final production image, which will generate its own Prisma client
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install OS dependencies needed for runtime
RUN apk add --no-cache openssl

# Copy dependency manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages/prisma-client/package.json packages/prisma-client/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json

# IMPORTANT: Copy the prisma schema, which is needed for the generate command
COPY packages/prisma-client/prisma ./packages/prisma-client/prisma

# Install ONLY production dependencies to keep the image smaller
RUN pnpm install --prod --frozen-lockfile

# NOW, generate the prisma client inside the final runtime environment
RUN pnpm --filter=prisma-client generate

# Copy the BUILT JS code from the builder stage
COPY --from=builder /app/apps/backend/.next ./apps/backend/.next
COPY --from=builder /app/packages/prisma-client/dist ./packages/prisma-client/dist
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist

# Set the working directory to the app
WORKDIR /app/apps/backend

EXPOSE 8080

# Use the standard next start command
CMD ["npx", "next", "start"]