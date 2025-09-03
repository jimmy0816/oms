# A new, robust Dockerfile for frontend (non-standalone) - CORRECTED

# ---- 1. Base ----
# Base stage with Node.js and pnpm
FROM node:18-alpine AS base
WORKDIR /app
RUN npm install -g pnpm

# ---- 2. Dependencies ----
# Install all dependencies in a separate, cacheable layer
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Copy all package.json files to understand the workspace structure
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

# Pass build arguments
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_BASE_URL
ARG NEXTAUTH_URL
ARG NEXTAUTH_SECRET
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL
ENV NEXTAUTH_URL=$NEXTAUTH_URL
ENV NEXTAUTH_SECRET=$NEXTAUTH_SECRET

# Manually build dependencies first, then the app
RUN pnpm --filter=shared-types build
RUN pnpm --filter=frontend build

# ---- 4. Runner ----
# The final production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy dependency manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages/prisma-client/package.json packages/prisma-client/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json

# Install ONLY production dependencies to keep the image smaller
RUN pnpm install --prod --frozen-lockfile

# Copy the build output and public files from the builder stage
COPY --from=builder /app/apps/frontend/.next ./apps/frontend/.next
COPY --from=builder /app/apps/frontend/public ./apps/frontend/public

# Set the working directory to the app
WORKDIR /app/apps/frontend

EXPOSE 8080

# Use the familiar next start command.
# It automatically respects the PORT environment variable set by Cloud Run.
CMD ["npx", "next", "start"]