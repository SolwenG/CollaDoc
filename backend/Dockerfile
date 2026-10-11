# Built from the repository root: the realtime server imports ../shared
FROM node:24-alpine

WORKDIR /app/backend

COPY backend/package.json backend/package-lock.json ./
# npm links the "shared" dependency to ../shared, which must exist before installing
COPY shared/ /app/shared/
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev

COPY backend/ ./

ENV NODE_ENV=production
EXPOSE 3000 3001

# The realtime service overrides this with src/realtime.ts
CMD ["node", "src/app.ts"]
