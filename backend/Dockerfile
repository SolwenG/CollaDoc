# Built from the repository root: the realtime server imports ../shared
FROM node:24.21-alpine3.24

WORKDIR /app/backend

COPY backend/package.json backend/package-lock.json ./
# npm links the "shared" dependency to ../shared, which must exist before installing
COPY shared/ /app/shared/
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev

COPY backend/ ./

ENV NODE_ENV=production
EXPOSE 3000 3001

# Uploads volume mount point: the only place the app writes. A fresh volume inherits this ownership
RUN mkdir /app/uploads && chown node:node /app/uploads

# Runs unprivileged: the code stays owned by root, so the app cannot modify it
USER node

# The realtime service overrides this with src/realtime.ts
CMD ["node", "src/app.ts"]
