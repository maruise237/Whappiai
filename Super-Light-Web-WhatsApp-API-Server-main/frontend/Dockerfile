# Use Node.js 20 LTS (Lightweight)
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application source
COPY . .

# Build the Next.js application
RUN npm run build

# Expose the frontend port (3001 or 3000, but Next default is 3000. 
# We'll use 3001 if the backend uses 3000)
EXPOSE 3001

# Start the application
CMD ["npm", "run", "start", "--", "-p", "3001"]
