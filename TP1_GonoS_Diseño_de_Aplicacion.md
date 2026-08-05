# GonoS - App de Classroom con Visor 3D y Vectorial

## Problema

En carreras como Arquitectura, Diseño y Matemática, la corrección de trabajos prácticos suele requerir que el docente descargue archivos pesados (modelos 3D, vectoriales) y abra software especializado (CAD, visores 3D, editores de imagen) solo para poder ver lo que el alumno entregó. Esto vuelve el proceso lento, dependiente de instalar herramientas específicas, y dificulta dejar feedback claro y ubicado exactamente sobre la parte del trabajo que se está corrigiendo.

- **¿Qué problema resuelve?** Elimina la necesidad de descargar archivos o instalar software para revisar entregas 3D/vectoriales: todo se visualiza e inspecciona directamente en el navegador, y el feedback queda anclado a un punto específico del modelo (no es un comentario suelto sin contexto).
- **¿Quién la utilizaría?** Docentes y alumnos de cátedras de Arquitectura, Diseño Industrial, Topología y Matemática (geometría, modelado, cuerpos geométricos) que trabajan con archivos 3D (`.obj`, `.stl`, `.gltf`, `.glb`, `.ifc`) o vectoriales (`.svg`), organizados en clases/cátedras.
- **¿Por qué sería útil?** Acelera la corrección (menos pasos, menos software), estandariza cómo se organiza el material por clase y trabajo, y deja un historial de comentarios trazable por entrega — algo que hoy suele resolverse a mano, por mail, o en reuniones presenciales frente a una pantalla compartida.

## Funcionalidades

1. **Gestión de clases:** un docente crea una clase (cátedra) y genera un código de invitación; los alumnos se unen con ese código.
2. **Publicación de trabajos:** el docente publica un trabajo con consigna, fecha de entrega y los formatos de archivo aceptados; queda asignado automáticamente a todos los alumnos de la clase.
3. **Entrega de archivos:** el alumno sube su archivo (modelo 3D o vectorial, más archivos extra como PDF/imágenes de apoyo) validando formato y tamaño antes de aceptarla.
4. **Visualización 3D/vectorial en el navegador:** el docente (y el alumno sobre su propia entrega) abre el archivo en un visor interactivo con zoom, rotación, desplazamiento y árbol de piezas — sin descargar nada.
5. **Comentarios anclados a un punto del modelo:** el docente selecciona una pieza/punto del modelo 3D y deja un comentario privado ligado a esa posición (X, Y, Z), o un comentario general sobre toda la entrega.
6. **Tablón / comentarios públicos por trabajo:** además del feedback privado por entrega, existe un canal de comentarios públicos asociado al trabajo (tipo anuncio o consulta visible para toda la clase).
7. **Estados de revisión:** cada entrega pasa por los estados Pendiente → En revisión → Revisado → Aprobado, visibles tanto para el docente como para el alumno dueño de la entrega.
8. **Roles y permisos:** Admin, Profesor y Alumno, con permisos distintos por clase (un mismo usuario puede ser Profesor en una cátedra y Alumno en otra).

## Datos

Basado en el modelo Entidad-Relación definitivo del proyecto:

| Entidad | Campos principales |
|---|---|
| **Usuarios** | UsuarioID, mail, Nombre, Apellido, Contraseña (hash) |
| **Roles** | RolID, Nombre (Creador/Admin, Profesor, Alumno) |
| **Participaciones** | ParticipacionID, UsuarioID, ClaseID, RolID — el rol de un usuario es *por clase*, no global |
| **Clases** | ClaseID, Nombre, Descripcion, FechaCreacion, Código (de invitación) |
| **Trabajos** | TpID, ClaseID, ParticipacionID (profesor creador), FechaEntrega, Descripcion/Consigna, Formatos (aceptados) |
| **Publicaciones** | PublicacionID, ClaseID, ParticipacionID, mensaje — tablón/anuncios de la clase |
| **ComentarioPublico** | ComPublicoID, TpID, ParticipacionID, Fecha, Comentario — comentarios visibles por todos sobre un trabajo |
| **Asignacion** | AsignacionID, TpID, ParticipacionID (alumno), Nota |
| **Entrega** | EntregaID, AsignacionID, Trabajo, FechaEntrega, Devolucion, archivo, nombre_original |
| **Archivo_extra** | archivo_extraID, entregaID, nombre, nombre_Original — archivos adicionales de apoyo (PDF, imágenes) por entrega |
| **ComentarioPriv** | ComPrivID, EntregaID, ParticipacionID, Fecha, Comentario — feedback privado del docente sobre una entrega puntual |
| **Posiciones** | ComPrivID + TejeID (PK compuesta), Valor — coordenada de un comentario privado sobre un eje |
| **TiposEjes** | TejeID, Tipo (X, Y, Z) — permite anclar un comentario a un punto 3D exacto |

