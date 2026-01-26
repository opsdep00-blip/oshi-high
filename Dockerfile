# ---------- Build stage ----------
FROM node:20-alpine AS builder
# Prisma のために openssl をインストール
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ARG DATABASE_URL="postgresql://user:pass@localhost:5432/db"
ENV DATABASE_URL=${DATABASE_URL}

COPY package*.json ./
# Prisma スキーマを先にコピーして generate する
COPY prisma ./prisma/
RUN npm ci
RUN npx prisma generate

# ソースをコピーしてビルド
COPY . .
RUN npm run build

# ---------- Runtime stage ----------
FROM node:20-alpine AS runner
# 実行時にも Prisma 用のライブラリが必要
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
ARG DATABASE_URL="postgresql://user:pass@localhost:5432/db"
ENV DATABASE_URL=${DATABASE_URL}
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

# Copy standalone Next.js build directly to root
COPY --chown=node:node --from=builder /app/.next/standalone /app/
COPY --chown=node:node --from=builder /app/.next/static /app/.next/static
COPY --chown=node:node --from=builder /app/public /app/public
COPY --chown=node:node --from=builder /app/prisma /app/prisma
COPY --chown=node:node --from=builder /app/node_modules/.prisma /app/node_modules/.prisma

USER node

EXPOSE 8080

# Start Next.js server
CMD ["node", "/app/server.js"]