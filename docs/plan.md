# Plan · Bloque 1 (Motor visual estable)

## Objetivo
Establecer una base robusta y mínima en Canvas 2D con arquitectura de engine + escena para habilitar iteraciones visuales posteriores sin introducir funcionalidades de bloques futuros.

## Alcance implementado
- Engine con `requestAnimationFrame`, `update(dt)` y `render()`.
- `dt` clamped (`CONFIG.dtClamp = 0.05`) para evitar saltos tras pausas.
- Soporte HiDPI con `devicePixelRatio` y `ctx.setTransform(...)`.
- Resize robusto con `debounce` (`CONFIG.resizeDebounceMs = 150`).
- `CONFIG` y `PALETTE` centralizados en `main.js`.
- Utilidades mínimas: `clamp`, `lerp`, `randRange`, `debounce`.
- SceneManager mínimo con una escena real (`MainScene`) y hooks: `init`, `update`, `render`, `resize`, `destroy`.
- Placeholder visual minimalista (fondo + retícula sutil + cruz geométrica abstracta).

## Fuera de alcance explícito
- Sin loader de assets.
- Sin alpha mask.
- Sin partículas avanzadas.
- Sin narrativa cultural.
- Sin tooling Node/Vite/Webpack/Parcel ni dependencias externas.
