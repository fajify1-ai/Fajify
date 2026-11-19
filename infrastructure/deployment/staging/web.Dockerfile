FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
COPY . .
ARG WEB_APP
RUN pnpm install --frozen-lockfile && pnpm --filter ./apps/${WEB_APP} build
FROM node:22-bookworm-slim
ARG WEB_APP
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build --chown=node:node /app/apps/${WEB_APP}/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/${WEB_APP}/.next/static ./apps/${WEB_APP}/.next/static
COPY --from=build --chown=node:node /app/apps/${WEB_APP}/public ./apps/${WEB_APP}/public
ENV FAJI_WEB_APP=${WEB_APP}
USER node
CMD ["sh","-c","exec node apps/${FAJI_WEB_APP}/server.js"]
