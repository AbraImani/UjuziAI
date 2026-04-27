# Base image for building
FROM node:18-slim AS builder

WORKDIR /app

# Define Build Arguments (No hardcoded values here!)
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID
ARG VITE_FIREBASE_MEASUREMENT_ID

# Set them as Environment Variables for the build process
ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY
ENV VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN
ENV VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID
ENV VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET
ENV VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID
ENV VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID
ENV VITE_FIREBASE_MEASUREMENT_ID=$VITE_FIREBASE_MEASUREMENT_ID

# Copy root package files
COPY package*.json ./
RUN npm install

# Copy frontend source
COPY . .

# Build frontend (Vite will see the variables passed during build)
RUN npm run build

# Final image
FROM node:18-slim

WORKDIR /app

# Copy built assets
COPY --from=builder /app/dist ./dist

# Copy backend files and dependencies
COPY package*.json ./
COPY functions/package*.json ./functions/
RUN npm install --production
RUN cd functions && npm install --production

# Copy all source files (needed for agents logic)
COPY . .

# Environment variables for runtime
ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080

# Start server
CMD ["node", "server.js"]
