FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

# Copy source
COPY tsconfig*.json ./
COPY src ./src

# Build and generate Prisma client
RUN npm run build
RUN npx prisma generate

EXPOSE 3000

# Run migrations on startup (safe for production)
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
