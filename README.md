# ProyectoWebAncestralFlux

Experiencia web generativa basada en Canvas 2D, orientada a iteración visual mínima sin dependencias pesadas.

## Estado actual
- Bloque 1: motor visual estable (RAF + `update/render`, HiDPI, resize con debounce).
- Bloque 2: Symbol Loader con rotación por pasos, rotación suave opcional y navegación mínima.

## Asset activo
- Ruta: `./assets/symbols/symbol-01.png`

## Controles
- `ArrowLeft`: símbolo anterior.
- `ArrowRight`: símbolo siguiente.
- `R`: rotación por paso de 90°.
- `Shift + R`: activar/desactivar rotación suave automática.

## Probar localmente
1. Abrir `index.html` directamente (doble click).
2. Verificar que el símbolo aparece centrado con ajuste `contain` (factor visual ~85% del viewport).
3. Presionar `R` y confirmar rotación por pasos exactos de 90°.
4. Activar/desactivar rotación suave con `Shift + R`.
5. Cambiar símbolo con flechas (arquitectura lista aunque exista 1 asset).

### Caso fallback (si falla carga de imagen)
1. Renombrar temporalmente `./assets/symbols/symbol-01.png`.
2. Recargar `index.html`.
3. Debe mostrarse un fallback geométrico minimalista centrado, sin errores en consola.


## Sistema de partículas sobre símbolo
- `P`: activar/desactivar partículas dinámicas sobre la máscara alpha del símbolo.
- Las partículas migran suavemente cuando rota el símbolo y respetan fallback si la imagen falla.
