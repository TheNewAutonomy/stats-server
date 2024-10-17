# Step 1: Build the Angular front-end
FROM node:20 AS build-stage

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all files to the container
COPY . .

# Build Angular app
RUN npm run build -- --configuration production

# Step 2: Set up Node.js server to serve Angular app and handle WebSocket
FROM node:20 AS production-stage

WORKDIR /app

# Install Angular CLI globally
RUN npm install -g @angular/cli

# Copy package.json and package-lock.json
COPY package*.json ./

# Install only production dependencies
RUN npm install --only=production

# Copy built Angular app from build-stage
COPY --from=build-stage /app/dist/stats-dashboard ./dist/stats-dashboard

# Copy the Node.js server file
COPY server.js .

# Expose the application port
EXPOSE 3000 4200

# Start the Node.js server
CMD ["node", "server.js"]
