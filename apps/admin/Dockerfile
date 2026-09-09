FROM node:24-bookworm-slim AS base

ENV PNPM_HOME=/pnpm
ENV PATH="${PNPM_HOME}:$PATH"
ENV NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates && rm -rf /var/lib/apt/lists/* \
  && corepack enable && corepack prepare pnpm@11.25.0 --activate

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/admin/package.json ./apps/admin/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/contracts ./packages/contracts

RUN pnpm install --frozen-lockfile --ignore-scripts

COPY . .

RUN pnpm --filter @assostack/admin build

FROM node:24-bookworm-slim AS runtime

ENV PNPM_HOME=/pnpm
ENV PATH="${PNPM_HOME}:$PATH"
ENV NODE_ENV=production
ENV PORT=3001

RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates && rm -rf /var/lib/apt/lists/* \
  && corepack enable && corepack prepare pnpm@11.25.0 --activate

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/admin/package.json ./apps/admin/package.json
COPY packages/contracts ./packages/contracts

RUN pnpm install --frozen-lockfile --prod --ignore-scripts

COPY --from=base /workspace/node_modules ./node_modules
COPY --from=base /workspace/apps/admin ./apps/admin
COPY --from=base /workspace/packages ./packages

RUN mkdir -p /workspace/apps/admin/media /workspace/apps/admin/documents \
  && chown -R node:node /workspace/apps/admin /workspace/packages /workspace/node_modules

USER node

EXPOSE 3001

CMD ["sh", "-lc", "mkdir -p /workspace/apps/admin/media /workspace/apps/admin/documents && cd /workspace/apps/admin && pnpm start"]
