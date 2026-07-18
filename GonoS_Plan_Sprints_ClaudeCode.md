# GonoS — Plan de Sprints y Prompts para Claude Code

> Plataforma web tipo "Classroom" para entrega, visualización 3D y corrección de trabajos de Diseño, Arquitectura y Matemática.
> Este documento traduce la Fase 1, Fase 2, la MML ajustada, el diagrama de Casos de Uso, los wireframes/mockups y el modelo Entidad-Relación en un **backlog de Sprints Scrum** con **prompts listos para pegar en Claude Code**, ordenados de forma que cada sprint construye sobre el anterior sin dependencias rotas.

---

## 0. Resumen del proyecto y stack definitivo

**Nombre interno:** GonoS
**Objetivo:** Los alumnos suben trabajos (modelos 3D, vectoriales, imágenes, PDFs); los docentes los visualizan directamente en el navegador (sin descargar ni instalar software) y dejan anotaciones/comentarios vinculados a puntos específicos del archivo.

**Stack definitivo (el que manda sobre versiones anteriores del EML/Fase 2, que proponían TypeScript/Postgres/Prisma/Docker — eso queda descartado a favor de velocidad de desarrollo):**

| Capa | Tecnología |
|---|---|
| Lenguaje | JavaScript ES2022 (sin TypeScript) |
| Frontend | Vue 3 (Composition API) + Vue Router 4 + Axios |
| Estilos | CSS puro, `<style scoped>`, variables CSS (sin Tailwind) |
| Visor 3D | That Open Components (basado en Three.js) |
| Backend | Node.js 18+ + Express.js |
| Acceso a datos | `mysql2/promise`, queries directas (sin ORM) |
| Auth | `jsonwebtoken` + `bcryptjs`, JWT manual |
| Uploads | `multer`, guardado en disco |
| Base de datos | MariaDB 10.6+ |
| Control de versiones | Git + GitHub |
| Despliegue | Railway o Render |

**Reglas de negocio clave que TODO prompt debe respetar** (de la MML/Fase 1/Fase 2):

- Roles: **Admin (Creador)**, **Profesor**, **Alumno**. Un usuario puede tener distinto rol en distintas clases (tabla `participaciones`).
- Formatos 3D soportados: `.obj`, `.stl` (núcleo del MVP), `.gltf`, `.glb`, `.ifc` (soportados por That Open Components), `.fbx` es **condicional** (si falla, se muestra advertencia + descarga directa, nunca rompe la app).
- Vectoriales: `.svg` con fidelidad completa. Extras permitidos: `.jpg`, `.png`, `.pdf`.
- Jerarquía: **Clase (cátedra) → Trabajo (tarea) → Alumno**. El nivel "comisión" es opcional/fuera del MVP.
- Estados de una entrega/comentario: `Pendiente` → `En revisión` → `Revisado` → `Aprobado`.
- Notificaciones: solo internas (badge/contador), sin email en el MVP.
- No hay edición de archivos, ni LMS, ni conversión automática de formatos, ni apps móviles nativas. Es exclusivamente **web de escritorio** (no se optimiza para mobile).
- Rendimiento objetivo: interfaz carga en <3s, modelos de hasta 20MB visibles en <5s.
- Seguridad: hash de contraseñas (bcrypt), JWT de 15 min sin refresh (el usuario reloguea), ownership check en cada endpoint con ID (anti-IDOR), sanitización anti-XSS, whitelist de extensiones + renombrado UUID anti path-traversal, límite de 50MB por archivo (anti-DoS).

---

## 1. Sistema de diseño UI — Base para todos los prompts de frontend

Este bloque **no es un sprint**, es la base visual que hay que pasarle a Claude Code en el Sprint 0 y referenciar en cada prompt de UI posterior. Estética: **minimalista, monocromática, con mínimos acentos de color**.

### 1.1 Paleta de colores

```css
/* src/assets/theme.css */
:root {
  /* ===== MODO CLARO (default) — acentos AZULES ===== */
  --color-bg:            #FAFAF8;   /* blanco crema, no blanco puro */
  --color-bg-elevated:   #FFFFFF;   /* tarjetas, modales */
  --color-bg-subtle:     #F1F1EE;   /* zebra rows, hover sutil */
  --color-border:        #E2E2DE;
  --color-text:          #1C1C1A;
  --color-text-muted:    #6B6B66;
  --color-text-disabled: #A9A9A4;

  --color-accent:        #19B0B5;   /* azul — único color "vivo" en modo claro */
  --color-accent-hover:  #158D91;
  --color-accent-soft:   rgba(25, 176, 181, 0.12); /* fondos suaves, focus rings */

  --color-danger:        #C0392B;   /* solo para errores/destructivo, no decorativo */
  --color-success:       #2E7D32;

  --color-scrollbar-thumb: var(--color-accent);
  --color-scrollbar-track: transparent;
}

[data-theme="dark"] {
  /* ===== MODO OSCURO — acentos NARANJAS ===== */
  --color-bg:            #121212;
  --color-bg-elevated:   #1B1B1B;
  --color-bg-subtle:     #232323;
  --color-border:        #333331;
  --color-text:          #EDEDEA;
  --color-text-muted:    #A3A39D;
  --color-text-disabled: #6B6B66;

  --color-accent:        #E06710;   /* naranja — único color "vivo" en modo oscuro */
  --color-accent-hover:  #F17A22;
  --color-accent-soft:   rgba(224, 103, 16, 0.15);

  --color-danger:        #E57373;
  --color-success:       #66BB6A;

  --color-scrollbar-thumb: var(--color-accent);
  --color-scrollbar-track: transparent;
}
```

### 1.2 Principios de uso del acento

- El acento (**azul en claro / naranja en oscuro**) se usa **solo** en: botón primario, links, foco de inputs, indicador de pestaña/ruta activa, barra de scroll, badges de "pendiente/nuevo", y el pin de anotación activo en el visor 3D.
- Todo lo demás (textos, bordes, fondos, iconos secundarios) es **escala de grises/cremas**.
- Nunca combinar azul y naranja en la misma vista — el tema decide cuál de los dos existe.
- Botones secundarios/terciarios: solo borde y texto en gris, sin relleno de color.
- Estados de sistema (error, éxito) usan rojo/verde discretos, **no** el color de acento — para no diluir su significado de "acción principal".

### 1.3 Tipografía y componentes base

```css
:root {
  --font-family: 'Inter', system-ui, -apple-system, sans-serif;
  --radius-sm: 4px;
  --radius-md: 8px;
  --transition-fast: 150ms ease;
}

body {
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-family);
}

::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: var(--color-scrollbar-track); }
::-webkit-scrollbar-thumb {
  background: var(--color-scrollbar-thumb);
  border-radius: var(--radius-sm);
  opacity: 0.5;
}

button.primary {
  background: var(--color-accent);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  transition: background var(--transition-fast);
}
button.primary:hover { background: var(--color-accent-hover); }

button.secondary {
  background: transparent;
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

a, .link { color: var(--color-accent); }

input:focus, textarea:focus, select:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-soft);
}
```

### 1.4 Toggle de tema

- Estado global reactivo `themeState` (mismo patrón que `authState`, sin Pinia), persistido en `localStorage` bajo `gonos-theme`.
- Aplica el atributo `data-theme="dark"` en `<html>`.
- Detecta `prefers-color-scheme` solo la primera vez (si no hay preferencia guardada).
- Un ícono de sol/luna en `AppHeader.vue` alterna el tema.

---

## 2. Reglas transversales para TODOS los prompts

Estas reglas se le repiten a Claude Code al inicio de cada sprint (o se guardan en un `CLAUDE.md` en la raíz del repo, ver Sprint 0):

