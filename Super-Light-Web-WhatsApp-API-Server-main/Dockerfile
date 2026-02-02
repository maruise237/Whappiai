# Use Node.js 20 LTS (Lightweight)
FROM node:20-slim

# Install dependencies for better-sqlite3 and other native modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application source
COPY . .

# Create required directories for persistence
RUN mkdir -p logs sessions media auth_info_baileys data

# Expose the API port (3000 by default)
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start"]
