# GonoS

Plataforma web tipo "Classroom" para entrega, visualización 3D y corrección de trabajos de Diseño, Arquitectura y Matemática.

---

## Stack

| Capa | Tecnología |
|---|---|
| Backend | Node.js 18+, Express, JavaScript ES2022 |
| Base de datos | MariaDB 10.6+ (`mysql2/promise`) |
| Frontend | Vue 3 (Composition API) + Vite + Vue Router 4 |
| HTTP | Axios |
| 3D | Three.js + @thatopen/components (IFC) |
| Auth | JWT (`jsonwebtoken` + `bcryptjs`) |
| Uploads | Multer (disk storage) |

---

## Instalación local

### Requisitos

- Node.js >= 18
- MariaDB >= 10.6
- npm

### 1. Clonar el repositorio

```bash
git clone <repo-url>
cd gonos
```

### 2. Base de datos

```bash
mysql -u root -p < backend/database/schema.sql
mysql -u root -p gonos < backend/database/seed-dev.sql
```

El seed crea 3 usuarios de prueba y una clase con un trabajo.

### 3. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Editar `.env` con los datos de conexión a MariaDB:

```env
PORT=3000
NODE_ENV=development
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=gonos
DB_PORT=3306
JWT_SECRET=una_clave_segura_aqui
JWT_EXPIRES_IN=7d
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=52428800
CORS_ORIGIN=http://localhost:4000
```

Iniciar el backend:

```bash
npm start
```

(Abriría en `http://localhost:3000`)

### 4. Frontend

En otra terminal:

```bash
cd frontend
npm install
npm run dev
```

(Abriría en `http://localhost:4000` con proxy automático al backend en `:3000`)

---

## Usuarios de prueba (seed-dev.sql)

| Mail | Contraseña | Rol en la clase |
|---|---|---|
| `juan@example.com` | `test1234` | Profesor |
| `maria@example.com` | `test1234` | Alumno |
| `carlos@example.com` | `test1234` | Alumno |

El profesor `juan@example.com` tiene acceso a la clase "Diseño Arquitectónico 2026" con un trabajo ya creado. Los roles son por clase (no hay rol global de usuario).

---

## Despliegue

### Opción A — Servicios separados (recomendado)

#### Backend en Railway / Render

1. Crear un nuevo servicio web apuntando al directorio `backend/`.
2. Configurar el **Start Command** como `npm start`.
3. Configurar las variables de entorno (ver sección debajo).
4. MariaDB puede usarse con un add-on de Railway (MySQL) o un servicio externo
   como [aiven.io](https://aiven.io) (plan gratuito).

#### Frontend en Railway Static / Netlify / Vercel

1. Build command: `npm run build`
2. Publish directory: `frontend/dist`
3. Configurar `VITE_API_URL` apuntando a la URL pública del backend (ej:
   `https://gonos-backend.up.railway.app`).
4. El `CORS_ORIGIN` del backend debe apuntar a la URL pública del frontend.

### Opción B — Monolito (recomendado para Railway / Render)

El backend sirve el frontend compilado en producción. Un solo servicio.

#### Railway

El `railway.json` ya está configurado en la raíz. Solo conectar el repo
y configurar las variables de entorno (ver sección debajo).

El build command (`railway.json`) ejecuta:
```bash
cd frontend && npm install && npm run build && cd ../backend && npm install
```

El start command:
```bash
cd backend && node server.js
```

#### Render

1. Crear nuevo Web Service apuntando al repo raíz.
2. Build Command:
   ```
   cd frontend && npm install && npm run build && cd ../backend && npm install
   ```
3. Start Command:
   ```
   cd backend && node server.js
   ```

En ambos casos, el backend sirve automáticamente los archivos estáticos de
`frontend/dist/` cuando `NODE_ENV=production`. No hace falta configurar
`VITE_API_URL` ni `CORS_ORIGIN` (opcional si querés restringirlo).

---

## Variables de entorno — Railway / Render

### Backend

| Variable | Descripción | Ejemplo |
|---|---|---|
| `PORT` | Puerto del servidor | `3000` |
| `NODE_ENV` | `production` para producción | `production` |
| `DB_HOST` | Host de MariaDB | `containers-us-west-xxx.railway.app` |
| `DB_USER` | Usuario BD | `root` |
| `DB_PASSWORD` | Contraseña BD | *(generada por el add-on)* |
| `DB_NAME` | Nombre BD | `railway` |
| `DB_PORT` | Puerto BD | `3306` |
| `JWT_SECRET` | Clave secreta para firmar tokens | *(generar con `openssl rand -hex 32`)* |
| `JWT_EXPIRES_IN` | Duración del token JWT | `7d` |
| `UPLOAD_DIR` | Directorio de uploads | `./uploads` |
| `MAX_FILE_SIZE` | Tamaño máximo de archivo (bytes) | `52428800` |
| `CORS_ORIGIN` | URL del frontend (separado) o `*` | `https://gonos-frontend.vercel.app` |

### Frontend (solo en despliegue separado)

| Variable | Descripción | Ejemplo |
|---|---|---|
| `VITE_API_URL` | URL pública del backend | `https://gonos-backend.up.railway.app` |

---

## Limitaciones conocidas

### Sesión JWT sin refresh token

El token expira a los **7 días** por defecto (configurable vía `JWT_EXPIRES_IN`)
y no hay mecanismo de refresh token. Si la sesión expira, el usuario debe
volver a iniciar sesión.

### Filesystem no persistente en free tiers

En los planes gratuitos de Railway / Render el almacenamiento en disco
**no es persistente** entre deploys. Los archivos subidos (entregas,
trabajos) se pierden al redeployar. Para un entorno productivo se
recomienda usar almacenamiento externo tipo S3 (MinIO, AWS S3, R2).
Queda fuera de alcance para esta fase académica.

### Sin CSRF protection

La API es stateless (JWT Bearer) y no implementa tokens CSRF. Esto es
aceptable para una SPA donde el token se envía en el header
`Authorization`, no en cookies.

---

## Seguridad

Ver `SECURITY_AUDIT.md` para el informe completo de la auditoría de
seguridad realizada, incluyendo la lista de verificación IDOR,
sanitización de inputs, headers de seguridad, y riesgos residuales
aceptados.

---

## Licencia

Uso académico — Proyecto final de carrera.