1. **JavaScript puro, ES2022.** Nunca introducir TypeScript, `.ts`, ni tipos JSDoc obligatorios.
2. **Sin librerías fuera del stack definido** (nada de Pinia, Tailwind, Prisma, Zod, Docker) salvo que el prompt lo pida explícitamente.
3. **Toda query a MariaDB usa `pool.execute(sql, [params])`.** Nunca concatenar strings en SQL.
4. **Todo endpoint que recibe un `:id` debe verificar ownership** (rol + pertenencia a la clase/trabajo/entrega) antes de responder — anti-IDOR.
5. **Todo endpoint devuelve JSON consistente:** éxito → objeto/array directo; error → `{ error: 'mensaje' }` con status HTTP correcto (400/401/403/404/409/413/500). Nunca exponer stack traces al cliente.
6. **Todo formulario del frontend valida en cliente Y en servidor** (nunca confiar solo en el cliente).
7. **Nunca usar `v-html`** con contenido generado por usuarios (anotaciones, comentarios, nombres). Sanitizar también en backend antes de guardar.
8. **Archivos subidos:** validar extensión + tamaño (50MB) en frontend (UX) y en backend (seguridad real, vía `multer` `fileFilter` + `limits`). Renombrar siempre con UUID/timestamp random, nunca confiar en el nombre original para el path físico.
9. **Manejo de errores de red en frontend:** todo `try/catch` en llamadas Axios debe mostrar un mensaje de error legible al usuario (toast/alert simple), nunca dejar la UI en un estado de carga infinito.
10. **Diseño:** usar exclusivamente las variables CSS de `theme.css` (sección 1). No hardcodear colores hex en componentes.
11. **Commits pequeños y descriptivos**, uno por historia de usuario cuando sea posible (Claude Code debe sugerir el mensaje de commit al final de cada prompt).
12. **Idioma:** UI, mensajes de error y nombres de entidades de negocio en **español** (coherente con la MML). Nombres de variables/funciones de código en **inglés** (convención de la industria), salvo los nombres de tablas/columnas de BD que siguen el modelo ER (ver Sprint 1) en español.

---

## 3. Mapeo del Modelo Entidad-Relación → Base de Datos

Antes de los sprints, esta es la traducción del diagrama ER provisto a entidades que Claude Code deberá usar como **única fuente de verdad** para el schema (sección detallada en el prompt 1.2 del Sprint 1):

| Entidad ER | Rol en el sistema |
|---|---|
| `usuarios` | Cuenta de persona (mail, nombre, apellido). No tiene rol fijo global. |
| `roles` | Catálogo: `Creador` (Admin), `Profesor`, `Alumno`. |
| `participaciones` | Tabla puente: qué rol tiene un usuario **dentro de una clase específica**. Un usuario puede ser Profesor en una clase y no tener participación en otra. |
| `clases` | La cátedra/curso. |
| `trabajos` | Una tarea/actividad dentro de una clase, creada por la Participación con rol Profesor. Tiene consigna (`Descripcion`) y fecha límite. |
| `asignacion` | Vincula un `trabajo` con la `participacion` (alumno) que debe/puede entregarlo, y guarda la `Nota` final. |
| `entrega` | La entrega física de un alumno para una `asignacion`: archivo, fecha, devolución del docente. |
| `comentario_priv` | Comentario del docente vinculado a una `entrega`. |
| `posiciones` | Coordenada (valor numérico) de un comentario en un eje específico — permite anclar el comentario a un punto 3D (X, Y, Z). |
| `tipos_ejes` | Catálogo fijo: X, Y, Z. |

Esto reemplaza el naming en inglés que traían `specs-backend.md`/`specs-frontend.md` (`users`, `classes`, `submissions`, `annotations`) — **se usa el naming en español del ER como fuente de verdad**, y las rutas de la API se adaptan a él (ver Sprint 1 y 3).

---

## 4. Backlog de Sprints

Metodología: **Scrum, sprints de 1 semana** (equipo de 4: 2 backend, 2 frontend, dedicación ~10h/semana c/u — ajustado de las 2 semanas de Fase 2 a 1 semana porque el alcance por sprint aquí es más chico y secuencial para Claude Code). Cada sprint tiene: objetivo, historias de usuario, y prompts en orden de ejecución.

---

### 🏁 Sprint 0 — Fundacional: repo, entorno y sistema de diseño

**Objetivo del sprint:** dejar el monorepo (o dos repos `frontend`/`backend`) corriendo localmente, con lint básico, estructura de carpetas acordada y el sistema de diseño (tema claro/oscuro) funcionando sobre una pantalla de prueba.

**Historias de usuario:**
- Como equipo, quiero una estructura de proyecto clara para que cualquiera pueda sumarse sin ambigüedad.
- Como usuario, quiero poder alternar entre modo claro y oscuro y que se recuerde mi preferencia.

#### Prompt 0.1 — Bootstrap del backend

```
Contexto: Estamos empezando el proyecto GonoS (plataforma de entrega y revisión de
trabajos 3D). Stack obligatorio: Node.js 18+, Express, JavaScript puro (ES2022, sin
TypeScript), mysql2 (sin ORM), jsonwebtoken, bcryptjs, multer, cors, dotenv.

Tarea:
1. Crear la carpeta `backend/` con esta estructura exacta:
   backend/
   ├── database/
   │   ├── connection.js
   │   └── schema.sql        (vacío por ahora, se llena en Sprint 1)
   ├── middleware/
   │   ├── auth.js
   │   └── upload.js
   ├── routes/
   ├── utils/
   ├── uploads/original/
   ├── uploads/converted/
   ├── .env.example
   ├── .gitignore
   ├── package.json
   └── server.js

2. `server.js` debe: cargar dotenv, crear la app Express, aplicar cors con
   origin desde `process.env.CORS_ORIGIN`, `express.json()`,
   `express.urlencoded({extended:true})`, servir `/uploads` como estático desde
   `UPLOAD_DIR`, tener un 404 catch-all que devuelva `{ error: 'Ruta no encontrada' }`
   y un error handler final que loguee el stack en consola pero responda solo
   `{ error: 'Error interno del servidor' }` (nunca exponer el stack al cliente).

3. `.env.example` debe listar (sin valores reales): PORT, NODE_ENV, DB_HOST,
   DB_USER, DB_PASSWORD, DB_NAME, DB_PORT, JWT_SECRET, JWT_EXPIRES_IN, UPLOAD_DIR,
   MAX_FILE_SIZE, CORS_ORIGIN.

4. `.gitignore` debe excluir: node_modules, .env, uploads/original/*,
   uploads/converted/* (con sus .gitkeep para mantener las carpetas).

5. `package.json` con scripts `start` (node server.js) y `dev` (nodemon server.js).

Manejo de errores / consideraciones:
- Si falta alguna variable de entorno crítica (JWT_SECRET, DB_*), el server debe
  loguear un error claro y salir con `process.exit(1)` en vez de arrancar en un
  estado inválido.
- No crear todavía rutas de negocio; solo un endpoint `GET /api/health` que
  devuelva `{ status: 'ok' }` para verificar que el server levanta.

Al terminar, mostrame el árbol de archivos creado y el comando para correrlo.
```

#### Prompt 0.2 — Bootstrap del frontend + sistema de diseño

