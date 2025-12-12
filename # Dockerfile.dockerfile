# Dockerfile
FROM node:18-bullseye

# Install ffmpeg and necessary fonts (for drawtext)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    fonts-dejavu-core \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Create app dir
WORKDIR /app

# Copy package files and install deps
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Copy source
COPY . .

# Expose (Render will override PORT env)
ENV PORT=10000
EXPOSE 10000

# Start
CMD ["npm", "start"]
