FROM node:20-alpine

WORKDIR /app

# Instalar dependencias y compilar frontend
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install

COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Instalar dependencias del backend
COPY backend/package*.json ./backend/
RUN cd backend && npm install --omit=dev

COPY backend/ ./backend/

# Crear directorio para archivos subidos
RUN mkdir -p /app/backend/uploads/original

WORKDIR /app/backend

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "server.js"]