```
Contexto: Frontend de GonoS. Stack obligatorio: Vue 3 (Composition API) + Vite,
JavaScript puro (sin TypeScript), Vue Router 4, Axios, CSS puro (sin Tailwind,
sin frameworks UI). Sin Pinia: estado global con `reactive()` de Vue.

Tarea:
1. Crear el proyecto con Vite (plantilla vue, JavaScript) en `frontend/` con esta
   estructura: src/assets, src/components, src/components/viewer,
   src/components/layout, src/views, src/state, src/composables, src/router.

2. Crear `src/assets/theme.css` con EXACTAMENTE estas variables CSS (cópialas
   tal cual, no las reinventes):

   [pegar aquí el bloque completo de la sección 1.1 y 1.3 de este documento:
   variables --color-bg, --color-accent, etc. para :root y [data-theme="dark"],
   más los estilos base de scrollbar, botones, inputs y focus]

3. Crear `src/state/theme.js` con un objeto reactivo `themeState` que tenga:
   - `current` ('light' | 'dark'), inicializado leyendo `localStorage.getItem('gonos-theme')`;
     si no existe, usar `window.matchMedia('(prefers-color-scheme: dark)')`.
   - método `toggle()` que cambia `current`, lo persiste en localStorage, y
     setea `document.documentElement.setAttribute('data-theme', ...)` (o lo
     remueve si es 'light', ya que 'light' es el default sin atributo).
   - Debe aplicarse el tema ANTES del primer render para evitar flash de tema
     incorrecto (aplicarlo en `main.js` antes de `app.mount()`).

4. Crear un componente `ThemeToggle.vue` simple: un botón que muestre un ícono
   sol/luna (puede ser texto "☀️/🌙" por ahora) y llame a `themeState.toggle()`.

5. Crear una `HomeView.vue` de prueba que muestre: un título, un botón
   `.primary`, un botón `.secondary`, un input, y el `ThemeToggle`, para
   verificar visualmente que el sistema de diseño funciona en ambos modos.

6. Configurar `vite.config.js` con proxy de `/api` hacia `http://localhost:3000`
   (puerto del backend) y puerto de dev server en 4000.

Manejo de errores / consideraciones:
- Si `localStorage` no está disponible (modo incógnito estricto, raro pero
  posible), el toggle debe seguir funcionando en memoria sin crashear.
- No agregues Pinia, Tailwind ni Vue Router todavía si no es necesario para esta
  pantalla de prueba — Router se agrega en el Sprint 1.

