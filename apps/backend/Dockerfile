# This Dockerfile is based entirely on the user's working .bak file.
# The goal is to replicate the working logic with minimal changes.

# ---- 1. Builder Stage ----
# This stage builds the application.
FROM node:18-alpine AS builder
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy all package manifests and the lockfile
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/
COPY packages/prisma-client/package.json ./packages/prisma-client/
COPY packages/shared-types/package.json ./packages/shared-types/

# Install ALL dependencies (dev included)
RUN pnpm install --frozen-lockfile

# Copy the entire source code
COPY . .

# Set Prisma engine type
ENV PRISMA_CLIENT_ENGINE_TYPE=binary

# Run all build steps in order
RUN pnpm --filter=shared-types build
RUN pnpm --filter=prisma-client generate
RUN pnpm --filter=prisma-client build
RUN pnpm --filter=backend build

# ---- 2. Runner Stage ----
# This stage runs the application, mimicking the .bak file's logic.
FROM node:18-alpine AS runner
WORKDIR /app

# Install OS dependencies needed for runtime
RUN apk add --no-cache openssl

# Install pnpm
RUN npm install -g pnpm

# Copy all package manifests to create the workspace structure
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/apps/backend/package.json ./apps/backend/
COPY --from=builder /app/apps/frontend/package.json ./apps/frontend/
COPY --from=builder /app/packages/prisma-client/package.json ./packages/prisma-client/
COPY --from=builder /app/packages/shared-types/package.json ./packages/shared-types/

# Install production dependencies. While this seems redundant because of the next step,
# we will follow the .bak logic exactly.
RUN pnpm install --prod --frozen-lockfile

# Copy the build artifacts from the builder
COPY --from=builder /app/apps/backend/.next ./apps/backend/.next
COPY --from=builder /app/packages/prisma-client/dist ./packages/prisma-client/dist
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist

# THE KEY STEP FROM .BAK: Copy the entire node_modules from the builder, overwriting the prod-only one.
# This ensures 100% environment consistency.
COPY --from=builder /app/node_modules ./node_modules

# Set the working directory
WORKDIR /app/apps/backend

EXPOSE 8080

# Use the exact command from the .bak file, but using PORT from env for flexibility
CMD ["npx", "next", "start"]