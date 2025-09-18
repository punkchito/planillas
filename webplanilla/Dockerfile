FROM node:20-alpine AS build

ARG API_URL=http://34.176.222.150:3000
ENV API_URL=$API_URL

WORKDIR /app

# Copiar archivos de configuración primerox
COPY package*.json ./
COPY angular.json ./
COPY tsconfig*.json ./

# Configurar npm y instalar CLI
RUN npm config set legacy-peer-deps true && \
    npm install -g @angular/cli@16

# Instalar dependencias
RUN npm ci --legacy-peer-deps --no-audit --no-fund

# Copiar código fuente
COPY src/ ./src/

# Crear directorio de environments si no existe
RUN mkdir -p src/app/environments

# Crear environment.ts
RUN echo "export const environment = { production: true, apiUrl: '${API_URL}/api' };" > src/app/environments/environment.ts

# Debug: Verificar estructura antes del build
RUN echo "=== ESTRUCTURA ANTES DEL BUILD ===" && \
    ls -la && \
    echo "=== CONTENIDO DE SRC ===" && \
    ls -la src/ && \
    echo "=== VERIFICANDO ANGULAR.JSON ===" && \
    cat angular.json | grep outputPath

# Construir aplicación
RUN ng build --configuration production

# Debug: Verificar qué se generó
RUN echo "=== CONTENIDO DEL BUILD ===" && \
    ls -la dist/ && \
    find dist -type f -name "*.html"

# Etapa de producción
FROM nginx:alpine

# Instalar curl
RUN apk add --no-cache curl

# Remover configuración default
RUN rm /etc/nginx/conf.d/default.conf

# Copiar configuración de nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Verificar configuración de nginx
RUN nginx -t

# Crear directorio web
RUN mkdir -p /var/www/html

# Copiar archivos del build - intentar ambas rutas posibles
COPY --from=build /app/dist/ /tmp/dist/
RUN if [ -d "/tmp/dist/webplanilla" ]; then \
        cp -r /tmp/dist/webplanilla/* /var/www/html/; \
    else \
        cp -r /tmp/dist/* /var/www/html/; \
    fi

# Verificar que index.html existe
RUN ls -la /var/www/html/ && \
    if [ ! -f /var/www/html/index.html ]; then \
        echo "ERROR: index.html no encontrado"; \
        echo "Contenido disponible:"; \
        find /var/www/html -type f; \
        exit 1; \
    fi

# Permisos
RUN chown -R nginx:nginx /var/www/html && \
    chmod -R 755 /var/www/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:80 || exit 1

CMD ["nginx", "-g", "daemon off;"]