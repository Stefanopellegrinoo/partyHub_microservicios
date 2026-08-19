FROM node:18-slim

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl
COPY package*.json ./

RUN npm install

COPY . .

RUN npx prisma generate

# Usamos un usuario sin privilegios
USER node

EXPOSE 4003
CMD ["node", "src/index.js"]