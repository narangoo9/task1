
# ---- Stage 1: Builder (for development with hot reload) ----
FROM node:20-slim AS builder
WORKDIR /app
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
EXPOSE 4000
CMD ["npm", "run", "dev"]

# ---- Stage 2: Production ----
FROM node:20-slim AS production
ENV NODE_ENV=production
WORKDIR /app
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 4000
RUN chown -R node /app
USER node
CMD ["npm", "start"]