## SPEC

**Objetivo:** ofrecer una plataforma web donde alumnos suben trabajos 3D/vectoriales y docentes los visualizan e inspeccionan directamente en el navegador, dejando comentarios anclados a puntos específicos del modelo, organizados por clase y trabajo.

**Usuario:** docentes y alumnos de cátedras de Arquitectura, Diseño y Matemática, organizados en clases con roles diferenciados (Profesor/Alumno) y un Admin para gestión general del sistema.

**Funcionalidades:** gestión de clases con código de invitación; publicación de trabajos con consigna y formatos aceptados; entrega de archivos con validación de formato/tamaño; visor 3D interactivo (zoom, rotación, árbol de piezas) para `.obj`/`.stl`/`.gltf`/`.glb`/`.ifc` (`.fbx` condicional) y visor nativo para `.svg`; comentarios privados anclados a posición 3D o generales sobre la entrega; comentarios públicos por trabajo (tablón); estados de revisión (Pendiente/En revisión/Revisado/Aprobado); panel de Admin para gestión de usuarios.

**Restricciones:** sin conversión automática entre formatos; `.fbx` es soporte condicional (si falla la previsualización, se ofrece descarga directa sin romper la vista); tamaño máximo de archivo 50MB; JWT sin refresh token (expira a los 15 minutos, el usuario reloguea); solo uso de escritorio (sin optimización mobile en el MVP); sin integración con LMS externos (Moodle, Google Classroom); sin notificaciones por email (solo internas).

**Tecnología elegida:** JavaScript (ES2022, sin TypeScript) de punta a punta; Frontend Vue 3 (Composition API) + Vue Router 4 + Axios + CSS puro; visor 3D con That Open Components (sobre Three.js); Backend Node.js + Express; acceso a datos con `mysql2/promise` sin ORM; autenticación con `jsonwebtoken` + `bcryptjs`; subida de archivos con `multer` guardando en disco; base de datos MariaDB; despliegue en Railway o Render.

## Prompt profesional

