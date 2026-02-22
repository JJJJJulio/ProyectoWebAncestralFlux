# Plan · Bloque 2 (Symbol Loader + rotación + navegación mínima)

## Objetivo
Añadir un cargador de símbolo con render centrado y rotación controlada (paso 90° y modo suave), manteniendo el motor limpio del Bloque 1 y un fallback robusto cuando falle la carga del asset.

## Alcance implementado
- Carga de `./assets/symbols/symbol-01.png` con `Image()` y manejo `onload/onerror`.
- Estado mínimo de símbolo en escena:
  - `currentIndex`, `img` nullable, `loadState` (`loading|loaded|failed`), `angleRad`, `autoRotateEnabled`.
- Cache simple por nombre:
  - `imageCache[name] = { img, status }`.
- Render con contain + rotación alrededor del centro:
  - `scale = min((w*0.85)/imgW, (h*0.85)/imgH)`.
- Normalización de ángulo:
  - `angle = (angle % TAU + TAU) % TAU`.
- Controles:
  - `ArrowLeft` / `ArrowRight`: navegación de símbolo.
  - `R`: rotación por paso de 90°.
  - `Shift+R`: toggle de rotación automática suave (`0.35 rad/s`).
- Fallback demo cuando falla carga:
  - cruz escalonada minimalista (sin simbología literal), renderizada con el mismo pipeline de transform/rotación.
- Política de consola:
  - sin logs salvo `CONFIG.debug === true`.
  - fallos de carga no rompen runtime ni lanzan excepción.

## Fuera de alcance explícito
- Sin alpha mask (Bloque 3).
- Sin partículas avanzadas (Bloque 4).
- Sin state machine cultural (Bloque 5).
- Sin tooling Node/Vite/Webpack/Parcel ni dependencias externas.


## Extensión Bloque 3 (implementado)
- Pipeline máscara alpha -> nube de puntos con offscreen canvas + ImageData (muestreo por `sampleStep`).
- Parámetros: `alphaThreshold`, `sampleStep`, `maxPoints`.
- Tecla `D` para toggle debug de puntos y overlay mínimo de conteo.
- Cálculo de puntos solo en carga/re-carga del símbolo (no por frame).
