# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS base
RUN apt-get update && apt-get install --yes --no-install-recommends openssl && \
    rm -rf /var/lib/apt/lists/* && \
    corepack enable && corepack prepare yarn@1.22.22 --activate
WORKDIR /app

FROM base AS dependencies
COPY package.json yarn.lock ./
COPY backend/package.json backend/package.json
COPY web/package.json web/package.json
RUN yarn install --frozen-lockfile

FROM dependencies AS build
COPY backend backend
WORKDIR /app/backend
RUN DATABASE_URL=postgresql://postgres:postgres@localhost:5432/app yarn prisma generate
RUN yarn build

FROM base AS production-dependencies
ENV NODE_ENV=production
WORKDIR /app/backend
COPY yarn.lock ./yarn.lock
COPY backend/package.json ./package.json
RUN yarn install --frozen-lockfile --production=true && yarn cache clean

FROM node:22-bookworm-slim AS runtime
RUN apt-get update && apt-get install --yes --no-install-recommends openssl && \
    rm -rf /var/lib/apt/lists/* && \
    corepack disable && \
    npm install --global yarn@1.22.22 && \
    groupadd --system --gid 1001 rag && \
    useradd --system --uid 1001 --gid rag --create-home --home-dir /home/rag --shell /usr/sbin/nologin rag
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5555
COPY --from=production-dependencies /app/backend ./backend
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/prisma ./backend/prisma
COPY --from=build /app/backend/prisma.config.ts ./backend/prisma.config.ts
USER rag
WORKDIR /app/backend
EXPOSE 5555
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=6 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:5555/').then((response) => { if (!response.ok) process.exit(1); }).catch(() => process.exit(1));"]
CMD ["node", "dist/src/main.js"]
