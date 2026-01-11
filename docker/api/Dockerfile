FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/shared/package*.json ./packages/shared/

# Install dependencies
RUN npm ci --workspace=apps/api --workspace=packages/shared

# Copy source code
COPY . .

# Build shared package
RUN npm run build --workspace=packages/shared

# Build API
RUN npm run build --workspace=apps/api

# Expose port
EXPOSE 3001

# Start server
CMD ["npm", "run", "start", "--workspace=apps/api"]
