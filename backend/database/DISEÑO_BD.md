# Diseño de Base de Datos — GonoS

## Convenciones generales

- **Naming:** snake_case, español (coherente con el ER y con la UI).
- **Engine:** InnoDB (soporte de transacciones, FK, UTF-8).
- **Charset:** `utf8mb4` (soporte completo de acentos, ñ, emojis).
- **PKs:** `INT UNSIGNED AUTO_INCREMENT` en todas las tablas salvo `posiciones` (PK compuesta) y `tipos_ejes`/`roles` (TINYINT, pocas filas).
- **Auditoría:** `created_at` y `updated_at` en todas las tablas de negocio (excepto catálogos fijos y tablas puente simples). `created_at` con `DEFAULT CURRENT_TIMESTAMP`, `updated_at` con `ON UPDATE CURRENT_TIMESTAMP`.

---

## 1. `roles`

Catálogo fijo: `Creador` (Admin), `Profesor`, `Alumno`.

| Columna | Tipo | Restricciones | Justificación |
|---------|------|---------------|---------------|
| `rol_id` | `TINYINT UNSIGNED` | PK, AUTO_INCREMENT | 3 filas, sobra INT. TINYINT (0-255) es suficiente. |
| `nombre` | `VARCHAR(20)` | NOT NULL, UNIQUE | Suficiente para `'Creador'` (7 chars), margen de sobra. |
| `created_at` | `DATETIME` | DEFAULT CURRENT_TIMESTAMP | Auditoría básica. |

**Seed:** `('Creador'), ('Profesor'), ('Alumno')`.

---

## 2. `tipos_ejes`

Catálogo fijo con los 3 ejes cartesianos.

| Columna | Tipo | Restricciones | Justificación |
|---------|------|---------------|---------------|
| `teje_id` | `TINYINT UNSIGNED` | PK, AUTO_INCREMENT | 3 filas. |
| `tipo` | `VARCHAR(1)` | NOT NULL, UNIQUE | `'X'`, `'Y'`, `'Z'`. Un carácter basta. |
| `created_at` | `DATETIME` | DEFAULT CURRENT_TIMESTAMP | |

**Seed:** `('X'), ('Y'), ('Z')`.

---

## 3. `usuarios`

Cuenta de persona. No tiene rol fijo global en el ER original, pero agregamos `rol_global` para determinar el dashboard inicial y `activo` para desactivación (Sprint 7).

| Columna | Tipo | Restricciones | Justificación |
|---------|------|---------------|---------------|
| `usuario_id` | `INT UNSIGNED` | PK, AUTO_INCREMENT | Hasta 4.294M usuarios. |
| `mail` | `VARCHAR(255)` | NOT NULL, UNIQUE | RFC 5321 permite hasta 254 caracteres. 255 por redondeo. |
| `nombre` | `VARCHAR(100)` | NOT NULL | Nombres típicos < 50 chars. 100 para casos compuestos. |
| `apellido` | `VARCHAR(100)` | NOT NULL | Misma justificación. |
| `password_hash` | `VARCHAR(255)` | NOT NULL | bcrypt genera 60 chars. 255 para futuros algoritmos. |
| `rol_global` | `ENUM('ADMIN','PROFESOR','ALUMNO')` | NOT NULL, DEFAULT 'ALUMNO' | Solo 3 valores fijos. Indica el tipo de cuenta para el dashboard. No reemplaza el rol por-clase de `participaciones`. |
| `activo` | `BOOLEAN` (TINYINT(1)) | NOT NULL, DEFAULT TRUE | Para desactivación administrativa (Sprint 7). |
| `created_at` | `DATETIME` | DEFAULT CURRENT_TIMESTAMP | |
| `updated_at` | `DATETIME` | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | |

**Índices:** UNIQUE sobre `mail` (ya cubierto por la restricción).

---

## 4. `clases`

Una cátedra/curso. Se agrega `codigo` (invitación, Sprint 2) que no estaba en el ER original pero es necesario para el flujo de "unirse con código".