```
Actuá como desarrollador full-stack senior. Vamos a construir GonoS, una
plataforma web tipo "Classroom" para que alumnos entreguen trabajos 3D y
vectoriales, y docentes los visualicen directamente en el navegador (sin
descargar archivos ni instalar software) para dejar comentarios anclados a
puntos específicos del modelo. Es para cátedras de Arquitectura, Diseño y
Matemática.

STACK OBLIGATORIO (no cambiar sin autorización explícita):
- JavaScript puro ES2022, sin TypeScript, en frontend y backend.
- Frontend: Vue 3 (Composition API), Vue Router 4, Axios, CSS puro en
  <style scoped> (sin Tailwind ni frameworks UI), estado global con
  reactive() de Vue (sin Pinia).
- Visor 3D: That Open Components (sobre Three.js). Vectoriales (.svg) se
  muestran nativos del navegador, sin pipeline 3D.
- Backend: Node.js 18+ + Express.js.
- Acceso a datos: mysql2/promise con queries parametrizadas, SIN ORM.
- Auth: jsonwebtoken + bcryptjs, JWT manual (sin Passport), expiración 15 min,
  sin refresh token.
- Uploads: multer, guardado en disco, renombrado con UUID (nunca el nombre
  original como path físico).
- Base de datos: MariaDB 10.6+.
- Despliegue: Railway o Render.

MODELO DE DATOS (fuente de verdad, usar estos nombres en español, snake_case,
para tablas y columnas): usuarios, roles, participaciones, clases, trabajos,
publicaciones, comentario_publico, asignacion, entrega, archivo_extra,
comentario_priv, posiciones, tipos_ejes. El rol de un usuario (Profesor/
Alumno) se define POR CLASE en `participaciones`, no es un atributo fijo del
usuario.

REGLAS TRANSVERSALES QUE SE APLICAN A TODO EL DESARROLLO:
1. Toda query SQL usa pool.execute(sql, [params]); nunca concatenar strings.
2. Todo endpoint con :id verifica ownership (rol + pertenencia a la clase/
   trabajo/entrega correspondiente) antes de responder — anti-IDOR.
3. Todo endpoint devuelve JSON consistente: éxito → datos directos; error →
   { error: 'mensaje' } con status HTTP correcto. Nunca exponer stack traces.
4. Toda entrada de texto libre (comentarios, descripciones, nombres) se
   sanitiza en backend antes de guardar (anti-XSS), y nunca se renderiza con
   v-html en el frontend.
5. Archivos subidos: whitelist de extensiones (.obj, .stl, .gltf, .glb, .ifc,
   .fbx, .svg, .jpg, .png, .pdf), límite de 50MB, renombrado con UUID,
   validación de extensión Y tamaño en cliente (UX) y servidor (seguridad
   real).
6. Todo error de red/carga en el frontend debe mostrar un mensaje claro al
   usuario, nunca dejar la UI en un loading infinito ni mostrar un error
   técnico crudo.
7. Diseño visual minimalista y monocromático: variables CSS en theme.css,
   modo claro con acento único azul #19B0B5, modo oscuro con acento único
   naranja #E06710, resto en grises/blancos crema/negros. Nunca colores hex
   hardcodeados fuera de theme.css.
8. Idioma: UI y mensajes de error en español; nombres de variables/funciones
   de código en inglés; nombres de tablas/columnas de BD en español según el
   modelo de datos.

Vamos a trabajar en fases con metodología Scrum (sprints cortos, cada uno con
su objetivo cerrado y verificable antes de avanzar al siguiente). Empezá
SOLO por la Fase 0 y esperá mi confirmación antes de continuar a la
siguiente fase.

FASE 0 — Fundacional (repo, entorno, sistema de diseño):
- Estructura de carpetas backend/ y frontend/ separadas.
- Backend: server.js con Express, cors, dotenv, manejo de 404 y error
  handler genérico que nunca expone detalles internos, endpoint
  GET /api/health. .env.example con todas las variables necesarias
  (PORT, DB_*, JWT_SECRET, JWT_EXPIRES_IN, UPLOAD_DIR, MAX_FILE_SIZE,
  CORS_ORIGIN). El server debe abortar el arranque con mensaje claro si
  falta una variable crítica.
- Frontend: proyecto Vite + Vue 3, theme.css con el sistema de diseño
  descripto arriba, estado reactivo de tema claro/oscuro persistido en
  localStorage, componente ThemeToggle, vista de prueba para validar
  visualmente ambos modos.

FASE 1 — Base de datos y autenticación:
- Primero ENTREGAME un documento de análisis (DISEÑO_BD.md) detallando tipos
  de dato MariaDB exactos, claves foráneas con su ON DELETE/UPDATE, índices,
  columnas de auditoría faltantes, y cómo modelar los estados de entrega
  (Pendiente/En revisión/Revisado/Aprobado) — esperá mi aprobación antes de
  generar el SQL definitivo.
- Luego generá schema.sql completo (InnoDB, utf8mb4) con todas las tablas del
  modelo de datos, seeds de catálogos (roles, tipos_ejes), y un seed-dev.sql
  opcional con datos de prueba.
- Backend: registro (con rol_global ADMIN/PROFESOR/ALUMNO), login con
  mensajes de error genéricos (no revelar si el mail existe), JWT de 15 min,
  middleware requireAuth/requireRole, rate limiting simple de login (5
  intentos / 15 min).
- Frontend: Vue Router con guards por autenticación, estado de sesión
  persistido, vistas de Login/Registro con validación en cliente y manejo de
  errores de red.

FASE 2 — Clases, publicaciones y trabajos:
- API y UI para crear clase (genera código de invitación único), unirse con
  código, dashboard de clases según participación del usuario.
- API y UI de "tablón" de la clase (publicaciones) y trabajos con consigna,
  fecha límite y formatos aceptados; al crear un trabajo se generan
  automáticamente las asignaciones para los alumnos ya participantes (y para
  los que se unan después).
- Comentarios públicos por trabajo (comentario_publico), visibles para toda
  la clase.

FASE 3 — Entregas y archivos:
- Middleware de upload seguro (multer con whitelist, límite de tamaño,
  renombrado UUID, manejo específico de errores de Multer con status 413/400
  en vez de 500).
- API de entregas: subida validando formato contra los formatos aceptados
  DEL TRABAJO específico, archivos extra (archivo_extra) para material de
  apoyo, endpoint de descarga controlado con verificación de ownership
  (nunca depender solo de que la carpeta /uploads sea "difícil de adivinar").
- UI: componente de subida drag&drop con validación previa en cliente y
  barra de progreso, tabla de entregas para el docente.

FASE 4 — Visor 3D y vectorial:
- Composable de inicialización del visor con That Open Components/Three.js,
  soporte .obj/.stl/.gltf/.glb/.ifc, manejo explícito de fallback para .fbx
  (si falla la carga, ofrecer descarga directa sin romper la vista), 
  detección de soporte WebGL, liberación de memoria al desmontar (dispose).
- UI: Viewer3D con toolbar (reset, aislar selección), árbol de piezas cuando
  el formato lo permite, visor nativo simple para .svg vía <img>/<object>.
- Vista de revisión de 3 columnas (árbol / canvas / panel lateral) según
  rol (Profesor con controles completos, Alumno en modo solo lectura).

FASE 5 — Comentarios privados anclados a posición 3D:
- API de comentario_priv + posiciones (X/Y/Z) con sanitización de texto,
  transacción atómica al guardar las 3 coordenadas, endpoint de cambio de
  estado de la entrega (solo valores del catálogo permitido).
- UI: pin visual sobre el modelo proyectando la coordenada 3D a pantalla,
  formulario de comentario, panel lateral de anotaciones con navegación
  hacia el punto en el modelo, selector de estado para el docente.

FASE 6 — Seguridad, rol Admin y hardening:
- Panel de Admin (gestión de usuarios, activar/desactivar cuentas, vista
  global de clases).
- Auditoría completa: revisar cada endpoint contra IDOR, confirmar headers
  de seguridad (X-Frame-Options, X-Content-Type-Options, HSTS en
  producción), confirmar que .env nunca se commiteó, entregar un informe
  SECURITY_AUDIT.md con checklist marcado.

FASE 7 — Despliegue:
- Preparar build de producción de ambos proyectos, variables de entorno para
  Railway/Render, README con instrucciones de instalación local y
  despliegue, documentar limitaciones conocidas (sin refresh token, posible
  no-persistencia de disco en free tier).

CONTROL DE ERRORES (aplicar en TODAS las fases):
- Nunca un endpoint debe responder 500 sin loguear el detalle en servidor y
  responder al cliente solo un mensaje genérico.
- Toda validación de negocio (fechas pasadas, formatos no permitidos, límites
  de tamaño, duplicados) se valida en backend aunque ya se haya validado en
  frontend.
- Usar transacciones (beginTransaction/commit/rollback) en toda operación
  que inserte en más de una tabla relacionada (ej: crear clase + su
  participación inicial; crear trabajo + sus asignaciones; crear comentario
  + sus 3 posiciones).
- Todo componente Vue que dependa de datos remotos maneja explícitamente 3
  estados: cargando, error, listo — nunca dejar una pantalla en blanco sin
  feedback.

Antes de escribir código de una fase, mostrame un resumen de qué archivos vas
a crear/modificar. Al terminar cada fase, mostrame cómo probarla manualmente
y esperá mi confirmación antes de avanzar a la siguiente.
```

