FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV COREPACK_HOME=/opt/corepack
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
COPY --chown=node:node . .
RUN pnpm install --frozen-lockfile && pnpm --filter @faji/api build && pnpm --filter @faji/api deploy --prod /out
FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=3001
WORKDIR /app
COPY --from=build --chown=node:node /out ./
COPY --from=build --chown=node:node /app/infrastructure/deployment/staging/read-secrets.mjs ./read-secrets.mjs
USER node
EXPOSE 3001
CMD ["node","read-secrets.mjs","node","dist/main.js"]
FROM build AS migrations
USER node
CMD ["node","infrastructure/deployment/staging/read-secrets.mjs","sh","-c","pnpm --filter @faji/database migrate && pnpm --filter @faji/database exec tsx scripts/grant-staging-runtime.ts"]
