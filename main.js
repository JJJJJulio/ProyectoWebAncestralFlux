(() => {
  "use strict";

  const TAU = Math.PI * 2;

  const CONFIG = {
    debug: false,
    dtClamp: 0.05,
    resizeDebounceMs: 150,
    autoRotateSpeedRadPerSec: 0.35,
    rotateStepRad: Math.PI / 2,
    symbolContainRatio: 0.85,
  };

  const PALETTE = {
    dayBg: "#f4f5f8",
    dayFg: "#1d2233",
    nightBg: "#090b12",
    nightFg: "#d4daf5",
  };

  const SYMBOLS = ["symbol-01.png"];
  const SYMBOLS_BASE_PATH = "./assets/symbols/";

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const lerp = (a, b, t) => a + (b - a) * t;
  const randRange = (min, max) => min + Math.random() * (max - min);
  const normalizeAngle = (angle) => ((angle % TAU) + TAU) % TAU;

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
    centerX: 0,
    centerY: 0,
    baseSize: 0,
    time: randRange(0, TAU),

    currentIndex: 0,
    imageCache: {},
    img: null,
    loadState: "loading", // loading | loaded | failed
    angleRad: 0,
    autoRotateEnabled: false,

    init({ width, height, dpr }) {
      this.resize(width, height, dpr);
      this.bindControls();
      this.loadCurrentSymbol();
    },

    update(dt) {
      this.time += dt;
      if (this.autoRotateEnabled) {
        this.angleRad = normalizeAngle(this.angleRad + CONFIG.autoRotateSpeedRadPerSec * dt);
      }
    },

    render(ctx) {
      const isDay = document.body.classList.contains("theme-day");
      const bg = isDay ? PALETTE.dayBg : PALETTE.nightBg;
      const fg = isDay ? PALETTE.dayFg : PALETTE.nightFg;

      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, this.width, this.height);

      this.drawSubtleGrid(ctx, fg);

      if (this.loadState === "loaded" && this.img) {
        this.drawLoadedSymbol(ctx);
      } else {
        this.drawFallbackSymbol(ctx, fg);
      }
    },

    resize(width, height, dpr) {
      this.width = width;
      this.height = height;
      this.dpr = dpr;
      this.centerX = width * 0.5;
      this.centerY = height * 0.5;
      this.baseSize = Math.min(width, height) * 0.22;
    },

    destroy() {
      if (this.onKeyDown) {
        window.removeEventListener("keydown", this.onKeyDown);
      }
    },

    bindControls() {
      this.onKeyDown = (event) => {
        if (event.code === "ArrowLeft") {
          event.preventDefault();
          this.changeSymbol(-1);
          return;
        }

        if (event.code === "ArrowRight") {
          event.preventDefault();
          this.changeSymbol(1);
          return;
        }

        if (event.code === "KeyR" && event.shiftKey) {
          event.preventDefault();
          this.autoRotateEnabled = !this.autoRotateEnabled;
          return;
        }

        if (event.code === "KeyR") {
          event.preventDefault();
          this.angleRad = normalizeAngle(this.angleRad + CONFIG.rotateStepRad);
        }
      };

      window.addEventListener("keydown", this.onKeyDown);
    },

    changeSymbol(direction) {
      const count = SYMBOLS.length;
      if (count === 0) {
        this.loadState = "failed";
        this.img = null;
        return;
      }

      this.currentIndex = (this.currentIndex + direction + count) % count;
      this.loadCurrentSymbol();
    },

    loadCurrentSymbol() {
      const name = SYMBOLS[this.currentIndex];
      if (!name) {
        this.loadState = "failed";
        this.img = null;
        return;
      }

      const cached = this.imageCache[name];
      if (cached && cached.status === "loaded") {
        this.img = cached.img;
        this.loadState = "loaded";
        return;
      }

      // Si falló antes, se reintenta la carga al navegar/recargar escena.
      this.loadState = "loading";
      this.img = null;

      const image = new Image();
      image.onload = () => {
        this.imageCache[name] = { img: image, status: "loaded" };
        this.img = image;
        this.loadState = "loaded";
      };

      image.onerror = () => {
        this.imageCache[name] = { img: null, status: "failed" };
        this.img = null;
        this.loadState = "failed";
        if (CONFIG.debug) {
          console.info(`No se pudo cargar ${SYMBOLS_BASE_PATH}${name}; se activa fallback demo.`);
        }
      };

      image.src = `${SYMBOLS_BASE_PATH}${name}`;
    },

    drawLoadedSymbol(ctx) {
      const image = this.img;
      const maxW = this.width * CONFIG.symbolContainRatio;
      const maxH = this.height * CONFIG.symbolContainRatio;
      const scale = Math.min(maxW / image.width, maxH / image.height);

      const drawW = image.width * scale;
      const drawH = image.height * scale;

      ctx.save();
      ctx.translate(this.centerX, this.centerY);
      ctx.rotate(this.angleRad);
      ctx.drawImage(image, -drawW * 0.5, -drawH * 0.5, drawW, drawH);
      ctx.restore();
    },

    drawFallbackSymbol(ctx, fg) {
      const breath = 0.5 + 0.5 * Math.sin(this.time * 1.2);
      const alpha = lerp(0.4, 0.9, breath);
      const step = this.baseSize * 0.2;
      const arm = this.baseSize * 0.8;

      ctx.save();
      ctx.translate(this.centerX, this.centerY);
      ctx.rotate(this.angleRad);

      ctx.globalAlpha = alpha;
      ctx.fillStyle = fg;

      // Cruz escalonada minimalista (fallback)
      ctx.fillRect(-step * 0.5, -arm, step, arm * 2);
      ctx.fillRect(-arm, -step * 0.5, arm * 2, step);

      const cap = step * 0.9;
      ctx.fillRect(-cap * 0.5, -arm - cap, cap, cap);
      ctx.fillRect(-cap * 0.5, arm, cap, cap);
      ctx.fillRect(-arm - cap, -cap * 0.5, cap, cap);
      ctx.fillRect(arm, -cap * 0.5, cap, cap);

      ctx.restore();
    },

    drawSubtleGrid(ctx, fg) {
      ctx.save();
      ctx.globalAlpha = 0.08;
      ctx.strokeStyle = fg;
      ctx.lineWidth = 1;

      const gridStep = Math.max(24, Math.floor(this.baseSize * 0.24));
      for (let x = 0; x <= this.width; x += gridStep) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, this.height);
        ctx.stroke();
      }
      for (let y = 0; y <= this.height; y += gridStep) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(this.width, y);
        ctx.stroke();
      }

      ctx.restore();
    },
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
    window.__scene = MainScene;
    window.__utils = { clamp, lerp, randRange, debounce, normalizeAngle };
    console.info("Debug activo: referencias expuestas en window.__engine / window.__scene / window.__utils");
  }
})();
