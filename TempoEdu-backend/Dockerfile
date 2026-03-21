# Stage 1: Install build dependencies (includes dev deps)
FROM node:20-alpine AS build-deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --include=dev

# Stage 2: Install production dependencies only
FROM node:20-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# Stage 3: Build
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=build-deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 4: Production runtime
FROM node:20-alpine
WORKDIR /app
RUN addgroup -S nodejs && adduser -S nestjs -G nodejs
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
ENV NODE_ENV=production
EXPOSE 3000
USER nestjs
CMD ["node", "dist/main"]
