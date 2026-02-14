# Build stage
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
RUN npx prisma generate

# ビルド時にクライアント用 NEXT_PUBLIC_... を埋め込めるようにする
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID

ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID
ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ENV NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID

COPY . .
RUN npm run build

# Runtime stage
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl

WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone /app/
COPY --from=builder /app/.next/static /app/.next/static
COPY --from=builder /app/public /app/public
COPY --from=builder /app/prisma /app/prisma
COPY --from=builder /app/node_modules/.prisma /app/node_modules/.prisma

EXPOSE 8080
CMD ["node", "/app/server.js"]