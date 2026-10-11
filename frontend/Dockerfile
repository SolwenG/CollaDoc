# Built from the repository root: the editor imports ../shared
FROM node:24-alpine AS build

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
# npm links the "shared" dependency to ../shared, which must exist before installing
COPY shared/ /app/shared/
RUN --mount=type=cache,target=/root/.npm npm ci --ignore-scripts

COPY frontend/ ./
RUN npx quasar prepare && npx quasar build

FROM nginx:alpine

COPY --from=build /app/frontend/dist/spa /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
