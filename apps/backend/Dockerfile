# Stage 1: Installation and Build
FROM node:18-alpine AS builder

# Install dependencies needed for packages, like openssl for Prisma
# and python/make/g++ for other native modules.
RUN apk add --no-cache openssl python3 make g++

# Use pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy dependency definition files first to leverage Docker cache
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy all individual package.json files
COPY apps/backend/package.json ./apps/backend/
COPY packages/prisma-client/package.json ./packages/prisma-client/
COPY packages/shared-types/package.json ./packages/shared-types/

# Install all dependencies (including devDependencies for building)
RUN pnpm install

# Copy the rest of the source code
COPY . .

# Build the backend app and its dependencies using Turborepo.
# This will automatically run `prisma generate` if it's part of the build script.
RUN pnpm turbo run build --filter=backend...

# Use pnpm deploy to create a pruned production-ready folder
# This copies only the necessary files and production dependencies for the backend app
RUN pnpm --filter=backend deploy --prod /prod/app

RUN cp -r /app/apps/backend/.next /prod/app/apps/backend/.next

# ---

# Stage 2: Final Runner Image
# Use the specific alpine version for OpenSSL 1.1 compatibility with Prisma
FROM node:18-alpine3.15 AS runner
WORKDIR /app

# Install only runtime native dependencies
RUN apk add --no-cache openssl postgresql-client

# Copy the pruned and built application from the builder stage
COPY --from=builder /prod/app .

# Set environment for production
ENV NODE_ENV=production
ENV PORT=8080

# Expose the port the app runs on
EXPOSE 8080

# Set the working directory to the specific app
WORKDIR /app/apps/backend

# Start the app
CMD ["../../node_modules/.bin/next", "start", "-p", "8080"]