Al terminar, corré `npm run dev` y confirmame que la pantalla de prueba se ve
correctamente en modo claro (acento azul #19B0B5) y modo oscuro (acento naranja
#E06710).
```

---

### 🔐 Sprint 1 — Base de datos completa + Autenticación

**Objetivo del sprint:** modelo de datos completo en MariaDB según el ER, y flujo de registro/login/JWT funcionando end-to-end.

**Historias de usuario:**
- Como Admin, necesito que la base de datos exista con todas las tablas y relaciones del modelo ER para poder empezar a persistir cualquier dato.
- Como usuario nuevo, quiero registrarme eligiendo si soy Profesor o Alumno.
- Como usuario registrado, quiero iniciar sesión y mantenerme autenticado mientras uso la app.

#### Prompt 1.1 — Diseño y documentación detallada de la base de datos (pedir el detalle antes de crearla)

```
Contexto: Tenemos este modelo Entidad-Relación ya definido a mano para GonoS
(pego la descripción exacta de cada entidad y sus relaciones, extraída del
diagrama ER original):

- Usuarios (PK UsuarioID, mail, Nombre, Apellido)
- Roles (PK RolID, Nombre) — valores: 'Creador' (Admin), 'Profesor', 'Alumno'
- Participaciones (PK ParticipacionID, FK UsuarioID, FK ClaseID, FK RolID)
  → un usuario tiene un rol específico DENTRO de una clase (relación N:M
  Usuario–Clase resuelta con Rol como atributo)
- Clases (PK ClaseID, Nombre, Descripcion, FechaCreacion)
- Trabajos (PK TpID, FK ClaseID, FK ParticipacionID [rol Profesor, creador del
  trabajo], FechaEntrega, Descripcion/Consigna)
- Asignacion (PK AsignacionID, FK TpID, FK ParticipacionID [rol Alumno], Nota)
  → vincula un Trabajo con el Alumno que debe resolverlo, y guarda la nota
- Entrega (PK EntregaID, FK AsignacionID, Trabajo [referencia/ruta del archivo
  entregado], FechaEntrega, Devolucion)
- ComentarioPriv (PK ComPrivID, FK EntregaID, Comentario, Fecha)
- Posiciones (PK compuesta ComPrivID+TejeID, FK a ComentarioPriv, FK a
  TiposEjes, Valor) → coordenada numérica de un comentario en un eje
- TiposEjes (PK TejeID, Tipo) → catálogo fijo: 'X', 'Y', 'Z'

Reglas de negocio adicionales que la BD debe soportar:
- Estados de entrega/revisión: Pendiente, En revisión, Revisado, Aprobado.
- Formatos de archivo aceptados por entrega: .obj, .stl, .gltf, .glb, .ifc
  (.fbx condicional), y extras .svg, .jpg, .png, .pdf.
- Un comentario (ComentarioPriv) puede o no tener posición 3D asociada (puede
  ser un comentario general sobre la entrega completa, sin pin).
- Debe poder auditarse cuándo se creó cada registro relevante.

Tarea (SOLO ANÁLISIS, no generes el SQL todavía):
Quiero que actúes como DBA y me entregues un documento en markdown
(`backend/database/DISEÑO_BD.md`) que detalle, para cada tabla:
1. Nombre final de la tabla y columnas (en snake_case, en español, siguiendo el
   ER: `usuarios`, `roles`, `participaciones`, `clases`, `trabajos`,
   `asignacion`, `entrega`, `comentario_priv`, `posiciones`, `tipos_ejes`).
2. Tipo de dato MariaDB exacto de cada columna (justificando VARCHAR(n) vs TEXT,
   INT vs BIGINT, DECIMAL para notas, ENUM vs tabla catálogo para estados, etc.)
3. Claves primarias, foráneas, y su acción ON DELETE/ON UPDATE (justificar
   CASCADE vs RESTRICT vs SET NULL en cada FK — pensando en qué pasa si se
   borra una clase con trabajos, o un trabajo con entregas).
4. Índices recomendados más allá de las PK/FK (ej: email único en usuarios,
   índice compuesto para búsquedas frecuentes).
5. Qué columnas de auditoría faltan agregar (created_at, updated_at) que no
   estaban explícitas en el ER pero son necesarias.
6. Qué tabla catálogo adicional (si alguna) hace falta para los ESTADOS de
   entrega (Pendiente/En revisión/Revisado/Aprobado) — decidir si es un ENUM
   simple en `entrega` o una tabla `estados_entrega` aparte, y justificar.
7. Cualquier ambigüedad o decisión de diseño que hayas tenido que resolver
   por tu cuenta, explicada en una sección aparte "Decisiones y supuestos".

No escribas código Node.js ni rutas todavía. Este documento es para que el
equipo lo revise antes de generar el DDL definitivo en el siguiente prompt.
```

#### Prompt 1.2 — Generación del schema.sql definitivo

```
Contexto: Ya tenés el documento `backend/database/DISEÑO_BD.md` del prompt
anterior, aprobado por el equipo. Ahora generá el DDL real.

Tarea:
1. Escribir `backend/database/schema.sql` completo para MariaDB 10.6+, con:
   - `CREATE DATABASE IF NOT EXISTS gonos` + `USE gonos;`
   - Todas las tablas del diseño aprobado, en el orden correcto de creación
     (catálogos primero: roles, tipos_ejes; luego usuarios, clases; luego
     participaciones; luego trabajos, asignacion, entrega, comentario_priv,
     posiciones).
   - `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4` en cada tabla (soporte completo de
     acentos/ñ, requerido porque toda la UI es en español).
   - Restricciones `UNIQUE` donde corresponda (ej: mail de usuario único,
     combinación usuario+clase única en participaciones para que no haya
     participaciones duplicadas).
   - Sentencias `INSERT` de seed para los catálogos fijos: roles
     ('Creador','Profesor','Alumno') y tipos_ejes ('X','Y','Z').

2. Crear `backend/database/connection.js`: pool de `mysql2/promise` usando las
   variables de entorno (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT),
   con `connectionLimit: 10`, y que loguee un error claro (sin crashear el
   proceso completo de forma silenciosa) si no puede conectar al arrancar.

3. Crear `backend/database/seed-dev.sql` (opcional, separado de schema.sql) con
   2-3 usuarios de prueba (1 profesor, 2 alumnos, contraseña ya hasheada con
   bcrypt para "test1234"), una clase de ejemplo y un trabajo de ejemplo — para
   poder probar el resto de los sprints sin cargar datos a mano.

Manejo de errores / consideraciones:
- Todas las FK deben tener nombre explícito de constraint (`CONSTRAINT fk_...`)
  para que los errores de integridad referencial sean legibles en los logs.
- Documentar en un comentario arriba del archivo el comando exacto para
  ejecutar el schema: `mysql -u root -p < schema.sql`.
- No uses ningún ORM ni migration tool: es un único archivo .sql ejecutado a mano.

Al terminar, mostrame el diagrama de tablas resultante en formato texto (lista
de tablas con sus columnas) para verificar contra el ER original.
```

#### Prompt 1.3 — Autenticación backend (registro/login/JWT)

```
Contexto: Ya existe `backend/database/schema.sql` con la tabla `usuarios`,
`roles` y `participaciones`. Nota importante: en este modelo el rol NO vive en
`usuarios` sino que se asigna por clase en `participaciones`. Sin embargo,
para el registro inicial y endpoints globales (como "crear una clase"), un
usuario necesita un rol de sistema base. Decisión: agregar una columna
`rol_global` (ENUM 'ADMIN','PROFESOR','ALUMNO') a `usuarios` SOLO para saber
qué tipo de cuenta es al registrarse (qué pantalla de dashboard ve), separado
del rol por-clase de `participaciones` que se usa para autorización fina
dentro de cada clase. Actualizá `schema.sql` para agregar esta columna con
default 'ALUMNO', y agregá también `password_hash VARCHAR(255) NOT NULL` a
`usuarios` si no existía.

Tarea:
1. `backend/utils/jwt.js`: funciones `createToken(payload)` (expira según
   `JWT_EXPIRES_IN`, default 15m) y `verifyToken(token)` (devuelve `null` si
   es inválido/expirado, nunca lanza excepción sin capturar).

2. `backend/middleware/auth.js`: `requireAuth` (valida header
   `Authorization: Bearer <token>`, si falta o es inválido responde 401 con
   `{ error: 'No autorizado' }`, si es válido setea `req.user = { id, mail,
   rol_global }`), y helpers `requireRole(...roles)` genérico reutilizable
   (reemplaza a tener un middleware distinto por cada rol).

3. `backend/routes/auth.routes.js` con:
   - `POST /api/auth/register`: recibe `mail, password, nombre, apellido,
     rol_global`. Valida: mail con formato válido, password mínimo 8
     caracteres, rol_global sea uno de los 3 valores permitidos (nunca
     confiar en que el frontend solo mande los 3 esperados). Verifica que el
     mail no exista ya (409 si existe). Hashea con bcrypt (10 rounds). Inserta
     y devuelve `{ token, user }` (sin el hash de password en la respuesta).
   - `POST /api/auth/login`: valida credenciales, mismo mensaje genérico
     "Mail o contraseña incorrectos" tanto si el mail no existe como si la
     password es incorrecta (para no filtrar qué mails están registrados).
   - `GET /api/auth/me`: protegido con `requireAuth`, devuelve los datos del
     usuario actual sin el hash.

4. Rate limiting simple en memoria para `/login` (Map ip → intentos, bloqueo
   de 15 min tras 5 intentos fallidos, tal como está en specs-seguridad.md).

Manejo de errores / consideraciones:
- Nunca devolver el `password_hash` en ninguna respuesta JSON.
- Si `bcrypt.compare` o el insert fallan por error de conexión a BD, responder
  500 genérico, loguear el detalle en servidor únicamente.
- Sanitizar `nombre`/`apellido` (trim, longitud máxima) antes de guardar.
- Testear manualmente con curl o Thunder Client: registro exitoso, registro
  con mail duplicado (409), login correcto, login incorrecto, acceso a /me
  sin token (401) y con token (200).

Mostrame los 4 endpoints probados con ejemplos de request/response.
```

#### Prompt 1.4 — Auth en el frontend

```
Contexto: El backend ya expone /api/auth/register, /login, /me. Frontend Vue 3
sin Pinia, con `themeState` ya existente. Ahora agregamos Vue Router y el
estado de sesión.

Tarea:
1. Instalar y configurar Vue Router 4 en `src/router/index.js` con rutas:
   /login (LoginView), /registro (RegisterView), / (DashboardView, placeholder
   por ahora), con meta `requiresAuth`/`requiresGuest` y un guard
   `router.beforeEach` que redirija según `authState.isLoggedIn`.

2. `src/composables/useApi.js`: instancia de Axios con `baseURL` desde
   `import.meta.env.VITE_API_URL` (default `/api` para aprovechar el proxy de
   Vite), interceptor de request que agrega `Authorization: Bearer <token>` si
   existe, e interceptor de response que en un 401 limpia la sesión
   (`authState.logout()`) y redirige a /login.

3. `src/state/auth.js`: objeto reactivo `authState` con `user`, `token`,
   `isLoggedIn`, y métodos `login(user, token)` / `logout()` que persisten/
   limpian `localStorage`. Al cargar la app, si hay token guardado, llamar a
   `GET /api/auth/me` para revalidar la sesión (si falla, hacer logout
   silencioso, no mostrar error al usuario en este caso puntual).

4. `LoginView.vue`: formulario mail/password, botón submit deshabilitado
   mientras la request está en curso (evitar doble submit), muestra el mensaje
   de error del backend tal cual (ya viene sanitizado y genérico), usa
   exclusivamente clases `.primary`/`.secondary` y variables del theme.css.

5. `RegisterView.vue`: formulario mail/password/confirmar password/nombre/
   apellido/selector de rol (Profesor/Alumno — nunca ofrecer "Admin" como
   opción pública). Validar en cliente: passwords coinciden, mail con formato
   básico, todos los campos requeridos, ANTES de pegarle al backend.

Manejo de errores / consideraciones:
- Si Axios rechaza por error de red (backend caído), mostrar "No se pudo
  conectar con el servidor, intentá de nuevo" — nunca un error técnico crudo.
- Loading state visual (texto del botón cambia a "Ingresando..." / "Creando
  cuenta...") durante la request.
- Accesibilidad básica: labels asociados a inputs, foco visible (usa el
  focus-ring de accent ya definido en theme.css).

Al terminar, probá manualmente el flujo completo: registro → redirige a
dashboard → refresh de página mantiene sesión → logout → vuelve a /login.
```

---

### 🏫 Sprint 2 — Clases y Participaciones

**Objetivo del sprint:** un Profesor puede crear una clase y obtener un código de invitación; un Alumno puede unirse con ese código. Dashboard lista las clases según el rol del usuario en cada una.

**Historias de usuario:**
- Como Profesor, quiero crear una clase para empezar a publicar trabajos.
- Como Alumno, quiero unirme a una clase con un código para ver sus trabajos.
- Como cualquier usuario, quiero ver en mi dashboard todas las clases donde tengo una participación.

#### Prompt 2.1 — API de clases y participaciones

```
Contexto: Tablas `clases` y `participaciones` ya existen (Sprint 1). Un
usuario "crea" una clase y automáticamente se crea su `participacion` con rol
'Profesor' en esa clase. Otro usuario se une con un código y se crea su
`participacion` con rol 'Alumno'.

Tarea:
1. `backend/routes/clases.routes.js`:
   - `POST /api/clases` (requireAuth, cualquier usuario con rol_global
     PROFESOR puede crear): recibe `nombre, descripcion`. Genera un `codigo`
     de invitación alfanumérico de 6 caracteres, único (reintenta generar si
     hay colisión). Inserta en `clases` y en la misma transacción crea la
     `participacion` del creador con rol 'Profesor'. Devuelve la clase creada
     con su código.
   - `GET /api/clases`: lista SOLO las clases donde el usuario autenticado
     tiene una `participacion` (join clases + participaciones + roles),
     incluyendo qué rol tiene en cada una.
   - `GET /api/clases/:id`: detalle de una clase — PRIMERO verificar que el
     usuario tenga una participación en esa clase (si no, 403), recién
     entonces devolver los datos + lista de trabajos asociados.
   - `POST /api/clases/:id/unirse`: recibe `codigo`. Verifica que el código
     coincida con esa clase (400 si no), que el usuario no tenga ya una
     participación ahí (409 si ya está), crea la `participacion` con rol
     'Alumno'.

2. Usar transacciones (`connection.beginTransaction()` / `commit()` /
   `rollback()`) en la creación de clase + participación inicial, para que no
   quede una clase huérfana sin su Profesor si algo falla a mitad de camino.

Manejo de errores / consideraciones:
- El código de invitación debe ser fácil de compartir oralmente/por chat:
  mayúsculas + números, sin caracteres ambiguos (evitar 0/O, 1/I/L).
- Si dos requests concurrentes generan el mismo código (raro pero posible),
  el `UNIQUE` de la columna en BD debe rechazar el segundo insert y el código
  debe manejar ese error regenerando el código, no devolviendo 500 crudo.
- 403 (no 404) cuando el usuario existe pero no tiene participación en la
  clase que pide — así evitamos IDOR pero sin revelar si la clase existe.

Mostrame ejemplos de request/response de los 4 endpoints.
```

#### Prompt 2.2 — UI de clases: dashboard, crear, unirse

```
Contexto: API de clases lista. Frontend con auth y router funcionando.

Tarea:
1. `src/components/ClassCard.vue`: props `clase` (objeto con nombre,
   descripcion, rolDelUsuario, cantidadTrabajos), emit `click`. Muestra un
   badge sutil (color de acento) si `rolDelUsuario === 'Profesor'` para
   diferenciarla visualmente de las clases donde el usuario es Alumno.

2. `DashboardView.vue`: al montar, llama `GET /api/clases`, muestra un grid de
   `ClassCard`. Si el `authState.user.rol_global === 'PROFESOR'`, muestra un
   botón "+ Crear clase" que abre un modal/vista con formulario
   (nombre + descripción). Si es 'ALUMNO', muestra un botón "+ Unirse con
   código" que abre un input de código de 6 caracteres.
   - Estado vacío: si no hay clases, mostrar un mensaje amigable en vez de un
     grid vacío ("Todavía no tenés clases. Creá una o unite con un código.").

3. `ClassView.vue` (ruta `/clase/:id`): al montar, llama
   `GET /api/clases/:id`. Si devuelve 403, redirigir a `/` y mostrar un
   mensaje "No tenés acceso a esta clase". Muestra nombre, descripción, y si
   el usuario es Profesor en ESA clase, el código de invitación visible con
   botón "copiar" — si es Alumno, el código no se muestra.

Manejo de errores / consideraciones:
- El código de invitación al copiarse debe dar feedback visual (ej: el botón
  cambia a "¡Copiado!" por 2 segundos) usando `navigator.clipboard`, con
  fallback si el navegador no lo soporta.
- Formulario de crear clase: deshabilitar submit si el nombre está vacío.
- Formulario de unirse: normalizar el código a mayúsculas mientras el usuario
  escribe, para tolerar que lo tipeen en minúscula.

Probá el flujo: Profesor crea clase → ve el código → Alumno (otra sesión/
usuario) se une con ese código → ambos ven la clase en su dashboard con el
rol correcto.
```

---

### 📚 Sprint 3 — Trabajos y Asignaciones

**Objetivo del sprint:** el Profesor publica un Trabajo (consigna + fecha límite) dentro de una clase; queda asignado a todos los Alumnos participantes de esa clase.

**Historias de usuario:**
- Como Profesor, quiero publicar un trabajo con consigna y fecha de entrega.
- Como Alumno, quiero ver la lista de trabajos de mi clase y cuáles tengo pendientes.

#### Prompt 3.1 — API de trabajos y asignaciones

```
Contexto: Tablas `trabajos` (TpID, ClaseID, ParticipacionID del profesor
creador, FechaEntrega, Descripcion) y `asignacion` (AsignacionID, TpID,
ParticipacionID del alumno, Nota) ya existen.

Tarea:
1. `backend/routes/trabajos.routes.js`:
   - `POST /api/clases/:claseId/trabajos` (requireAuth): verifica que el
     usuario tenga participación con rol 'Profesor' en `claseId` (403 si no).
     Recibe `descripcion, fecha_entrega, formatos_aceptados` (array, ej:
     ['.obj','.stl','.svg']). Inserta el trabajo. INMEDIATAMENTE DESPUÉS, en
     la misma transacción, busca todas las `participaciones` con rol 'Alumno'
     de esa clase y crea una fila en `asignacion` por cada una (estado inicial
     'Pendiente' — ver decisión de Sprint 1 sobre dónde vive el estado).
   - `GET /api/clases/:claseId/trabajos`: verifica participación (cualquier
     rol) en la clase. Si el usuario es Alumno, además de los datos del
     trabajo devuelve el estado de SU `asignacion` particular (join filtrado
     por su participacion_id). Si es Profesor, devuelve conteos agregados
     (cuántos alumnos entregaron / pendientes).
   - `GET /api/trabajos/:id`: detalle de un trabajo + consigna completa,
     mismo criterio de ownership que arriba.

2. Validaciones: `fecha_entrega` no puede ser una fecha ya pasada al momento
   de crear el trabajo (400 si lo es). `descripcion` requerida, longitud
   máxima razonable (ej. 5000 caracteres) para evitar abuso.

Manejo de errores / consideraciones:
- Si una clase no tiene ningún alumno todavía cuando se crea el trabajo, no
  es un error: el trabajo se crea igual sin asignaciones, y quedará
  "huérfano" de asignaciones hasta que se unan alumnos (decidir: ¿se generan
  asignaciones también cuando un alumno se une DESPUÉS a una clase con
  trabajos ya publicados? Sí — actualizar el endpoint `unirse` del Sprint 2
  para que, al crear la participación de un alumno nuevo, genere también sus
  asignaciones pendientes para los trabajos ya existentes de esa clase).
- Usar transacciones para que "crear trabajo" + "crear N asignaciones" sea
  atómico.

Mostrame los endpoints probados, incluyendo el caso de un alumno que se une
después de que ya existían trabajos.
```

#### Prompt 3.2 — UI de trabajos

```
Contexto: API de trabajos/asignaciones lista.

Tarea:
1. `AssignmentCard.vue`: props `trabajo`, `isTeacher`. Si es Alumno, muestra
   un badge de estado (Pendiente/En revisión/Revisado/Aprobado) con color de
   acento solo si es 'Pendiente' (para llamar la atención), gris para el
   resto. Si es Profesor, muestra "X/Y entregados".

2. Dentro de `ClassView.vue`, agregar sección "Trabajos": lista de
   `AssignmentCard`, y si el usuario es Profesor de esa clase, un botón
   "+ Nuevo trabajo" que abre `AssignmentFormView.vue` (o modal) con:
   descripción (textarea), fecha de entrega (date input, con mínimo = hoy),
   checklist de formatos aceptados (.obj, .stl, .gltf, .glb, .ifc, .svg, con
   nota "otros formatos como .fbx pueden no visualizarse correctamente").

3. `AssignmentView.vue` (ruta `/trabajo/:id`): muestra la consigna completa.
   Si es Alumno y su asignación está 'Pendiente', botón "Entregar trabajo"
   (lleva a la vista de subida, Sprint 4). Si ya entregó, botón "Ver mi
   entrega" en su lugar.

Manejo de errores / consideraciones:
- El date input no debe permitir seleccionar fechas pasadas (atributo `min`
  en el input, más validación igual en el submit por si el navegador no lo
  respeta).
- Mostrar la fecha de entrega en formato local legible (`Intl.DateTimeFormat`
  con locale 'es-AR'), nunca ISO crudo.

Probá: Profesor publica un trabajo con 2 formatos aceptados → Alumno lo ve en
su lista con estado Pendiente → fecha se muestra correctamente formateada.
```

---

### 📤 Sprint 4 — Subida de archivos y Entregas

**Objetivo del sprint:** el Alumno sube su archivo de entrega; queda guardado en disco y registrado en `entrega`; el Profesor puede ver la lista de entregas de un trabajo.

**Historias de usuario:**
- Como Alumno, quiero subir mi archivo de entrega validando que el formato sea el aceptado por el trabajo.
- Como Profesor, quiero ver la lista de entregas de un trabajo con su estado.

#### Prompt 4.1 — Middleware de upload seguro

```
Contexto: Aplicar TODAS las mitigaciones de specs-seguridad.md para uploads.

Tarea:
1. `backend/middleware/upload.js` con `multer.diskStorage`:
   - `destination`: `uploads/original/`
   - `filename`: `${Date.now()}-${Math.round(Math.random()*1e9)}${ext}` — el
     nombre original del usuario NUNCA se usa para el path físico (anti path
     traversal). Guardar el nombre original solo como metadato en BD.
   - `fileFilter`: whitelist estricta de extensiones:
     ['.obj','.stl','.gltf','.glb','.ifc','.fbx','.svg','.jpg','.jpeg','.png',
     '.pdf']. Rechazar cualquier otra con un mensaje claro
     `Formato no permitido: ${ext}`.
   - `limits.fileSize`: desde `MAX_FILE_SIZE` env var (default 50MB). Si se
     excede, multer aborta antes de escribir todo el archivo a disco.

2. Exportar también una función `deleteFileIfExists(path)` (usa `fs.promises`,
   con try/catch que no rompa el flujo si el archivo ya no existe) para
   limpiar archivos huérfanos cuando falle un insert posterior a la subida.

Manejo de errores / consideraciones:
- Multer lanza un error especial `MulterError` para tamaño excedido —
  capturarlo específicamente en el route handler (o en un error-handling
  middleware dedicado después de la ruta de upload) y responder 413 con
  `{ error: 'Archivo demasiado grande (máx 50MB)' }`, no un 500 genérico.
- El error de `fileFilter` (formato no permitido) también debe capturarse y
  devolver 400, no 500.

Mostrame cómo quedó el manejo de errores de Multer en la ruta.
```

#### Prompt 4.2 — API de entregas

```
Contexto: Middleware de upload listo. Tabla `entrega` (EntregaID, AsignacionID,
Trabajo [ruta del archivo], FechaEntrega, Devolucion) ya existe.

Tarea:
1. `backend/routes/entregas.routes.js`:
   - `POST /api/asignaciones/:asignacionId/entregas` (requireAuth +
     requireRole implícito Alumno vía ownership): verifica que la
     `asignacion` pertenezca a una `participacion` del usuario autenticado
     (403 si no es suya). Usa `upload.single('archivo')` como middleware.
     Verifica que la extensión del archivo subido esté dentro de
     `formatos_aceptados` DEL TRABAJO específico (no solo la whitelist
     global) — si no coincide, borrar el archivo recién subido con
     `deleteFileIfExists` y responder 400. Si todo OK, inserta en `entrega`
     con la ruta relativa (nunca la ruta absoluta del server) y actualiza el
     estado de la asignación a 'En revisión'.
   - `GET /api/trabajos/:trabajoId/entregas` (solo Profesor de esa clase):
     lista todas las entregas de ese trabajo con nombre del alumno y estado.
   - `GET /api/entregas/:id`: detalle de una entrega — el Alumno solo puede
     ver la suya, el Profesor solo si es de su clase (mismo patrón de
     ownership de siempre).
   - `GET /api/entregas/:id/descargar`: sirve el archivo original con
     `res.download()`, mismo chequeo de ownership antes de servir el archivo
     (nunca depender solo de que la URL de `/uploads` sea "difícil de
     adivinar" — ese endpoint autenticado es el único camino soportado para
     descargar el archivo original; considerar si `/uploads` estático debe
     quedar público o removerse en favor de este endpoint controlado).

Manejo de errores / consideraciones:
- Si el alumno reintenta subir una entrega para una asignación que ya tiene
  entrega, decidir la regla de negocio: permitir REEMPLAZAR el archivo
  anterior hasta la fecha límite (borrando el archivo viejo del disco) — esto
  es más amigable que bloquear. Documentarlo en un comentario en el código.
- Validar `fecha_entrega` del trabajo: si ya pasó, igual permitir la entrega
  pero marcarla internamente como tardía (columna adicional o nota en
  `Devolucion`) — decisión de negocio a confirmar con el equipo, dejar el
  campo preparado.

Mostrame los 4 endpoints probados con un archivo .obj de ejemplo.
```

#### Prompt 4.3 — UI de subida y listado de entregas

```
Contexto: API de entregas lista.

Tarea:
1. `FileUpload.vue`: componente drag & drop reutilizable. Props
   `acceptedFormats` (array). Antes de emitir el evento `upload`, valida en
   cliente: extensión dentro de `acceptedFormats` y tamaño <= 50MB — si falla,
   emite `error` con un mensaje claro y NO llega a hacer la request (evita
   subir 50MB para que el servidor recién ahí lo rechace).
   Muestra una barra de progreso simple usando el evento `onUploadProgress`
   de Axios.

2. `NewSubmissionView.vue` (ruta `/trabajo/:id/nueva-entrega`): usa
   `FileUpload` con los `formatos_aceptados` del trabajo (traídos del
   detalle). Al subir con éxito, redirige a `AssignmentView` mostrando un
   mensaje de confirmación.

3. `SubmissionRow.vue`: fila para la tabla del Profesor — nombre de alumno,
   fecha de entrega, estado (badge), botón "Revisar" (lleva al visor 3D,
   Sprint 5) y botón "Descargar original".

4. Dentro de `AssignmentView.vue` (vista de Profesor), agregar tabla de
   `SubmissionRow` por cada entrega del trabajo.

Manejo de errores / consideraciones:
- Si `upload` falla por red a mitad de camino, mostrar mensaje y permitir
  reintentar sin perder el archivo ya seleccionado (mantenerlo en el
  `<input type="file">` / drag state hasta que el usuario lo cambie).
- Deshabilitar el botón de submit mientras la barra de progreso está activa,
  para evitar doble envío.

Probá: subir un .obj válido → ver el estado cambiar a "En revisión" → como
Profesor, ver la fila en la tabla de entregas → descargar el original.
```

---

### 🧊 Sprint 5 — Visor 3D (That Open Components)

**Objetivo del sprint:** el Profesor abre una entrega y ve el modelo 3D renderizado en el navegador, con zoom/rotación/desplazamiento y árbol de piezas.

**Historias de usuario:**
- Como Profesor, quiero ver el modelo 3D entregado directamente en el navegador sin descargarlo.
- Como Profesor, quiero rotar, hacer zoom y seleccionar piezas individuales del modelo.

#### Prompt 5.1 — Composable e inicialización del visor

```
Contexto: Librería That Open Components + Three.js. El modelo se sirve desde
`/uploads/...` o desde el endpoint de descarga controlado del Sprint 4 (usar
ese, no la ruta estática pública, para respetar ownership también al cargar
el modelo en el visor).

Tarea:
1. Instalar `@thatopen/components` y `three` en el frontend.
2. `src/composables/useViewer.js`: inicializa el visor sobre un `<canvas>`
   dado por ref, configura cámara orbital con damping, luz ambiental + luz
   direccional (según specs-frontend.md), expone:
   - `loadModel(url, format)`: soporta `.gltf`/`.glb` de forma nativa. Para
     `.obj`/`.stl`, usar los loaders correspondientes de Three.js
     (`OBJLoader`, `STLLoader`) ya que That Open Components está más orientado
     a IFC/glTF. Para `.ifc`, usar el loader IFC de That Open. Para `.fbx`,
     intentar con `FBXLoader`; SI FALLA, no crashear la vista completa: capturar
     el error y devolver un estado `loadError` que el componente use para
     mostrar el mensaje "No se pudo previsualizar este formato, podés
     descargar el archivo original" + botón de descarga (tal como define el
     Riesgo 1 de la Fase 2 sobre .fbx condicional).
   - `raycast(event)`: para selección de piezas por click.
   - `resetCamera()`, `fitModelToView()`.
   - `dispose()`: liberar geometría/materiales/renderer al desmontar el
     componente (evitar memory leaks al navegar entre entregas).

Manejo de errores / consideraciones:
- Validar tamaño del modelo antes de cargarlo (si el backend ya limita a
  50MB, igual mostrar un loader con mensaje "Cargando modelo (puede tardar
  unos segundos)..." para archivos grandes, cumpliendo el objetivo de
  specs-general de <5s para modelos de hasta 20MB, pero sin bloquear la UI
  si tarda más).
