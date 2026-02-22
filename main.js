(() => {
  "use strict";

  // --- DOM references ------------------------------------------------------
  const canvas = document.getElementById("scene");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    console.error("No se pudo inicializar el contexto 2D del canvas.");
    return;
  }

  // --- Rendering configuration --------------------------------------------
  const state = {
    width: 0,
    height: 0,
    dpr: 1,
    centerX: 0,
    centerY: 0,
    baseSize: 0,
    startTime: performance.now(),
  };

  function resizeCanvas() {
    state.dpr = Math.min(window.devicePixelRatio || 1, 2);
    state.width = window.innerWidth;
    state.height = window.innerHeight;

    canvas.width = Math.floor(state.width * state.dpr);
    canvas.height = Math.floor(state.height * state.dpr);

    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);

    state.centerX = state.width * 0.5;
    state.centerY = state.height * 0.5;
    state.baseSize = Math.min(state.width, state.height) * 0.14;
  }

  // Placeholder: símbolo geométrico ritual abstracto (círculo + rombo + cruz)
  function drawSymbol(time) {
    const pulse = 1 + Math.sin(time * 0.0018) * 0.05;
    const glow = 0.35 + Math.sin(time * 0.0021) * 0.15;

    const size = state.baseSize * pulse;

    ctx.save();
    ctx.translate(state.centerX, state.centerY);

    // Halo exterior
    ctx.globalAlpha = 0.2 + glow;
    ctx.strokeStyle = "#d8ddff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, size * 1.15, 0, Math.PI * 2);
    ctx.stroke();

    // Círculo central
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.75, 0, Math.PI * 2);
    ctx.stroke();

    // Rombo interno
    ctx.globalAlpha = 0.78;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.55);
    ctx.lineTo(size * 0.55, 0);
    ctx.lineTo(0, size * 0.55);
    ctx.lineTo(-size * 0.55, 0);
    ctx.closePath();
    ctx.stroke();

    // Cruz axial
    ctx.globalAlpha = 0.62;
    ctx.beginPath();
    ctx.moveTo(-size * 0.9, 0);
    ctx.lineTo(size * 0.9, 0);
    ctx.moveTo(0, -size * 0.9);
    ctx.lineTo(0, size * 0.9);
    ctx.stroke();

    ctx.restore();
  }

  function renderFrame(now) {
    const elapsed = now - state.startTime;

    ctx.clearRect(0, 0, state.width, state.height);

    drawSymbol(elapsed);
    requestAnimationFrame(renderFrame);
  }

  function init() {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    requestAnimationFrame(renderFrame);
  }

  init();
})();
