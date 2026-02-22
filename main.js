(() => {
  "use strict";

  const CONFIG = {
    debug: false,
    dtClamp: 0.05,
    resizeDebounceMs: 150,
  };

  const PALETTE = {
    dayBg: "#f4f5f8",
    dayFg: "#1d2233",
    nightBg: "#090b12",
    nightFg: "#d4daf5",
  };

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const lerp = (a, b, t) => a + (b - a) * t;
  const randRange = (min, max) => min + Math.random() * (max - min);

  function debounce(fn, waitMs) {
    let timeoutId = null;
    return (...args) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => fn(...args), waitMs);
    };
  }

  const SceneManager = {
    currentScene: null,

    setScene(scene, context) {
      if (this.currentScene && this.currentScene.destroy) {
        this.currentScene.destroy();
      }
      this.currentScene = scene;
      if (this.currentScene && this.currentScene.init) {
        this.currentScene.init(context);
      }
    },

    update(dt) {
      if (this.currentScene && this.currentScene.update) {
        this.currentScene.update(dt);
      }
    },

    render(ctx) {
      if (this.currentScene && this.currentScene.render) {
        this.currentScene.render(ctx);
      }
    },

    resize(width, height, dpr) {
      if (this.currentScene && this.currentScene.resize) {
        this.currentScene.resize(width, height, dpr);
      }
    },
  };

  const MainScene = {
    width: 0,
    height: 0,
    dpr: 1,
    time: randRange(0, Math.PI * 2),
    centerX: 0,
    centerY: 0,
    baseSize: 0,

    init({ width, height, dpr }) {
      this.resize(width, height, dpr);
    },

    update(dt) {
      this.time += dt;
    },

    render(ctx) {
      const isDay = document.body.classList.contains("theme-day");
      const bg = isDay ? PALETTE.dayBg : PALETTE.nightBg;
      const fg = isDay ? PALETTE.dayFg : PALETTE.nightFg;

      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, this.width, this.height);

      const breath = 0.5 + 0.5 * Math.sin(this.time * 1.4);
      const glowAlpha = lerp(0.15, 0.38, breath);
      const strokeAlpha = lerp(0.45, 0.9, breath);
      const crossExtent = this.baseSize * lerp(0.9, 1.05, breath);

      ctx.save();
      ctx.translate(this.centerX, this.centerY);

      // Sutil retícula para validar nitidez y escalado
      ctx.globalAlpha = 0.08;
      ctx.strokeStyle = fg;
      ctx.lineWidth = 1;
      const gridStep = Math.max(24, Math.floor(this.baseSize * 0.22));
      for (let x = -this.centerX; x <= this.centerX; x += gridStep) {
        ctx.beginPath();
        ctx.moveTo(x, -this.centerY);
        ctx.lineTo(x, this.centerY);
        ctx.stroke();
      }
      for (let y = -this.centerY; y <= this.centerY; y += gridStep) {
        ctx.beginPath();
        ctx.moveTo(-this.centerX, y);
        ctx.lineTo(this.centerX, y);
        ctx.stroke();
      }

      // Halo
      ctx.globalAlpha = glowAlpha;
      ctx.strokeStyle = fg;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, this.baseSize * 0.95, 0, Math.PI * 2);
      ctx.stroke();

      // Cruz geométrica
      ctx.globalAlpha = strokeAlpha;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-crossExtent, 0);
      ctx.lineTo(crossExtent, 0);
      ctx.moveTo(0, -crossExtent);
      ctx.lineTo(0, crossExtent);
      ctx.stroke();

      // Marco interno simple
      ctx.globalAlpha = strokeAlpha * 0.85;
      const square = this.baseSize * 0.45;
      ctx.strokeRect(-square, -square, square * 2, square * 2);

      ctx.restore();
    },

    resize(width, height, dpr) {
      this.width = width;
      this.height = height;
      this.dpr = dpr;
      this.centerX = width * 0.5;
      this.centerY = height * 0.5;
      this.baseSize = Math.min(width, height) * 0.18;
    },

    destroy() {},
  };

  const Engine = {
    canvas: null,
    ctx: null,
    width: 0,
    height: 0,
    dpr: 1,
    rafId: 0,
    lastTimeMs: 0,

    initCanvas() {
      this.canvas = document.getElementById("c");
      if (!this.canvas) {
        throw new Error("No se encontró <canvas id='c'> en el documento.");
      }

      this.ctx = this.canvas.getContext("2d");
      if (!this.ctx) {
        throw new Error("No se pudo crear el contexto 2D del canvas.");
      }

      this.resize();
      const debouncedResize = debounce(() => this.resize(), CONFIG.resizeDebounceMs);
      window.addEventListener("resize", debouncedResize);
      this._onResize = debouncedResize;
    },

    resize() {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.dpr = Math.max(1, window.devicePixelRatio || 1);

      this.canvas.width = Math.floor(this.width * this.dpr);
      this.canvas.height = Math.floor(this.height * this.dpr);

      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      SceneManager.resize(this.width, this.height, this.dpr);
    },

    loop: (timestampMs) => {
      if (!Engine.lastTimeMs) {
        Engine.lastTimeMs = timestampMs;
      }

      const rawDt = (timestampMs - Engine.lastTimeMs) * 0.001;
      const dt = clamp(rawDt, 0, CONFIG.dtClamp);
      Engine.lastTimeMs = timestampMs;

      Engine.update(dt);
      Engine.render();

      Engine.rafId = window.requestAnimationFrame(Engine.loop);
    },

    update(dt) {
      SceneManager.update(dt);
    },

    render() {
      SceneManager.render(this.ctx);
    },

    start() {
      this.initCanvas();
      SceneManager.setScene(MainScene, {
        width: this.width,
        height: this.height,
        dpr: this.dpr,
      });
      this.rafId = window.requestAnimationFrame(this.loop);
    },

    destroy() {
      if (this.rafId) {
        window.cancelAnimationFrame(this.rafId);
      }
      if (this._onResize) {
        window.removeEventListener("resize", this._onResize);
      }
      if (SceneManager.currentScene && SceneManager.currentScene.destroy) {
        SceneManager.currentScene.destroy();
      }
    },
  };

  try {
    Engine.start();
  } catch (error) {
    console.error("Error al iniciar el motor visual:", error);
  }

  if (CONFIG.debug) {
    window.__engine = Engine;
    window.__utils = { clamp, lerp, randRange, debounce };
    console.info("Debug activo: referencias expuestas en window.__engine / window.__utils");
  }
})();
