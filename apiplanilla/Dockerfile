# Dockerfile para Backend Node.js (apiplanilla/Dockerfile)
FROM node:20-alpine AS base

# Instalar dependencias del sistema necesarias
RUN apk add --no-cache curl dumb-init

WORKDIR /app

# Copiar archivos de configuración de dependencias
COPY package*.json ./

# Instalar dependencias de producción
RUN npm ci --only=production && \
    npm cache clean --force

# Copiar código fuente
COPY . .

# Crear usuario no root para seguridad
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

# Cambiar a usuario no root
USER nodejs

# Exponer puerto
EXPOSE 3000

# Health check usando el script personalizado
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node healthcheck.js

# Usar dumb-init para manejo correcto de señales
ENTRYPOINT ["dumb-init", "--"]

# Comando de inicio
CMD ["npm", "start"]