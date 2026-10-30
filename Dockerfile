# nshde runs on Bun (Bun.serve). Use Koyeb's Dockerfile builder, not Node buildpacks.
# bun.lock uses lockfileVersion 2 — requires Bun 1.4+ (oven/bun:1.2 is too old).
FROM oven/bun:1.4 AS base
WORKDIR /app

COPY package.json bun.lock bunfig.toml ./
RUN bun install --frozen-lockfile

COPY . .

ENV NODE_ENV=production
EXPOSE 8000

CMD ["bun", "src/server.ts"]
