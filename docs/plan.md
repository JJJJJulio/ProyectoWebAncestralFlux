# Plan · Bloques 2, 3 y 4 (estado actual)

## Objetivo
Extender el motor Canvas 2D existente manteniendo arquitectura simple, sin tooling externo y con foco en visuales contemplativos: symbol loader, máscara alpha y partículas orgánicas.

## Alcance implementado
- Carga de símbolo desde `./assets/symbols/symbol-01.png` con `Image()` y estados `loading|loaded|failed`.
- Render centrado con contain (`0.85`) y rotación controlada.
- Controles base:
  - `ArrowLeft` / `ArrowRight` navegación.
  - `R` rotación por pasos de 90°.
  - `Shift+R` rotación suave automática.
- Pipeline de máscara alpha:
  - offscreen canvas + `getImageData`.
  - muestreo por `sampleStep` y filtro por `alphaThreshold`.
  - límite por `maxPoints`.
- Sistema de partículas:
  - estado por partícula: posición, target, velocidad, tamaño, fase, alpha.
  - movimiento orgánico suave (atracción + ruido sinusoidal + fricción).
  - migración progresiva al rotar (sin teletransporte de partículas).
  - toggle `P` para activar/desactivar partículas.
- Modo debug de puntos:
  - toggle `D` para visualizar nube de puntos y overlay mínimo de conteo.
- Fallback robusto:
  - si falla carga del símbolo, se mantiene forma geométrica y partículas sobre fallback.

## Parámetros clave
- `alphaThreshold`, `sampleStep`, `maxPoints`
- `particleCount`, `particleSize`, `particleAttraction`, `particleFriction`
- `particleNoiseStrength`, `particleReturnSpeed`

## Fuera de alcance
- State machine narrativa/cultural avanzada.
- Export de imágenes.
- Tooling (Node/Vite/Webpack/Parcel) o dependencias externas.
