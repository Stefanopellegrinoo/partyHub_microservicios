FROM node:18-slim

WORKDIR /app

# Archivos de configuración de npm
COPY package*.json ./

# En producción instalamos solo dependencias de prod
RUN npm ci --omit=dev

COPY . .

# Usamos un usuario sin privilegios por seguridad
USER node

EXPOSE 3005
CMD ["node", "src/index.js"]