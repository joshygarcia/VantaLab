# ──────────────────────────────────────────────────────────────────────
# Stage 1: Install ALL dependencies + compile TypeScript
# ──────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests first (Docker layer caching)
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# Install ALL deps (including devDependencies for tsc)
RUN npm install

# Generate the Prisma client
RUN npx prisma generate --schema prisma/schema.prisma

# Copy source code and compile
COPY tsconfig.json ./
COPY src ./src/
RUN npm run build

# ──────────────────────────────────────────────────────────────────────
# Stage 2: Production-only image (no devDeps, no source code)
# ──────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Security: run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy dependency manifests and install production-only deps
COPY package.json package-lock.json* ./
COPY prisma ./prisma/
RUN npm install --omit=dev

# Re-generate Prisma client for the production image
RUN npx prisma generate --schema prisma/schema.prisma

# Copy the compiled output from the builder stage
COPY --from=builder /app/dist ./dist

# Switch to non-root user
USER appuser

# Cloud Run uses the PORT env var (defaults to 4000 locally)
ENV PORT=4000
EXPOSE ${PORT}

# Health check for Cloud Run
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/api/v1/health || exit 1

# Start the compiled NestJS server
CMD ["node", "dist/main.js"]