| Columna | Tipo | Restricciones | Justificación |
|---------|------|---------------|---------------|
| `clase_id` | `INT UNSIGNED` | PK, AUTO_INCREMENT | |
| `nombre` | `VARCHAR(200)` | NOT NULL | Suficiente para nombres de cátedra. |
| `descripcion` | `TEXT` | NULL | Descripción larga opcional. TEXT permite hasta 64KB. |
| `codigo` | `VARCHAR(6)` | NOT NULL, UNIQUE | Código alfanumérico de invitación (mayúsculas+números, sin caracteres ambiguos). |
| `created_at` | `DATETIME` | DEFAULT CURRENT_TIMESTAMP | Reemplaza a `FechaCreacion` del ER. |
| `updated_at` | `DATETIME` | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | |

**Índices:** UNIQUE sobre `codigo` (búsqueda exacta al unirse a una clase).

---

## 5. `participaciones`

Tabla puente que resuelve la relación N:M entre `usuarios` y `clases`, con el rol como atributo. Un usuario puede tener distinto rol en distintas clases.

| Columna | Tipo | Restricciones | Justificación |
|---------|------|---------------|---------------|
| `participacion_id` | `INT UNSIGNED` | PK, AUTO_INCREMENT | |
| `usuario_id` | `INT UNSIGNED` | FK → `usuarios(usuario_id)`, NOT NULL | |
| `clase_id` | `INT UNSIGNED` | FK → `clases(clase_id)`, NOT NULL | |
| `rol_id` | `TINYINT UNSIGNED` | FK → `roles(rol_id)`, NOT NULL | |
| `created_at` | `DATETIME` | DEFAULT CURRENT_TIMESTAMP | |

**FKs:**
| FK | Referencia | ON DELETE | ON UPDATE | Justificación |
|----|------------|-----------|-----------|---------------|
| `fk_part_usuario` | `usuario_id` → `usuarios(usuario_id)` | CASCADE | CASCADE | Si se elimina un usuario, sus participaciones se eliminan automáticamente. |
| `fk_part_clase` | `clase_id` → `clases(clase_id)` | CASCADE | CASCADE | Si se elimina una clase, todas las participaciones asociadas se eliminan. |
| `fk_part_rol` | `rol_id` → `roles(rol_id)` | RESTRICT | CASCADE | No se puede eliminar un rol que está en uso (catálogo fijo, no debería ocurrir). |

**Índices:**
- UNIQUE `(usuario_id, clase_id)` — evita participaciones duplicadas.

---

## 6. `trabajos`

Una tarea/actividad dentro de una clase. La crea una participación con rol Profesor. Se agregan `formatos_aceptados` (no estaba en el ER original).

| Columna | Tipo | Restricciones | Justificación |
|---------|------|---------------|---------------|
| `tp_id` | `INT UNSIGNED` | PK, AUTO_INCREMENT | |
| `clase_id` | `INT UNSIGNED` | FK → `clases(clase_id)`, NOT NULL | |
| `participacion_id` | `INT UNSIGNED` | FK → `participaciones(participacion_id)`, NOT NULL | El Profesor que creó el trabajo. |
| `descripcion` | `TEXT` | NOT NULL | Consigna del trabajo (hasta 64KB). |
| `fecha_entrega` | `DATETIME` | NOT NULL | Fecha límite. Se valida en backend que no sea pasada al crear. |
| `formatos_aceptados` | `JSON` | NOT NULL | Array de strings: `['.obj','.stl','.svg']`. MariaDB 10.6+ soporta JSON como tipo nativo. |
| `created_at` | `DATETIME` | DEFAULT CURRENT_TIMESTAMP | |
| `updated_at` | `DATETIME` | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | |

**FKs:**
| FK | Referencia | ON DELETE | ON UPDATE | Justificación |
|----|------------|-----------|-----------|---------------|
| `fk_tp_clase` | `clase_id` → `clases(clase_id)` | CASCADE | CASCADE | Si se borra la clase, se borran todos sus trabajos. |
| `fk_tp_participacion` | `participacion_id` → `participaciones(participacion_id)` | RESTRICT | CASCADE | No se puede eliminar una participación (profesor) que haya creado trabajos — perderíamos el creador. |

**Índices:**
- `(clase_id)` para listar trabajos de una clase.

---

## 7. `asignacion`

Vincula un trabajo con el Alumno que debe resolverlo. Guarda la nota y el estado de revisión. Esta tabla es el registro central del progreso: existe desde que se publica el trabajo hasta que se califica.

| Columna | Tipo | Restricciones | Justificación |
|---------|------|---------------|---------------|
| `asignacion_id` | `INT UNSIGNED` | PK, AUTO_INCREMENT | |
| `tp_id` | `INT UNSIGNED` | FK → `trabajos(tp_id)`, NOT NULL | |
| `participacion_id` | `INT UNSIGNED` | FK → `participaciones(participacion_id)`, NOT NULL | El Alumno asignado. |
| `nota` | `DECIMAL(5,2)` | NULL | Permite valores como 0.00 a 999.99. NULL = sin calificar. DECIMAL evita errores de redondeo de FLOAT. |
| `estado` | `ENUM('Pendiente','En revisión','Revisado','Aprobado')` | NOT NULL, DEFAULT 'Pendiente' | Los 4 estados del flujo. ENUM es suficiente porque son valores fijos y no tienen atributos adicionales. |
| `created_at` | `DATETIME` | DEFAULT CURRENT_TIMESTAMP | |
| `updated_at` | `DATETIME` | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | |

**FKs:**
| FK | Referencia | ON DELETE | ON UPDATE | Justificación |
|----|------------|-----------|-----------|---------------|
| `fk_asig_tp` | `tp_id` → `trabajos(tp_id)` | CASCADE | CASCADE | Si se borra el trabajo, se borran sus asignaciones. |
| `fk_asig_participacion` | `participacion_id` → `participaciones(participacion_id)` | CASCADE | CASCADE | Si un alumno ya no participa en la clase, sus asignaciones se limpian. |

**Índices:**
- UNIQUE `(tp_id, participacion_id)` — evita que un alumno tenga dos asignaciones para el mismo trabajo.
- `(participacion_id)` para listar los trabajos pendientes de un alumno.

---

## 8. `entrega`

La entrega física de un alumno para una asignación: archivo, fechas y devolución del docente.

| Columna | Tipo | Restricciones | Justificación |
|---------|------|---------------|---------------|
| `entrega_id` | `INT UNSIGNED` | PK, AUTO_INCREMENT | |
| `asignacion_id` | `INT UNSIGNED` | FK → `asignacion(asignacion_id)`, NOT NULL | |
| `archivo` | `VARCHAR(255)` | NOT NULL | Ruta relativa del archivo en disco (ej: `uploads/original/1234567890-987654321.obj`). |
| `nombre_original` | `VARCHAR(255)` | NOT NULL | Nombre original del archivo subido por el usuario (solo para display, nunca para path físico). |
| `fecha_entrega` | `DATETIME` | NOT NULL | Momento exacto de la subida. |
| `devolucion` | `TEXT` | NULL | Notas/feedback del docente sobre la entrega completa (no confundir con comentarios con pin del Sprint 6). |
| `created_at` | `DATETIME` | DEFAULT CURRENT_TIMESTAMP | |
| `updated_at` | `DATETIME` | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | |

**FKs:**
| FK | Referencia | ON DELETE | ON UPDATE | Justificación |
|----|------------|-----------|-----------|---------------|
| `fk_entrega_asignacion` | `asignacion_id` → `asignacion(asignacion_id)` | CASCADE | CASCADE | Si se elimina la asignación, se elimina su entrega. |