- Si el navegador no soporta WebGL, detectarlo ANTES de intentar inicializar
  el visor y mostrar un mensaje claro en vez de una pantalla en blanco.
- Todo error de carga debe loguearse en consola con detalle técnico pero
  mostrar al usuario solo el mensaje amigable.

No integres todavía el árbol de piezas ni las anotaciones (van en el
siguiente prompt y en el Sprint 6). Solo el visor cargando y rotando un
modelo de prueba.
```

#### Prompt 5.2 — UI del visor: Viewer3D, ElementTree, controles

```
Contexto: `useViewer.js` funcionando.

Tarea:
1. `Viewer3D.vue`: canvas a pantalla completa dentro del layout de revisión,
   toolbar superior (Reset, Aislar selección, Mostrar todo), maneja los 3
   estados: cargando (spinner + texto), error (mensaje + botón descarga
   original), listo (canvas interactivo).

2. `ElementTree.vue`: árbol jerárquico de las piezas del modelo (si el
   formato lo permite extraer jerarquía, como IFC/glTF; para .obj/.stl sin
   jerarquía interna, mostrar un único nodo raíz "Modelo completo" sin
   árbol — no forzar una jerarquía que el formato no tiene).

3. `ElementInfo.vue`: panel que muestra las propiedades de la pieza
   seleccionada (nombre, tipo, si están disponibles en los metadatos del
   archivo).

