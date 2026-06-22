# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

FROM node:22-alpine
ENV NODE_ENV=production \
  PORT=3001

WORKDIR /app

RUN addgroup -S badges && adduser -S badges -G badges \
  && mkdir -p /app/data \
  && chown -R badges:badges /app

COPY --from=deps --chown=badges:badges /app/node_modules ./node_modules
COPY --chown=badges:badges package*.json ./
COPY --chown=badges:badges src ./src
COPY --chown=badges:badges public ./public

USER badges
EXPOSE 3001

CMD ["node", "src/index.js"]