**Nota:** un alumno puede reemplazar su entrega (borrando el archivo anterior en disco y actualizando la fila) hasta la fecha límite — ver reglas de negocio. Por eso no hay UNIQUE sobre `asignacion_id` de forma estricta: la regla de "máximo una entrega activa por asignación" se maneja en la capa de aplicación, no en la BD (aunque podría agregarse un UNIQUE y hacer UPDATE en vez de INSERT para el reemplazo).

---

## 9. `comentario_priv`

Comentario del docente sobre una entrega. Puede tener o no una posición 3D asociada (si no tiene, es un comentario general sobre toda la entrega).

| Columna | Tipo | Restricciones | Justificación |
|---------|------|---------------|---------------|
| `com_priv_id` | `INT UNSIGNED` | PK, AUTO_INCREMENT | |
| `entrega_id` | `INT UNSIGNED` | FK → `entrega(entrega_id)`, NOT NULL | |
| `participacion_id` | `INT UNSIGNED` | FK → `participaciones(participacion_id)`, NOT NULL | El docente que escribió el comentario (para control de autoría). No estaba en el ER original pero es necesario para el DELETE solo-autor. |
| `comentario` | `TEXT` | NOT NULL | Contenido del comentario. TEXT por flexibilidad (aunque se limite a 2000 chars en la capa de aplicación). |
| `fecha` | `DATETIME` | NOT NULL | Momento del comentario. |
| `created_at` | `DATETIME` | DEFAULT CURRENT_TIMESTAMP | |

**FKs:**
| FK | Referencia | ON DELETE | ON UPDATE | Justificación |
|----|------------|-----------|-----------|---------------|
| `fk_coment_entrega` | `entrega_id` → `entrega(entrega_id)` | CASCADE | CASCADE | Si se elimina la entrega, se eliminan sus comentarios. |
| `fk_coment_participacion` | `participacion_id` → `participaciones(participacion_id)` | RESTRICT | CASCADE | No se puede eliminar una participación (docente) que haya escrito comentarios. |

**Índices:**
- `(entrega_id)` para listar comentarios de una entrega.

---

## 10. `posiciones`

Coordenada 3D de un comentario. PK compuesta: cada comentario con posición tiene 3 filas (una por eje). Esto refleja fielmente el diagrama ER original (entidad débil de `comentario_priv` con `tipos_ejes`).

| Columna | Tipo | Restricciones | Justificación |
|---------|------|---------------|---------------|
| `com_priv_id` | `INT UNSIGNED` | PK (compuesta), FK → `comentario_priv(com_priv_id)`, NOT NULL | |
| `teje_id` | `TINYINT UNSIGNED` | PK (compuesta), FK → `tipos_ejes(teje_id)`, NOT NULL | |
| `valor` | `DECIMAL(10,4)` | NOT NULL | Coordenada. DECIMAL(10,4) permite rangos amplios (±999999.9999) con precisión de 0.0001. |

**FKs:**
| FK | Referencia | ON DELETE | ON UPDATE | Justificación |
|----|------------|-----------|-----------|---------------|
| `fk_pos_coment` | `com_priv_id` → `comentario_priv(com_priv_id)` | CASCADE | CASCADE | Si se elimina el comentario, se eliminan sus posiciones. |
| `fk_pos_teje` | `teje_id` → `tipos_ejes(teje_id)` | RESTRICT | CASCADE | No se puede eliminar un tipo de eje que esté en uso. |

---

## Decisión: ENUM vs tabla catálogo para estados

**Opción elegida:** ENUM sobre la columna `estado` en `asignacion`.

**Justificación:**
1. Los 4 valores (`Pendiente`, `En revisión`, `Revisado`, `Aprobado`) son fijos, no tienen atributos adicionales (color, orden, etc.) que justifiquen una tabla separada.
2. La lógica de transición de estados se maneja en la capa de aplicación (código), no en la BD.
3. ENUM es más simple de consultar y mantener: un `ALTER TABLE` si en el futuro se agrega un estado es trivial y poco frecuente.
4. Una tabla `estados_entrega` añadiría un JOIN innecesario para cada consulta de asignación sin beneficio real.