4. `ReviewView.vue` (ruta `/entrega/:id/revisar`, solo Profesor de esa
   clase): layout de 3 columnas como en el wireframe de specs-general.md —
   árbol de piezas (izquierda), canvas 3D (centro), panel de anotaciones
   (derecha, placeholder por ahora, se completa en Sprint 6). Pestañas
   inferiores para "Modelo 3D" / "Documentos" / "Imágenes" si la entrega
   incluye archivos extra (.pdf, .jpg, .png).

Manejo de errores / consideraciones:
- Verificar ownership ANTES de siquiera intentar cargar el modelo (llamar
  primero a `GET /api/entregas/:id`, y solo si responde 200 proceder a pedir
  el archivo binario).
- El visor SVG (para entregas vectoriales) es una vista distinta y más
  simple: usar `<img>` o `<object>` con el SVG directamente (los navegadores
  lo renderizan nativo), sin necesidad de Three.js — documentar esto para no
  intentar forzar archivos SVG por el pipeline 3D.

Probá con un .obj, un .gltf y (si el tiempo alcanza) un .fbx para confirmar
que el mensaje de fallback funciona en el caso .fbx problemático.
```

---

### 💬 Sprint 6 — Anotaciones y feedback (`comentario_priv` / `posiciones`)

**Objetivo del sprint:** el Profesor selecciona una pieza o punto del modelo y deja un comentario anclado a una posición 3D; el Alumno ve esos comentarios y su estado.

**Historias de usuario:**
- Como Profesor, quiero dejar un comentario anclado a un punto específico del modelo 3D.
- Como Profesor, quiero dejar un comentario general sobre toda la entrega (sin punto anclado).
- Como Alumno, quiero ver los comentarios de mi entrega y su ubicación en el modelo.
- Como Profesor, quiero cambiar el estado de la entrega (Pendiente/En revisión/Revisado/Aprobado).

#### Prompt 6.1 — API de comentarios y posiciones

```
Contexto: Tablas `comentario_priv` (ComPrivID, EntregaID, Comentario, Fecha) y
`posiciones` (ComPrivID+TejeID PK compuesta, Valor) + `tipos_ejes` (X,Y,Z) ya
existen.

