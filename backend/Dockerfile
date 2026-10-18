# Built from the repository root: the backend depends on ../shared
FROM node:24.21-alpine3.24 AS base

WORKDIR /app/backend

COPY backend/package.json backend/package-lock.json ./
# npm links the "shared" dependency to ../shared, which must exist before installing
COPY shared/ /app/shared/

# One-shot migration runner: needs the Prisma CLI (a dev dependency), its config and the migration files
FROM base AS migrate

RUN --mount=type=cache,target=/root/.npm npm ci
COPY backend/prisma.config.ts ./
COPY backend/migrations ./migrations
# The CLI reads the emitted contract (src/prisma/contract.json) named in prisma.config.ts
COPY backend/src/prisma ./src/prisma

# No telemetry: the job only needs to reach the database
ENV PRISMA_DISABLE_TELEMETRY=1

USER node

# Applies pending migrations only: --advance-ref would rewrite the git-tracked refs file. Binary called directly: npm writes to ~/.npm (read-only here)
CMD ["node_modules/.bin/prisma", "db", "migrate"]

# Application image (backend and realtime). Last stage, so also the default build target
FROM base AS runtime

RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev

# Only what runs: tsconfig, Prisma CLI files and tooling stay out (the migrate stage has its own)
COPY backend/src ./src

ENV NODE_ENV=production
EXPOSE 3000 3001

# Uploads volume mount point: the only place the app writes. A fresh volume inherits this ownership
RUN mkdir /app/uploads && chown node:node /app/uploads

# Runs unprivileged: the code stays owned by root, so the app cannot modify it
USER node

# The realtime service overrides this with src/realtime.ts
CMD ["node", "src/app.ts"]
