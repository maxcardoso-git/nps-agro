# Stage 1 - deps: install dependencies
# Note: user-portal has no local package-lock.json (uses root monorepo lockfile),
# so npm install is used instead of npm ci.
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm install --ignore-scripts

# Stage 2 - build: compile Next.js with standalone output
FROM deps AS build
WORKDIR /app
COPY . .
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_DEFAULT_LOCALE=pt-BR
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_DEFAULT_LOCALE=$NEXT_PUBLIC_DEFAULT_LOCALE
RUN npm run build

# Stage 3 - production: minimal standalone server
FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
RUN mkdir -p ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
ENV PORT=3000
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://0.0.0.0:3000/').then(r=>{if(!r.ok)throw r.status}).catch(()=>process.exit(1))"
CMD ["sh", "-c", "HOSTNAME=0.0.0.0 node server.js"]
