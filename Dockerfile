FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy server code
COPY server/ ./server/

# Cloud Run uses PORT env variable
ENV PORT=8080

EXPOSE 8080

CMD ["node", "server/index.js"]
