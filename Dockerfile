# nshde runs on Bun (Bun.serve). Use Koyeb's Dockerfile builder, not Node buildpacks.
FROM oven/bun:1.2 AS base
WORKDIR /app

COPY package.json bun.lock bunfig.toml ./
RUN bun install --frozen-lockfile

COPY . .

ENV NODE_ENV=production
EXPOSE 8000

CMD ["bun", "src/server.ts"]
