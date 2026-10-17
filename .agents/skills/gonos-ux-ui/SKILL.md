---
name: gonos-ux-ui
description: Guía de implementación para diseño visual, UX, skeletons, toasts, microinteracciones y efectos para el proyecto GonoS.
---

# Guía de Implementación UI/UX para GonoS

## 1. Regla de Oro: Sistema de Colores y Tokens
Nunca hardcodear valores hexadecimales en ningún componente de Vue (`<style scoped>`). Usar exclusivamente los tokens de `frontend/src/assets/theme.css`:

```css
/* Fondos */
var(--color-bg);           /* Fondo general (crema claro / antracita oscuro) */
var(--color-bg-elevated);  /* Tarjetas, paneles flotantes, modales */
var(--color-bg-subtle);    /* Filas alternas, hover suave */
var(--color-border);       /* Bordes */

/* Tipografía */
var(--color-text);
var(--color-text-muted);
var(--color-text-disabled);

/* Acentos dinámicos por tema */
var(--color-accent);       /* Azul #19B0B5 en claro / Naranja #E06710 en oscuro */
var(--color-accent-hover);
var(--color-accent-soft);  /* Con transparencia (para halos, focus rings) */

/* Estados */
var(--color-danger);
var(--color-success);
```

## 2. Coexistencia con `DotsBackground.vue` (Efecto Glassmorphism Técnico)
Dado que el fondo punteado interactivo está siempre detrás (`z-index: 0`), los contenedores elevados deben permitir cierta translucidez controlada para lucir integrados:

```css
.card-glass, .modal-glass, .panel-glass {
  background: var(--color-bg-elevated);
  /* En navegadores modernos con soporte de backdrop-filter */
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--color-border);
}
```

## 3. Patrón para Skeletons Animados (Reemplazo de "Cargando...")
Para crear estados de carga visuales:
```css
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.skeleton {
  background: linear-gradient(
    90deg,
    var(--color-bg-subtle) 25%,
    var(--color-border) 50%,
    var(--color-bg-subtle) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: var(--radius-sm);
}
```

## 4. Patrón de Toasts No Intrusivos
- Los Toasts deben montarse vía `<Teleport to="body">`.
- Estados: `info`, `success`, `error`.
- Borde izquierdo con `var(--color-accent)` o `var(--color-danger)`.
- Sin librerías externas: administrado con un composable simple (`useToast`).

## 5. Micro-interacciones en el Visor 3D (`useViewer.js`)
- **Proyecciones:** Permitir cambiar suavemente entre `camera = perspCamera` y `camera = orthoCamera`.
- **Lerp en navegación de comentarios:** Al enfocar una anotación `(x, y, z)`, interpolar `controls.target` y `camera.position` a lo largo de 30 frames (60fps) usando `requestAnimationFrame`.