**Contraindicación considerada y descartada:** si los estados tuvieran atributos (colores, íconos, orden de workflow, permisos por rol), una tabla catálogo sería superior. No es el caso.

---

## Decisiones y supuestos

### 1. `rol_global` en `usuarios`

El ER original no define un rol global. Pero para el flujo de registro y el dashboard inicial, necesitamos saber si la cuenta es de tipo `ADMIN`, `PROFESOR` o `ALUMNO`. Este rol es separado y convive con los roles por-clase de `participaciones`. El rol en `participaciones` es el que se usa para autorización fina dentro de cada clase.

### 2. Estado en `asignacion`, no en `entrega`

Aunque el Sprint 6 expone `PATCH /api/entregas/:id/estado`, el estado conceptualmente pertenece a la asignación (el progreso del alumno en ese trabajo), no al archivo físico subido. La API actualiza el estado a través de la entrega como punto de entrada, pero en BD el estado vive en `asignacion`. La tabla `entrega` es el vehículo (el archivo); `asignacion` es el proceso (la revisión).

### 3. `codigo` de invitación en `clases`

No estaba en el ER original. Se agrega para el flujo de "unirse con código" del Sprint 2. Es un VARCHAR(6) con UNIQUE, generado por el backend al crear la clase.

### 4. `formatos_aceptados` en `trabajos`

No estaba en el ER original. Se agrega como JSON para que el profesor pueda elegir qué formatos acepta por trabajo. Alternativa considerada: tabla separada `formatos_trabajo` (N:N). Se descartó porque los formatos son un array simple sin atributos adicionales.

### 5. `participacion_id` en `comentario_priv`

El ER no la incluye. Se agrega para saber qué profesor escribió cada comentario, necesario para:
- Permitir que solo el autor elimine su comentario.
- Mostrar el nombre del profesor en la UI.

### 6. `nombre_original` en `entrega`

No estaba en el ER. Se agrega para mostrar al usuario el nombre de su archivo original en la UI, ya que el archivo en disco se guarda con nombre UUID por seguridad (anti path traversal).

### 7. ON DELETE CASCADE vs RESTRICT

- **CASCADE** en relaciones jerárquicas donde no tiene sentido mantener huérfanos: clase → trabajos, trabajo → asignaciones, asignación → entregas, entrega → comentarios.
- **RESTRICT** en relaciones donde la eliminación del padre dejaría datos inconsistentes: un profesor que creó trabajos no puede eliminarse de la clase sin antes reasignar esos trabajos.
- Para los catálogos (`roles`, `tipos_ejes`) siempre RESTRICT — no deberían eliminarse filas de estos en producción.

### 8. Justificación de tipos de datos

| Tipo | Cuándo se usa |
|------|---------------|
| `INT UNSIGNED` | PKs de tablas principales (esperamos < 4B filas). |
| `TINYINT UNSIGNED` | PKs de catálogos con < 255 filas (`roles`, `tipos_ejes`). |
| `VARCHAR(n)` | Texto corto con límite conocido (nombres, mails, códigos, rutas). |
| `TEXT` | Texto largo sin límite fijo (descripciones, comentarios, devoluciones). |
| `DECIMAL(10,4)` | Coordenadas numéricas que requieren precisión exacta. |
| `DECIMAL(5,2)` | Notas (0.00–999.99). |
| `ENUM` | Campos con conjunto fijo de valores conocidos (< 10 opciones estables). |
| `JSON` | Arrays/objetos sin estructura fija (`formatos_aceptados`). |
| `BOOLEAN` (TINYINT(1)) | Flags binarios (`activo`). |
| `DATETIME` | Fechas con hora. Suficiente para el alcance del MVP (sin TIMEZONE, el servidor usa UTC). |
