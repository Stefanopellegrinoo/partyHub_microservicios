FROM node:18-slim

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl
COPY package*.json ./

# Instalar todas las dependencias para prisma generate, luego purgar devDependencies
RUN npm install

COPY . .

# Generar cliente prisma
RUN npx prisma generate

# Usamos un usuario sin privilegios
USER node

EXPOSE 4000
CMD ["node", "src/index.js"]