Tarea:
1. `backend/routes/comentarios.routes.js`:
   - `POST /api/entregas/:entregaId/comentarios` (solo Profesor de esa
     clase): recibe `texto` y OPCIONALMENTE `posicion: {x, y, z}`. Sanitiza
     `texto` (escapar HTML, ver specs-seguridad.md, función `sanitizeText`)
     antes de guardar — defensa en profundidad aunque el frontend también
     escape al renderizar. Inserta en `comentario_priv`; si vino `posicion`,
     inserta las 3 filas correspondientes en `posiciones` (una por cada eje
     X/Y/Z) dentro de la misma transacción.
   - `GET /api/entregas/:entregaId/comentarios`: verifica ownership (Alumno
     dueño de la entrega, o Profesor de la clase). Devuelve los comentarios
     con su posición reconstituida como `{x, y, z}` o `null` si es un
     comentario general (hacer el join/agrupación de las 3 filas de
     `posiciones` en el backend, el frontend no debería tener que enterarse
     de que son 3 filas separadas).
   - `DELETE /api/comentarios/:id` (solo el Profesor autor, verificar
     `EntregaID` → clase → participación del usuario).
   - `PATCH /api/entregas/:id/estado`: (solo Profesor) cambia el estado de la
     entrega entre los 4 valores válidos — rechazar cualquier valor fuera del
     catálogo con 400.

2. Longitud máxima de `texto` del comentario (ej: 2000 caracteres) validada
   en backend, no solo con `maxlength` en el input del frontend.

Manejo de errores / consideraciones:
- Si `posicion` viene incompleta (falta algún eje), rechazar con 400 en vez
  de guardar una posición parcial inconsistente.
- Nunca renderizar el `texto` del comentario "as-is" en ningún log del
  servidor sin escapar tampoco, por si se inspecciona el log en una consola
  que sí interprete HTML.

Mostrame los 4 endpoints probados, incluyendo un intento de comentario con
`<script>` en el texto para confirmar que queda sanitizado en la respuesta.
```

#### Prompt 6.2 — UI de anotaciones sobre el visor

```
Contexto: Visor 3D del Sprint 5 + API de comentarios lista.

Tarea:
1. `AnnotationPin.vue`: marcador visual (círculo pequeño con el color de
   acento del tema activo) posicionado sobre el canvas proyectando la
   coordenada 3D a coordenadas 2D de pantalla (usar
   `camera.project()`/`Vector3.project()` de Three.js recalculado en cada
   frame o en `requestAnimationFrame` mientras la cámara se mueve). Emit
   `click` para abrir el detalle del comentario.

2. `AnnotationForm.vue`: formulario simple (textarea + botón guardar/
   cancelar) que aparece flotando cerca del punto clickeado. Si el Profesor
   hizo click en modo "agregar anotación" sobre una pieza, pre-llena la
   posición; si usa el botón "Comentario general" (fuera del canvas), no hay
   posición.

