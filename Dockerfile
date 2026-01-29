# Build stage
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
RUN npx prisma generate

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