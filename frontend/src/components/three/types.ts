import type { ReactNode } from "react";
import type { Object3D, PerspectiveCamera, Scene, WebGLRenderer } from "three";

export interface SceneConfig {
  sceneId?: string;
  /** Maximum device pixel ratio used by the renderer. */
  dprCap?: number;
  /** Ask the browser to reject software/blocklisted WebGL contexts. */
  failIfMajorPerformanceCaveat?: boolean;
  /** Respect the user's reduced-motion preference. Defaults to true. */
  prefersReducedMotion?: boolean;
}

export interface SceneBuildResult {
  root: Object3D;
  update?: (delta: number, time: number) => void;
  dispose?: () => void;
}

export type SceneBuilder = (three: typeof import("three")) => SceneBuildResult;

export interface SceneAPI {
  sceneId: string;
  mount: () => Promise<void>;
  unmount: () => void;
  getCanvas: () => HTMLCanvasElement | null;
  getContext: () => WebGLRenderingContext | null;
  getScene: () => Scene | null;
  getCamera: () => PerspectiveCamera | null;
  getRenderer: () => WebGLRenderer | null;
  isRunning: () => boolean;
  isVisible: () => boolean;
  setAnimationEnabled: (enabled: boolean) => void;
}

export interface SceneCanvasProps {
  config?: SceneConfig;
  /** Called once the scene is ready or has fallen back. */
  onReady?: (api: SceneAPI | null, error?: Error) => void;
  /** Called for a runtime or WebGL error. */
  onError?: (error: Error) => void;
  className?: string;
  /** Static content shown only while loading or when WebGL is unavailable. */
  fallback?: ReactNode;
  /** Backwards-compatible alias for fallback content. */
  children?: ReactNode;
  buildScene?: SceneBuilder;
  /** A meaningful label for a data/identity scene. */
  ariaLabel?: string;
  /** Decorative scenes are hidden from assistive technology by default. */
  decorative?: boolean;
}

export type SceneRuntimeState =
  | "idle"
  | "loading"
  | "mounting"
  | "running"
  | "paused"
  | "lost"
  | "failed"
  | "unsupported";
