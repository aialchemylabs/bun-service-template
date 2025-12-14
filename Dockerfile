# syntax=docker/dockerfile:1.5

###############################################################################
# BUILD STAGE
###############################################################################
FROM oven/bun:1-debian AS build

WORKDIR /app

ENV NODE_ENV=production \
    BUN_TELEMETRY_DISABLE=1

# Copy manifests first (better caching)
# bun.lock is the standard Bun lockfile (bun.lockb for older Bun versions).
COPY package.json bun.lock* ./

RUN bun install --frozen-lockfile

# Copy source + build (needs devDependencies like typescript)
COPY . .
RUN bun run build


###############################################################################
# RUNTIME STAGE
###############################################################################
FROM oven/bun:1-debian AS runtime

WORKDIR /app

ENV NODE_ENV=production \
    BUN_TELEMETRY_DISABLE=1

# Copy only what we need to run
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/bun.lock* ./

# Re-install production deps only (smaller, still native-safe)
RUN bun install --frozen-lockfile --production

EXPOSE 9000

CMD ["bun", "dist/index.js"]