## Challenge de validación

Antes de aceptar como terminada cualquier fase generada por la IA, voy a validar:

- **¿Funciona de punta a punta?** Que el flujo completo (crear clase → publicar trabajo → alumno entrega → docente visualiza y comenta → cambia el estado) corra sin errores en el navegador, no solo que compile.
- **¿Respeta el modelo de datos acordado?** Que las tablas y relaciones generadas coincidan exactamente con el ER (nombres en español, claves foráneas correctas), sin inventar columnas o entidades nuevas sin avisar.
- **¿El manejo de errores es real, no solo cosmético?** Probar casos límite a propósito: subir un archivo con extensión no permitida, subir un archivo de más de 50MB, entrar a una entrega de otro alumno cambiando el ID en la URL (IDOR), mandar un comentario con `<script>` adentro — confirmar que en todos los casos la app responde con un mensaje claro y no rompe ni expone datos ajenos.
- **¿El visor 3D realmente evita la descarga?** Confirmar que un `.obj`/`.stl`/`.gltf` se visualiza en el navegador sin necesidad de abrir otro programa, y que un `.fbx` problemático cae en el fallback (mensaje + descarga) en vez de romper toda la pantalla.
- **¿Es fácil de entender y mantener?** Código dividido en componentes/archivos chicos y con responsabilidad clara, sin lógica de negocio mezclada dentro de componentes de UI.
- **¿La interfaz es clara y consistente?** Que el sistema de diseño (modo claro/oscuro, acentos únicos azul/naranja) se aplique de forma pareja en todas las vistas, sin colores sueltos hardcodeados.
- **¿Los datos persisten correctamente?** Verificar directamente en la base de datos (vía DBeaver) que cada acción desde la UI efectivamente impacta en las tablas esperadas, sin datos huérfanos (ej: una entrega sin su asignación, un comentario sin su entrega).
