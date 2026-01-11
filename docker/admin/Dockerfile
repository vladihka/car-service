FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/admin/package*.json ./apps/admin/
COPY packages/shared/package*.json ./packages/shared/

# Install dependencies
RUN npm ci --workspace=apps/admin --workspace=packages/shared

# Copy source code
COPY . .

# Build shared package
RUN npm run build --workspace=packages/shared

# Build Next.js app
RUN npm run build --workspace=apps/admin

# Production image
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV production

# Copy built app
COPY --from=builder /app/apps/admin/.next ./apps/admin/.next
COPY --from=builder /app/apps/admin/public ./apps/admin/public
COPY --from=builder /app/apps/admin/package*.json ./apps/admin/
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared ./packages/shared

WORKDIR /app/apps/admin

EXPOSE 3003

CMD ["npm", "run", "start"]
