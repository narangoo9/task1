# ---- Stage 1: Deps ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
# `package-lock.json` repository-д байхгүй тул `npm ci` ажиллахгүй.
RUN npm install --no-audit

# ---- Stage 2: Builder ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ---- Stage 3: Runner ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://$(hostname -i | awk '{print $1}'):3000/auth/login || exit 1

CMD ["node", "server.js"]
