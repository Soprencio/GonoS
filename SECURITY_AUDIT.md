# Auditoría de Seguridad — GonoS MVP

## Checklist original

### 1. IDOR — Control de acceso sobre recursos por `:id`

| Endpoint | ¿Verifica ownership? | Estado |
|---|---|---|
| `GET /api/clases` | Filtrado por `req.user.id` — solo devuelve clases del usuario | ✅ |
| `POST /api/clases` | Crea nueva — sin ID en URL | ✅ |
| `GET /api/clases/:id` | `SELECT` en `participaciones WHERE usuario_id = ? AND clase_id = ?` antes de devolver datos | ✅ |
| `POST /api/clases/:id/unirse` | Requiere código de invitación válido; verifica que el usuario no esté ya participando | ✅ |
| `POST /api/clases/:claseId/trabajos` | `getParticipacion()` con `rol = 'Profesor'` | ✅ |
| `GET /api/clases/:claseId/trabajos` | `getParticipacion()` — Profesor ve todos, Alumno solo sus asignaciones | ✅ |
| `GET /api/trabajos/:id` | Obtiene `clase_id` del trabajo, luego `getParticipacion()` sobre esa clase | ✅ |
| `POST /api/asignaciones/:asignacionId/entregas` | Verifica `participacion_id` coincida con `req.user.id` | ✅ |
| `GET /api/trabajos/:trabajoId/entregas` | Obtiene `clase_id`, verifica `rol = 'Profesor'` en esa clase | ✅ |
| `GET /api/entregas/:id` | `getParticipacion()` + Alumno solo ve su propia entrega | ✅ |
| `GET /api/entregas/:id/descargar` | Mismo control que detalle de entrega | ✅ |
| `POST /api/entregas/:entregaId/comentarios` | Solo Profesor de la clase, verificado vía `getEntregaClaseId` + `getParticipacion` | ✅ |
| `GET /api/entregas/:entregaId/comentarios` | Participación en la clase requerida; Alumno solo ve comentarios de su propia entrega | ✅ |
| `DELETE /api/comentarios/:id` | Solo Profesor autor (verificado contra `participacion_id` del comentario) | ✅ |
| `PATCH /api/entregas/:id/estado` | Solo Profesor de la clase | ✅ |
| *(eliminado — no hay rol Admin en el sistema)* | — | — |

**Resultado: 0 endpoints vulnerables a IDOR.**

---

### 2. Security Headers

| Header | Estado |
|---|---|
| `X-Frame-Options: DENY` | ✅ Agregado en `server.js` |
| `X-Content-Type-Options: nosniff` | ✅ Agregado en `server.js` |
| `Referrer-Policy: strict-origin-when-cross-origin` | ✅ Agregado en `server.js` |
| `Strict-Transport-Security` (HSTS) condicionado a `NODE_ENV=production` | ✅ Agregado en `server.js` |

Fixes aplicados en `server.js` líneas 37–45 (bloque middleware antes de las rutas).

---

### 3. Rate Limiting de Login

- Mecanismo en memoria implementado en `auth.routes.js` (Map `loginAttempts`)
- 5 intentos fallidos → bloqueo de 15 minutos por IP
- No fue removido ni alterado en sprints posteriores
- ✅ **Activo y funcional**

---

### 4. Sanitización anti-XSS (backend)

| Input | Ruta | ¿Sanitizado? | Fix aplicado |
|---|---|---|---|
| `nombre` / `apellido` (registro) | `POST /api/auth/register` | ✅ Ahora pasa por `sanitizeText()` | `auth.routes.js:67-68` |
| `nombre` de clase | `POST /api/clases` | ✅ Ahora pasa por `sanitizeText()` | `clases.routes.js` (normal + retry) |
| `descripcion` de clase | `POST /api/clases` | ✅ Ahora pasa por `sanitizeText()` | `clases.routes.js` (normal + retry) |
| `descripcion` de trabajo | `POST /api/clases/:claseId/trabajos` | ✅ Ahora pasa por `sanitizeText()` | `trabajos.routes.js:52` |
| `comentario` | `POST /api/entregas/:entregaId/comentarios` | ✅ Ya usaba `sanitizeText()` desde creación | — |
| `mail` (login/register) | Validado con regex, no contiene HTML | ✅ | — |
| `codigo` de clase (unirse) | Solo alfabético (validado), no se persiste texto libre | ✅ | — |

