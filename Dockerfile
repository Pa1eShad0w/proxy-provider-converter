FROM node:22-slim AS builder
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
RUN pnpm exec esbuild server.mjs \
      --bundle \
      --platform=node \
      --target=node22 \
      --format=esm \
      --outfile=server.bundle.mjs \
      --banner:js="import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);"

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.bundle.mjs ./server.bundle.mjs
EXPOSE 3000
CMD ["node", "server.bundle.mjs"]
