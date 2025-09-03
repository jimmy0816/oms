# Dockerfile for frontend using turbo prune - FINAL

# ---- 1. Base ----
# A base stage with node and pnpm installed
FROM node:18-alpine AS base
WORKDIR /app
RUN npm install -g pnpm

# ---- 2. Pruner ----
# Prune the monorepo to only include files needed for the 'frontend' app
FROM base AS pruner
WORKDIR /app

# Copy the root dependency files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy the full source code to allow turbo to analyze the dependency graph
COPY . .

# Generate a pruned monorepo subset for 'frontend'
RUN npx turbo prune --scope=frontend --docker

# ---- 3. Installer ----
# Install dependencies for the pruned subset of the monorepo
FROM base AS installer
WORKDIR /app

# Copy the pruned package.json files and lockfile
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

# Install dependencies
RUN pnpm install --frozen-lockfile

# ---- 4. Builder ----
# Build the 'frontend' application
FROM base AS builder
WORKDIR /app

# First, copy the full pruned source code
COPY --from=pruner /app/out/full/ .

# Then, copy the entire workspace from the installer stage.
# This includes node_modules AND the package.json files that pnpm needs to understand the workspace.
# This is the critical fix.
COPY --from=installer /app/ .

# Pass build arguments for environment variables
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_BASE_URL
ARG NEXTAUTH_URL
ARG NEXTAUTH_SECRET
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL
ENV NEXTAUTH_URL=$NEXTAUTH_URL
ENV NEXTAUTH_SECRET=$NEXTAUTH_SECRET

# Run the build command using turbo, which respects the dependency graph
RUN pnpm turbo build --filter=frontend

# ---- 5. Runner ----
# The final, minimal image for running the application
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy the standalone output from the builder
COPY --from=builder /app/apps/frontend/.next/standalone ./

# Copy the public and static assets
COPY --from=builder /app/apps/frontend/public ./public
COPY --from=builder /app/apps/frontend/.next/static ./.next/static

EXPOSE 8080

# This is the correct command to run the standalone server.
# It will automatically listen on the PORT environment variable provided by Cloud Run.
CMD ["node", "server.js"]