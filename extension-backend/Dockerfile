# Use Bun image as base
FROM oven/bun:1.2-slim AS base

# Set working directory
WORKDIR /app

# Copy package.json and bun.lockb (if exists) for dependency installation
COPY package.json ./
COPY bun.lockb* ./

# Install dependencies
RUN bun install --frozen-lockfile --production=false

# Build stage
FROM base AS build

# Copy Prisma schema first
COPY prisma ./prisma

# Generate Prisma client
RUN bun run db:generate

# Copy source code
COPY src ./src
COPY tsconfig.json* ./

# Build the application
RUN bun run build

# Production stage
FROM oven/bun:1.2-slim AS production

# Set working directory
WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 bunjs
RUN adduser --system --uid 1001 bunjs

# Copy only the built application
COPY --from=build --chown=bunjs:bunjs /app/dist ./dist

# Switch to non-root user
USER bunjs

# Expose port (adjust if your app uses a different port)
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Run the bundled application
CMD ["bun", "dist/index.js"]
