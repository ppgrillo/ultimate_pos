# Build Stage
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat

# Copy workspace configuration and root configs
COPY package.json package-lock.json* turbo.json tsconfig.base.json ./

# Copy all source files
COPY apps ./apps
COPY packages ./packages

# Install dependencies (native workspace support)
RUN npm ci

# Build all workspaces
RUN npm run build
RUN npx esbuild apps/backend/src/index.ts --bundle --platform=node --target=node20 --outfile=apps/backend/dist/index.js --packages=external --format=esm

# Backend Runtime
FROM node:20-alpine AS backend-runtime
WORKDIR /app
RUN apk add --no-cache dumb-init
ENV NODE_ENV=production

# Copy built artifacts and dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend/dist/index.js ./apps/backend/dist/index.js
COPY --from=builder /app/apps/backend/package.json ./apps/backend/package.json
COPY --from=builder /app/apps/backend/src/services/apple-models ./apps/backend/dist/apple-models
COPY --from=builder /app/packages/shared/src ./packages/shared/src
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json

EXPOSE 3001
CMD ["dumb-init", "node", "--experimental-websocket", "apps/backend/dist/index.js"]

# Frontend Runtime
FROM node:20-alpine AS frontend-runtime
WORKDIR /app
RUN apk add --no-cache dumb-init
ENV NODE_ENV=production
ENV PORT=3000

# Copy built artifacts and dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/frontend/.next ./apps/frontend/.next
COPY --from=builder /app/apps/frontend/public ./apps/frontend/public
COPY --from=builder /app/apps/frontend/package.json ./apps/frontend/package.json
COPY --from=builder /app/apps/frontend/next.config.mjs ./apps/frontend/next.config.mjs
COPY --from=builder /app/packages/shared/src ./packages/shared/src
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["dumb-init", "npm", "run", "start", "--workspace=@ultimate-pos/frontend"]
