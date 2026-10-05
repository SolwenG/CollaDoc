FROM node:24-alpine AS build

WORKDIR /app

# le front dépend de typescript installé à la racine du repo
COPY package.json package-lock.json ./
RUN npm ci

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --ignore-scripts --legacy-peer-deps

COPY frontend/ .
RUN npx quasar prepare && npx quasar build

FROM nginx:alpine

COPY --from=build /app/frontend/dist/spa /usr/share/nginx/html
EXPOSE 80
