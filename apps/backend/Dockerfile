# A new, robust Dockerfile for backend (non-standalone)

# ---- 1. Base ----
# Base stage with Node.js and pnpm
FROM node:18-alpine AS base
WORKDIR /app
RUN npm install -g pnpm

# ---- 2. Dependencies ----
# Install all dependencies in a separate, cacheable layer
FROM base AS deps
WORKDIR /app
# Copy all package.json files to understand the workspace structure
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages/prisma-client/package.json packages/prisma-client/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
# Install all dependencies (including devDependencies for the build)
RUN pnpm install --frozen-lockfile

# ---- 3. Builder ----
# Build the application, starting from the deps stage to preserve the context
FROM deps AS builder
WORKDIR /app

# The deps stage already has node_modules and package.json files.
# We only need to copy the rest of the source code.
COPY . .

# Set prisma engine type for build
ENV PRISMA_CLIENT_ENGINE_TYPE=binary

# Build dependencies and the app itself in order
RUN pnpm --filter=shared-types build
RUN pnpm --filter=prisma-client generate
RUN pnpm --filter=prisma-client build
RUN pnpm --filter=backend build

# ---- 4. Runner ----
# The final production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# Prisma runtime requires OpenSSL
RUN apk add --no-cache openssl

# Copy dependency manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages/prisma-client/package.json packages/prisma-client/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json

# Install ONLY production dependencies to keep the image smaller
RUN pnpm install --prod --frozen-lockfile

# Copy the build output from the builder stage
COPY --from=builder /app/apps/backend/.next ./apps/backend/.next
COPY --from=builder /app/packages/prisma-client/dist ./packages/prisma-client/dist
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist

# IMPORTANT: Copy the generated Prisma client which is needed at runtime
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Set the working directory to the app
WORKDIR /app/apps/backend

EXPOSE 8080

# Use the standard next start command
CMD ["npx", "next", "start"]