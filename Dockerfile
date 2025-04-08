FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy app source
COPY . .

# Set port to match fly.toml
ENV PORT=3000
EXPOSE 3000

# Start the app
CMD ["node", "server.js"]