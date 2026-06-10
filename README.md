# GonoS: Plataforma Web de Visualización de Archivos 2D y 3D

> Plataforma web académica que permite a docentes de diseño, arquitectura y matemática visualizar e inspeccionar archivos 2D, vectoriales y 3D directamente desde el navegador, sin descargar archivos ni instalar software especializado.

---

## 👥 Equipo

| Nombre | Rol |
|--------|-----|
| **Emiliano Montero** | Frontend |
| **Camilo Sosa** | Frontend |
| **Juan Almaraz** | Backend |
| **Manuel Ponce** | Backend |

---

## 🎯 Propósito

Los docentes de diseño, arquitectura y matemática enfrentan barreras al corregir trabajos digitales: descargar archivos pesados, instalar software con licencias costosas y recibir representaciones degradadas (modelos 3D convertidos a imágenes estáticas, vectores rasterizados).

**GonoS** resuelve esto con una plataforma web que centraliza la entrega, visualización y corrección de trabajos académicos en un solo lugar, manteniendo la fidelidad del archivo original.

---

## ✅ Funcionalidades

### Visualización
- 📦 Modelos 3D (`.obj`, `.stl`) con rotación, zoom y desplazamiento
- 🎨 Archivos vectoriales (`.svg`) con fidelidad completa sin rasterización
- 🖼️ Imágenes 2D (`.png`, `.jpg`) con zoom y desplazamiento
- ⚠️ Soporte `.fbx` condicional (según compatibilidad en producción)

### Organización académica
- Estructura jerárquica: **Cátedra → Alumno** (Comisión como nivel opcional)
- Panel de navegación para docentes con acceso en ≤ 3 clics a cualquier trabajo
- Estados de entrega visibles: `Pendiente / En revisión / Revisado / Aprobado`

### Carga de archivos
- Módulo de subida de archivos para alumnos con validación de formato (MIME)
- Límite de 100 MB por archivo
- Registro automático de fecha y hora de entrega

### Feedback y correcciones
- Sistema de comentarios vinculados al archivo
- Hilo de conversación docente ↔ alumno
- Notificaciones internas al recibir feedback o nuevas entregas

### Autenticación y roles
- Roles: **Docente**, **Alumno** y **Admin**
- Autenticación con JWT + refresh tokens
- Contraseñas almacenadas con hash bcrypt

---

## 🚫 Fuera del alcance

- Edición de archivos en línea
- Integración con LMS (Moodle, Google Classroom)
- Conversión automática de formatos
- Notificaciones por correo electrónico
- Calificación numérica automática
- App móvil o soporte para tablets

---

## 🧱 Stack Tecnológico

### Frontend
| Componente | Tecnología |
|-----------|-----------|
| Framework | Vue.js 3 + Composition API |
| Lenguaje | TypeScript |
| Build Tool | Vite |
| UI | Tailwind CSS + Headless UI |
| Estado global | Pinia |
| Router | Vue Router 4 |
| HTTP Client | Axios |
| Motor 3D | That Open Components (basado en Three.js) |
| Fechas | date-fns |
| Notificaciones UI | Vue Sonner |

### Backend
| Componente | Tecnología |
|-----------|-----------|
| Runtime | Node.js 18+ LTS |
| Framework | Express.js o Fastify |
| Lenguaje | TypeScript |
| ORM | Prisma |
| Validación | Zod |
| Autenticación | JWT + bcrypt |
| Documentación API | Swagger / OpenAPI |

### Base de datos y almacenamiento
| Servicio | Tecnología |
|---------|-----------|
| Base de datos | PostgreSQL 15+ |
| Archivos | MinIO (auto-hospedado) o Cloudflare R2 |
| Caché / Rate limiting | Redis 7+ |

### Infraestructura (si se gestiona)
| Componente | Tecnología |
|-----------|-----------|
| Contenedores | Docker + Docker Compose |
| Proxy inverso | Nginx o Caddy (HTTPS automático) |
| CI/CD | GitHub Actions |
| Orquestación (futuro) | Docker Swarm / Kubernetes |
| Monitoreo (futuro) | Prometheus + Grafana |

---

## 🗂️ Estructura del proyecto

```
GonoS/
├── frontend/               # Vue.js 3 + Vite
│   ├── src/
│   │   ├── components/     # Componentes reutilizables
│   │   ├── views/          # Páginas (Login, Panel, Visor)
│   │   ├── stores/         # Estado global con Pinia
│   │   ├── router/         # Vue Router 4
│   │   └── services/       # Llamadas a la API (Axios)
│   └── vite.config.ts
│
├── backend/                # Node.js + Express/Fastify
│   ├── src/
│   │   ├── routes/         # Endpoints de la API REST
│   │   ├── controllers/    # Lógica de negocio
│   │   ├── middlewares/    # Auth JWT, validación, rate limiting
│   │   ├── prisma/         # Esquema y migraciones de PostgreSQL
│   │   └── storage/        # Integración con MinIO / R2
│   └── swagger.yaml        # Documentación OpenAPI
│
├── docker-compose.yml      # PostgreSQL + Redis + MinIO + app
└── README.md
```

---

## ⚙️ Requisitos del sistema

- **SO compatible:** Windows o Linux (escritorio)
- **Navegadores soportados:** Chrome 90+, Firefox 88+, Edge 90+
- No requiere instalación de plugins ni software adicional

---

## 📋 Rendimiento

| Aspecto | Objetivo |
|---------|----------|
| Carga de la app | < 3 segundos |
| Renderizado de modelo 3D (hasta 20 MB) | < 5 segundos |
| Renderizado SVG (hasta 5 MB) | < 2 segundos |
| Respuesta de la API | < 500 ms en el 95% de las solicitudes |
| Disponibilidad | ≥ 99% mensual |
| Usuarios concurrentes | ≥ 50 sin degradación |

---

## 📄 Licencia

Proyecto académico — uso educativo. Todos los derechos reservados al equipo de desarrollo.
