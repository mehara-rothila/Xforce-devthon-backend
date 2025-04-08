WORKDIR /app # Set working directory

# Copy package files FIRST
COPY package*.json ./
# Install production dependencies using npm ci (clean install)
RUN npm ci --only=production # This uses package-lock.json

# Copy ALL application source code AFTER installing dependencies
COPY . .

# Set environment variable for port
ENV PORT=3000
# Expose the port the app will run on
EXPOSE 3000

# Command to start the application
CMD ["node", "server.js"]