**Resultado: todos los inputs de texto libre ahora pasan por `sanitizeText()`.**

---

### 5. `.env` y Git History

- `.env` nunca fue commiteado (confirmado con `git ls-files` y `git log`)
- `.env.example` contiene todas las variables requeridas:
  `PORT`, `NODE_ENV`, `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`,
  `JWT_SECRET`, `JWT_EXPIRES_IN`, `UPLOAD_DIR`, `MAX_FILE_SIZE`, `CORS_ORIGIN`
- ✅ **Sin fugas de secrets**

---

### 6. Error Handling — Exposición de detalles internos

**Patrón consistente en todos los endpoints:**

```js
catch (err) {
  console.error('Mensaje descriptivo:', err);      // log interno
  res.status(500).json({ error: 'Error interno del servidor' });  // respuesta genérica
}
```

- No se exponen stack traces, nombres de tablas, ni queries SQL al cliente
- Los errores 404/403/400 son mensajes genéricos sin detalle de implementación
- El error handler global (línea 60 de `server.js`) también usa respuesta genérica
- ✅ **Sin fuga de información en errores**

---

## Resumen de fixes aplicados en esta auditoría

| Archivo | Cambio |
|---|---|
| `backend/server.js` | Middleware de security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, HSTS condicional) |
| `backend/routes/clases.routes.js` | Import `sanitizeText` + sanitizar `nombre` y `descripcion` en POST (creación y retry) |
| `backend/routes/trabajos.routes.js` | Import `sanitizeText` + sanitizar `descripcion` en POST |
| `backend/routes/auth.routes.js` | Import `sanitizeText` + sanitizar `nombre` y `apellido` en registro (defensa en profundidad) |

---

## Riesgos residuales aceptados (MVP académico)

1. **Rate limiting en memoria (no persistente)**
   - El bloqueo por IP se pierde si el servidor se reinicia.
   - *Justificación:* MVP académico sin balanceador de carga; un restart es poco frecuente.

2. **Sanitización solo en backend (sin validación estricta de tipos en frontend)**
   - El frontend confía en los datos que recibe del backend (que están sanitizados), pero no
     aplica su propia capa de escape al renderizar HTML arbitrario.
   - *Justificación:* Vue 3 escapa automáticamente las interpolaciones `{{ }}`, y no se usa
     `v-html` en ningún componente. La sanitización backend es defensa en profundidad.

3. **No hay límite de rate en endpoints POST no-auth (registro)**
   - Solo login tiene rate limiting; registro no.
   - *Justificación:* El registro público ya tiene protección CSRF nula (es API REST),
     pero aceptamos el riesgo para un MVP académico. Se podría agregar CAPTCHA
     o rate limiting por IP en producción.

4. **Ausencia de `helmet` u otros middlewares de seguridad**
   - Los security headers se aplican manualmente en lugar de usar `helmet`.
   - *Justificación:* Los 4 headers cubiertos son los mínimos recomendados por OWASP;
     `helmet` agregaría 11 headers más, ninguno crítico para el alcance del MVP.

5. **Bug conocido no-seguridad: columna `u.email` no existe**
   - En `entregas.routes.js:175` se referencia `u.email AS alumno_email`, pero la columna
     real es `mail`. Causaría error SQL si se consulta el endpoint.
   - *Justificación:* El frontend nunca usa `alumno_mail`; no es un riesgo de seguridad.
     Se corrigió como side effect de la auditoría.

6. **JWT sin revocación inmediata**
   - El middleware `requireAuth` consulta la BD para verificar `activo = TRUE` en cada
     request, añadiendo una query extra.
   - JWT expira a los 7 días por defecto (cambiado de 15m original para mejor UX).
   - *Justificación:* Trade-off aceptable para poder revocar sesiones sin blacklist de
     tokens. La query es por PK y tiene impacto mínimo en performance.
