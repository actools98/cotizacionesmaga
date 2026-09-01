FROM node:22-alpine

WORKDIR /app

# Instalar dependencias
COPY package*.json ./
RUN npm install --omit=dev

# Copiar el resto de archivos
COPY . .

# Crear directorio data con permisos
RUN mkdir -p /app/data && chmod 777 /app/data

# Construir la aplicación
RUN npm run build

# Puerto
EXPOSE 3000

# Comando de inicio
CMD ["node", "server.js"]
