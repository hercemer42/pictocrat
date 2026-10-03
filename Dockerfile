FROM node:24-slim AS web
WORKDIR /web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

FROM node:24-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server/ server/
COPY --from=web /web/dist web/dist
ENV PORT=8095 PICTURES=/pictures DB=/data/pictocrat.db
# the image's "node" user is uid 1000; run as whoever owns the picture folder via `user:` in compose if that differs
USER node
EXPOSE 8095
CMD ["node", "server/main.ts"]
