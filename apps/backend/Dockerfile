# Final working Dockerfile for backend, combining optimization with robust runtime

# ---- 1. Base ----
# Base stage with Node.js and pnpm
FROM node:18-alpine AS base
WORKDIR /app
RUN npm install -g pnpm

# ---- 2. Dependencies ----
# This stage creates a cached layer of ALL dependencies (dev included)
# It is the primary optimization.
FROM base AS deps
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages/prisma-client/package.json packages/prisma-client/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
RUN pnpm install --frozen-lockfile

# ---- 3. Builder ----
# This stage builds the entire application
FROM deps AS builder
WORKDIR /app
COPY . .
ENV PRISMA_CLIENT_ENGINE_TYPE=binary
RUN pnpm --filter=shared-types build
RUN pnpm --filter=prisma-client db:generate
RUN pnpm --filter=prisma-client build
RUN pnpm --filter=backend build

# ---- 4. Runner ----
# The final production image.
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl

# Copy all package manifests to provide the full workspace context to pnpm at runtime.
# THIS IS THE CRITICAL FIX.
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/apps/backend/package.json ./apps/backend/
COPY --from=builder /app/apps/frontend/package.json ./apps/frontend/
COPY --from=builder /app/packages/prisma-client/package.json ./packages/prisma-client/
COPY --from=builder /app/packages/shared-types/package.json ./packages/shared-types/

# Copy the EXACT node_modules from the builder stage to ensure consistency.
COPY --from=builder /app/node_modules /app/node_modules

# Copy the built code artifacts
COPY --from=builder /app/apps/backend/.next ./apps/backend/.next
COPY --from=builder /app/packages/prisma-client/dist ./packages/prisma-client/dist
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist

# Set the working directory to the app
WORKDIR /app/apps/backend

EXPOSE 8080

# Use the standard next start command
CMD ["npx", "next", "start"]
