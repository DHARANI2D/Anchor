FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build the app
RUN npm run build

# Use non-root user
RUN chown -R node:node /app
USER node

EXPOSE 3000
CMD ["npm", "run", "start"]
