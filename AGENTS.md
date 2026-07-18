# AGENTS.md

## Project

**GonoS** — Plataforma web tipo "Classroom" para entrega y revisión de trabajos de Diseño, Arquitectura y Matemática. Los alumnos suben modelos 3D (`.obj`, `.stl`, `.gltf`, `.glb`, `.ifc`, `.fbx` condicional) y archivos vectoriales (`.svg`), y los docentes los visualizan directamente en el navegador (sin descargar ni instalar software) para dejar anotaciones ancladas a puntos específicos del modelo.

Repositorio con dos proyectos hermanos:
```
proyecto/
├── backend/   (API REST)
└── frontend/  (SPA)
```

Stack obligatorio — **no cambiar sin autorización explícita**:
- Lenguaje: JavaScript puro, ES2022 (sin TypeScript)
- Frontend: Vue 3 (Composition API) + Vue Router 4 + Axios + CSS puro (sin Tailwind)
- Visor 3D: That Open Components (basado en Three.js)
- Backend: Node.js 18+ + Express.js
- Acceso a datos: `mysql2/promise`, queries directas (sin ORM)
- Auth: `jsonwebtoken` + `bcryptjs` (JWT manual, sin Passport)
- Uploads: `multer`, guardado en disco (sin S3/MinIO)
- Base de datos: MariaDB 10.6+ (base `gonos`)
- Estado global frontend: `reactive()` de Vue (sin Pinia)
- Despliegue: Railway o Render

## Commands

### Backend (`/backend`)
```bash
npm install          # instalar dependencias
npm run dev           # levantar con nodemon (desarrollo), puerto 3000
npm start             # levantar en modo producción
```
Base de datos (ejecutar manualmente, el agente no debe correr esto solo):
```bash
mysql -u root -p gonos < database/schema.sql
mysql -u root -p gonos < database/seed-dev.sql
```

### Frontend (`/frontend`)
```bash
npm install           # instalar dependencias
npm run dev            # levantar con Vite, puerto 4000
npm run build          # build de producción
npm run preview        # previsualizar el build
```

### Variables de entorno
El backend requiere `backend/.env` (basado en `backend/.env.example`, nunca commitear el real). Si falta alguna variable crítica (`JWT_SECRET`, `DB_*`), el servidor debe fallar al arrancar con un mensaje claro, no arrancar en un estado inválido.

## Code style

- **Nombres de tablas/columnas SQL:** `snake_case`, en **español**, siguiendo el modelo ER acordado: `usuarios`, `roles`, `participaciones`, `clases`, `trabajos`, `asignacion`, `entrega`, `comentario_priv`, `posiciones`, `tipos_ejes`.
- **Variables y funciones JS:** `camelCase`, en inglés (convención de la industria).
- **Componentes Vue:** `PascalCase.vue`, componentes pequeños y con una sola responsabilidad (ej: `AnnotationPin.vue`, no un componente gigante que haga todo el visor).
- **Rutas de la API:** `kebab-case`/plural en inglés técnico donde no choque con el modelo de datos (`/api/clases`, `/api/entregas/:id/comentarios`), coherentes con las tablas en español.
- **UI, textos de error y nombres de entidades de negocio:** en **español** (coherente con el público del proyecto).
- **Queries SQL:** siempre `pool.execute(sql, [params])`. Prohibido concatenar strings en una query.
- **Colores:** solo mediante las variables CSS de `frontend/src/assets/theme.css` (`--color-accent`, `--color-bg`, etc.). Prohibido hardcodear valores hex en componentes. Modo claro = acento azul `#19B0B5`; modo oscuro = acento naranja `#E06710`; resto de la paleta en grises/blancos crema/negros.
- **Nunca usar `v-html`** con contenido generado por usuarios (comentarios, nombres, descripciones).
- Componentes y funciones pequeñas y enfocadas; evitar archivos de más de ~300 líneas sin dividir.

## Agent behavior — Qué SÍ puede hacer el agente

- Crear, editar y refactorizar archivos dentro de `backend/` y `frontend/` según los prompts de sprint acordados.
- Instalar dependencias npm **del stack ya definido** (Express, mysql2, jsonwebtoken, bcryptjs, multer, cors, dotenv, vue, vue-router, axios, @thatopen/components, three) sin pedir confirmación adicional.
- Escribir y modificar archivos `.sql` de schema/seed dentro de `backend/database/` (pero no ejecutarlos contra la base real sin avisar, ver abajo).
- Correr `npm run dev` / `npm run build` / linters / tests para verificar que lo que construyó funciona.
- Agregar validaciones, manejo de errores, sanitización y checks de ownership (anti-IDOR) en cualquier endpoint, incluso si el prompt original no lo detalló explícitamente — es una regla transversal siempre vigente.
- Documentar decisiones de diseño no explícitas (ej: en `DISEÑO_BD.md`, `SECURITY_AUDIT.md`) cuando el prompt lo pida.
- Sugerir mensajes de commit descriptivos al final de cada tarea.

## Agent behavior — Qué NO debe hacer sin permiso

- **No ejecutar `schema.sql`, `seed-dev.sql` ni ningún `ALTER`/`DROP` contra la base de datos real** — el humano ejecuta manualmente los scripts SQL (vía terminal o DBeaver) para tener control total sobre qué se aplica a los datos.
- **No modificar ni sobrescribir `backend/.env`** (contiene credenciales reales) ni commitearlo. Solo puede tocar `.env.example`.
- **No introducir TypeScript, Pinia, Tailwind, Prisma/ORM, Redis, Docker, S3/MinIO** ni ninguna dependencia fuera del stack definido sin que el humano lo apruebe explícitamente primero.
- **No hacer `git push` ni `git commit` directamente** — solo preparar los cambios y sugerir el mensaje de commit; el humano decide cuándo confirmar y subir.
- **No borrar archivos de `uploads/original/` o `uploads/converted/`** salvo que sea parte explícita de la lógica de negocio (ej: reemplazar una entrega vieja), y en ese caso debe loguear qué borró y por qué.
- **No exponer secretos** (JWT_SECRET, contraseñas, tokens) en logs, commits, mensajes de commit ni código de ejemplo.
- **No desplegar a producción (Railway/Render)** ni cambiar variables de entorno en esos paneles sin confirmación del humano.
- **No agregar formatos de archivo aceptados, roles nuevos, o cambios al modelo de datos (ER)** sin señalarlo explícitamente y esperar aprobación — el ER (`usuarios`, `roles`, `participaciones`, `clases`, `trabajos`, `asignacion`, `entrega`, `comentario_priv`, `posiciones`, `tipos_ejes`) es la fuente de verdad y cualquier cambio ahí impacta todo el sistema.
- **No asumir soporte mobile/tablet** ni funcionalidades marcadas como fuera de alcance del MVP (edición de archivos, integración LMS, conversión automática de formatos, calificación numérica automática, notificaciones por email) — estas quedan explícitamente para una fase futura.
