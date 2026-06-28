# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app

# Cài deps (gồm devDeps để build TypeScript)
COPY package*.json ./
RUN npm ci

# Build source
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Chỉ giữ lại production deps cho stage runtime
RUN npm ci --omit=dev

# ---- Runtime stage ----
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Chạy bằng user không phải root
USER node

COPY --chown=node:node --from=build /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/dist ./dist
COPY --chown=node:node package.json ./

EXPOSE 3000
CMD ["node", "dist/server.js"]
