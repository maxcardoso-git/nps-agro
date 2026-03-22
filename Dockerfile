# Stage 1 - deps: install all dependencies (dev + prod) needed for tsc build
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Stage 2 - build: compile TypeScript to dist/
FROM deps AS build
WORKDIR /app
COPY tsconfig.json tsconfig.build.json ./
COPY src/ src/
RUN npm run build

# Stage 3 - production: minimal runtime image
FROM node:22-alpine AS production
# psql CLI required by scripts/run-migrations.sh
RUN apk add --no-cache postgresql-client bash
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY --from=build /app/dist dist/
COPY sql/ sql/
COPY scripts/run-migrations.sh scripts/run-migrations.sh
RUN chmod +x scripts/run-migrations.sh
ENV NODE_ENV=production
ENV PORT=3310
EXPOSE 3310
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3310/health || exit 1
CMD ["node", "dist/main.js"]
