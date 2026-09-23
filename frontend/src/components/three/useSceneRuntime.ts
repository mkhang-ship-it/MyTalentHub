import { useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import type { Material, Object3D, PerspectiveCamera, Scene, WebGLRenderer } from "three";
import type {
  SceneAPI,
  SceneBuildResult,
  SceneBuilder,
  SceneConfig,
  SceneRuntimeState,
} from "./types";

type RuntimeGlobals = typeof globalThis & {
  requestAnimationFrame?: (callback: FrameRequestCallback) => number;
  cancelAnimationFrame?: (handle: number) => void;
  IntersectionObserver?: typeof IntersectionObserver;
  ResizeObserver?: typeof ResizeObserver;
  document?: Document;
  navigator?: Navigator;
  performance?: Performance;
  devicePixelRatio?: number;
};

const runtimeGlobal = globalThis as RuntimeGlobals;

function nowMs(): number {
  return runtimeGlobal.performance?.now?.() ?? Date.now();
}

function disposeTexture(value: unknown): void {
  if (!value || typeof value !== "object") return;
  const candidate = value as { isTexture?: unknown; dispose?: () => void };
  if (candidate.isTexture === true) candidate.dispose?.();
}

function disposeMaterial(material: Material | Material[]): void {
  if (Array.isArray(material)) {
    material.forEach((entry) => {
      Object.values(entry).forEach(disposeTexture);
      entry.dispose();
    });
    return;
  }
  Object.values(material).forEach(disposeTexture);
  material.dispose();
}

function disposeTree(root: Object3D): void {
  root.traverse((object) => {
    const disposable = object as Object3D & {
      geometry?: { dispose: () => void };
      material?: Material | Material[];
    };
    disposable.geometry?.dispose();
    if (disposable.material) disposeMaterial(disposable.material);
  });
  root.clear();
}

function createDefaultScene(three: typeof import("three")): SceneBuildResult {
  const root = new three.Group();
  const geometry = new three.OctahedronGeometry(0.65, 1);
  const material = new three.MeshBasicMaterial({ color: 0xc44296, wireframe: true });
  const mesh = new three.Mesh(geometry, material);
  root.add(mesh);
  return {
    root,
    update: (delta) => {
      root.rotation.y += delta * 0.35;
      root.rotation.x += delta * 0.12;
    },
  };
}

class SceneController implements SceneAPI {
  readonly sceneId: string;
  private canvasEl: HTMLCanvasElement | null;
  private readonly buildScene: SceneBuilder | undefined;
  private readonly config: Required<Pick<SceneConfig, "dprCap" | "failIfMajorPerformanceCaveat" | "prefersReducedMotion">>;
  private readonly onState: (state: SceneRuntimeState) => void;
  private renderer: WebGLRenderer | null = null;
  private scene: Scene | null = null;
  private camera: PerspectiveCamera | null = null;
  private buildResult: SceneBuildResult | null = null;
  private rAFId = 0;
  private running = false;
  private mounting = false;
  private visible = true;
  private animationEnabled = true;
  private reducedMotion = false;
  private lastTime = 0;
  private observer: IntersectionObserver | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private visibilityHandler: (() => void) | null = null;
  private mediaQuery: MediaQueryList | null = null;
  private mediaQueryHandler: ((event: MediaQueryListEvent) => void) | null = null;
  private contextLostHandler: ((event: Event) => void) | null = null;
  private contextRestoredHandler: (() => void) | null = null;

  constructor(
    id: string,
    canvas: HTMLCanvasElement | null,
    buildScene: SceneBuilder | undefined,
    config: SceneConfig,
    onState: (state: SceneRuntimeState) => void
  ) {
    this.sceneId = id;
    this.canvasEl = canvas;
    this.buildScene = buildScene;
    this.config = {
      dprCap: Math.max(0.75, Math.min(config.dprCap ?? 1.5, 2)),
      failIfMajorPerformanceCaveat: config.failIfMajorPerformanceCaveat ?? true,
      prefersReducedMotion: config.prefersReducedMotion !== false,
    };
    this.onState = onState;
  }

  async mount(): Promise<void> {
    if (this.running || this.mounting) return;
    this.mounting = true;
    this.onState("loading");

    try {
      if (!this.canvasEl) throw new Error("SceneCanvas: canvas is not available");
      if (this.config.failIfMajorPerformanceCaveat && this.hasMajorPerformanceCaveat()) {
        const error = new Error("SceneCanvas: major performance caveat detected");
        error.name = "SceneUnsupportedError";
        this.onState("unsupported");
        throw error;
      }

      const three = await import("three");
      if (!this.canvasEl) throw new Error("SceneCanvas: canvas is not available");
      const renderer = new three.WebGLRenderer({
        canvas: this.canvasEl,
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
        failIfMajorPerformanceCaveat: this.config.failIfMajorPerformanceCaveat,
      });
      this.renderer = renderer;
      this.scene = new three.Scene();
      const ambient = new three.AmbientLight(0xffffff, 1.35);
      const keyLight = new three.DirectionalLight(0xfff4e8, 2.1);
      keyLight.position.set(3, 4, 5);
      this.scene.add(ambient, keyLight);
      this.camera = new three.PerspectiveCamera(50, 1, 0.1, 100);
      this.camera.position.set(0, 0, 4.2);
      this.buildResult = this.buildScene ? this.buildScene(three) : createDefaultScene(three);
      this.scene.add(this.buildResult.root);

      this.reducedMotion = this.config.prefersReducedMotion && this.matchesReducedMotion();
      this.animationEnabled = !this.reducedMotion;
      this.bindContextEvents();
      this.setupObservers();
      this.setupMediaQuery();
      this.resize();
      this.running = true;
      this.mounting = false;
      this.onState("running");
      if (this.reducedMotion) this.renderOnce();
      else this.startLoop();
    } catch (error) {
      this.mounting = false;
      this.running = false;
      this.cleanupContext();
      if (error instanceof Error && error.name === "SceneUnsupportedError") this.onState("unsupported");
      else this.onState("failed");
      throw error;
    }
  }

  unmount(): void {
    this.mounting = false;
    this.running = false;
    this.stopLoop();
    this.cleanupObservers();
    this.cleanupMediaQuery();
    this.cleanupContext();
  }

  setCanvas(canvas: HTMLCanvasElement | null): void {
    this.canvasEl = canvas;
  }

  getCanvas(): HTMLCanvasElement | null {
    return this.canvasEl;
  }

  getContext(): WebGLRenderingContext | null {
    return this.renderer?.getContext() ?? null;
  }

  getScene(): Scene | null {
    return this.scene;
  }

  getCamera(): PerspectiveCamera | null {
    return this.camera;
  }

  getRenderer(): WebGLRenderer | null {
    return this.renderer;
  }

  isRunning(): boolean {
    return this.running;
  }

  isVisible(): boolean {
    return this.visible;
  }

  setAnimationEnabled(enabled: boolean): void {
    this.animationEnabled = enabled && !this.reducedMotion;
    if (!this.animationEnabled) {
      this.stopLoop();
      this.renderOnce();
    } else if (this.running && this.visible) {
      this.startLoop();
    }
  }

  private hasMajorPerformanceCaveat(): boolean {
    const nav = runtimeGlobal.navigator;
    if (!nav) return false;
    const cores = nav.hardwareConcurrency;
    const memory = (nav as Navigator & { deviceMemory?: number }).deviceMemory;
    return (typeof cores === "number" && cores > 0 && cores < 2) ||
      (typeof memory === "number" && memory > 0 && memory < 2);
  }

  private matchesReducedMotion(): boolean {
    return runtimeGlobal.document?.defaultView?.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  }

  private bindContextEvents(): void {
    if (!this.canvasEl) return;
    this.contextLostHandler = (event: Event) => {
      event.preventDefault();
      this.running = false;
      this.stopLoop();
      this.onState("lost");
    };
    this.contextRestoredHandler = () => {
      this.cleanupContext();
      void this.mount().catch(() => {
        this.onState("failed");
      });
    };
    this.canvasEl.addEventListener("webglcontextlost", this.contextLostHandler, false);
    this.canvasEl.addEventListener("webglcontextrestored", this.contextRestoredHandler, false);
  }

  private cleanupContext(): void {
    if (this.canvasEl) {
      if (this.contextLostHandler) this.canvasEl.removeEventListener("webglcontextlost", this.contextLostHandler, false);
      if (this.contextRestoredHandler) this.canvasEl.removeEventListener("webglcontextrestored", this.contextRestoredHandler, false);
    }
    this.contextLostHandler = null;
    this.contextRestoredHandler = null;
    if (this.buildResult) {
      try {
        this.buildResult.dispose?.();
      } catch {
        // A custom disposer must not prevent renderer cleanup.
      }
      disposeTree(this.buildResult.root);
      this.buildResult = null;
    }
    if (this.renderer) {
      try {
        this.renderer.dispose();
      } catch {
        // Ignore browser teardown races after context loss.
      }
      this.renderer = null;
    }
    this.scene = null;
    this.camera = null;
  }

  private setupObservers(): void {
    const doc = runtimeGlobal.document;
    if (!doc) return;
    const docHidden = () => doc.hidden || doc.visibilityState === "hidden";
    this.visibilityHandler = () => {
      this.visible = !docHidden();
      if (!this.visible) this.stopLoop();
      else if (this.running) this.onState(this.reducedMotion ? "paused" : "running");
      if (this.visible && this.running && this.animationEnabled) this.startLoop();
    };
    doc.addEventListener("visibilitychange", this.visibilityHandler);

    const Observer = runtimeGlobal.IntersectionObserver;
    if (Observer && this.canvasEl) {
      this.observer = new Observer((entries) => {
        const entry = entries[entries.length - 1];
        if (!entry) return;
        this.visible = entry.isIntersecting && !docHidden();
        this.onState(this.visible ? "running" : "paused");
        if (this.visible && this.running && this.animationEnabled) this.startLoop();
        else this.stopLoop();
      }, { threshold: 0.05 });
      this.observer.observe(this.canvasEl);
    }

    const ResizeObserverCtor = runtimeGlobal.ResizeObserver;
    const target = this.canvasEl?.parentElement ?? this.canvasEl;
    if (ResizeObserverCtor && target) {
      this.resizeObserver = new ResizeObserverCtor(() => this.resize());
      this.resizeObserver.observe(target);
    }
  }

  private cleanupObservers(): void {
    const doc = runtimeGlobal.document;
    if (doc && this.visibilityHandler) doc.removeEventListener("visibilitychange", this.visibilityHandler);
    this.visibilityHandler = null;
    this.observer?.disconnect();
    this.observer = null;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }

  private setupMediaQuery(): void {
    if (!this.config.prefersReducedMotion) return;
    const mq = runtimeGlobal.document?.defaultView?.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    this.mediaQuery = mq;
    this.mediaQueryHandler = (event) => {
      this.reducedMotion = event.matches;
      this.animationEnabled = !event.matches;
      if (event.matches) {
        this.stopLoop();
        this.renderOnce();
      } else if (this.running && this.visible) {
        this.startLoop();
      }
    };
    mq.addEventListener?.("change", this.mediaQueryHandler);
  }

  private cleanupMediaQuery(): void {
    if (this.mediaQuery && this.mediaQueryHandler) this.mediaQuery.removeEventListener?.("change", this.mediaQueryHandler);
    this.mediaQuery = null;
    this.mediaQueryHandler = null;
  }

  private resize(): void {
    if (!this.renderer || !this.camera || !this.canvasEl) return;
    const rect = this.canvasEl.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width || this.canvasEl.clientWidth || 1));
    const height = Math.max(1, Math.floor(rect.height || this.canvasEl.clientHeight || 1));
    const dpr = Math.min(runtimeGlobal.devicePixelRatio || 1, this.config.dprCap);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private renderOnce(): void {
    if (!this.renderer || !this.scene || !this.camera) return;
    const time = nowMs() / 1000;
    this.buildResult?.update?.(0, time);
    this.renderer.render(this.scene, this.camera);
  }

  private startLoop(): void {
    if (!this.running || !this.visible || !this.animationEnabled || this.reducedMotion) return;
    this.stopLoop();
    this.lastTime = nowMs();
    const tick = (timestamp: number) => {
      if (!this.running || !this.visible || !this.animationEnabled) {
        this.rAFId = 0;
        return;
      }
      const delta = Math.min(0.1, Math.max(0, (timestamp - this.lastTime) / 1000));
      this.lastTime = timestamp;
      this.buildResult?.update?.(delta, timestamp / 1000);
      if (this.renderer && this.scene && this.camera) this.renderer.render(this.scene, this.camera);
      const raf = runtimeGlobal.requestAnimationFrame;
      this.rAFId = raf ? raf(tick) : 0;
    };
    const raf = runtimeGlobal.requestAnimationFrame;
    this.rAFId = raf ? raf(tick) : 0;
  }

  private stopLoop(): void {
    if (this.rAFId) {
      runtimeGlobal.cancelAnimationFrame?.(this.rAFId);
      this.rAFId = 0;
    }
  }
}

