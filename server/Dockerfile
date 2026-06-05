# --- deps stage: install all deps (incl. dev) for build ---
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

# --- build stage: compile TS and generate prisma client ---
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# --- seeder stage: full deps, runs all seed scripts (used by starter.sh) ---
# This stage is never pushed to a registry; it is only used via:
#   docker compose run --rm seeder
FROM build AS seeder
COPY starter-inner.sh /app/starter-inner.sh

# --- prod-deps stage: production-only node_modules ---
FROM node:20-alpine AS prod-deps
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev && npx prisma generate

# --- runtime stage ---
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package*.json ./
RUN mkdir -p uploads
EXPOSE 5000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
