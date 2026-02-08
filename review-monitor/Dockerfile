# ---------- build stage ----------
FROM node:20-alpine AS build
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY tsconfig.json ./
COPY src/ src/
RUN pnpm build:esbuild

# ---------- runtime stage ----------
FROM node:20-alpine
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY --from=build /app/dist/ dist/
COPY public/ public/
COPY data/mockComments.json data/mockComments.json

# data directory for JSON store (products, snapshots, reports)
VOLUME /app/data

ENV PORT=3000
EXPOSE 3000

CMD ["node", "dist/index.js"]