3. `AnnotationPanel.vue`: lista lateral de todos los comentarios de la
   entrega actual (ordenados por fecha), cada uno con: texto, fecha, y si
   tiene posición, un botón "Ver en el modelo" que mueve la cámara hacia ese
   punto (`fitModelToView` centrado en la coordenada). Botón eliminar visible
   solo para el Profesor autor.

4. Selector de estado de la entrega (Pendiente/En revisión/Revisado/
   Aprobado) como un `<select>` visible solo para el Profesor en
   `ReviewView.vue`, que llama al `PATCH` correspondiente al cambiar.

5. Vista de solo-lectura para el Alumno: mismo `Viewer3D` + `AnnotationPanel`
   pero sin botones de crear/eliminar/cambiar estado — reutilizar los mismos
   componentes con un prop `readonly`.

Manejo de errores / consideraciones:
- Si el usuario hace click para agregar una anotación pero no hay pieza
  seleccionada (click en el vacío del canvas), no abrir el formulario —
  dar feedback (ej. cursor o tooltip) de que hay que seleccionar un punto
  del modelo primero.
- Actualizar `AnnotationPanel` en tiempo real (sin recargar la página) tras
  crear o eliminar un comentario, usando el estado reactivo del visor
  (`viewerState.annotations`).
- El texto de los comentarios se muestra SIEMPRE con interpolación `{{ }}`
  de Vue (nunca `v-html`), aunque ya venga sanitizado del backend — defensa
  en profundidad doble.

Probá el flujo completo: Profesor selecciona una pieza → agrega anotación →
Alumno (otra sesión) entra a ver su entrega y ve el pin y el comentario →
Profesor cambia el estado a "Revisado" → Alumno ve el nuevo estado reflejado.
```

---

### 🛡️ Sprint 7 — Seguridad, roles de Admin y hardening

**Objetivo del sprint:** cerrar la checklist completa de `specs-seguridad.md`, agregar el rol Admin con su panel básico, y revisar cada endpoint contra IDOR/XSS/uploads.

**Historias de usuario:**
- Como Admin, quiero ver y gestionar usuarios del sistema.
- Como equipo, queremos verificar que ningún endpoint permite acceder a datos de otro usuario.

#### Prompt 7.1 — Panel de Admin

```
Contexto: `usuarios.rol_global` incluye 'ADMIN' (no se ofrece en el registro
público — se otorga manualmente en BD o por un Admin existente).

Tarea:
1. `backend/routes/admin.routes.js`, todas las rutas con
   `requireAuth + requireRole('ADMIN')`:
   - `GET /api/admin/usuarios`: lista todos los usuarios (sin password_hash).
   - `PATCH /api/admin/usuarios/:id/estado`: activar/desactivar una cuenta
     (agregar columna `activo BOOLEAN DEFAULT TRUE` a `usuarios` si no
     existe; el middleware `requireAuth` debe rechazar login/JWT de usuarios
     con `activo = FALSE`).
   - `GET /api/admin/clases`: lista todas las clases del sistema (vista
     global, sin el filtro de participación que tienen los demás roles).

2. `AdminView.vue` (ruta `/admin`, guard `requiresAdmin`): tabla de usuarios
   con toggle de activar/desactivar, tabla de clases del sistema.

Manejo de errores / consideraciones:
- Un Admin no puede desactivarse a sí mismo (validación en backend, 400 si
  `req.user.id === req.params.id`).
- Todas las acciones destructivas/administrativas deben pedir confirmación
  en el frontend (modal simple "¿Seguro que querés desactivar a X?").
```

#### Prompt 7.2 — Auditoría de seguridad end-to-end

```
Contexto: Repasar TODO lo construido en los Sprints 1-6 contra la checklist
de specs-seguridad.md.

Tarea: Revisar el código existente y corregir donde falte, endpoint por
endpoint:
1. Confirmar que TODOS los endpoints con `:id` en la URL verifican ownership
   antes de devolver datos (IDOR) — listame explícitamente cada endpoint que
   NO lo estaba haciendo y corregilo.
2. Confirmar headers de seguridad en `server.js`: X-Frame-Options,
   X-Content-Type-Options, Referrer-Policy, y HSTS condicionado a
   `NODE_ENV=production` (bloque de código de specs-seguridad.md sección 3).
3. Confirmar que el rate limiting de login sigue activo y no fue removido
   por error en sprints posteriores.
4. Confirmar que CADA input de texto libre que se guarda en BD (comentarios,
   descripciones de trabajos, nombres de clase) pasa por sanitización
   anti-XSS en el backend, no solo se confía en el escape de Vue en el
   frontend.
5. Confirmar que el `.env` real nunca fue commiteado (revisar historial de
   git) y que `.env.example` está actualizado con todas las variables que se
   fueron agregando en sprints posteriores (ej: si se agregó alguna nueva).
6. Confirmar que los mensajes de error 500 nunca exponen detalles internos
   (stack, nombre de tabla, query SQL) en ningún endpoint.

Entregame un informe en markdown (`SECURITY_AUDIT.md`) con: checklist
original marcada ✅/❌, lista de fixes aplicados, y cualquier riesgo residual
aceptado conscientemente (con justificación) para este MVP académico.
```

---

### 🚀 Sprint 8 — Despliegue y documentación final

**Objetivo del sprint:** app desplegada en Railway/Render, accesible públicamente, con documentación de instalación para quien la evalúe.

**Historias de usuario:**
- Como equipo, queremos que la app esté accesible desde una URL pública para la evaluación académica.
- Como evaluador, quiero poder instalar el proyecto localmente siguiendo un README claro.

#### Prompt 8.1 — Preparación para despliegue

```
Contexto: Backend Express + MariaDB, Frontend Vite/Vue. Destino: Railway o
Render (planes gratuitos).

Tarea:
1. Backend: agregar script de build/start compatible con Railway/Render
   (variables de entorno vía panel de la plataforma, no `.env` en
   producción). Confirmar que `UPLOAD_DIR` funciona con almacenamiento
   persistente del plan elegido (documentar la limitación: en free tiers el
   filesystem puede no ser persistente entre deploys — dejarlo anotado como
   riesgo conocido para esta fase académica, ya que MinIO/S3 quedó fuera de
   alcance).
2. Frontend: build de producción (`npm run build`), configurar
   `VITE_API_URL` apuntando a la URL pública del backend desplegado.
   Configurar CORS_ORIGIN del backend con la URL pública del frontend.
3. Generar `README.md` en la raíz con: descripción del proyecto, stack,
   instrucciones de instalación local paso a paso (clonar, instalar
   dependencias, crear BD con schema.sql, variables de entorno, levantar
   backend y frontend), instrucciones de despliegue, y credenciales de
   usuario de prueba (del seed-dev.sql del Sprint 1).

Manejo de errores / consideraciones:
- Documentar explícitamente en el README la limitación de que no hay
  refresh token (sesión expira a los 15 min) para que el evaluador no lo
  interprete como un bug.
- Verificar que ningún `console.log` de debug quedó mostrando datos
  sensibles (tokens, passwords) antes de este deploy final.

Entregame el README completo y la lista de variables de entorno a configurar
en el panel de Railway/Render.
```

---

## 5. Backlog fuera de alcance del MVP (Fase 2 / futuro)

Registrado explícitamente para que ningún prompt de los sprints anteriores intente resolverlo por adelantado:

- Nivel jerárquico "Comisión" entre Clase y Alumno.
- Notificaciones por email (solo quedan las internas/badge en el MVP).
- Herramientas de medición/anotación sobre imágenes 2D.
- Integración con Moodle/Google Classroom.
- Conversión automática entre formatos de archivo.
- Calificación numérica automática.
- Soporte mobile/tablet nativo.
- Refresh tokens / sesiones extendidas.
- Migración a Redis, S3/MinIO, Docker, si el proyecto escala más allá del uso académico piloto.
