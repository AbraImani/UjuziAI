# Base image for building
FROM node:18-slim AS builder

WORKDIR /app

# Hardcoded Build Arguments for immediate fix
ENV VITE_FIREBASE_API_KEY=AIzaSyAtTE0OM_Ii9QlCWp7PevM_S1KCmDuhUeo
ENV VITE_FIREBASE_AUTH_DOMAIN=ujuziai-2ddea.firebaseapp.com
ENV VITE_FIREBASE_PROJECT_ID=ujuziai-2ddea
ENV VITE_FIREBASE_STORAGE_BUCKET=ujuziai-2ddea.appspot.com
ENV VITE_FIREBASE_MESSAGING_SENDER_ID=61014165253
ENV VITE_FIREBASE_APP_ID=1:61014165253:web:3e44b74a0cc9cab1e9196c
ENV VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# Copy root package files
COPY package*.json ./
RUN npm install

# Copy frontend source
COPY . .

# Build frontend (Vite will now see the variables)
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
