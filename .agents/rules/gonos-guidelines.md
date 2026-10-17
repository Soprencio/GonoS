---
description: Reglas de arquitectura, diseño y seguridad del proyecto GonoS
trigger: always_on
---

# Reglas del Proyecto GonoS (Antigravity Workspace)

Cualquier agente que trabaje en este workspace debe consultar y respetar las siguientes directivas:

1. **Contexto Maestro:** Leer `GONOS_MASTER_CONTEXT.md` y `AGENTS.md` en la raíz del repositorio.
2. **Stack Obligatorio:**
   - **Frontend:** Vue 3 (Composition API), Vite, Vue Router 4, Three.js, CSS puro (sin Tailwind ni librerías UI externas).
   - **Backend:** Node.js 18+, Express.js, `mysql2/promise` (queries parametrizadas directas, sin ORM).
   - **Base de Datos:** MariaDB 10.6+.
   - **Lenguaje:** JavaScript ES2022 puro (sin TypeScript forzado).
3. **Sistema de Diseño y Estilos:**
   - Modo Claro: acento azul `#19B0B5` (`--color-accent`).
   - Modo Oscuro: acento naranja `#E06710` (`--color-accent`).
   - Prohibido hardcodear colores hexadecimales en componentes `.vue`; usar siempre variables de `frontend/src/assets/theme.css`.
   - Coexistencia estética con el fondo punteado interactivo `DotsBackground.vue`.
4. **Seguridad y Robustez:**
   - Verificación estricta de propiedad (anti-IDOR) en cada endpoint con `:id`.
   - Sanitización de entradas de texto libre (anti-XSS). Nunca usar `v-html` con datos de usuarios.
   - Manejo de archivos: whitelist de extensiones, renombrado con UUID y límite de 50MB.
5. **Autoverificación:**
   - Todo cambio en frontend debe ser verificado con `npm run build` dentro de `frontend/`.
   - Todo cambio en backend debe respetar los endpoints y pasar los tests en `backend/test/`.
