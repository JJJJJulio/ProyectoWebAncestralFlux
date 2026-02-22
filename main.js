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
    alphaThreshold: 80,
    sampleStep: 6,
    maxPoints: 7000,
    particleCount: 800,
    particleSize: 1.5,
    particleAttraction: 0.002,
    particleFriction: 0.92,
    particleNoiseStrength: 0.4,
    particleReturnSpeed: 0.05,
  };

  const PALETTE = {
    dayBg: "#f4f5f8",
    dayFg: "#1d2233",
    nightBg: "#090b12",
    nightFg: "#d4daf5",
    primary: "#d4daf5",
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
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), waitMs);
    };
  }

  function createParticleSystem() {
    return {
      enabled: true,
      particles: [],
      symbolPoints: [],

      setPoints(points, width, height) {
        this.symbolPoints = points || [];
        this.reseed(width, height);
      },

      reseed(width, height) {
        const points = this.symbolPoints;
        if (!points.length) {
          this.particles = [];
          return;
        }

        const adaptiveCount = clamp(Math.floor((width * height) / 1800), 300, 1200);
        const desired = Math.min(CONFIG.particleCount, adaptiveCount);
        const particles = [];

        for (let i = 0; i < desired; i += 1) {
          const target = points[Math.floor(Math.random() * points.length)];
          particles.push({
            x: randRange(-width * 0.45, width * 0.45),
            y: randRange(-height * 0.45, height * 0.45),
            tx: target.x,
            ty: target.y,
            vx: 0,
            vy: 0,
            size: CONFIG.particleSize * randRange(0.85, 1.15),
            phase: randRange(0, TAU),
            alpha: randRange(0.35, 0.9),
          });
        }

        this.particles = particles;
      },

      update(dt, time, targetFn) {
        if (!this.enabled || !this.particles.length) return;

        const noiseSpeed = 0.85;
        for (let i = 0; i < this.particles.length; i += 1) {
          const p = this.particles[i];
          const target = targetFn(p, i);
          p.tx = lerp(p.tx, target.x, CONFIG.particleReturnSpeed);
          p.ty = lerp(p.ty, target.y, CONFIG.particleReturnSpeed);

          const dx = p.tx - p.x;
          const dy = p.ty - p.y;

          p.vx += dx * CONFIG.particleAttraction;
          p.vy += dy * CONFIG.particleAttraction;

          const n = time * noiseSpeed + p.phase;
          p.vx += Math.sin(n + p.ty * 0.01) * CONFIG.particleNoiseStrength * dt;
          p.vy += Math.cos(n + p.tx * 0.01) * CONFIG.particleNoiseStrength * dt;

          p.vx *= CONFIG.particleFriction;
          p.vy *= CONFIG.particleFriction;

          p.x += p.vx;
          p.y += p.vy;
        }
      },

      render(ctx, color) {
        if (!this.enabled || !this.particles.length) return;

        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = color;

        for (let i = 0; i < this.particles.length; i += 1) {
          const p = this.particles[i];
          ctx.globalAlpha = p.alpha;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, TAU);
          ctx.fill();
        }

        ctx.restore();
        ctx.globalAlpha = 1;
      },
    };
  }

  const SceneManager = {
    currentScene: null,

    setScene(scene, context) {
      if (this.currentScene && this.currentScene.destroy) this.currentScene.destroy();
      this.currentScene = scene;
      if (this.currentScene && this.currentScene.init) this.currentScene.init(context);
    },

    update(dt) {
      if (this.currentScene && this.currentScene.update) this.currentScene.update(dt);
    },

    render(ctx) {
      if (this.currentScene && this.currentScene.render) this.currentScene.render(ctx);
    },

    resize(width, height, dpr) {
      if (this.currentScene && this.currentScene.resize) this.currentScene.resize(width, height, dpr);
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
    loadState: "loading",
    angleRad: 0,
    autoRotateEnabled: false,

    debugPointsEnabled: false,
    pointCloud: [],
    fallbackPoints: [],
    particleSystem: createParticleSystem(),

    init({ width, height, dpr }) {
      this.resize(width, height, dpr);
      this.bindControls();
      this.fallbackPoints = this.buildFallbackPoints();
      this.loadCurrentSymbol();
    },

    update(dt) {
      this.time += dt;
      if (this.autoRotateEnabled) {
        this.angleRad = normalizeAngle(this.angleRad + CONFIG.autoRotateSpeedRadPerSec * dt);
      }

      const points = this.loadState === "loaded" && this.pointCloud.length ? this.pointCloud : this.fallbackPoints;
      this.particleSystem.update(dt, this.time, (particle, idx) => {
        const source = points[idx % points.length] || { x: 0.5, y: 0.5 };
        return this.normalizedPointToScene(source.x, source.y);
      });
    },

    render(ctx) {
      const isDay = document.body.classList.contains("theme-day");
      const bg = isDay ? PALETTE.dayBg : PALETTE.nightBg;
      const fg = isDay ? PALETTE.dayFg : PALETTE.nightFg;

      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, this.width, this.height);
      this.drawSubtleGrid(ctx, fg);

      if (this.loadState === "loaded" && this.img) {
        if (this.debugPointsEnabled) {
          this.drawPointCloud(ctx, fg);
          this.drawDebugOverlay(ctx, fg);
        } else {
          this.drawLoadedSymbol(ctx);
        }
      } else {
        this.drawFallbackSymbol(ctx, fg);
      }

      this.particleSystem.render(ctx, PALETTE.primary);
    },

    resize(width, height, dpr) {
      this.width = width;
      this.height = height;
      this.dpr = dpr;
      this.centerX = width * 0.5;
      this.centerY = height * 0.5;
      this.baseSize = Math.min(width, height) * 0.22;
      this.fallbackPoints = this.buildFallbackPoints();

      const sourcePoints = this.loadState === "loaded" && this.pointCloud.length ? this.pointCloud : this.fallbackPoints;
      this.particleSystem.setPoints(sourcePoints, width, height);
    },

    destroy() {
      if (this.onKeyDown) window.removeEventListener("keydown", this.onKeyDown);
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
          return;
        }
        if (event.code === "KeyD") {
          event.preventDefault();
          this.debugPointsEnabled = !this.debugPointsEnabled;
          return;
        }
        if (event.code === "KeyP") {
          event.preventDefault();
          this.particleSystem.enabled = !this.particleSystem.enabled;
        }
      };

      window.addEventListener("keydown", this.onKeyDown);
    },

    changeSymbol(direction) {
      const count = SYMBOLS.length;
      if (count === 0) {
        this.loadState = "failed";
        this.img = null;
        this.pointCloud = [];
        this.particleSystem.setPoints(this.fallbackPoints, this.width, this.height);
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
        this.pointCloud = [];
        this.particleSystem.setPoints(this.fallbackPoints, this.width, this.height);
        return;
      }

      const cached = this.imageCache[name];
      if (cached && cached.status === "loaded") {
        this.img = cached.img;
        this.loadState = "loaded";
        this.pointCloud = cached.pointCloud || [];
        this.particleSystem.setPoints(this.pointCloud, this.width, this.height);
        return;
      }

      this.loadState = "loading";
      this.img = null;
      this.pointCloud = [];

      const image = new Image();
      image.onload = () => {
        const pointCloud = this.buildPointCloudFromImage(image);
        this.imageCache[name] = { img: image, status: "loaded", pointCloud };
        this.img = image;
        this.pointCloud = pointCloud;
        this.loadState = "loaded";
        this.particleSystem.setPoints(this.pointCloud, this.width, this.height);
      };

      image.onerror = () => {
        this.imageCache[name] = { img: null, status: "failed", pointCloud: [] };
        this.img = null;
        this.pointCloud = [];
        this.loadState = "failed";
        this.particleSystem.setPoints(this.fallbackPoints, this.width, this.height);
        if (CONFIG.debug) {
          console.info(`No se pudo cargar ${SYMBOLS_BASE_PATH}${name}; se activa fallback demo.`);
        }
      };

      image.src = `${SYMBOLS_BASE_PATH}${name}`;
    },

    buildPointCloudFromImage(image) {
      const offscreen = document.createElement("canvas");
      offscreen.width = image.width;
      offscreen.height = image.height;
      const offCtx = offscreen.getContext("2d", { willReadFrequently: true });
      if (!offCtx) return [];

      offCtx.clearRect(0, 0, image.width, image.height);
      offCtx.drawImage(image, 0, 0);

      const pixels = offCtx.getImageData(0, 0, image.width, image.height).data;
      const points = [];
      const step = Math.max(1, Math.floor(CONFIG.sampleStep));

      for (let y = 0; y < image.height; y += step) {
        for (let x = 0; x < image.width; x += step) {
          const idx = (y * image.width + x) * 4;
          if (pixels[idx + 3] > CONFIG.alphaThreshold) {
            points.push({ x: x / image.width, y: y / image.height, alpha: pixels[idx + 3] / 255 });
            if (points.length >= CONFIG.maxPoints) return points;
          }
        }
      }

      return points;
    },

    buildFallbackPoints() {
      const points = [];
      const step = 0.03;
      for (let y = 0; y <= 1; y += step) {
        for (let x = 0; x <= 1; x += step) {
          const nx = x - 0.5;
          const ny = y - 0.5;
          const inVertical = Math.abs(nx) < 0.06 && Math.abs(ny) < 0.42;
          const inHorizontal = Math.abs(ny) < 0.06 && Math.abs(nx) < 0.42;
          const inCore = Math.abs(nx) < 0.18 && Math.abs(ny) < 0.18;
          if (inVertical || inHorizontal || inCore) {
            points.push({ x, y, alpha: 1 });
          }
        }
      }
      return points;
    },

    getContainDrawMetrics() {
      const image = this.img;
      const maxW = this.width * CONFIG.symbolContainRatio;
      const maxH = this.height * CONFIG.symbolContainRatio;
      const scale = Math.min(maxW / image.width, maxH / image.height);
      return { drawW: image.width * scale, drawH: image.height * scale };
    },

    normalizedPointToScene(nx, ny) {
      let drawW;
      let drawH;
      if (this.loadState === "loaded" && this.img) {
        ({ drawW, drawH } = this.getContainDrawMetrics());
      } else {
        drawW = this.baseSize * 2.5;
        drawH = this.baseSize * 2.5;
      }

      const localX = nx * drawW - drawW * 0.5;
      const localY = ny * drawH - drawH * 0.5;
      const cos = Math.cos(this.angleRad);
      const sin = Math.sin(this.angleRad);

      return {
        x: this.centerX + localX * cos - localY * sin,
        y: this.centerY + localX * sin + localY * cos,
      };
    },

    drawLoadedSymbol(ctx) {
      const { drawW, drawH } = this.getContainDrawMetrics();

      ctx.save();
      ctx.translate(this.centerX, this.centerY);
      ctx.rotate(this.angleRad);
      ctx.drawImage(this.img, -drawW * 0.5, -drawH * 0.5, drawW, drawH);
      ctx.restore();
    },

    drawPointCloud(ctx, fg) {
      if (!this.img || this.pointCloud.length === 0) {
        this.drawFallbackSymbol(ctx, fg);
        return;
      }

      const { drawW, drawH } = this.getContainDrawMetrics();
      const radius = this.dpr > 1.5 ? 0.95 : 1.2;

      ctx.save();
      ctx.translate(this.centerX, this.centerY);
      ctx.rotate(this.angleRad);
      ctx.fillStyle = fg;

      for (let i = 0; i < this.pointCloud.length; i += 1) {
        const p = this.pointCloud[i];
        const px = p.x * drawW - drawW * 0.5;
        const py = p.y * drawH - drawH * 0.5;
        ctx.globalAlpha = 0.35 + p.alpha * 0.65;
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, TAU);
        ctx.fill();
      }

      ctx.restore();
      ctx.globalAlpha = 1;
    },

    drawDebugOverlay(ctx, fg) {
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = fg;
      ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.textBaseline = "top";
      ctx.fillText(`debug points: ${this.pointCloud.length}`, 12, 12);
      ctx.fillText(`particles: ${this.particleSystem.particles.length}`, 12, 28);
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
      if (!this.canvas) throw new Error("No se encontró <canvas id='c'> en el documento.");

      this.ctx = this.canvas.getContext("2d");
      if (!this.ctx) throw new Error("No se pudo crear el contexto 2D del canvas.");

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
      if (!Engine.lastTimeMs) Engine.lastTimeMs = timestampMs;
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
      SceneManager.setScene(MainScene, { width: this.width, height: this.height, dpr: this.dpr });
      this.rafId = window.requestAnimationFrame(this.loop);
    },

    destroy() {
      if (this.rafId) window.cancelAnimationFrame(this.rafId);
      if (this._onResize) window.removeEventListener("resize", this._onResize);
      if (SceneManager.currentScene && SceneManager.currentScene.destroy) SceneManager.currentScene.destroy();
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