export function useSceneRuntime(
  config: SceneConfig | undefined,
  canvasRef: RefObject<HTMLCanvasElement | null>,
  buildScene: SceneBuilder | undefined,
  onReady?: (api: SceneAPI | null, error?: Error) => void,
  onError?: (error: Error) => void
): SceneRuntimeState {
  const [state, setState] = useState<SceneRuntimeState>("idle");
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);
  onReadyRef.current = onReady;
  onErrorRef.current = onError;

  const sceneId = config?.sceneId ?? "default-scene";
  const dprCap = config?.dprCap ?? 1.5;
  const failIfMajorPerformanceCaveat = config?.failIfMajorPerformanceCaveat ?? true;
  const prefersReducedMotion = config?.prefersReducedMotion !== false;
  const controller = useMemo(
    () => new SceneController(
      sceneId,
      null,
      buildScene,
      { dprCap, failIfMajorPerformanceCaveat, prefersReducedMotion },
      setState
    ),
    [buildScene, dprCap, failIfMajorPerformanceCaveat, prefersReducedMotion, sceneId]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    controller.setCanvas(canvas);
    if (!canvas) return () => controller.unmount();

    let cancelled = false;
    void controller.mount().then(
      () => {
        if (!cancelled) onReadyRef.current?.(controller);
      },
      (reason: unknown) => {
        if (cancelled) return;
        const error = reason instanceof Error ? reason : new Error(String(reason));
        onReadyRef.current?.(null, error);
        onErrorRef.current?.(error);
      }
    );

    return () => {
      cancelled = true;
      controller.unmount();
    };
  }, [canvasRef, controller]);

  return state;
}
