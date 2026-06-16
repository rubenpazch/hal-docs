# syntax=docker/dockerfile:1

# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --prefer-offline

COPY . .
RUN npm run build

# ── Stage 2: Serve ────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built React app
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx config template (processed at container start via envsubst)
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# API_URL defaults to the compose service name; override for ECS service discovery
ENV API_URL=http://api

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
